import 'package:drift/drift.dart';
import 'medicines.dart';
import 'prescriptions.dart';

@TableIndex(
  name: 'prescription_items_prescription_id_idx',
  columns: {#prescriptionId},
)
@TableIndex(name: 'prescription_items_medicine_id_idx', columns: {#medicineId})
class PrescriptionItems extends Table {
  TextColumn get id => text()();
  TextColumn get prescriptionId => text().references(Prescriptions, #id)();
  TextColumn get medicineId => text().references(Medicines, #id)();
  RealColumn get quantityPrescribed => real()();
  RealColumn get quantityDispensed =>
      real().withDefault(const Constant(0.0))();
  TextColumn get directions => text().nullable()();
  TextColumn get notes => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}
