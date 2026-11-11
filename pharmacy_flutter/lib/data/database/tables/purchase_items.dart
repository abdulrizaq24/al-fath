import 'package:drift/drift.dart';
import 'medicines.dart';
import 'purchases.dart';

@TableIndex(name: 'purchase_items_purchase_id_idx', columns: {#purchaseId})
@TableIndex(name: 'purchase_items_medicine_id_idx', columns: {#medicineId})
class PurchaseItems extends Table {
  TextColumn get id => text()();
  TextColumn get purchaseId => text().references(Purchases, #id)();
  TextColumn get medicineId => text().references(Medicines, #id)();
  IntColumn get orderedQuantity => integer()();
  IntColumn get unitCost => integer()();
  IntColumn get totalCost => integer()();
  IntColumn get createdAt => integer().withDefault(const Constant(0))();
  IntColumn get updatedAt => integer().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {id};
}
