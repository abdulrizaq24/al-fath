import 'package:drift/drift.dart';

import '../../domain/enums/app_enums.dart';
import 'connection.dart';
import 'tables/audit_logs.dart';
import 'tables/batches.dart';
import 'tables/categories.dart';
import 'tables/inventory_transactions.dart';
import 'tables/medicine_packages.dart';
import 'tables/medicines.dart';
import 'tables/patients.dart';
import 'tables/payments.dart';
import 'tables/pharmacies.dart';
import 'tables/prescription_items.dart';
import 'tables/prescriptions.dart';
import 'tables/purchase_items.dart';
import 'tables/purchase_receipt_items.dart';
import 'tables/purchase_receipts.dart';
import 'tables/purchases.dart';
import 'tables/roles.dart';
import 'tables/sale_item_batches.dart';
import 'tables/sale_idempotency.dart';
import 'tables/sale_items.dart';
import 'tables/sales.dart';
import 'tables/suppliers.dart';
import 'tables/users.dart';

part 'database.g.dart';

@DriftDatabase(
  tables: [
    Pharmacies,
    Roles,
    Users,
    Categories,
    Medicines,
    MedicinePackages,
    Batches,
    Suppliers,
    Purchases,
    PurchaseItems,
    PurchaseReceipts,
    PurchaseReceiptItems,
    Patients,
    Prescriptions,
    PrescriptionItems,
    Sales,
    SaleItems,
    SaleItemBatches,
    SaleIdempotency,
    Payments,
    InventoryTransactions,
    AuditLogs,
  ],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase([QueryExecutor? executor]) : super(executor ?? openConnection());

  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration => MigrationStrategy(
    onCreate: (Migrator m) async {
      await m.createAll();
    },
    beforeOpen: (details) async {
      await customStatement('PRAGMA foreign_keys = ON;');
    },
  );
}
