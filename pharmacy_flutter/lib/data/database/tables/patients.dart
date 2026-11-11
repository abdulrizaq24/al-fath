import 'package:drift/drift.dart';
import 'pharmacies.dart';

@TableIndex(name: 'patients_pharmacy_id_idx', columns: {#pharmacyId})
@TableIndex(name: 'patients_last_name_idx', columns: {#lastName})
class Patients extends Table {
  TextColumn get id => text()();
  TextColumn get pharmacyId => text().references(Pharmacies, #id)();
  TextColumn get patientNumber => text()();
  TextColumn get firstName => text()();
  TextColumn get lastName => text().nullable()();
  IntColumn get dateOfBirth => integer().nullable()();
  TextColumn get sex => text().nullable()();
  TextColumn get phone => text().nullable()();
  TextColumn get address => text().nullable()();
  TextColumn get notes => text().nullable()();
  IntColumn get createdAt => integer().withDefault(const Constant(0))();
  IntColumn get updatedAt => integer().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<Set<Column>> get uniqueKeys => [
    {pharmacyId, patientNumber},
  ];
}
