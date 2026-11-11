import 'package:drift/drift.dart';

import '../database/database.dart';

abstract class IBatchDao {
  Future<List<Batche>> getAvailableBatchesFEFO(
    String pharmacyId,
    String medicineId,
  );
  Future<List<Batche>> getBatchesForMedicine(
    String pharmacyId,
    String medicineId,
  );
  Stream<List<Batche>> watchBatchesForMedicine(
    String pharmacyId,
    String medicineId,
  );
  Future<List<Batche>> getExpiringBatches(
    String pharmacyId, {
    int daysThreshold = 60,
  });
  Future<List<Batche>> getExpiredBatches(String pharmacyId);
  Future<double> getTotalAvailableStock(String pharmacyId, String medicineId);
  Future<Batche?> getById(String id);
  Future<Batche> insert(BatchesCompanion entry);
  Future<bool> updateQuantity(String id, double newQuantity);
}

class BatchDao implements IBatchDao {
  final AppDatabase _db;

  const BatchDao(this._db);

  DateTime get _startOfToday {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day);
  }

  @override
  Future<List<Batche>> getAvailableBatchesFEFO(
    String pharmacyId,
    String medicineId,
  ) async {
    final query = _db.select(_db.batches)
      ..where(
        (tbl) =>
            tbl.pharmacyId.equals(pharmacyId) &
            tbl.medicineId.equals(medicineId) &
            tbl.currentQuantity.isBiggerThanValue(0) &
            tbl.expiryDate.isBiggerOrEqualValue(_startOfToday),
      )
      ..orderBy([(tbl) => OrderingTerm.asc(tbl.expiryDate)]);
    return query.get();
  }

  @override
  Future<List<Batche>> getBatchesForMedicine(
    String pharmacyId,
    String medicineId,
  ) async {
    final query = _db.select(_db.batches)
      ..where(
        (tbl) =>
            tbl.pharmacyId.equals(pharmacyId) &
            tbl.medicineId.equals(medicineId),
      )
      ..orderBy([(tbl) => OrderingTerm.asc(tbl.expiryDate)]);
    return query.get();
  }

  @override
  Stream<List<Batche>> watchBatchesForMedicine(
    String pharmacyId,
    String medicineId,
  ) {
    final query = _db.select(_db.batches)
      ..where(
        (tbl) =>
            tbl.pharmacyId.equals(pharmacyId) &
            tbl.medicineId.equals(medicineId),
      )
      ..orderBy([(tbl) => OrderingTerm.asc(tbl.expiryDate)]);
    return query.watch();
  }

  @override
  Future<List<Batche>> getExpiringBatches(
    String pharmacyId, {
    int daysThreshold = 60,
  }) async {
    final today = _startOfToday;
    final maxDate = today.add(Duration(days: daysThreshold));
    final query = _db.select(_db.batches)
      ..where(
        (tbl) =>
            tbl.pharmacyId.equals(pharmacyId) &
            tbl.currentQuantity.isBiggerThanValue(0) &
            tbl.expiryDate.isBiggerOrEqualValue(today) &
            tbl.expiryDate.isSmallerOrEqualValue(maxDate),
      )
      ..orderBy([(tbl) => OrderingTerm.asc(tbl.expiryDate)]);
    return query.get();
  }

  @override
  Future<List<Batche>> getExpiredBatches(String pharmacyId) async {
    final today = _startOfToday;
    final query = _db.select(_db.batches)
      ..where(
        (tbl) =>
            tbl.pharmacyId.equals(pharmacyId) &
            tbl.currentQuantity.isBiggerThanValue(0) &
            tbl.expiryDate.isSmallerThanValue(today),
      )
      ..orderBy([(tbl) => OrderingTerm.asc(tbl.expiryDate)]);
    return query.get();
  }

  @override
  Future<double> getTotalAvailableStock(
    String pharmacyId,
    String medicineId,
  ) async {
    final availableBatches = await getAvailableBatchesFEFO(
      pharmacyId,
      medicineId,
    );
    return availableBatches.fold<double>(
      0.0,
      (sum, b) => sum + b.currentQuantity,
    );
  }

  @override
  Future<Batche?> getById(String id) async {
    final query = _db.select(_db.batches)..where((tbl) => tbl.id.equals(id));
    return query.getSingleOrNull();
  }

  @override
  Future<Batche> insert(BatchesCompanion entry) async {
    return _db.into(_db.batches).insertReturning(entry);
  }

  @override
  Future<bool> updateQuantity(String id, double newQuantity) async {
    final count =
        await (_db.update(
          _db.batches,
        )..where((tbl) => tbl.id.equals(id))).write(
          BatchesCompanion(
            currentQuantity: Value(newQuantity),
            updatedAt: Value(DateTime.now()),
          ),
        );
    return count > 0;
  }
}
