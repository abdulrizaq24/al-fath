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
  IntColumn get quantityPrescribed => integer()();
  IntColumn get quantityDispensed => integer().withDefault(const Constant(0))();
  TextColumn get directions => text().nullable()();
  TextColumn get notes => text().nullable()();
  IntColumn get createdAt => integer().withDefault(const Constant(0))();
  IntColumn get updatedAt => integer().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {id};
}
