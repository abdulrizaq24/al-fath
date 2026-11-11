import 'package:drift/drift.dart';

import '../database/database.dart';

abstract class IPatientDao {
  Future<List<Patient>> getAll(String pharmacyId, {String? searchQuery});
  Stream<List<Patient>> watchAll(String pharmacyId, {String? searchQuery});
  Future<Patient?> getById(String id);
  Future<Patient?> getByPatientNumber(String pharmacyId, String patientNumber);
  Future<Patient> insert(PatientsCompanion entry);
  Future<bool> updatePatient(PatientsCompanion entry);
}

class PatientDao implements IPatientDao {
  final AppDatabase _db;

  const PatientDao(this._db);

  SimpleSelectStatement<$PatientsTable, Patient> _buildQuery(
    String pharmacyId, {
    String? searchQuery,
  }) {
    final query = _db.select(_db.patients)
      ..where((tbl) => tbl.pharmacyId.equals(pharmacyId));

    if (searchQuery != null && searchQuery.trim().isNotEmpty) {
      final term = '%${searchQuery.trim().toLowerCase()}%';
      query.where(
        (tbl) =>
            tbl.firstName.lower().like(term) |
            tbl.lastName.lower().like(term) |
            tbl.patientNumber.lower().like(term) |
            tbl.phone.lower().like(term),
      );
    }

    query.orderBy([(tbl) => OrderingTerm.asc(tbl.firstName)]);
    return query;
  }

  @override
  Future<List<Patient>> getAll(String pharmacyId, {String? searchQuery}) async {
    return _buildQuery(pharmacyId, searchQuery: searchQuery).get();
  }

  @override
  Stream<List<Patient>> watchAll(String pharmacyId, {String? searchQuery}) {
    return _buildQuery(pharmacyId, searchQuery: searchQuery).watch();
  }

  @override
  Future<Patient?> getById(String id) async {
    final query = _db.select(_db.patients)..where((tbl) => tbl.id.equals(id));
    return query.getSingleOrNull();
  }

  @override
  Future<Patient?> getByPatientNumber(
    String pharmacyId,
    String patientNumber,
  ) async {
    final query = _db.select(_db.patients)
      ..where(
        (tbl) =>
            tbl.pharmacyId.equals(pharmacyId) &
            tbl.patientNumber.equals(patientNumber),
      );
    return query.getSingleOrNull();
  }

  @override
  Future<Patient> insert(PatientsCompanion entry) async {
    return _db.into(_db.patients).insertReturning(entry);
  }

  @override
  Future<bool> updatePatient(PatientsCompanion entry) async {
    return _db.update(_db.patients).replace(entry);
  }
}
