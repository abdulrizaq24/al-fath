import 'package:drift/drift.dart' as drift;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pharmacy_flutter/core/utils/uuid_generator.dart';
import 'package:pharmacy_flutter/data/daos/auth_dao.dart';
import 'package:pharmacy_flutter/data/daos/batch_dao.dart';
import 'package:pharmacy_flutter/data/daos/inventory_dao.dart';
import 'package:pharmacy_flutter/data/daos/purchase_dao.dart';
import 'package:pharmacy_flutter/data/daos/supplier_dao.dart';
import 'package:pharmacy_flutter/data/database/database.dart';
import 'package:pharmacy_flutter/domain/enums/app_enums.dart';
import 'package:pharmacy_flutter/services/purchase_service.dart';

void main() {
  late AppDatabase db;
  late PurchaseDao purchaseDao;
  late BatchDao batchDao;
  late InventoryDao inventoryDao;
  late SupplierDao supplierDao;
  late AuthDao authDao;
  late PurchaseService purchaseService;

  final pharmacyId = UuidGenerator.v4();
  final adminUserId = UuidGenerator.v4();
  final supplierId = UuidGenerator.v4();
  final categoryId = UuidGenerator.v4();
  final medicineId = UuidGenerator.v4();

  setUp(() async {
    db = AppDatabase(NativeDatabase.memory());
    purchaseDao = PurchaseDao(db);
    batchDao = BatchDao(db);
    inventoryDao = InventoryDao(db);
    supplierDao = SupplierDao(db);
    authDao = AuthDao(db);
    purchaseService = PurchaseService(db, purchaseDao, batchDao, inventoryDao);

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
        name: const drift.Value('Admin Pengadaan'),
        username: const drift.Value('admin'),
        passwordHash: const drift.Value('hash'),
      ),
    );

    await supplierDao.insert(
      SuppliersCompanion(
        id: drift.Value(supplierId),
        pharmacyId: drift.Value(pharmacyId),
        name: const drift.Value('PT Kimia Farma Trading'),
      ),
    );

    await db.into(db.categories).insert(
          CategoriesCompanion(
            id: drift.Value(categoryId),
            pharmacyId: drift.Value(pharmacyId),
            name: const drift.Value('Antibiotik'),
          ),
        );

    await db.into(db.medicines).insert(
          MedicinesCompanion(
            id: drift.Value(medicineId),
            pharmacyId: drift.Value(pharmacyId),
            categoryId: drift.Value(categoryId),
            name: const drift.Value('Amoxicillin 500mg'),
            dosageForm: const drift.Value('Kapsul'),
            baseUnit: const drift.Value('Strip'),
            sellingPrice: const drift.Value(15000.0),
          ),
        );
  });

  tearDown(() async {
    await db.close();
  });

  test('Purchase Workflow: Create PO -> Receive Goods -> Batch & Stock update', () async {
    // 1. Create Purchase Order
    final po = await purchaseService.createPurchaseOrder(
      pharmacyId: pharmacyId,
      supplierId: supplierId,
      createdById: adminUserId,
      items: [
        CreatePurchaseItemInput(
          medicineId: medicineId,
          orderedQuantity: 20.0,
          unitCost: 10000.0,
        ),
      ],
    );

    expect(po.purchase.status, PurchaseStatus.ordered);
    expect(po.purchase.totalAmount, 200000.0);
    expect(po.items.length, 1);

    // 2. Receive Goods partial (10 units)
    final poItemId = po.items.first.item.id;
    await purchaseService.receiveGoods(
      purchaseId: po.purchase.id,
      pharmacyId: pharmacyId,
      receiptNumber: 'SJ-2026-001',
      receivedById: adminUserId,
      items: [
        ReceiveItemInput(
          purchaseItemId: poItemId,
          medicineId: medicineId,
          batchNumber: 'AMX-001',
          expiryDate: DateTime.now().add(const Duration(days: 365)),
          quantityReceived: 10.0,
          unitCost: 10000.0,
        ),
      ],
    );

    // PO Status should now be PARTIALLY_RECEIVED
    final poAfterPartial = await purchaseDao.getById(po.purchase.id);
    expect(poAfterPartial!.purchase.status, PurchaseStatus.partiallyReceived);

    // Batch should exist with quantity 10
    final batches = await batchDao.getBatchesForMedicine(pharmacyId, medicineId);
    expect(batches.length, 1);
    expect(batches.first.batchNumber, 'AMX-001');
    expect(batches.first.currentQuantity, 10.0);

    // 3. Receive remaining 10 units
    await purchaseService.receiveGoods(
      purchaseId: po.purchase.id,
      pharmacyId: pharmacyId,
      receiptNumber: 'SJ-2026-002',
      receivedById: adminUserId,
      items: [
        ReceiveItemInput(
          purchaseItemId: poItemId,
          medicineId: medicineId,
          batchNumber: 'AMX-001',
          expiryDate: DateTime.now().add(const Duration(days: 365)),
          quantityReceived: 10.0,
          unitCost: 10000.0,
        ),
      ],
    );

    // PO Status should now be RECEIVED (fully completed)
    final poAfterComplete = await purchaseDao.getById(po.purchase.id);
    expect(poAfterComplete!.purchase.status, PurchaseStatus.received);

    // Batch currentQuantity should be 20
    final updatedBatch = await batchDao.getById(batches.first.id);
    expect(updatedBatch!.currentQuantity, 20.0);
  });
}
