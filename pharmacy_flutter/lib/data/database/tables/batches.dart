import 'package:drift/drift.dart';
import 'medicines.dart';
import 'pharmacies.dart';

@TableIndex(name: 'batches_pharmacy_id_idx', columns: {#pharmacyId})
@TableIndex(name: 'batches_medicine_id_idx', columns: {#medicineId})
@TableIndex(name: 'batches_expiry_date_idx', columns: {#expiryDate})
class Batches extends Table {
  TextColumn get id => text()();
  TextColumn get pharmacyId => text().references(Pharmacies, #id)();
  TextColumn get medicineId => text().references(Medicines, #id)();
  TextColumn get batchNumber => text()();
  DateTimeColumn get expiryDate => dateTime()();
  RealColumn get purchasePrice => real()();
  RealColumn get receivedQuantity => real()();
  RealColumn get currentQuantity => real()();
  DateTimeColumn get receivedAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<Set<Column>> get uniqueKeys => [
    {pharmacyId, medicineId, batchNumber},
  ];
}
