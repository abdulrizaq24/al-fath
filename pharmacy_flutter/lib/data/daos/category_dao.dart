import 'package:drift/drift.dart';

import '../database/database.dart';

abstract class ICategoryDao {
  Future<List<Category>> getAll(String pharmacyId, {bool activeOnly = true});
  Stream<List<Category>> watchAll(String pharmacyId, {bool activeOnly = true});
  Future<Category?> getById(String id);
  Future<Category> insert(CategoriesCompanion entry);
  Future<bool> updateCategory(CategoriesCompanion entry);
  Future<bool> toggleActive(String id, bool isActive);
}

class CategoryDao implements ICategoryDao {
  final AppDatabase _db;

  const CategoryDao(this._db);

  @override
  Future<List<Category>> getAll(
    String pharmacyId, {
    bool activeOnly = true,
  }) async {
    final query = _db.select(_db.categories)
      ..where((tbl) => tbl.pharmacyId.equals(pharmacyId));
    if (activeOnly) {
      query.where((tbl) => tbl.isActive.equals(true));
    }
    query.orderBy([(tbl) => OrderingTerm.asc(tbl.name)]);
    return query.get();
  }

  @override
  Stream<List<Category>> watchAll(String pharmacyId, {bool activeOnly = true}) {
    final query = _db.select(_db.categories)
      ..where((tbl) => tbl.pharmacyId.equals(pharmacyId));
    if (activeOnly) {
      query.where((tbl) => tbl.isActive.equals(true));
    }
    query.orderBy([(tbl) => OrderingTerm.asc(tbl.name)]);
    return query.watch();
  }

  @override
  Future<Category?> getById(String id) async {
    final query = _db.select(_db.categories)..where((tbl) => tbl.id.equals(id));
    return query.getSingleOrNull();
  }

  @override
  Future<Category> insert(CategoriesCompanion entry) async {
    return _db.into(_db.categories).insertReturning(entry);
  }

  @override
  Future<bool> updateCategory(CategoriesCompanion entry) async {
    return _db.update(_db.categories).replace(entry);
  }

  @override
  Future<bool> toggleActive(String id, bool isActive) async {
    final count =
        await (_db.update(_db.categories)..where((tbl) => tbl.id.equals(id)))
            .write(CategoriesCompanion(isActive: Value(isActive)));
    return count > 0;
  }
}
