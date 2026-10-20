import 'package:drift/drift.dart';

import '../database/database.dart';

abstract class ISupplierDao {
  Future<List<Supplier>> getAll(String pharmacyId, {bool activeOnly = true});
  Stream<List<Supplier>> watchAll(String pharmacyId, {bool activeOnly = true});
  Future<Supplier?> getById(String id);
  Future<Supplier> insert(SuppliersCompanion entry);
  Future<bool> updateSupplier(SuppliersCompanion entry);
  Future<bool> toggleActive(String id, bool isActive);
}

class SupplierDao implements ISupplierDao {
  final AppDatabase _db;

  const SupplierDao(this._db);

  @override
  Future<List<Supplier>> getAll(
    String pharmacyId, {
    bool activeOnly = true,
  }) async {
    final query = _db.select(_db.suppliers)
      ..where((tbl) => tbl.pharmacyId.equals(pharmacyId));
    if (activeOnly) {
      query.where((tbl) => tbl.isActive.equals(true));
    }
    query.orderBy([(tbl) => OrderingTerm.asc(tbl.name)]);
    return query.get();
  }

  @override
  Stream<List<Supplier>> watchAll(
    String pharmacyId, {
    bool activeOnly = true,
  }) {
    final query = _db.select(_db.suppliers)
      ..where((tbl) => tbl.pharmacyId.equals(pharmacyId));
    if (activeOnly) {
      query.where((tbl) => tbl.isActive.equals(true));
    }
    query.orderBy([(tbl) => OrderingTerm.asc(tbl.name)]);
    return query.watch();
  }

  @override
  Future<Supplier?> getById(String id) async {
    final query = _db.select(_db.suppliers)..where((tbl) => tbl.id.equals(id));
    return query.getSingleOrNull();
  }

  @override
  Future<Supplier> insert(SuppliersCompanion entry) async {
    return _db.into(_db.suppliers).insertReturning(entry);
  }

  @override
  Future<bool> updateSupplier(SuppliersCompanion entry) async {
    return _db.update(_db.suppliers).replace(entry);
  }

  @override
  Future<bool> toggleActive(String id, bool isActive) async {
    final count = await (_db.update(_db.suppliers)
          ..where((tbl) => tbl.id.equals(id)))
        .write(SuppliersCompanion(isActive: Value(isActive)));
    return count > 0;
  }
}
