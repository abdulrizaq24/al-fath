import 'package:drift/drift.dart';
import 'medicines.dart';
import 'sales.dart';

@TableIndex(name: 'sale_items_sale_id_idx', columns: {#saleId})
@TableIndex(name: 'sale_items_medicine_id_idx', columns: {#medicineId})
class SaleItems extends Table {
  TextColumn get id => text()();
  TextColumn get saleId => text().references(Sales, #id)();
  TextColumn get medicineId => text().references(Medicines, #id)();
  IntColumn get quantity => integer()();
  IntColumn get unitPrice => integer()();
  IntColumn get discount => integer().withDefault(const Constant(0))();
  IntColumn get total => integer()();
  IntColumn get createdAt => integer().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {id};
}
