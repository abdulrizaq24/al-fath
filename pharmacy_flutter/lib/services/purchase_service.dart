import 'package:drift/drift.dart';
import 'package:intl/intl.dart';

import '../core/errors/exceptions.dart';
import '../core/utils/uuid_generator.dart';
import '../data/daos/batch_dao.dart';
import '../data/daos/inventory_dao.dart';
import '../data/daos/purchase_dao.dart';
import '../data/database/database.dart';
import '../domain/enums/app_enums.dart';

class CreatePurchaseItemInput {
  final String medicineId;
  final double orderedQuantity;
  final double unitCost;

  const CreatePurchaseItemInput({
    required this.medicineId,
    required this.orderedQuantity,
    required this.unitCost,
  });

  double get totalCost => orderedQuantity * unitCost;
}

class ReceiveItemInput {
  final String purchaseItemId;
  final String medicineId;
  final String batchNumber;
  final DateTime expiryDate;
  final double quantityReceived;
  final double unitCost;

  const ReceiveItemInput({
    required this.purchaseItemId,
    required this.medicineId,
    required this.batchNumber,
    required this.expiryDate,
    required this.quantityReceived,
    required this.unitCost,
  });
}

abstract class IPurchaseService {
  Future<PurchaseWithDetails> createPurchaseOrder({
    required String pharmacyId,
    required String supplierId,
    required String createdById,
    required List<CreatePurchaseItemInput> items,
    DateTime? expectedDate,
    String? notes,
  });

  Future<void> receiveGoods({
    required String purchaseId,
    required String pharmacyId,
    required String receiptNumber,
    required String receivedById,
    required List<ReceiveItemInput> items,
    String? notes,
  });
}

class PurchaseService implements IPurchaseService {
  final AppDatabase _db;
  final IPurchaseDao _purchaseDao;
  final IBatchDao _batchDao;
  final IInventoryDao _inventoryDao;

  const PurchaseService(
    this._db,
    this._purchaseDao,
    this._batchDao,
    this._inventoryDao,
  );

  String _generatePoNumber() {
    final now = DateTime.now();
    final dateStr = DateFormat('yyyyMMdd').format(now);
    final randomPart = UuidGenerator.v4().substring(0, 5).toUpperCase();
    return 'PO-$dateStr-$randomPart';
  }

  @override
  Future<PurchaseWithDetails> createPurchaseOrder({
    required String pharmacyId,
    required String supplierId,
    required String createdById,
    required List<CreatePurchaseItemInput> items,
    DateTime? expectedDate,
    String? notes,
  }) async {
    if (items.isEmpty) {
      throw const ValidationException('The purchase order cannot be empty.');
    }

    double totalAmount = 0.0;
    for (final item in items) {
      if (item.orderedQuantity <= 0) {
        throw const ValidationException(
          'Ordered quantity must be greater than 0.',
        );
      }
      totalAmount += item.totalCost;
    }

    final purchaseId = UuidGenerator.v4();
    final poNumber = _generatePoNumber();

    return _db.transaction(() async {
      await _purchaseDao.insertPurchase(
        PurchasesCompanion(
          id: Value(purchaseId),
          pharmacyId: Value(pharmacyId),
          supplierId: Value(supplierId),
          createdById: Value(createdById),
          purchaseNumber: Value(poNumber),
          status: const Value(PurchaseStatus.ordered),
          purchaseDate: Value(DateTime.now()),
          expectedDate: Value(expectedDate),
          totalAmount: Value(totalAmount),
          notes: Value(notes),
          createdAt: Value(DateTime.now()),
          updatedAt: Value(DateTime.now()),
        ),
      );

      final companions = items.map((i) {
        return PurchaseItemsCompanion(
          id: Value(UuidGenerator.v4()),
          purchaseId: Value(purchaseId),
          medicineId: Value(i.medicineId),
          orderedQuantity: Value(i.orderedQuantity),
          unitCost: Value(i.unitCost),
          totalCost: Value(i.totalCost),
          createdAt: Value(DateTime.now()),
          updatedAt: Value(DateTime.now()),
        );
      }).toList();

      await _purchaseDao.insertPurchaseItems(companions);

      final result = await _purchaseDao.getById(purchaseId);
      return result!;
    });
  }

