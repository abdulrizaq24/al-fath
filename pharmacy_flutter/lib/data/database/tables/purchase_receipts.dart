import 'package:drift/drift.dart';
import 'pharmacies.dart';
import 'purchases.dart';

@TableIndex(name: 'purchase_receipts_purchase_id_idx', columns: {#purchaseId})
class PurchaseReceipts extends Table {
  TextColumn get id => text()();
  TextColumn get pharmacyId => text().references(Pharmacies, #id)();
  TextColumn get purchaseId => text().references(Purchases, #id)();
  TextColumn get createdById => text().nullable()();
  TextColumn get receiptNumber => text()();
  IntColumn get receivedAt => integer().withDefault(const Constant(0))();
  TextColumn get notes => text().nullable()();
  IntColumn get createdAt => integer().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<Set<Column>> get uniqueKeys => [
    {pharmacyId, receiptNumber},
  ];
}
