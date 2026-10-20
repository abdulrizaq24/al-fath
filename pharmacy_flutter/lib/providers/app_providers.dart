import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/daos/audit_dao.dart';
import '../data/daos/auth_dao.dart';
import '../data/daos/batch_dao.dart';
import '../data/daos/category_dao.dart';
import '../data/daos/inventory_dao.dart';
import '../data/daos/medicine_dao.dart';
import '../data/daos/patient_dao.dart';
import '../data/daos/prescription_dao.dart';
import '../data/daos/purchase_dao.dart';
import '../data/daos/report_dao.dart';
import '../data/daos/sale_dao.dart';
import '../data/daos/supplier_dao.dart';
import '../data/database/database.dart';
import '../services/auth_service.dart';
import '../services/export_service.dart';
import '../services/inventory_service.dart';
import '../services/prescription_service.dart';
import '../services/purchase_service.dart';
import '../services/sale_service.dart';

// Database Singleton Provider
final databaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase();
  ref.onDispose(() => db.close());
  return db;
});

// DAOs
final authDaoProvider = Provider<IAuthDao>((ref) {
  return AuthDao(ref.watch(databaseProvider));
});

final categoryDaoProvider = Provider<ICategoryDao>((ref) {
  return CategoryDao(ref.watch(databaseProvider));
});

final medicineDaoProvider = Provider<IMedicineDao>((ref) {
  return MedicineDao(ref.watch(databaseProvider));
});

final batchDaoProvider = Provider<IBatchDao>((ref) {
  return BatchDao(ref.watch(databaseProvider));
});

final supplierDaoProvider = Provider<ISupplierDao>((ref) {
  return SupplierDao(ref.watch(databaseProvider));
});

final purchaseDaoProvider = Provider<IPurchaseDao>((ref) {
  return PurchaseDao(ref.watch(databaseProvider));
});

final patientDaoProvider = Provider<IPatientDao>((ref) {
  return PatientDao(ref.watch(databaseProvider));
});

final prescriptionDaoProvider = Provider<IPrescriptionDao>((ref) {
  return PrescriptionDao(ref.watch(databaseProvider));
});

final saleDaoProvider = Provider<ISaleDao>((ref) {
  return SaleDao(ref.watch(databaseProvider));
});

final inventoryDaoProvider = Provider<IInventoryDao>((ref) {
  return InventoryDao(ref.watch(databaseProvider));
});

final reportDaoProvider = Provider<IReportDao>((ref) {
  return ReportDao(ref.watch(databaseProvider));
});

final auditDaoProvider = Provider<IAuditDao>((ref) {
  return AuditDao(ref.watch(databaseProvider));
});

// Services
final authServiceProvider = Provider<IAuthService>((ref) {
  return AuthService(ref.watch(authDaoProvider));
});

final saleServiceProvider = Provider<ISaleService>((ref) {
  return SaleService(
    ref.watch(databaseProvider),
    ref.watch(saleDaoProvider),
    ref.watch(batchDaoProvider),
    ref.watch(inventoryDaoProvider),
  );
});

final purchaseServiceProvider = Provider<IPurchaseService>((ref) {
  return PurchaseService(
    ref.watch(databaseProvider),
    ref.watch(purchaseDaoProvider),
    ref.watch(batchDaoProvider),
    ref.watch(inventoryDaoProvider),
  );
});

final prescriptionServiceProvider = Provider<IPrescriptionService>((ref) {
  return PrescriptionService(
    ref.watch(databaseProvider),
    ref.watch(prescriptionDaoProvider),
    ref.watch(saleServiceProvider),
  );
});

final inventoryServiceProvider = Provider<IInventoryService>((ref) {
  return InventoryService(
    ref.watch(databaseProvider),
    ref.watch(batchDaoProvider),
    ref.watch(inventoryDaoProvider),
  );
});

final exportServiceProvider = Provider<IExportService>((ref) {
  return const ExportService();
});
