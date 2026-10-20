import 'package:drift/drift.dart';
import '../../../domain/enums/app_enums.dart';
import 'batches.dart';
import 'medicines.dart';
import 'pharmacies.dart';
import 'users.dart';

@TableIndex(name: 'inv_trans_pharmacy_id_idx', columns: {#pharmacyId})
@TableIndex(name: 'inv_trans_medicine_id_idx', columns: {#medicineId})
@TableIndex(name: 'inv_trans_batch_id_idx', columns: {#batchId})
@TableIndex(name: 'inv_trans_created_at_idx', columns: {#createdAt})
class InventoryTransactions extends Table {
  TextColumn get id => text()();
  TextColumn get pharmacyId => text().references(Pharmacies, #id)();
  TextColumn get medicineId => text().references(Medicines, #id)();
  TextColumn get batchId => text().references(Batches, #id)();
  IntColumn get transactionType => intEnum<InventoryTransactionType>()();
  RealColumn get quantity => real()();
  IntColumn get referenceType => intEnum<ReferenceType>()();
  TextColumn get referenceId => text().nullable()();
  TextColumn get reason => text().nullable()();
  TextColumn get createdById => text().references(Users, #id)();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}
