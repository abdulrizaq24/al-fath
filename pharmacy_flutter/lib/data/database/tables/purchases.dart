import 'package:drift/drift.dart';
import '../../../domain/enums/app_enums.dart';
import 'pharmacies.dart';
import 'suppliers.dart';

@TableIndex(name: 'purchases_pharmacy_id_idx', columns: {#pharmacyId})
@TableIndex(name: 'purchases_supplier_id_idx', columns: {#supplierId})
@TableIndex(name: 'purchases_status_idx', columns: {#status})
class Purchases extends Table {
  TextColumn get id => text()();
  TextColumn get pharmacyId => text().references(Pharmacies, #id)();
  TextColumn get supplierId => text().references(Suppliers, #id)();
  TextColumn get createdById => text().nullable()();
  TextColumn get purchaseNumber => text()();
  IntColumn get status =>
      intEnum<PurchaseStatus>().withDefault(const Constant(0))();
  IntColumn get purchaseDate => integer().withDefault(const Constant(0))();
  IntColumn get expectedDate => integer().nullable()();
  IntColumn get totalAmount => integer().withDefault(const Constant(0))();
  TextColumn get notes => text().nullable()();
  IntColumn get createdAt => integer().withDefault(const Constant(0))();
  IntColumn get updatedAt => integer().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<Set<Column>> get uniqueKeys => [
    {pharmacyId, purchaseNumber},
  ];
}
