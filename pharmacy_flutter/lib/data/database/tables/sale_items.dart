import 'package:drift/drift.dart';
import 'medicines.dart';
import 'sales.dart';

@TableIndex(name: 'sale_items_sale_id_idx', columns: {#saleId})
@TableIndex(name: 'sale_items_medicine_id_idx', columns: {#medicineId})
class SaleItems extends Table {
  TextColumn get id => text()();
  TextColumn get saleId => text().references(Sales, #id)();
  TextColumn get medicineId => text().references(Medicines, #id)();
  RealColumn get quantity => real()();
  RealColumn get unitPrice => real()();
  RealColumn get discount => real().withDefault(const Constant(0.0))();
  RealColumn get total => real()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}
