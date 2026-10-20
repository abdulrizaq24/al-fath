import 'package:drift/drift.dart';
import '../../../domain/enums/app_enums.dart';
import 'patients.dart';
import 'pharmacies.dart';
import 'users.dart';

@TableIndex(name: 'prescriptions_pharmacy_id_idx', columns: {#pharmacyId})
@TableIndex(name: 'prescriptions_patient_id_idx', columns: {#patientId})
class Prescriptions extends Table {
  TextColumn get id => text()();
  TextColumn get pharmacyId => text().references(Pharmacies, #id)();
  TextColumn get patientId => text().references(Patients, #id)();
  TextColumn get createdById => text().references(Users, #id)();
  TextColumn get prescriptionNumber => text()();
  TextColumn get prescriberName => text()();
  DateTimeColumn get prescriptionDate => dateTime()();
  IntColumn get status =>
      intEnum<PrescriptionStatus>().withDefault(const Constant(0))();
  TextColumn get notes => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<Set<Column>> get uniqueKeys => [
    {pharmacyId, prescriptionNumber},
  ];
}
