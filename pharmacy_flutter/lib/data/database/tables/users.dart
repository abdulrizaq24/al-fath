import 'package:drift/drift.dart';
import 'pharmacies.dart';
import 'roles.dart';

@TableIndex(name: 'users_pharmacy_id_idx', columns: {#pharmacyId})
@TableIndex(name: 'users_role_id_idx', columns: {#roleId})
class Users extends Table {
  TextColumn get id => text()();
  TextColumn get pharmacyId => text().references(Pharmacies, #id)();
  TextColumn get roleId => text().references(Roles, #id)();
  TextColumn get name => text()();
  TextColumn get username => text().unique()();
  TextColumn get email => text().nullable()();
  TextColumn get passwordHash => text()();
  BoolColumn get isActive => boolean().withDefault(const Constant(true))();
  DateTimeColumn get lastLoginAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}
