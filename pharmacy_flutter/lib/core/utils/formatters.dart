import 'package:intl/intl.dart';

class AppFormatters {
  AppFormatters._();

  static final NumberFormat _currencyFormat = NumberFormat.currency(
    locale: 'en_US',
    symbol: 'SDG ',
    decimalDigits: 0,
  );

  static final DateFormat _dateFormat = DateFormat('dd/MM/yyyy');
  static final DateFormat _dateTimeFormat = DateFormat('dd/MM/yyyy HH:mm');
  static final DateFormat _dateSqlFormat = DateFormat('yyyy-MM-dd');

  static String currency(num amount) => _currencyFormat.format(amount);

  static String date(DateTime dateTime) => _dateFormat.format(dateTime);

  static String dateTime(DateTime dateTime) => _dateTimeFormat.format(dateTime);

  static String dateSql(DateTime dateTime) => _dateSqlFormat.format(dateTime);

  static String quantity(double qty) {
    if (qty == qty.roundToDouble()) {
      return qty.toInt().toString();
    }
    return qty.toStringAsFixed(2);
  }
}
