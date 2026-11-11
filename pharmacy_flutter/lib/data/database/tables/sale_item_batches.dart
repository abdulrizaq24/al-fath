import 'package:drift/drift.dart';
import 'batches.dart';
import 'sale_items.dart';

@TableIndex(name: 'sale_item_batches_sale_item_id_idx', columns: {#saleItemId})
@TableIndex(name: 'sale_item_batches_batch_id_idx', columns: {#batchId})
class SaleItemBatches extends Table {
  TextColumn get id => text()();
  TextColumn get saleItemId => text().references(SaleItems, #id)();
  TextColumn get batchId => text().references(Batches, #id)();
  IntColumn get quantity => integer()();
  IntColumn get createdAt => integer().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {id};
}
