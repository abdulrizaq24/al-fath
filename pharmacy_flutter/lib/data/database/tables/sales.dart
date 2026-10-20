import 'package:drift/drift.dart';
import '../../../domain/enums/app_enums.dart';
import 'patients.dart';
import 'pharmacies.dart';
import 'users.dart';

@TableIndex(name: 'sales_pharmacy_id_idx', columns: {#pharmacyId})
@TableIndex(name: 'sales_patient_id_idx', columns: {#patientId})
@TableIndex(name: 'sales_sale_date_idx', columns: {#saleDate})
class Sales extends Table {
  TextColumn get id => text()();
  TextColumn get pharmacyId => text().references(Pharmacies, #id)();
  TextColumn get patientId => text().nullable().references(Patients, #id)();
  TextColumn get soldById => text().references(Users, #id)();
  TextColumn get invoiceNumber => text()();
  RealColumn get subtotal => real()();
  RealColumn get discount => real().withDefault(const Constant(0.0))();
  RealColumn get tax => real().withDefault(const Constant(0.0))();
  RealColumn get total => real()();
  IntColumn get status =>
      intEnum<SaleStatus>().withDefault(const Constant(0))();
  DateTimeColumn get saleDate => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<Set<Column>> get uniqueKeys => [
    {pharmacyId, invoiceNumber},
  ];
}
