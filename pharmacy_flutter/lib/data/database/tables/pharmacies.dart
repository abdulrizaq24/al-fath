import 'package:drift/drift.dart';

class Pharmacies extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get licenseNumber => text().nullable()();
  TextColumn get address => text().nullable()();
  TextColumn get phone => text().nullable()();
  TextColumn get email => text().nullable()();
  TextColumn get country => text().withDefault(const Constant('Sudan'))();
  TextColumn get currency => text().withDefault(const Constant('SDG'))();
  TextColumn get timezone => text().nullable()();
  TextColumn get logoUrl => text().nullable()();
  IntColumn get createdAt => integer().withDefault(const Constant(0))();
  IntColumn get updatedAt => integer().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {id};
}
