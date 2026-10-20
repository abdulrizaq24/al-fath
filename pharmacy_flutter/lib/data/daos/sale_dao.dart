import 'package:drift/drift.dart';

import '../../domain/enums/app_enums.dart';
import '../database/database.dart';

class SaleItemBatchWithBatch {
  final SaleItemBatche itemBatch;
  final Batche batch;

  const SaleItemBatchWithBatch({
    required this.itemBatch,
    required this.batch,
  });
}

class SaleItemWithMedicineAndBatches {
  final SaleItem item;
  final Medicine medicine;
  final List<SaleItemBatchWithBatch> allocatedBatches;

  const SaleItemWithMedicineAndBatches({
    required this.item,
    required this.medicine,
    required this.allocatedBatches,
  });
}

class SaleWithDetails {
  final Sale sale;
  final Patient? patient;
  final User soldBy;
  final List<SaleItemWithMedicineAndBatches> items;
  final List<Payment> payments;

  const SaleWithDetails({
    required this.sale,
    this.patient,
    required this.soldBy,
    required this.items,
    required this.payments,
  });
}

abstract class ISaleDao {
  Future<List<SaleWithDetails>> getAll(
    String pharmacyId, {
    DateTime? startDate,
    DateTime? endDate,
    SaleStatus? status,
  });
  Stream<List<SaleWithDetails>> watchAll(
    String pharmacyId, {
    DateTime? startDate,
    DateTime? endDate,
    SaleStatus? status,
  });
  Future<SaleWithDetails?> getById(String id);
  Future<Sale> insertSale(SalesCompanion entry);
  Future<SaleItem> insertSaleItem(SaleItemsCompanion entry);
  Future<void> insertSaleItemBatches(
      List<SaleItemBatchesCompanion> batches);
  Future<Payment> insertPayment(PaymentsCompanion entry);
  Future<bool> updateStatus(String id, SaleStatus status);
}

class SaleDao implements ISaleDao {
  final AppDatabase _db;

  const SaleDao(this._db);

  @override
  Future<List<SaleWithDetails>> getAll(
    String pharmacyId, {
    DateTime? startDate,
    DateTime? endDate,
    SaleStatus? status,
  }) async {
    final query = _db.select(_db.sales)
      ..where((tbl) => tbl.pharmacyId.equals(pharmacyId));
    if (status != null) {
      query.where((tbl) => tbl.status.equals(status.index));
    }
    if (startDate != null) {
      query.where((tbl) => tbl.saleDate.isBiggerOrEqualValue(startDate));
    }
    if (endDate != null) {
      query.where((tbl) => tbl.saleDate.isSmallerOrEqualValue(endDate));
    }
    query.orderBy([(tbl) => OrderingTerm.desc(tbl.saleDate)]);

    final sales = await query.get();
    final result = <SaleWithDetails>[];
    for (final s in sales) {
      final details = await getById(s.id);
      if (details != null) {
        result.add(details);
      }
    }
    return result;
  }

  @override
  Stream<List<SaleWithDetails>> watchAll(
    String pharmacyId, {
    DateTime? startDate,
    DateTime? endDate,
    SaleStatus? status,
  }) {
    final query = _db.select(_db.sales)
      ..where((tbl) => tbl.pharmacyId.equals(pharmacyId));
    if (status != null) {
      query.where((tbl) => tbl.status.equals(status.index));
    }
    if (startDate != null) {
      query.where((tbl) => tbl.saleDate.isBiggerOrEqualValue(startDate));
    }
    if (endDate != null) {
      query.where((tbl) => tbl.saleDate.isSmallerOrEqualValue(endDate));
    }
    query.orderBy([(tbl) => OrderingTerm.desc(tbl.saleDate)]);

    return query.watch().asyncMap((sales) async {
      final result = <SaleWithDetails>[];
      for (final s in sales) {
        final details = await getById(s.id);
        if (details != null) {
          result.add(details);
        }
      }
      return result;
    });
  }

  @override
  Future<SaleWithDetails?> getById(String id) async {
    final sale = await (_db.select(_db.sales)
          ..where((tbl) => tbl.id.equals(id)))
        .getSingleOrNull();
    if (sale == null) return null;

    Patient? patient;
    if (sale.patientId != null) {
      patient = await (_db.select(_db.patients)
            ..where((tbl) => tbl.id.equals(sale.patientId!)))
          .getSingleOrNull();
    }

    final user = await (_db.select(_db.users)
          ..where((tbl) => tbl.id.equals(sale.soldById)))
        .getSingle();

    final itemsQuery = _db.select(_db.saleItems).join([
      innerJoin(
        _db.medicines,
        _db.medicines.id.equalsExp(_db.saleItems.medicineId),
      ),
    ])..where(_db.saleItems.saleId.equals(id));

    final itemRows = await itemsQuery.get();
    final items = <SaleItemWithMedicineAndBatches>[];

    for (final row in itemRows) {
      final saleItem = row.readTable(_db.saleItems);
      final medicine = row.readTable(_db.medicines);

      final batchQuery = _db.select(_db.saleItemBatches).join([
        innerJoin(
          _db.batches,
          _db.batches.id.equalsExp(_db.saleItemBatches.batchId),
        ),
      ])..where(_db.saleItemBatches.saleItemId.equals(saleItem.id));

      final batchRows = await batchQuery.get();
      final allocatedBatches = batchRows.map((bRow) {
        return SaleItemBatchWithBatch(
          itemBatch: bRow.readTable(_db.saleItemBatches),
          batch: bRow.readTable(_db.batches),
        );
      }).toList();

      items.add(SaleItemWithMedicineAndBatches(
        item: saleItem,
        medicine: medicine,
        allocatedBatches: allocatedBatches,
      ));
    }

    final payments = await (_db.select(_db.payments)
          ..where((tbl) => tbl.saleId.equals(id)))
        .get();

    return SaleWithDetails(
      sale: sale,
      patient: patient,
      soldBy: user,
      items: items,
      payments: payments,
    );
  }

  @override
  Future<Sale> insertSale(SalesCompanion entry) async {
    return _db.into(_db.sales).insertReturning(entry);
  }

  @override
  Future<SaleItem> insertSaleItem(SaleItemsCompanion entry) async {
    return _db.into(_db.saleItems).insertReturning(entry);
  }

  @override
  Future<void> insertSaleItemBatches(
      List<SaleItemBatchesCompanion> batches) async {
    await _db.batch((b) {
      b.insertAll(_db.saleItemBatches, batches);
    });
  }

  @override
  Future<Payment> insertPayment(PaymentsCompanion entry) async {
    return _db.into(_db.payments).insertReturning(entry);
  }

  @override
  Future<bool> updateStatus(String id, SaleStatus status) async {
    final count = await (_db.update(_db.sales)
          ..where((tbl) => tbl.id.equals(id)))
        .write(
      SalesCompanion(
        status: Value(status),
        updatedAt: Value(DateTime.now()),
      ),
    );
    return count > 0;
  }
}
