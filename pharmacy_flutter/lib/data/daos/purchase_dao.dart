import 'package:drift/drift.dart';

import '../../domain/enums/app_enums.dart';
import '../database/database.dart';

class PurchaseItemWithMedicine {
  final PurchaseItem item;
  final Medicine medicine;

  const PurchaseItemWithMedicine({required this.item, required this.medicine});
}

class PurchaseWithDetails {
  final Purchase purchase;
  final Supplier supplier;
  final User createdBy;
  final List<PurchaseItemWithMedicine> items;

  const PurchaseWithDetails({
    required this.purchase,
    required this.supplier,
    required this.createdBy,
    required this.items,
  });
}

abstract class IPurchaseDao {
  Future<List<PurchaseWithDetails>> getAll(
    String pharmacyId, {
    PurchaseStatus? status,
  });
  Stream<List<PurchaseWithDetails>> watchAll(
    String pharmacyId, {
    PurchaseStatus? status,
  });
  Future<PurchaseWithDetails?> getById(String id);
  Future<Purchase> insertPurchase(PurchasesCompanion entry);
  Future<void> insertPurchaseItems(List<PurchaseItemsCompanion> items);
  Future<bool> updateStatus(String id, PurchaseStatus status);
  Future<PurchaseReceipt> insertReceipt(PurchaseReceiptsCompanion entry);
  Future<void> insertReceiptItems(List<PurchaseReceiptItemsCompanion> items);
  Future<List<PurchaseReceiptItem>> getReceiptItemsForPurchase(
    String purchaseId,
  );
}

class PurchaseDao implements IPurchaseDao {
  final AppDatabase _db;

  const PurchaseDao(this._db);

  @override
  Future<List<PurchaseWithDetails>> getAll(
    String pharmacyId, {
    PurchaseStatus? status,
  }) async {
    final query = _db.select(_db.purchases)
      ..where((tbl) => tbl.pharmacyId.equals(pharmacyId));
    if (status != null) {
      query.where((tbl) => tbl.status.equals(status.index));
    }
    query.orderBy([(tbl) => OrderingTerm.desc(tbl.purchaseDate)]);

    final purchases = await query.get();
    final result = <PurchaseWithDetails>[];
    for (final p in purchases) {
      final details = await getById(p.id);
      if (details != null) {
        result.add(details);
      }
    }
    return result;
  }

  @override
  Stream<List<PurchaseWithDetails>> watchAll(
    String pharmacyId, {
    PurchaseStatus? status,
  }) {
    final query = _db.select(_db.purchases)
      ..where((tbl) => tbl.pharmacyId.equals(pharmacyId));
    if (status != null) {
      query.where((tbl) => tbl.status.equals(status.index));
    }
    query.orderBy([(tbl) => OrderingTerm.desc(tbl.purchaseDate)]);

    return query.watch().asyncMap((purchases) async {
      final result = <PurchaseWithDetails>[];
      for (final p in purchases) {
        final details = await getById(p.id);
        if (details != null) {
          result.add(details);
        }
      }
      return result;
    });
  }

  @override
  Future<PurchaseWithDetails?> getById(String id) async {
    final purchase = await (_db.select(
      _db.purchases,
    )..where((tbl) => tbl.id.equals(id))).getSingleOrNull();
    if (purchase == null) return null;

    final supplier = await (_db.select(
      _db.suppliers,
    )..where((tbl) => tbl.id.equals(purchase.supplierId))).getSingle();

    final user = await (_db.select(
      _db.users,
    )..where((tbl) => tbl.id.equals(purchase.createdById))).getSingle();

    final itemsQuery = _db.select(_db.purchaseItems).join([
      innerJoin(
        _db.medicines,
        _db.medicines.id.equalsExp(_db.purchaseItems.medicineId),
      ),
    ])..where(_db.purchaseItems.purchaseId.equals(id));

    final itemRows = await itemsQuery.get();
    final items = itemRows.map((row) {
      return PurchaseItemWithMedicine(
        item: row.readTable(_db.purchaseItems),
        medicine: row.readTable(_db.medicines),
      );
    }).toList();

    return PurchaseWithDetails(
      purchase: purchase,
      supplier: supplier,
      createdBy: user,
      items: items,
    );
  }

  @override
  Future<Purchase> insertPurchase(PurchasesCompanion entry) async {
    return _db.into(_db.purchases).insertReturning(entry);
  }

  @override
  Future<void> insertPurchaseItems(List<PurchaseItemsCompanion> items) async {
    await _db.batch((b) {
      b.insertAll(_db.purchaseItems, items);
    });
  }

  @override
  Future<bool> updateStatus(String id, PurchaseStatus status) async {
    final count =
        await (_db.update(
          _db.purchases,
        )..where((tbl) => tbl.id.equals(id))).write(
          PurchasesCompanion(
            status: Value(status),
            updatedAt: Value(DateTime.now()),
          ),
        );
    return count > 0;
  }

  @override
  Future<PurchaseReceipt> insertReceipt(PurchaseReceiptsCompanion entry) async {
    return _db.into(_db.purchaseReceipts).insertReturning(entry);
  }

  @override
  Future<void> insertReceiptItems(
    List<PurchaseReceiptItemsCompanion> items,
  ) async {
    await _db.batch((b) {
      b.insertAll(_db.purchaseReceiptItems, items);
    });
  }

  @override
  Future<List<PurchaseReceiptItem>> getReceiptItemsForPurchase(
    String purchaseId,
  ) async {
    final query = _db.select(_db.purchaseReceiptItems).join([
      innerJoin(
        _db.purchaseReceipts,
        _db.purchaseReceipts.id.equalsExp(_db.purchaseReceiptItems.receiptId),
      ),
    ])..where(_db.purchaseReceipts.purchaseId.equals(purchaseId));

    final rows = await query.get();
    return rows.map((r) => r.readTable(_db.purchaseReceiptItems)).toList();
  }
}
