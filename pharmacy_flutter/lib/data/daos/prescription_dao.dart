import 'package:drift/drift.dart';

import '../../domain/enums/app_enums.dart';
import '../database/database.dart';

class PrescriptionItemWithMedicine {
  final PrescriptionItem item;
  final Medicine medicine;

  const PrescriptionItemWithMedicine({
    required this.item,
    required this.medicine,
  });
}

class PrescriptionWithDetails {
  final Prescription prescription;
  final Patient patient;
  final User createdBy;
  final List<PrescriptionItemWithMedicine> items;

  const PrescriptionWithDetails({
    required this.prescription,
    required this.patient,
    required this.createdBy,
    required this.items,
  });
}

abstract class IPrescriptionDao {
  Future<List<PrescriptionWithDetails>> getAll(
    String pharmacyId, {
    PrescriptionStatus? status,
  });
  Stream<List<PrescriptionWithDetails>> watchAll(
    String pharmacyId, {
    PrescriptionStatus? status,
  });
  Future<PrescriptionWithDetails?> getById(String id);
  Future<Prescription> insertPrescription(PrescriptionsCompanion entry);
  Future<void> insertPrescriptionItems(
      List<PrescriptionItemsCompanion> items);
  Future<bool> updateStatus(String id, PrescriptionStatus status);
  Future<bool> updateItemDispensedQuantity(
      String itemId, double newQuantity);
}

class PrescriptionDao implements IPrescriptionDao {
  final AppDatabase _db;

  const PrescriptionDao(this._db);

  @override
  Future<List<PrescriptionWithDetails>> getAll(
    String pharmacyId, {
    PrescriptionStatus? status,
  }) async {
    final query = _db.select(_db.prescriptions)
      ..where((tbl) => tbl.pharmacyId.equals(pharmacyId));
    if (status != null) {
      query.where((tbl) => tbl.status.equals(status.index));
    }
    query.orderBy([(tbl) => OrderingTerm.desc(tbl.prescriptionDate)]);

    final prescriptions = await query.get();
    final result = <PrescriptionWithDetails>[];
    for (final p in prescriptions) {
      final details = await getById(p.id);
      if (details != null) {
        result.add(details);
      }
    }
    return result;
  }

  @override
  Stream<List<PrescriptionWithDetails>> watchAll(
    String pharmacyId, {
    PrescriptionStatus? status,
  }) {
    final query = _db.select(_db.prescriptions)
      ..where((tbl) => tbl.pharmacyId.equals(pharmacyId));
    if (status != null) {
      query.where((tbl) => tbl.status.equals(status.index));
    }
    query.orderBy([(tbl) => OrderingTerm.desc(tbl.prescriptionDate)]);

    return query.watch().asyncMap((prescriptions) async {
      final result = <PrescriptionWithDetails>[];
      for (final p in prescriptions) {
        final details = await getById(p.id);
        if (details != null) {
          result.add(details);
        }
      }
      return result;
    });
  }

  @override
  Future<PrescriptionWithDetails?> getById(String id) async {
    final prescription = await (_db.select(_db.prescriptions)
          ..where((tbl) => tbl.id.equals(id)))
        .getSingleOrNull();
    if (prescription == null) return null;

    final patient = await (_db.select(_db.patients)
          ..where((tbl) => tbl.id.equals(prescription.patientId)))
        .getSingle();

    final user = await (_db.select(_db.users)
          ..where((tbl) => tbl.id.equals(prescription.createdById)))
        .getSingle();

    final itemsQuery = _db.select(_db.prescriptionItems).join([
      innerJoin(
        _db.medicines,
        _db.medicines.id.equalsExp(_db.prescriptionItems.medicineId),
      ),
    ])..where(_db.prescriptionItems.prescriptionId.equals(id));

    final itemRows = await itemsQuery.get();
    final items = itemRows.map((row) {
      return PrescriptionItemWithMedicine(
        item: row.readTable(_db.prescriptionItems),
        medicine: row.readTable(_db.medicines),
      );
    }).toList();

    return PrescriptionWithDetails(
      prescription: prescription,
      patient: patient,
      createdBy: user,
      items: items,
    );
  }

  @override
  Future<Prescription> insertPrescription(
      PrescriptionsCompanion entry) async {
    return _db.into(_db.prescriptions).insertReturning(entry);
  }

  @override
  Future<void> insertPrescriptionItems(
      List<PrescriptionItemsCompanion> items) async {
    await _db.batch((b) {
      b.insertAll(_db.prescriptionItems, items);
    });
  }

  @override
  Future<bool> updateStatus(String id, PrescriptionStatus status) async {
    final count = await (_db.update(_db.prescriptions)
          ..where((tbl) => tbl.id.equals(id)))
        .write(
      PrescriptionsCompanion(
        status: Value(status),
        updatedAt: Value(DateTime.now()),
      ),
    );
    return count > 0;
  }

  @override
  Future<bool> updateItemDispensedQuantity(
    String itemId,
    double newQuantity,
  ) async {
    final count = await (_db.update(_db.prescriptionItems)
          ..where((tbl) => tbl.id.equals(itemId)))
        .write(
      PrescriptionItemsCompanion(
        quantityDispensed: Value(newQuantity),
        updatedAt: Value(DateTime.now()),
      ),
    );
    return count > 0;
  }
}
