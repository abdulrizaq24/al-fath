import 'package:drift/drift.dart';
import '../../../domain/enums/app_enums.dart';
import 'patients.dart';
import 'pharmacies.dart';

@TableIndex(name: 'sales_pharmacy_id_idx', columns: {#pharmacyId})
@TableIndex(name: 'sales_patient_id_idx', columns: {#patientId})
@TableIndex(name: 'sales_sale_date_idx', columns: {#saleDate})
class Sales extends Table {
  TextColumn get id => text()();
  TextColumn get pharmacyId => text().references(Pharmacies, #id)();
  TextColumn get patientId => text().nullable().references(Patients, #id, onDelete: KeyAction.setNull)();
  TextColumn get soldById => text().nullable()();
  TextColumn get invoiceNumber => text()();
  IntColumn get subtotal => integer()();
  IntColumn get discount => integer().withDefault(const Constant(0))();
  IntColumn get tax => integer().withDefault(const Constant(0))();
  IntColumn get total => integer()();
  IntColumn get status =>
      intEnum<SaleStatus>().withDefault(const Constant(0))();
  IntColumn get saleDate => integer().withDefault(const Constant(0))();
  IntColumn get createdAt => integer().withDefault(const Constant(0))();
  IntColumn get updatedAt => integer().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<Set<Column>> get uniqueKeys => [
    {pharmacyId, invoiceNumber},
  ];
}
