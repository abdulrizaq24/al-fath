import 'package:drift/drift.dart';
import '../../../domain/enums/app_enums.dart';

class Roles extends Table {
  TextColumn get id => text()();
  IntColumn get name => intEnum<RoleName>().unique()();
  TextColumn get description => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}
