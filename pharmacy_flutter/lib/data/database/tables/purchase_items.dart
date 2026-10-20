import 'package:drift/drift.dart';
import 'medicines.dart';
import 'purchases.dart';

@TableIndex(name: 'purchase_items_purchase_id_idx', columns: {#purchaseId})
@TableIndex(name: 'purchase_items_medicine_id_idx', columns: {#medicineId})
class PurchaseItems extends Table {
  TextColumn get id => text()();
  TextColumn get purchaseId => text().references(Purchases, #id)();
  TextColumn get medicineId => text().references(Medicines, #id)();
  RealColumn get orderedQuantity => real()();
  RealColumn get unitCost => real()();
  RealColumn get totalCost => real()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}
