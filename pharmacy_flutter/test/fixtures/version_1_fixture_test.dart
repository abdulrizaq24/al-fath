import 'package:drift/drift.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pharmacy_flutter/data/database/database.dart';
import 'package:pharmacy_flutter/domain/enums/app_enums.dart';

import 'version_1_fixture.dart';

void main() {
  group('Version 1 Disposable Fixture Foundation', () {
    test('opens in-memory database with schema version 1 and 21 tables', () async {
      final fixture = await Version1Fixture.create();
      try {
        expect(fixture.db.schemaVersion, 1);
        expect(fixture.db.allTables.length, 21);

        final tableNames = fixture.db.allTables.map((t) => t.actualTableName).toSet();
        const expectedTables = {
          'pharmacies',
          'roles',
          'users',
          'categories',
          'medicines',
          'medicine_packages',
          'batches',
          'suppliers',
          'purchases',
          'purchase_items',
          'purchase_receipts',
          'purchase_receipt_items',
          'patients',
          'prescriptions',
          'prescription_items',
          'sales',
          'sale_items',
          'sale_item_batches',
          'payments',
          'inventory_transactions',
          'audit_logs',
        };
        expect(tableNames, expectedTables);
      } finally {
        await fixture.close();
      }
    });

    test('populates every table with deterministic synthetic version 1 records', () async {
      final fixture = await Version1Fixture.create();
      try {
        // Master / identity tables
        final pharmacy = await (fixture.db.select(fixture.db.pharmacies)..where((t) => t.id.equals(fixture.ids['pharmacy']!))).getSingle();
        expect(pharmacy.name, 'Fixture Pharmacy');

        final role = await (fixture.db.select(fixture.db.roles)..where((t) => t.id.equals(fixture.ids['role']!))).getSingle();
        expect(role.name, RoleName.admin);

        final user = await (fixture.db.select(fixture.db.users)..where((t) => t.id.equals(fixture.ids['user']!))).getSingle();
        expect(user.pharmacyId, pharmacy.id);
        expect(user.roleId, role.id);

        final category = await (fixture.db.select(fixture.db.categories)..where((t) => t.id.equals(fixture.ids['category']!))).getSingle();
        expect(category.pharmacyId, pharmacy.id);

        final medicine = await (fixture.db.select(fixture.db.medicines)..where((t) => t.id.equals(fixture.ids['medicine']!))).getSingle();
        expect(medicine.sellingPrice, 10.50);
        expect(medicine.reorderLevel, 1.000);

        final package = await (fixture.db.select(fixture.db.medicinePackages)..where((t) => t.id.equals(fixture.ids['package']!))).getSingle();
        expect(package.medicineId, medicine.id);
        expect(package.quantityInBaseUnits, 10.000);

        final supplier = await (fixture.db.select(fixture.db.suppliers)..where((t) => t.id.equals(fixture.ids['supplier']!))).getSingle();
        expect(supplier.pharmacyId, pharmacy.id);

        // Batches with controlled calendar assumptions
        final batchToday = await (fixture.db.select(fixture.db.batches)..where((t) => t.id.equals(fixture.ids['batchToday']!))).getSingle();
        expect(batchToday.expiryDate, Version1Fixture.today);
        expect(batchToday.purchasePrice, 8.25);
        expect(batchToday.currentQuantity, 15.000);

        final batchFuture = await (fixture.db.select(fixture.db.batches)..where((t) => t.id.equals(fixture.ids['batchFuture']!))).getSingle();
        expect(batchFuture.expiryDate, Version1Fixture.future);

        // Purchases & Receipts
        final purchase = await (fixture.db.select(fixture.db.purchases)..where((t) => t.id.equals(fixture.ids['purchase']!))).getSingle();
        expect(purchase.createdById, user.id);
        expect(purchase.totalAmount, 82.50);

        final purchaseItem = await (fixture.db.select(fixture.db.purchaseItems)..where((t) => t.id.equals(fixture.ids['purchaseItem']!))).getSingle();
        expect(purchaseItem.orderedQuantity, 10.000);
        expect(purchaseItem.totalCost, 82.50);

        final receipt = await (fixture.db.select(fixture.db.purchaseReceipts)..where((t) => t.id.equals(fixture.ids['receipt']!))).getSingle();
        expect(receipt.purchaseId, purchase.id);

        final receiptItem = await (fixture.db.select(fixture.db.purchaseReceiptItems)..where((t) => t.id.equals(fixture.ids['receiptItem']!))).getSingle();
        expect(receiptItem.quantityReceived, 10.000);
        expect(receiptItem.batchId, batchFuture.id);

        // Patients & Prescriptions
        final patient = await (fixture.db.select(fixture.db.patients)..where((t) => t.id.equals(fixture.ids['patient']!))).getSingle();
        expect(patient.pharmacyId, pharmacy.id);

        final prescription = await (fixture.db.select(fixture.db.prescriptions)..where((t) => t.id.equals(fixture.ids['prescription']!))).getSingle();
        expect(prescription.patientId, patient.id);
        expect(prescription.createdById, user.id);

        final prescriptionItem = await (fixture.db.select(fixture.db.prescriptionItems)..where((t) => t.id.equals(fixture.ids['prescriptionItem']!))).getSingle();
        expect(prescriptionItem.prescriptionId, prescription.id);
        expect(prescriptionItem.quantityPrescribed, 2.000);

        // Sales, Line Items, Batch Allocations, Payments
        final sale = await (fixture.db.select(fixture.db.sales)..where((t) => t.id.equals(fixture.ids['sale']!))).getSingle();
        expect(sale.patientId, patient.id);
        expect(sale.soldById, user.id);
        expect(sale.total, 21.00);

        final saleItem = await (fixture.db.select(fixture.db.saleItems)..where((t) => t.id.equals(fixture.ids['saleItem']!))).getSingle();
        expect(saleItem.saleId, sale.id);
        expect(saleItem.total, 21.00);

        final saleBatch = await (fixture.db.select(fixture.db.saleItemBatches)..where((t) => t.id.equals(fixture.ids['saleBatch']!))).getSingle();
        expect(saleBatch.saleItemId, saleItem.id);
        expect(saleBatch.batchId, batchFuture.id);
        expect(saleBatch.quantity, 2.000);

        final payment = await (fixture.db.select(fixture.db.payments)..where((t) => t.id.equals(fixture.ids['payment']!))).getSingle();
        expect(payment.saleId, sale.id);
        expect(payment.amount, 21.00);

        // Inventory Transactions & Audit Logs
        final invTx = await (fixture.db.select(fixture.db.inventoryTransactions)..where((t) => t.id.equals(fixture.ids['inventory']!))).getSingle();
        expect(invTx.batchId, batchFuture.id);
        expect(invTx.quantity, -2.000);
        expect(invTx.createdById, user.id);

        final audit = await (fixture.db.select(fixture.db.auditLogs)..where((t) => t.id.equals(fixture.ids['audit']!))).getSingle();
        expect(audit.userId, user.id);
        expect(audit.entityId, sale.id);
      } finally {
        await fixture.close();
      }
    });

    test('verifies foreign key enforcement is active in SQLite', () async {
      final fixture = await Version1Fixture.create();
      try {
        final pragmaResult = await fixture.db.customSelect('PRAGMA foreign_keys;').getSingle();
        expect(pragmaResult.read<int>('foreign_keys'), 1);

        // Attempting to insert a child with non-existent parent must be rejected
        expect(
          () => fixture.db.into(fixture.db.users).insert(
                UsersCompanion(
                  id: const Value('orphan-user'),
                  pharmacyId: const Value('non-existent-pharmacy'),
                  roleId: Value(fixture.ids['role']!),
                  name: const Value('Orphan User'),
                  username: const Value('orphan'),
                  passwordHash: const Value('hash'),
                ),
              ),
          throwsException,
        );
      } finally {
        await fixture.close();
      }
    });

    test('ensures isolation and no data leakage across successive fixture creations', () async {
      final fixture1 = await Version1Fixture.create();
      await fixture1.close();

      final fixture2 = await Version1Fixture.create();
      try {
        final pharmacyCount = await fixture2.db.pharmacies.count().getSingle();
        expect(pharmacyCount, 1);
        final salesCount = await fixture2.db.sales.count().getSingle();
        expect(salesCount, 1);
      } finally {
        await fixture2.close();
      }
    });
  });
}
