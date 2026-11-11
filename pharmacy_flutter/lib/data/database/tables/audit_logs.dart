import 'package:drift/drift.dart';
import 'pharmacies.dart';
@TableIndex(name: 'audit_logs_pharmacy_id_idx', columns: {#pharmacyId})
@TableIndex(name: 'audit_logs_actor_id_idx', columns: {#actorId})
@TableIndex(name: 'audit_logs_entity_idx', columns: {#entityType, #entityId})
@TableIndex(name: 'audit_logs_created_at_idx', columns: {#createdAt})
class AuditLogs extends Table {
  TextColumn get id => text()();
  TextColumn get pharmacyId => text().references(Pharmacies, #id)();
  TextColumn get actorId => text().nullable()();
  TextColumn get action => text()();
  TextColumn get entityType => text()();
  TextColumn get entityId => text().nullable()();
  TextColumn get oldValues => text().nullable()();
  TextColumn get newValues => text().nullable()();
  TextColumn get ipAddress => text().nullable()();
  TextColumn get userAgent => text().nullable()();
  IntColumn get createdAt => integer().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {id};
}
