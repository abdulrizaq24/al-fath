import 'package:drift/drift.dart';
import '../../../domain/enums/app_enums.dart';
import 'categories.dart';
import 'pharmacies.dart';

@TableIndex(name: 'medicines_pharmacy_id_idx', columns: {#pharmacyId})
@TableIndex(name: 'medicines_category_id_idx', columns: {#categoryId})
@TableIndex(name: 'medicines_name_idx', columns: {#name})
@TableIndex(name: 'medicines_generic_name_idx', columns: {#genericName})
@TableIndex(name: 'medicines_barcode_idx', columns: {#barcode})
class Medicines extends Table {
  TextColumn get id => text()();
  TextColumn get pharmacyId => text().references(Pharmacies, #id)();
  TextColumn get categoryId => text().references(Categories, #id)();
  TextColumn get name => text()();
  TextColumn get genericName => text().nullable()();
  TextColumn get brandName => text().nullable()();
  TextColumn get manufacturer => text().nullable()();
  TextColumn get dosageForm => text()();
  TextColumn get strength => text().nullable()();
  TextColumn get baseUnit => text()();
  IntColumn get prescriptionStatus =>
      intEnum<ControlledStatus>().withDefault(const Constant(0))();
  IntColumn get sellingPrice => integer()();
  IntColumn get reorderLevel => integer().withDefault(const Constant(0))();
  TextColumn get barcode => text().nullable()();
  BoolColumn get isActive => boolean().withDefault(const Constant(true))();
  TextColumn get notes => text().nullable()();
  IntColumn get createdAt => integer().withDefault(const Constant(0))();
  IntColumn get updatedAt => integer().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {id};
}
