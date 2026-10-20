import 'package:drift/drift.dart';
import '../../../domain/enums/app_enums.dart';
import 'pharmacies.dart';
import 'suppliers.dart';
import 'users.dart';

@TableIndex(name: 'purchases_pharmacy_id_idx', columns: {#pharmacyId})
@TableIndex(name: 'purchases_supplier_id_idx', columns: {#supplierId})
@TableIndex(name: 'purchases_status_idx', columns: {#status})
class Purchases extends Table {
  TextColumn get id => text()();
  TextColumn get pharmacyId => text().references(Pharmacies, #id)();
  TextColumn get supplierId => text().references(Suppliers, #id)();
  TextColumn get createdById => text().references(Users, #id)();
  TextColumn get purchaseNumber => text()();
  IntColumn get status =>
      intEnum<PurchaseStatus>().withDefault(const Constant(0))();
  DateTimeColumn get purchaseDate =>
      dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get expectedDate => dateTime().nullable()();
  RealColumn get totalAmount => real().withDefault(const Constant(0.0))();
  TextColumn get notes => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<Set<Column>> get uniqueKeys => [
    {pharmacyId, purchaseNumber},
  ];
}