  @override
  Future<void> receiveGoods({
    required String purchaseId,
    required String pharmacyId,
    required String receiptNumber,
    required String receivedById,
    required List<ReceiveItemInput> items,
    String? notes,
  }) async {
    if (items.isEmpty) {
      throw const ValidationException(
        'The received goods list cannot be empty.',
      );
    }

    final purchase = await _purchaseDao.getById(purchaseId);
    if (purchase == null) {
      throw const NotFoundException('Purchase order not found.');
    }

    if (purchase.purchase.status == PurchaseStatus.received ||
        purchase.purchase.status == PurchaseStatus.cancelled) {
      throw BusinessLogicException(
        'Purchase order with status ${purchase.purchase.status.name} cannot receive goods.',
      );
    }

    final existingReceipts = await _purchaseDao.getReceiptItemsForPurchase(
      purchaseId,
    );

    // Hitung total yang sudah diterima per item sebelumnya
    final receivedTotals = <String, double>{};
    for (final rItem in existingReceipts) {
      receivedTotals[rItem.purchaseItemId] =
          (receivedTotals[rItem.purchaseItemId] ?? 0.0) +
          rItem.quantityReceived;
    }

    await _db.transaction(() async {
      final receiptId = UuidGenerator.v4();
      await _purchaseDao.insertReceipt(
        PurchaseReceiptsCompanion(
          id: Value(receiptId),
          pharmacyId: Value(pharmacyId),
          purchaseId: Value(purchaseId),
          createdById: Value(receivedById),
          receiptNumber: Value(receiptNumber.trim()),
          receivedAt: Value(DateTime.now()),
          notes: Value(notes?.trim()),
          createdAt: Value(DateTime.now()),
        ),
      );

      final receiptItemCompanions = <PurchaseReceiptItemsCompanion>[];

      for (final recItem in items) {
        if (recItem.quantityReceived <= 0) continue;

        // Validasi tidak melebihi pesanan
        final poItem = purchase.items.firstWhere(
          (it) => it.item.id == recItem.purchaseItemId,
        );
        final alreadyReceived = receivedTotals[recItem.purchaseItemId] ?? 0.0;
        final totalAfterThis = alreadyReceived + recItem.quantityReceived;

        if (totalAfterThis > poItem.item.orderedQuantity) {
          throw ValidationException(
            'Received quantity exceeds the remaining order quantity for ${poItem.medicine.name}.',
          );
        }
        receivedTotals[recItem.purchaseItemId] = totalAfterThis;

        // Cari atau buat Batch
        final existingBatch =
            await (_db.select(_db.batches)..where(
                  (tbl) =>
                      tbl.pharmacyId.equals(pharmacyId) &
                      tbl.medicineId.equals(recItem.medicineId) &
                      tbl.batchNumber.equals(recItem.batchNumber.trim()),
                ))
                .getSingleOrNull();

        String batchId;
        if (existingBatch != null) {
          batchId = existingBatch.id;
          final newQty =
              existingBatch.currentQuantity + recItem.quantityReceived;
          final newRecQty =
              existingBatch.receivedQuantity + recItem.quantityReceived;
          await (_db.update(
            _db.batches,
          )..where((tbl) => tbl.id.equals(batchId))).write(
            BatchesCompanion(
              currentQuantity: Value(newQty),
              receivedQuantity: Value(newRecQty),
              updatedAt: Value(DateTime.now()),
            ),
          );
        } else {
          batchId = UuidGenerator.v4();
          await _batchDao.insert(
            BatchesCompanion(
              id: Value(batchId),
              pharmacyId: Value(pharmacyId),
              medicineId: Value(recItem.medicineId),
              batchNumber: Value(recItem.batchNumber.trim()),
              expiryDate: Value(recItem.expiryDate),
              purchasePrice: Value(recItem.unitCost),
              receivedQuantity: Value(recItem.quantityReceived),
              currentQuantity: Value(recItem.quantityReceived),
              receivedAt: Value(DateTime.now()),
              createdAt: Value(DateTime.now()),
              updatedAt: Value(DateTime.now()),
            ),
          );
        }

        receiptItemCompanions.add(
          PurchaseReceiptItemsCompanion(
            id: Value(UuidGenerator.v4()),
            receiptId: Value(receiptId),
            purchaseItemId: Value(recItem.purchaseItemId),
            batchId: Value(batchId),
            quantityReceived: Value(recItem.quantityReceived),
            unitCost: Value(recItem.unitCost),
            createdAt: Value(DateTime.now()),
          ),
        );

        // Record audit InventoryTransaction (PURCHASE mutasi masuk)
        await _inventoryDao.recordTransaction(
          InventoryTransactionsCompanion(
            id: Value(UuidGenerator.v4()),
            pharmacyId: Value(pharmacyId),
            medicineId: Value(recItem.medicineId),
            batchId: Value(batchId),
            transactionType: const Value(InventoryTransactionType.purchase),
            quantity: Value(recItem.quantityReceived),
            referenceType: const Value(ReferenceType.purchaseReceipt),
            referenceId: Value(receiptId),
            reason: Value('Penerimaan PO ${purchase.purchase.purchaseNumber}'),
            createdById: Value(receivedById),
            createdAt: Value(DateTime.now()),
          ),
        );
      }

      await _purchaseDao.insertReceiptItems(receiptItemCompanions);

      // Cek apakah seluruh item di PO sudah lengkap diterima
      bool isAllCompleted = true;
      for (final poItem in purchase.items) {
        final totalRec = receivedTotals[poItem.item.id] ?? 0.0;
        if (totalRec < poItem.item.orderedQuantity) {
          isAllCompleted = false;
          break;
        }
      }

      final nextStatus = isAllCompleted
          ? PurchaseStatus.received
          : PurchaseStatus.partiallyReceived;

      await _purchaseDao.updateStatus(purchaseId, nextStatus);
    });
  }
}
