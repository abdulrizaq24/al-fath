import 'package:drift/drift.dart';
import '../../../domain/enums/app_enums.dart';
import 'sales.dart';

@TableIndex(name: 'payments_sale_id_idx', columns: {#saleId})
class Payments extends Table {
  TextColumn get id => text()();
  TextColumn get saleId => text().references(Sales, #id)();
  IntColumn get paymentMethod => intEnum<PaymentMethod>()();
  IntColumn get amount => integer()();
  IntColumn get status =>
      intEnum<PaymentStatus>().withDefault(const Constant(1))();
  TextColumn get transactionReference => text().nullable()();
  IntColumn get paidAt => integer().withDefault(const Constant(0))();
  IntColumn get createdAt => integer().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {id};
}
