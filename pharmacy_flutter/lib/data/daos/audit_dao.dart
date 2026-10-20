import 'package:drift/drift.dart';

import '../database/database.dart';

class AuditLogWithUser {
  final AuditLog log;
  final User user;

  const AuditLogWithUser({
    required this.log,
    required this.user,
  });
}

abstract class IAuditDao {
  Future<AuditLog> insert(AuditLogsCompanion entry);
  Future<List<AuditLogWithUser>> getAll(
    String pharmacyId, {
    String? entityType,
    String? userId,
    int limit = 100,
  });
}

class AuditDao implements IAuditDao {
  final AppDatabase _db;

  const AuditDao(this._db);

  @override
  Future<AuditLog> insert(AuditLogsCompanion entry) async {
    return _db.into(_db.auditLogs).insertReturning(entry);
  }

  @override
  Future<List<AuditLogWithUser>> getAll(
    String pharmacyId, {
    String? entityType,
    String? userId,
    int limit = 100,
  }) async {
    final query = _db.select(_db.auditLogs).join([
      innerJoin(
        _db.users,
        _db.users.id.equalsExp(_db.auditLogs.userId),
      ),
    ])..where(_db.auditLogs.pharmacyId.equals(pharmacyId));

    if (entityType != null && entityType.isNotEmpty) {
      query.where(_db.auditLogs.entityType.equals(entityType));
    }
    if (userId != null && userId.isNotEmpty) {
      query.where(_db.auditLogs.userId.equals(userId));
    }

    query
      ..orderBy([OrderingTerm.desc(_db.auditLogs.createdAt)])
      ..limit(limit);

    final rows = await query.get();
    return rows.map((r) {
      return AuditLogWithUser(
        log: r.readTable(_db.auditLogs),
        user: r.readTable(_db.users),
      );
    }).toList();
  }
}
