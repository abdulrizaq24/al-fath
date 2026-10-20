import 'package:drift/drift.dart';
import 'medicines.dart';

@TableIndex(name: 'medicine_packages_medicine_id_idx', columns: {#medicineId})
@TableIndex(name: 'medicine_packages_barcode_idx', columns: {#barcode})
class MedicinePackages extends Table {
  TextColumn get id => text()();
  TextColumn get medicineId => text().references(Medicines, #id)();
  TextColumn get name => text()();
  RealColumn get quantityInBaseUnits => real()();
  TextColumn get barcode => text().nullable()();
  BoolColumn get isDefault => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}
