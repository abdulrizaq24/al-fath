import 'package:drift/drift.dart';
import '../../../domain/enums/app_enums.dart';

class Roles extends Table {
  TextColumn get id => text()();
  IntColumn get name => intEnum<RoleName>().unique()();
  TextColumn get description => text().nullable()();
  IntColumn get createdAt => integer().withDefault(const Constant(0))();
  IntColumn get updatedAt => integer().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {id};
}
