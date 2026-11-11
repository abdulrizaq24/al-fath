import 'package:drift/drift.dart';
import 'pharmacies.dart';

@TableIndex(name: 'categories_pharmacy_id_idx', columns: {#pharmacyId})
class Categories extends Table {
  TextColumn get id => text()();
  TextColumn get pharmacyId => text().references(Pharmacies, #id)();
  TextColumn get name => text()();
  TextColumn get description => text().nullable()();
  BoolColumn get isActive => boolean().withDefault(const Constant(true))();
  IntColumn get createdAt => integer().withDefault(const Constant(0))();
  IntColumn get updatedAt => integer().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<Set<Column>> get uniqueKeys => [
    {pharmacyId, name},
  ];
}
