import 'package:drift/drift.dart';

import '../database/database.dart';

class MedicineWithCategory {
  final Medicine medicine;
  final Category? category;

  const MedicineWithCategory({
    required this.medicine,
    this.category,
  });
}

abstract class IMedicineDao {
  Future<List<MedicineWithCategory>> getAll(
    String pharmacyId, {
    String? categoryId,
    String? searchQuery,
    bool activeOnly = true,
  });
  Stream<List<MedicineWithCategory>> watchAll(
    String pharmacyId, {
    String? categoryId,
    String? searchQuery,
    bool activeOnly = true,
  });
  Future<MedicineWithCategory?> getById(String id);
  Future<Medicine?> getByBarcode(String pharmacyId, String barcode);
  Future<Medicine> insert(MedicinesCompanion entry);
  Future<bool> updateMedicine(MedicinesCompanion entry);
  Future<bool> toggleActive(String id, bool isActive);
  Future<List<MedicinePackage>> getPackages(String medicineId);
  Future<MedicinePackage> insertPackage(MedicinePackagesCompanion entry);
}

class MedicineDao implements IMedicineDao {
  final AppDatabase _db;

  const MedicineDao(this._db);

  JoinedSelectStatement<HasResultSet, dynamic> _buildJoinedQuery(
    String pharmacyId, {
    String? categoryId,
    String? searchQuery,
    bool activeOnly = true,
  }) {
    final query = _db.select(_db.medicines).join([
      leftOuterJoin(
        _db.categories,
        _db.categories.id.equalsExp(_db.medicines.categoryId),
      ),
    ])
      ..where(_db.medicines.pharmacyId.equals(pharmacyId));

    if (activeOnly) {
      query.where(_db.medicines.isActive.equals(true));
    }
    if (categoryId != null && categoryId.isNotEmpty) {
      query.where(_db.medicines.categoryId.equals(categoryId));
    }
    if (searchQuery != null && searchQuery.trim().isNotEmpty) {
      final term = '%${searchQuery.trim().toLowerCase()}%';
      query.where(
        _db.medicines.name.lower().like(term) |
            _db.medicines.genericName.lower().like(term) |
            _db.medicines.brandName.lower().like(term) |
            _db.medicines.barcode.lower().like(term),
      );
    }

    query.orderBy([OrderingTerm.asc(_db.medicines.name)]);
    return query;
  }

  MedicineWithCategory _mapRow(TypedResult row) {
    return MedicineWithCategory(
      medicine: row.readTable(_db.medicines),
      category: row.readTableOrNull(_db.categories),
    );
  }

  @override
  Future<List<MedicineWithCategory>> getAll(
    String pharmacyId, {
    String? categoryId,
    String? searchQuery,
    bool activeOnly = true,
  }) async {
    final rows = await _buildJoinedQuery(
      pharmacyId,
      categoryId: categoryId,
      searchQuery: searchQuery,
      activeOnly: activeOnly,
    ).get();
    return rows.map(_mapRow).toList();
  }

  @override
  Stream<List<MedicineWithCategory>> watchAll(
    String pharmacyId, {
    String? categoryId,
    String? searchQuery,
    bool activeOnly = true,
  }) {
    return _buildJoinedQuery(
      pharmacyId,
      categoryId: categoryId,
      searchQuery: searchQuery,
      activeOnly: activeOnly,
    ).watch().map((rows) => rows.map(_mapRow).toList());
  }

  @override
  Future<MedicineWithCategory?> getById(String id) async {
    final query = _db.select(_db.medicines).join([
      leftOuterJoin(
        _db.categories,
        _db.categories.id.equalsExp(_db.medicines.categoryId),
      ),
    ])..where(_db.medicines.id.equals(id));

    final row = await query.getSingleOrNull();
    return row != null ? _mapRow(row) : null;
  }

  @override
  Future<Medicine?> getByBarcode(String pharmacyId, String barcode) async {
    final query = _db.select(_db.medicines)
      ..where((tbl) =>
          tbl.pharmacyId.equals(pharmacyId) &
          tbl.barcode.equals(barcode) &
          tbl.isActive.equals(true));
    return query.getSingleOrNull();
  }

  @override
  Future<Medicine> insert(MedicinesCompanion entry) async {
    return _db.into(_db.medicines).insertReturning(entry);
  }

  @override
  Future<bool> updateMedicine(MedicinesCompanion entry) async {
    return _db.update(_db.medicines).replace(entry);
  }

  @override
  Future<bool> toggleActive(String id, bool isActive) async {
    final count = await (_db.update(_db.medicines)
          ..where((tbl) => tbl.id.equals(id)))
        .write(MedicinesCompanion(isActive: Value(isActive)));
    return count > 0;
  }

  @override
  Future<List<MedicinePackage>> getPackages(String medicineId) async {
    final query = _db.select(_db.medicinePackages)
      ..where((tbl) => tbl.medicineId.equals(medicineId));
    return query.get();
  }

  @override
  Future<MedicinePackage> insertPackage(
      MedicinePackagesCompanion entry) async {
    return _db.into(_db.medicinePackages).insertReturning(entry);
  }
}
