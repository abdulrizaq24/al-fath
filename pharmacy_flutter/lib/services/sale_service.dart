import 'package:drift/drift.dart';
import 'package:intl/intl.dart';

import '../core/errors/exceptions.dart';
import '../core/utils/uuid_generator.dart';
import '../data/daos/batch_dao.dart';
import '../data/daos/inventory_dao.dart';
import '../data/daos/sale_dao.dart';
import '../data/database/database.dart';
import '../domain/enums/app_enums.dart';

class SaleCartItemInput {
  final String medicineId;
  final String medicineName;
  final double quantity;
  final double unitPrice;
  final double discount;

  const SaleCartItemInput({
    required this.medicineId,
    required this.medicineName,
    required this.quantity,
    required this.unitPrice,
    this.discount = 0.0,
  });

  double get total => (quantity * unitPrice) - discount;
}

class SalePaymentInput {
  final PaymentMethod method;
  final double amount;
  final String? transactionReference;

  const SalePaymentInput({
    required this.method,
    required this.amount,
    this.transactionReference,
  });
}

abstract class ISaleService {
  Future<SaleWithDetails> createSale({
    required String pharmacyId,
    required String soldById,
    String? patientId,
    required List<SaleCartItemInput> items,
    required SalePaymentInput payment,
    double taxRate,
  });
}

class SaleService implements ISaleService {
  final AppDatabase _db;
  final ISaleDao _saleDao;
  final IBatchDao _batchDao;
  final IInventoryDao _inventoryDao;

  const SaleService(
    this._db,
    this._saleDao,
    this._batchDao,
    this._inventoryDao,
  );

  String _generateInvoiceNumber() {
    final now = DateTime.now();
    final dateStr = DateFormat('yyyyMMdd').format(now);
    final randomPart = UuidGenerator.v4().substring(0, 6).toUpperCase();
    return 'INV-$dateStr-$randomPart';
  }

  @override
  Future<SaleWithDetails> createSale({
    required String pharmacyId,
    required String soldById,
    String? patientId,
    required List<SaleCartItemInput> items,
    required SalePaymentInput payment,
    double taxRate = 0.0,
  }) async {
    if (items.isEmpty) {
      throw const ValidationException('The sales cart cannot be empty.');
    }

    double subtotal = 0.0;
    double totalDiscount = 0.0;
    for (final item in items) {
      if (item.quantity <= 0) {
        throw ValidationException(
          'Quantity ${item.medicineName} must be greater than 0.',
        );
      }
      subtotal += item.quantity * item.unitPrice;
      totalDiscount += item.discount;
    }

    final totalTax = (subtotal - totalDiscount) * taxRate;
    final grandTotal = (subtotal - totalDiscount) + totalTax;

    if (payment.amount < grandTotal) {
      throw ValidationException('Paid amount is less than the total bill.');
    }

    final invoiceNumber = _generateInvoiceNumber();
    final saleId = UuidGenerator.v4();

    return _db.transaction(() async {
      // 1. Eksekusi FEFO dan validasi stok per item
      final preparedItemBatches = <String, List<_AllocatedBatch>>{};

      for (final item in items) {
        final availableBatches = await _batchDao.getAvailableBatchesFEFO(
          pharmacyId,
          item.medicineId,
        );

        final totalAvailable = availableBatches.fold<double>(
          0.0,
          (sum, b) => sum + b.currentQuantity,
        );

        if (totalAvailable < item.quantity) {
          throw InsufficientStockException(
            'Insufficient stock for "${item.medicineName}". '
            'Available: $totalAvailable, requested: ${item.quantity}',
          );
        }

        // FEFO allocation logic
        double remainingToAllocate = item.quantity;
        final allocations = <_AllocatedBatch>[];

        for (final batch in availableBatches) {
          if (remainingToAllocate <= 0) break;

          final qtyFromThisBatch = batch.currentQuantity >= remainingToAllocate
              ? remainingToAllocate
              : batch.currentQuantity;

          allocations.add(
            _AllocatedBatch(batch: batch, quantity: qtyFromThisBatch),
          );

          remainingToAllocate -= qtyFromThisBatch;
        }

        preparedItemBatches[item.medicineId] = allocations;
      }

      // 2. Insert Sale header
      await _saleDao.insertSale(
        SalesCompanion(
          id: Value(saleId),
          pharmacyId: Value(pharmacyId),
          patientId: Value(patientId),
          soldById: Value(soldById),
          invoiceNumber: Value(invoiceNumber),
          subtotal: Value(subtotal),
          discount: Value(totalDiscount),
          tax: Value(totalTax),
          total: Value(grandTotal),
          status: const Value(SaleStatus.completed),
          saleDate: Value(DateTime.now()),
          createdAt: Value(DateTime.now()),
          updatedAt: Value(DateTime.now()),
        ),
      );

      // 3. Insert SaleItems and update Batches
      for (final item in items) {
        final saleItemId = UuidGenerator.v4();
        await _saleDao.insertSaleItem(
          SaleItemsCompanion(
            id: Value(saleItemId),
            saleId: Value(saleId),
            medicineId: Value(item.medicineId),
            quantity: Value(item.quantity),
            unitPrice: Value(item.unitPrice),
            discount: Value(item.discount),
            total: Value(item.total),
            createdAt: Value(DateTime.now()),
          ),
        );

        final allocations = preparedItemBatches[item.medicineId]!;
        for (final alloc in allocations) {
          // Record sale_item_batches
          await _db
              .into(_db.saleItemBatches)
              .insert(
                SaleItemBatchesCompanion(
                  id: Value(UuidGenerator.v4()),
                  saleItemId: Value(saleItemId),
                  batchId: Value(alloc.batch.id),
                  quantity: Value(alloc.quantity),
                  createdAt: Value(DateTime.now()),
                ),
              );

          // Update batch currentQuantity
          final newQty = alloc.batch.currentQuantity - alloc.quantity;
          await _batchDao.updateQuantity(alloc.batch.id, newQty);

          // Record inventory audit transaction (SALE mutasi keluar)
          await _inventoryDao.recordTransaction(
            InventoryTransactionsCompanion(
              id: Value(UuidGenerator.v4()),
              pharmacyId: Value(pharmacyId),
              medicineId: Value(item.medicineId),
              batchId: Value(alloc.batch.id),
              transactionType: const Value(InventoryTransactionType.sale),
              quantity: Value(-alloc.quantity),
              referenceType: const Value(ReferenceType.sale),
              referenceId: Value(saleId),
              reason: Value('Penjualan Kasir $invoiceNumber'),
              createdById: Value(soldById),
              createdAt: Value(DateTime.now()),
            ),
          );
        }
      }

      // 4. Insert Payment record
      await _saleDao.insertPayment(
        PaymentsCompanion(
          id: Value(UuidGenerator.v4()),
          saleId: Value(saleId),
          paymentMethod: Value(payment.method),
          amount: Value(payment.amount),
          status: const Value(PaymentStatus.completed),
          transactionReference: Value(payment.transactionReference),
          paidAt: Value(DateTime.now()),
          createdAt: Value(DateTime.now()),
        ),
      );

      final result = await _saleDao.getById(saleId);
      return result!;
    });
  }
}

class _AllocatedBatch {
  final Batche batch;
  final double quantity;

  const _AllocatedBatch({required this.batch, required this.quantity});
}
