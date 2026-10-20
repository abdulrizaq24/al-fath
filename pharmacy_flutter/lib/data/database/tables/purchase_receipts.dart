import 'package:drift/drift.dart';
import 'pharmacies.dart';
import 'purchases.dart';
import 'users.dart';

@TableIndex(name: 'purchase_receipts_purchase_id_idx', columns: {#purchaseId})
class PurchaseReceipts extends Table {
  TextColumn get id => text()();
  TextColumn get pharmacyId => text().references(Pharmacies, #id)();
  TextColumn get purchaseId => text().references(Purchases, #id)();
  TextColumn get createdById => text().references(Users, #id)();
  TextColumn get receiptNumber => text()();
  DateTimeColumn get receivedAt => dateTime().withDefault(currentDateAndTime)();
  TextColumn get notes => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<Set<Column>> get uniqueKeys => [
    {pharmacyId, receiptNumber},
  ];
}
