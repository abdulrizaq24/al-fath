import 'package:drift/drift.dart';

class Pharmacies extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get licenseNumber => text().nullable()();
  TextColumn get address => text().nullable()();
  TextColumn get phone => text().nullable()();
  TextColumn get email => text().nullable()();
  TextColumn get country => text().withDefault(const Constant('Indonesia'))();
  TextColumn get currency => text().withDefault(const Constant('IDR'))();
  TextColumn get timezone => text().nullable()();
  TextColumn get logoUrl => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}
