import 'package:drift/drift.dart' as drift;
import 'package:drift/native.dart';
import 'package:pharmacy_flutter/data/database/database.dart';
import 'package:pharmacy_flutter/domain/enums/app_enums.dart';

/// Deterministic, synthetic version-1 data for disposable migration tests.
/// Every database returned here uses NativeDatabase.memory(); this helper never
/// calls AppDatabase() and never creates a file-backed database.
class Version1Fixture {
  Version1Fixture._(this.db, this.ids);

  final AppDatabase db;
  final Map<String, String> ids;
  static final fixedNow = DateTime.utc(2025, 1, 15, 12);
  static final today = DateTime(2025, 1, 15);
  static final future = DateTime(2025, 2, 15);

  static Future<Version1Fixture> create() async {
    final db = AppDatabase(NativeDatabase.memory());
    final ids = <String, String>{
      'pharmacy': 'fixture-pharmacy',
      'role': 'fixture-role-admin',
      'user': 'fixture-user-admin',
      'category': 'fixture-category',
      'medicine': 'fixture-medicine',
      'package': 'fixture-package',
      'supplier': 'fixture-supplier',
      'batchToday': 'fixture-batch-today',
      'batchFuture': 'fixture-batch-future',
      'purchase': 'fixture-purchase',
      'purchaseItem': 'fixture-purchase-item',
      'receipt': 'fixture-receipt',
      'receiptItem': 'fixture-receipt-item',
      'patient': 'fixture-patient',
      'prescription': 'fixture-prescription',
      'prescriptionItem': 'fixture-prescription-item',
      'sale': 'fixture-sale',
      'saleItem': 'fixture-sale-item',
      'saleBatch': 'fixture-sale-batch',
      'payment': 'fixture-payment',
      'inventory': 'fixture-inventory',
      'audit': 'fixture-audit',
    };

    try {
      await db.into(db.pharmacies).insert(PharmaciesCompanion(
        id: drift.Value(ids['pharmacy']!), name: const drift.Value('Fixture Pharmacy'),
        timezone: const drift.Value('Africa/Khartoum'),
        createdAt: drift.Value(fixedNow), updatedAt: drift.Value(fixedNow),
      ));
      await db.into(db.roles).insert(RolesCompanion(
        id: drift.Value(ids['role']!), name: const drift.Value(RoleName.admin),
        createdAt: drift.Value(fixedNow), updatedAt: drift.Value(fixedNow),
      ));
      await db.into(db.users).insert(UsersCompanion(
        id: drift.Value(ids['user']!), pharmacyId: drift.Value(ids['pharmacy']!),
        roleId: drift.Value(ids['role']!), name: const drift.Value('Fixture Admin'),
        username: const drift.Value('fixture-admin'), passwordHash: const drift.Value('synthetic'),
        createdAt: drift.Value(fixedNow), updatedAt: drift.Value(fixedNow),
      ));
      await db.into(db.categories).insert(CategoriesCompanion(
        id: drift.Value(ids['category']!), pharmacyId: drift.Value(ids['pharmacy']!),
        name: const drift.Value('Fixture Category'), createdAt: drift.Value(fixedNow), updatedAt: drift.Value(fixedNow),
      ));
      await db.into(db.medicines).insert(MedicinesCompanion(
        id: drift.Value(ids['medicine']!), pharmacyId: drift.Value(ids['pharmacy']!), categoryId: drift.Value(ids['category']!),
        name: const drift.Value('Fixture Medicine'), dosageForm: const drift.Value('Tablet'), baseUnit: const drift.Value('unit'),
        sellingPrice: const drift.Value(10.50), reorderLevel: const drift.Value(1.000),
        createdAt: drift.Value(fixedNow), updatedAt: drift.Value(fixedNow),
      ));
      await db.into(db.medicinePackages).insert(MedicinePackagesCompanion(
        id: drift.Value(ids['package']!), medicineId: drift.Value(ids['medicine']!), name: const drift.Value('Box'),
        quantityInBaseUnits: const drift.Value(10.000), isDefault: const drift.Value(true),
        createdAt: drift.Value(fixedNow), updatedAt: drift.Value(fixedNow),
      ));
      await db.into(db.suppliers).insert(SuppliersCompanion(
        id: drift.Value(ids['supplier']!), pharmacyId: drift.Value(ids['pharmacy']!), name: const drift.Value('Fixture Supplier'),
        createdAt: drift.Value(fixedNow), updatedAt: drift.Value(fixedNow),
      ));
      for (final entry in [
        (ids['batchToday']!, today),
        (ids['batchFuture']!, future),
      ]) {
        await db.into(db.batches).insert(BatchesCompanion(
          id: drift.Value(entry.$1), pharmacyId: drift.Value(ids['pharmacy']!), medicineId: drift.Value(ids['medicine']!),
          batchNumber: drift.Value(entry.$1), expiryDate: drift.Value(entry.$2), purchasePrice: const drift.Value(8.25),
          receivedQuantity: const drift.Value(20.000), currentQuantity: const drift.Value(15.000),
          receivedAt: drift.Value(fixedNow), createdAt: drift.Value(fixedNow), updatedAt: drift.Value(fixedNow),
        ));
      }
      await db.into(db.purchases).insert(PurchasesCompanion(
        id: drift.Value(ids['purchase']!), pharmacyId: drift.Value(ids['pharmacy']!), supplierId: drift.Value(ids['supplier']!),
        createdById: drift.Value(ids['user']!), purchaseNumber: const drift.Value('FIX-P-001'), status: const drift.Value(PurchaseStatus.received),
        purchaseDate: drift.Value(fixedNow), totalAmount: const drift.Value(82.50), createdAt: drift.Value(fixedNow), updatedAt: drift.Value(fixedNow),
      ));
      await db.into(db.purchaseItems).insert(PurchaseItemsCompanion(
        id: drift.Value(ids['purchaseItem']!), purchaseId: drift.Value(ids['purchase']!), medicineId: drift.Value(ids['medicine']!),
        orderedQuantity: const drift.Value(10.000), unitCost: const drift.Value(8.25), totalCost: const drift.Value(82.50),
        createdAt: drift.Value(fixedNow), updatedAt: drift.Value(fixedNow),
      ));
      await db.into(db.purchaseReceipts).insert(PurchaseReceiptsCompanion(
        id: drift.Value(ids['receipt']!), pharmacyId: drift.Value(ids['pharmacy']!), purchaseId: drift.Value(ids['purchase']!),
        createdById: drift.Value(ids['user']!), receiptNumber: const drift.Value('FIX-R-001'), receivedAt: drift.Value(fixedNow), createdAt: drift.Value(fixedNow),
      ));
      await db.into(db.purchaseReceiptItems).insert(PurchaseReceiptItemsCompanion(
        id: drift.Value(ids['receiptItem']!), receiptId: drift.Value(ids['receipt']!), purchaseItemId: drift.Value(ids['purchaseItem']!),
        batchId: drift.Value(ids['batchFuture']!), quantityReceived: const drift.Value(10.000), unitCost: const drift.Value(8.25), createdAt: drift.Value(fixedNow),
      ));
      await db.into(db.patients).insert(PatientsCompanion(
        id: drift.Value(ids['patient']!), pharmacyId: drift.Value(ids['pharmacy']!), patientNumber: const drift.Value('FIX-PT-001'),
        firstName: const drift.Value('Synthetic'), lastName: const drift.Value('Patient'), createdAt: drift.Value(fixedNow), updatedAt: drift.Value(fixedNow),
      ));
      await db.into(db.prescriptions).insert(PrescriptionsCompanion(
        id: drift.Value(ids['prescription']!), pharmacyId: drift.Value(ids['pharmacy']!), patientId: drift.Value(ids['patient']!), createdById: drift.Value(ids['user']!),
        prescriptionNumber: const drift.Value('FIX-RX-001'), prescriberName: const drift.Value('Synthetic Doctor'), prescriptionDate: drift.Value(fixedNow),
        status: const drift.Value(PrescriptionStatus.pending), createdAt: drift.Value(fixedNow), updatedAt: drift.Value(fixedNow),
      ));
      await db.into(db.prescriptionItems).insert(PrescriptionItemsCompanion(
        id: drift.Value(ids['prescriptionItem']!), prescriptionId: drift.Value(ids['prescription']!), medicineId: drift.Value(ids['medicine']!),
        quantityPrescribed: const drift.Value(2.000), quantityDispensed: const drift.Value(0.000), createdAt: drift.Value(fixedNow), updatedAt: drift.Value(fixedNow),
      ));
      await db.into(db.sales).insert(SalesCompanion(
        id: drift.Value(ids['sale']!), pharmacyId: drift.Value(ids['pharmacy']!), patientId: drift.Value(ids['patient']!), soldById: drift.Value(ids['user']!),
        invoiceNumber: const drift.Value('FIX-S-001'), subtotal: const drift.Value(21.00), discount: const drift.Value(0.00), tax: const drift.Value(0.00), total: const drift.Value(21.00),
        status: const drift.Value(SaleStatus.completed), saleDate: drift.Value(fixedNow), createdAt: drift.Value(fixedNow), updatedAt: drift.Value(fixedNow),
      ));
      await db.into(db.saleItems).insert(SaleItemsCompanion(
        id: drift.Value(ids['saleItem']!), saleId: drift.Value(ids['sale']!), medicineId: drift.Value(ids['medicine']!), quantity: const drift.Value(2.000), unitPrice: const drift.Value(10.50), total: const drift.Value(21.00), createdAt: drift.Value(fixedNow),
      ));
      await db.into(db.saleItemBatches).insert(SaleItemBatchesCompanion(
        id: drift.Value(ids['saleBatch']!), saleItemId: drift.Value(ids['saleItem']!), batchId: drift.Value(ids['batchFuture']!), quantity: const drift.Value(2.000), createdAt: drift.Value(fixedNow),
      ));
      await db.into(db.payments).insert(PaymentsCompanion(
        id: drift.Value(ids['payment']!), saleId: drift.Value(ids['sale']!), paymentMethod: const drift.Value(PaymentMethod.cash), amount: const drift.Value(21.00),
        status: const drift.Value(PaymentStatus.completed), paidAt: drift.Value(fixedNow), createdAt: drift.Value(fixedNow),
      ));
      await db.into(db.inventoryTransactions).insert(InventoryTransactionsCompanion(
        id: drift.Value(ids['inventory']!), pharmacyId: drift.Value(ids['pharmacy']!), medicineId: drift.Value(ids['medicine']!), batchId: drift.Value(ids['batchFuture']!),
        transactionType: const drift.Value(InventoryTransactionType.sale), quantity: const drift.Value(-2.000), referenceType: const drift.Value(ReferenceType.sale), referenceId: drift.Value(ids['sale']!), createdById: drift.Value(ids['user']!), createdAt: drift.Value(fixedNow),
      ));
      await db.into(db.auditLogs).insert(AuditLogsCompanion(
        id: drift.Value(ids['audit']!), pharmacyId: drift.Value(ids['pharmacy']!), userId: drift.Value(ids['user']!), action: const drift.Value('CREATE'), entityType: const drift.Value('Sale'), entityId: drift.Value(ids['sale']!), oldValues: const drift.Value('{}'), newValues: const drift.Value('{}'), createdAt: drift.Value(fixedNow),
      ));
      return Version1Fixture._(db, ids);
    } catch (_) {
      await db.close();
      rethrow;
    }
  }

  Future<void> close() => db.close();
}
