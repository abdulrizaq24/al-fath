import 'package:drift/drift.dart' as drift;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pharmacy_flutter/core/errors/exceptions.dart';
import 'package:pharmacy_flutter/core/utils/uuid_generator.dart';
import 'package:pharmacy_flutter/data/daos/auth_dao.dart';
import 'package:pharmacy_flutter/data/daos/batch_dao.dart';
import 'package:pharmacy_flutter/data/daos/inventory_dao.dart';
import 'package:pharmacy_flutter/data/daos/sale_dao.dart';
import 'package:pharmacy_flutter/data/database/database.dart';
import 'package:pharmacy_flutter/domain/enums/app_enums.dart';
import 'package:pharmacy_flutter/services/sale_service.dart';

void main() {
  late AppDatabase db;
  late SaleDao saleDao;
  late BatchDao batchDao;
  late InventoryDao inventoryDao;
  late AuthDao authDao;
  late SaleService saleService;

  final pharmacyId = UuidGenerator.v4();
  final adminUserId = UuidGenerator.v4();
  final categoryId = UuidGenerator.v4();
  final medicineId = UuidGenerator.v4();

  setUp(() async {
    db = AppDatabase(NativeDatabase.memory());
    saleDao = SaleDao(db);
    batchDao = BatchDao(db);
    inventoryDao = InventoryDao(db);
    authDao = AuthDao(db);
    saleService = SaleService(db, saleDao, batchDao, inventoryDao);

    // Setup base pharmacy, user, category, medicine
    await authDao.insertPharmacy(
      PharmaciesCompanion(
        id: drift.Value(pharmacyId),
        name: const drift.Value('Apotek Sehat'),
      ),
    );

    final adminRole = await authDao.insertRole(
      RolesCompanion(
        id: drift.Value(UuidGenerator.v4()),
        name: const drift.Value(RoleName.admin),
      ),
    );

    await authDao.insertUser(
      UsersCompanion(
        id: drift.Value(adminUserId),
        pharmacyId: drift.Value(pharmacyId),
        roleId: drift.Value(adminRole.id),
        name: const drift.Value('Admin Kasir'),
        username: const drift.Value('admin'),
        passwordHash: const drift.Value('hash'),
      ),
    );

    await db.into(db.categories).insert(
          CategoriesCompanion(
            id: drift.Value(categoryId),
            pharmacyId: drift.Value(pharmacyId),
            name: const drift.Value('Analgesik'),
          ),
        );

    await db.into(db.medicines).insert(
          MedicinesCompanion(
            id: drift.Value(medicineId),
            pharmacyId: drift.Value(pharmacyId),
            categoryId: drift.Value(categoryId),
            name: const drift.Value('Paracetamol 500mg'),
            dosageForm: const drift.Value('Tablet'),
            baseUnit: const drift.Value('Strip'),
            sellingPrice: const drift.Value(10000.0),
          ),
        );
  });

  tearDown(() async {
    await db.close();
  });

  test('FEFO Allocation: selects earliest expiring batch first', () async {
    final now = DateTime.now();

    // Batch 1: Expire in 60 days, Qty = 10
    final batch1 = await batchDao.insert(
      BatchesCompanion(
        id: drift.Value(UuidGenerator.v4()),
        pharmacyId: drift.Value(pharmacyId),
        medicineId: drift.Value(medicineId),
        batchNumber: const drift.Value('BATCH-001'),
        expiryDate: drift.Value(now.add(const Duration(days: 60))),
        purchasePrice: const drift.Value(7000.0),
        receivedQuantity: const drift.Value(10.0),
        currentQuantity: const drift.Value(10.0),
      ),
    );

    // Batch 2: Expire in 15 days (Earlier!), Qty = 5
    final batch2 = await batchDao.insert(
      BatchesCompanion(
        id: drift.Value(UuidGenerator.v4()),
        pharmacyId: drift.Value(pharmacyId),
        medicineId: drift.Value(medicineId),
        batchNumber: const drift.Value('BATCH-002'),
        expiryDate: drift.Value(now.add(const Duration(days: 15))),
        purchasePrice: const drift.Value(6500.0),
        receivedQuantity: const drift.Value(5.0),
        currentQuantity: const drift.Value(5.0),
      ),
    );

    // Buy 8 items (should take 5 from Batch 2, and 3 from Batch 1)
    final saleResult = await saleService.createSale(
      pharmacyId: pharmacyId,
      soldById: adminUserId,
      items: [
        const SaleCartItemInput(
          medicineId: 'placeholder',
          medicineName: 'Paracetamol 500mg',
          quantity: 8.0,
          unitPrice: 10000.0,
        ),
      ].map((it) => SaleCartItemInput(
        medicineId: medicineId,
        medicineName: it.medicineName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      )).toList(),
      payment: const SalePaymentInput(
        method: PaymentMethod.cash,
        amount: 80000.0,
      ),
    );

    expect(saleResult.sale.total, 80000.0);
    expect(saleResult.items.first.allocatedBatches.length, 2);

    // Verify batch remaining quantities
    final updatedBatch2 = await batchDao.getById(batch2.id);
    expect(updatedBatch2!.currentQuantity, 0.0); // 5 - 5 = 0

    final updatedBatch1 = await batchDao.getById(batch1.id);
    expect(updatedBatch1!.currentQuantity, 7.0); // 10 - 3 = 7

    // Verify inventory transactions recorded
    final transactions = await inventoryDao.getTransactions(pharmacyId);
    expect(transactions.length, 2);
  });

  test('Insufficient stock throws InsufficientStockException', () async {
    final now = DateTime.now();

    await batchDao.insert(
      BatchesCompanion(
        id: drift.Value(UuidGenerator.v4()),
        pharmacyId: drift.Value(pharmacyId),
        medicineId: drift.Value(medicineId),
        batchNumber: const drift.Value('BATCH-001'),
        expiryDate: drift.Value(now.add(const Duration(days: 60))),
        purchasePrice: const drift.Value(7000.0),
        receivedQuantity: const drift.Value(5.0),
        currentQuantity: const drift.Value(5.0),
      ),
    );

    // Attempt to buy 10 items when only 5 are in stock
    expect(
      () => saleService.createSale(
        pharmacyId: pharmacyId,
        soldById: adminUserId,
        items: [
          SaleCartItemInput(
            medicineId: medicineId,
            medicineName: 'Paracetamol 500mg',
            quantity: 10.0,
            unitPrice: 10000.0,
          ),
        ],
        payment: const SalePaymentInput(
          method: PaymentMethod.cash,
          amount: 100000.0,
        ),
      ),
      throwsA(isA<InsufficientStockException>()),
    );
  });
}
