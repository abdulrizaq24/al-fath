import 'package:drift/drift.dart';

import '../../../core/utils/scaled_values.dart';

/// Production-owned v1 -> v2 row-copy mapping.
/// Callers must run V1ToV2MigrationPreflight before invoking this component.
class V1ToV2Copy {
  V1ToV2Copy._();

  static const orderedTables = <String>[
    'pharmacies', 'roles', 'users', 'categories', 'medicines',
    'medicine_packages', 'batches', 'suppliers', 'purchases', 'purchase_items',
    'purchase_receipts', 'purchase_receipt_items', 'patients', 'prescriptions',
    'prescription_items', 'sales', 'sale_items', 'sale_item_batches', 'payments',
    'inventory_transactions', 'audit_logs',
  ];

  static Future<void> copyAll(
    GeneratedDatabase source,
    GeneratedDatabase target, {
    required Map<String, String> resolvedExpiryDates,
    Future<void> Function(GeneratedDatabase target, String table, int rowCount)? onTableCopied,
  }) async {
    for (final table in orderedTables) {
      final sourceRows = await source.customSelect('SELECT * FROM $table;').get();
      for (final row in sourceRows) {
        final values = <String, Object?>{};
        for (final entry in row.data.entries) {
          final column = table == 'audit_logs' && entry.key == 'user_id' ? 'actor_id' : entry.key;
          if (table == 'batches' && column == 'expiry_date') {
            final batchId = row.data['id']?.toString() ?? '';
            final expiry = resolvedExpiryDates[batchId];
            if (expiry == null) throw StateError('Missing converted expiry date for batch $batchId');
            values[column] = expiry;
          } else {
            values[column] = _convertedValue(entry.key, entry.value);
          }
        }
        final columns = values.keys.toList();
        await target.customStatement(
          'INSERT INTO $table (${columns.join(', ')}) VALUES (${List.filled(columns.length, '?').join(', ')});',
          values.values.toList(),
        );
      }
      if (onTableCopied != null) await onTableCopied(target, table, sourceRows.length);
    }
  }

  static const _timestampColumns = <String>{
    'created_at', 'updated_at', 'last_login_at', 'received_at', 'purchase_date',
    'expected_date', 'date_of_birth', 'prescription_date', 'sale_date', 'paid_at',
  };

  static const _moneyColumns = <String>{
    'selling_price', 'purchase_price', 'total_amount', 'unit_cost', 'total_cost',
    'subtotal', 'discount', 'tax', 'total', 'unit_price', 'amount',
  };

  static const _quantityColumns = <String>{
    'reorder_level', 'quantity_in_base_units', 'received_quantity', 'current_quantity',
    'ordered_quantity', 'quantity_received', 'quantity_prescribed', 'quantity_dispensed',
    'quantity',
  };

  static Object? _convertedValue(String column, Object? value) {
    if (value == null) return null;
    if (value is DateTime) return value.millisecondsSinceEpoch;
    if (value is num && _timestampColumns.contains(column)) return value.toInt() * 1000;
    if (value is! num) return value;
    if (_moneyColumns.contains(column)) return ScaledValueConverter.moneyToStorageExact(value);
    if (_quantityColumns.contains(column)) return ScaledValueConverter.quantityToStorageExact(value);
    return value;
  }
}
