import 'package:drift/drift.dart';

import '../database/database.dart';

class LowStockMedicine {
  final Medicine medicine;
  final double currentStock;

  const LowStockMedicine({required this.medicine, required this.currentStock});
}

class InventoryTransactionWithDetails {
  final InventoryTransaction transaction;
  final Medicine medicine;
  final Batche batch;
  final User createdBy;

  const InventoryTransactionWithDetails({
    required this.transaction,
    required this.medicine,
    required this.batch,
    required this.createdBy,
  });
}

abstract class IInventoryDao {
  Future<InventoryTransaction> recordTransaction(
    InventoryTransactionsCompanion entry,
  );
  Future<List<InventoryTransactionWithDetails>> getTransactions(
    String pharmacyId, {
    String? medicineId,
    int limit = 50,
  });
  Future<List<LowStockMedicine>> getLowStockMedicines(String pharmacyId);
}

class InventoryDao implements IInventoryDao {
  final AppDatabase _db;

  const InventoryDao(this._db);

  @override
  Future<InventoryTransaction> recordTransaction(
    InventoryTransactionsCompanion entry,
  ) async {
    return _db.into(_db.inventoryTransactions).insertReturning(entry);
  }

  @override
  Future<List<InventoryTransactionWithDetails>> getTransactions(
    String pharmacyId, {
    String? medicineId,
    int limit = 50,
  }) async {
    final query = _db.select(_db.inventoryTransactions).join([
      innerJoin(
        _db.medicines,
        _db.medicines.id.equalsExp(_db.inventoryTransactions.medicineId),
      ),
      innerJoin(
        _db.batches,
        _db.batches.id.equalsExp(_db.inventoryTransactions.batchId),
      ),
      innerJoin(
        _db.users,
        _db.users.id.equalsExp(_db.inventoryTransactions.createdById),
      ),
    ])..where(_db.inventoryTransactions.pharmacyId.equals(pharmacyId));

    if (medicineId != null && medicineId.isNotEmpty) {
      query.where(_db.inventoryTransactions.medicineId.equals(medicineId));
    }

    query
      ..orderBy([OrderingTerm.desc(_db.inventoryTransactions.createdAt)])
      ..limit(limit);

    final rows = await query.get();
    return rows.map((row) {
      return InventoryTransactionWithDetails(
        transaction: row.readTable(_db.inventoryTransactions),
        medicine: row.readTable(_db.medicines),
        batch: row.readTable(_db.batches),
        createdBy: row.readTable(_db.users),
      );
    }).toList();
  }

  @override
  Future<List<LowStockMedicine>> getLowStockMedicines(String pharmacyId) async {
    final medicines =
        await (_db.select(_db.medicines)..where(
              (tbl) =>
                  tbl.pharmacyId.equals(pharmacyId) & tbl.isActive.equals(true),
            ))
            .get();

    final result = <LowStockMedicine>[];
    for (final med in medicines) {
      final batches =
          await (_db.select(_db.batches)..where(
                (tbl) =>
                    tbl.pharmacyId.equals(pharmacyId) &
                    tbl.medicineId.equals(med.id) &
                    tbl.currentQuantity.isBiggerThanValue(0),
              ))
              .get();

      final totalStock = batches.fold<double>(
        0.0,
        (sum, b) => sum + b.currentQuantity,
      );

      if (totalStock <= med.reorderLevel) {
        result.add(LowStockMedicine(medicine: med, currentStock: totalStock));
      }
    }

    return result;
  }
}
