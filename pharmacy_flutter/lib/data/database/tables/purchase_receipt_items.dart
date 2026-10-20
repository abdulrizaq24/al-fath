import 'package:drift/drift.dart';
import 'batches.dart';
import 'purchase_items.dart';
import 'purchase_receipts.dart';

@TableIndex(
  name: 'purchase_receipt_items_receipt_id_idx',
  columns: {#receiptId},
)
@TableIndex(
  name: 'purchase_receipt_items_purchase_item_id_idx',
  columns: {#purchaseItemId},
)
@TableIndex(name: 'purchase_receipt_items_batch_id_idx', columns: {#batchId})
class PurchaseReceiptItems extends Table {
  TextColumn get id => text()();
  TextColumn get receiptId => text().references(PurchaseReceipts, #id)();
  TextColumn get purchaseItemId => text().references(PurchaseItems, #id)();
  TextColumn get batchId => text().references(Batches, #id)();
  RealColumn get quantityReceived => real()();
  RealColumn get unitCost => real()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}
