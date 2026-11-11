import 'package:drift/drift.dart';

import 'pharmacies.dart';
import 'sales.dart';

class SaleIdempotency extends Table {
  TextColumn get id => text()();
  TextColumn get pharmacyId => text().references(Pharmacies, #id)();
  TextColumn get idempotencyKey => text()();
  TextColumn get saleId =>
      text().nullable().references(Sales, #id, onDelete: KeyAction.setNull)();
  TextColumn get status => text()();
  TextColumn get responsePayload => text().nullable()();
  IntColumn get createdAt => integer().withDefault(const Constant(0))();
  IntColumn get updatedAt => integer().nullable()();
  IntColumn get expiresAt => integer().nullable()();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<Set<Column>> get uniqueKeys => [
    {pharmacyId, idempotencyKey},
  ];
}
