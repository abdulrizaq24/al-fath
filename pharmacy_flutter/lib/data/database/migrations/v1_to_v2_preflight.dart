import 'package:drift/drift.dart';
import 'package:timezone/data/latest_all.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;
import '../../../core/utils/scaled_values.dart';

enum HistoricalExpiryClassification {
  explicitDateOnly,
  ambiguousUtcMidnight,
  ambiguousLocalMidnight,
  nonMidnightTimestamp,
  missingPharmacyTimezone,
  invalidPharmacyTimezone,
  malformedOrUnsupported,
}

enum PreflightViolationType {
  schemaVersion,
  foreignKey,
  excessPrecision,
  overflow,
  negativeValue,
  nonFiniteValue,
  invalidEnum,
  duplicateUniqueKey,
  businessInvariant,
  historicalExpiry,
}

class PreflightViolation {
  final PreflightViolationType type;
  final String table;
  final String? column;
  final String? recordId;
  final String message;

  const PreflightViolation({
    required this.type,
    required this.table,
    this.column,
    this.recordId,
    required this.message,
  });

  @override
  String toString() =>
      '[$type] $table${column != null ? '.$column' : ''}${recordId != null ? ' (id: $recordId)' : ''}: $message';
}

class HistoricalExpiryViolation extends PreflightViolation {
  final String batchId;
  final String pharmacyId;
  final HistoricalExpiryClassification classification;
  final Object? rawValue;
  final String? pharmacyTimezone;

  const HistoricalExpiryViolation({
    required this.batchId,
    required this.pharmacyId,
    required this.classification,
    required this.rawValue,
    required this.pharmacyTimezone,
    required String message,
  }) : super(
          type: PreflightViolationType.historicalExpiry,
          table: 'batches',
          column: 'expiry_date',
          recordId: batchId,
          message: 'batchId=$batchId; pharmacyId=$pharmacyId; rawValue=$rawValue; '
              'pharmacyTimezone=$pharmacyTimezone; classification=$classification; $message',
        );

  @override
  String toString() =>
      '[$type] batches.expiry_date (id: $batchId): $message';
}

class PreflightReport {
  final List<PreflightViolation> violations;
  final Map<String, String> resolvedExpiryDates;

  const PreflightReport(this.violations, [this.resolvedExpiryDates = const {}]);

  bool get isValid => violations.isEmpty;

  void ensureValid() {
    if (!isValid) {
      throw MigrationPreflightException(violations);
    }
  }
}

class MigrationPreflightException implements Exception {
  final List<PreflightViolation> violations;

  MigrationPreflightException(this.violations);

  @override
  String toString() =>
      'MigrationPreflightException: ${violations.length} violation(s) found during preflight:\n'
      '${violations.map((v) => '  - $v').join('\n')}';
}

/// Preflight inspection engine for the version 1 to version 2 migration.
///
/// Validates source data integrity before any table rebuild or migration takes place.
/// Uses [ScaledValueConverter] exact-conversion APIs to reject values requiring rounding.
class V1ToV2MigrationPreflight {
  V1ToV2MigrationPreflight._();

  static Future<(List<HistoricalExpiryViolation>, Map<String, String>)> _historicalExpiryCheck(
    GeneratedDatabase db, {
    Map<String, String>? explicitExpiryDates,
  }) async {
    tz_data.initializeTimeZones();
    final rows = await db.customSelect('''
      SELECT b.id AS batch_id, b.expiry_date, b.pharmacy_id,
             p.timezone AS pharmacy_timezone
      FROM batches b
      LEFT JOIN pharmacies p ON b.pharmacy_id = p.id
      ORDER BY b.id;
    ''').get();
    final violations = <HistoricalExpiryViolation>[];
    final resolvedDates = <String, String>{};
    final batchIds = rows.map((row) => row.data['batch_id']?.toString() ?? '').toSet();
    for (final entry in explicitExpiryDates?.entries ?? const <MapEntry<String, String>>[]) {
      if (!batchIds.contains(entry.key)) {
        violations.add(HistoricalExpiryViolation(
          batchId: entry.key,
          pharmacyId: '',
          classification: HistoricalExpiryClassification.malformedOrUnsupported,
          rawValue: entry.value,
          pharmacyTimezone: null,
          message: 'resolution supplied for unknown batch ID',
        ));
      } else if (_validateCanonicalDate(entry.value) == null) {
        violations.add(HistoricalExpiryViolation(
          batchId: entry.key,
          pharmacyId: '',
          classification: HistoricalExpiryClassification.malformedOrUnsupported,
          rawValue: entry.value,
          pharmacyTimezone: null,
          message: 'explicit resolution is not a canonical YYYY-MM-DD date',
        ));
      }
    }
    for (final row in rows) {
      final data = row.data;
      final batchId = data['batch_id']?.toString() ?? '';
      final pharmacyId = data['pharmacy_id']?.toString() ?? '';
      final raw = explicitExpiryDates?[batchId] ?? data['expiry_date'];
      final timezone = data['pharmacy_timezone']?.toString();
      final result = _classifyExpiry(raw, timezone);
      if (result != null) {
        violations.add(HistoricalExpiryViolation(
          batchId: batchId,
          pharmacyId: pharmacyId,
          classification: result.$1,
          rawValue: raw,
          pharmacyTimezone: timezone,
          message: result.$2,
        ));
      } else {
        resolvedDates[batchId] = raw as String;
      }
    }
    return (violations, resolvedDates);
  }

  static String? _validateCanonicalDate(String value) {
    final parsed = DateTime.tryParse(value);
    if (!RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(value) ||
        parsed == null ||
        _iso(parsed) != value ||
        parsed.year < 1970 ||
        parsed.year > 2100) {
      return null;
    }
    return value;
  }

  static (HistoricalExpiryClassification, String)? _classifyExpiry(
    Object? raw,
    String? timezone,
  ) {
    if (raw is String) {
      final match = RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(raw);
      final parsed = match ? DateTime.tryParse(raw) : null;
      if (parsed != null && _iso(parsed) == raw && parsed.year >= 1970 && parsed.year <= 2100) {
        return null;
      }
      return (HistoricalExpiryClassification.malformedOrUnsupported,
          'invalid canonical YYYY-MM-DD date');
    }
    if (raw is! num || !raw.isFinite || raw < 0 || raw != raw.round()) {
      return (HistoricalExpiryClassification.malformedOrUnsupported,
          'unsupported, fractional, negative, or non-finite Unix-second value');
    }
    final seconds = raw.toInt();
    if (seconds > 253402300799) {
      return (HistoricalExpiryClassification.malformedOrUnsupported,
          'Unix-second value is outside 1970-2100');
    }
    final utc = DateTime.fromMillisecondsSinceEpoch(seconds * 1000, isUtc: true);
    if (timezone == null || timezone.trim().isEmpty) {
      return (HistoricalExpiryClassification.missingPharmacyTimezone,
          'pharmacy timezone is missing');
    }
    late final tz.Location location;
    try {
      location = tz.getLocation(timezone.trim());
    } catch (_) {
      return (HistoricalExpiryClassification.invalidPharmacyTimezone,
          'invalid IANA pharmacy timezone');
    }
    final local = tz.TZDateTime.from(utc, location);
    final utcMidnight = utc.hour == 0 && utc.minute == 0 && utc.second == 0;
    final localMidnight = local.hour == 0 && local.minute == 0 && local.second == 0;
    if (utcMidnight && !localMidnight) {
      return (HistoricalExpiryClassification.ambiguousUtcMidnight,
          'UTC midnight lacks historical provenance');
    }
    if (localMidnight) {
      return (HistoricalExpiryClassification.ambiguousLocalMidnight,
          'pharmacy-local midnight lacks historical provenance');
    }
    return (HistoricalExpiryClassification.nonMidnightTimestamp,
        'timestamp lacks authoritative historical provenance');
  }

  static String _iso(DateTime value) =>
      '${value.year.toString().padLeft(4, '0')}-${value.month.toString().padLeft(2, '0')}-${value.day.toString().padLeft(2, '0')}';

  static Future<PreflightReport> run(
    GeneratedDatabase db, {
    Map<String, String>? explicitExpiryDates,
  }) async {
    final violations = <PreflightViolation>[];

    // 1. Validate Schema Version
    final userVersionRow = await db.customSelect('PRAGMA user_version;').getSingle();
    final userVersion = userVersionRow.data.values.first as int? ?? 0;
    if (userVersion != 1 && userVersion != 0) {
      violations.add(PreflightViolation(
        type: PreflightViolationType.schemaVersion,
        table: 'schema',
        message: 'Expected schema version 1, found user_version=$userVersion',
      ));
    }

    // 2. Historical expiry validation. This runs before any migration target work.
    final expiryCheck = await _historicalExpiryCheck(
      db,
      explicitExpiryDates: explicitExpiryDates,
    );
    violations.addAll(expiryCheck.$1);

    // 3. Foreign Key Integrity Check
    final fkCheckRows = await db.customSelect('PRAGMA foreign_key_check;').get();
    for (final row in fkCheckRows) {
      final childTable = row.data['table']?.toString() ?? 'unknown';
      final rowid = row.data['rowid']?.toString() ?? 'unknown';
      final parentTable = row.data['parent']?.toString() ?? 'unknown';
      violations.add(PreflightViolation(
        type: PreflightViolationType.foreignKey,
        table: childTable,
        recordId: rowid,
        message: 'Foreign key constraint violated; referenced row in $parentTable is missing.',
      ));
    }

    // 3. Monetary Fields Validation (Scale 100)
    final moneyFields = <(String table, String column, bool allowNegative)>[
      ('medicines', 'selling_price', false),
      ('batches', 'purchase_price', false),
      ('purchases', 'total_amount', false),
      ('purchase_items', 'unit_cost', false),
      ('purchase_items', 'total_cost', false),
      ('purchase_receipt_items', 'unit_cost', false),
      ('sales', 'subtotal', false),
      ('sales', 'discount', false),
      ('sales', 'tax', false),
      ('sales', 'total', false),
      ('sale_items', 'unit_price', false),
      ('sale_items', 'discount', false),
      ('sale_items', 'total', false),
      ('payments', 'amount', false),
    ];

    for (final (table, column, allowNegative) in moneyFields) {
      final rows = await db.customSelect('SELECT id, $column AS val FROM $table WHERE $column IS NOT NULL;').get();
      for (final r in rows) {
        final id = r.data['id']?.toString();
        final raw = r.data['val'];
        if (raw is! num) continue;

        if (raw is double && (!raw.isFinite || raw.isNaN)) {
          violations.add(PreflightViolation(
            type: PreflightViolationType.nonFiniteValue,
            table: table,
            column: column,
            recordId: id,
            message: 'Non-finite monetary value: $raw',
          ));
          continue;
        }

        if (!allowNegative && raw < 0) {
          violations.add(PreflightViolation(
            type: PreflightViolationType.negativeValue,
            table: table,
            column: column,
            recordId: id,
            message: 'Negative monetary value not allowed: $raw',
          ));
          continue;
        }

        if (ScaledValueConverter.hasExcessMoneyPrecision(raw)) {
          violations.add(PreflightViolation(
            type: PreflightViolationType.excessPrecision,
            table: table,
            column: column,
            recordId: id,
            message: 'Unsupported monetary precision (requires rounding at scale 100): $raw',
          ));
          continue;
        }

        try {
          ScaledValueConverter.moneyToStorageExact(raw);
        } on RangeError {
          violations.add(PreflightViolation(
            type: PreflightViolationType.overflow,
            table: table,
            column: column,
            recordId: id,
            message: 'Monetary value overflows signed 64-bit integer limits: $raw',
          ));
        } catch (_) {}
      }
    }

    // 4. Quantity Fields Validation (Scale 1,000)
    final quantityFields = <(String table, String column, bool allowNegative)>[
      ('medicines', 'reorder_level', false),
      ('medicine_packages', 'quantity_in_base_units', false),
      ('batches', 'received_quantity', false),
      ('batches', 'current_quantity', false),
      ('purchase_items', 'ordered_quantity', false),
      ('purchase_receipt_items', 'quantity_received', false),
      ('prescription_items', 'quantity_prescribed', false),
      ('prescription_items', 'quantity_dispensed', false),
      ('sale_items', 'quantity', false),
      ('sale_item_batches', 'quantity', false),
      ('inventory_transactions', 'quantity', true), // Deltas can be negative
    ];

    for (final (table, column, allowNegative) in quantityFields) {
      final rows = await db.customSelect('SELECT id, $column AS val FROM $table WHERE $column IS NOT NULL;').get();
      for (final r in rows) {
        final id = r.data['id']?.toString();
        final raw = r.data['val'];
        if (raw is! num) continue;

        if (raw is double && (!raw.isFinite || raw.isNaN)) {
          violations.add(PreflightViolation(
            type: PreflightViolationType.nonFiniteValue,
            table: table,
            column: column,
            recordId: id,
            message: 'Non-finite quantity value: $raw',
          ));
          continue;
        }

        if (!allowNegative && raw < 0) {
          violations.add(PreflightViolation(
            type: PreflightViolationType.negativeValue,
            table: table,
            column: column,
            recordId: id,
            message: 'Negative quantity not allowed: $raw',
          ));
          continue;
        }

        if (ScaledValueConverter.hasExcessQuantityPrecision(raw)) {
          violations.add(PreflightViolation(
            type: PreflightViolationType.excessPrecision,
            table: table,
            column: column,
            recordId: id,
            message: 'Unsupported quantity precision (requires rounding at scale 1000): $raw',
          ));
          continue;
        }

        try {
          ScaledValueConverter.quantityToStorageExact(raw);
        } on RangeError {
          violations.add(PreflightViolation(
            type: PreflightViolationType.overflow,
            table: table,
            column: column,
            recordId: id,
            message: 'Quantity overflows signed 64-bit integer limits: $raw',
          ));
        } catch (_) {}
      }
    }

    // 5. Integer-backed Enum Ranges
    final enumFields = <(String table, String column, String enumName, int maxAllowed)>[
      ('roles', 'name', 'RoleName', 1),
      ('medicines', 'prescription_status', 'ControlledStatus', 2),
      ('purchases', 'status', 'PurchaseStatus', 4),
      ('prescriptions', 'status', 'PrescriptionStatus', 3),
      ('sales', 'status', 'SaleStatus', 3),
      ('payments', 'payment_method', 'PaymentMethod', 4),
      ('payments', 'status', 'PaymentStatus', 3),
      ('inventory_transactions', 'transaction_type', 'InventoryTransactionType', 6),
      ('inventory_transactions', 'reference_type', 'ReferenceType', 5),
    ];

    for (final (table, column, enumName, maxAllowed) in enumFields) {
      final rows = await db.customSelect(
        'SELECT id, $column AS val FROM $table WHERE $column < 0 OR $column > $maxAllowed;',
      ).get();
      for (final r in rows) {
        final id = r.data['id']?.toString();
        final val = r.data['val'];
        violations.add(PreflightViolation(
          type: PreflightViolationType.invalidEnum,
          table: table,
          column: column,
          recordId: id,
          message: 'Invalid enum value $val for $enumName (allowed range: 0..$maxAllowed)',
        ));
      }
    }

    // 6. Composite Unique Constraints (Future Version 2 Constraints)
    final compositeConstraints = <(String table, List<String> columns)>[
      ('categories', ['pharmacy_id', 'name']),
      ('batches', ['pharmacy_id', 'medicine_id', 'batch_number']),
      ('purchases', ['pharmacy_id', 'purchase_number']),
      ('purchase_receipts', ['pharmacy_id', 'receipt_number']),
      ('patients', ['pharmacy_id', 'patient_number']),
      ('prescriptions', ['pharmacy_id', 'prescription_number']),
      ('sales', ['pharmacy_id', 'invoice_number']),
    ];

    for (final (table, columns) in compositeConstraints) {
      final colsJoined = columns.join(', ');
      final rows = await db.customSelect(
        'SELECT $colsJoined, COUNT(*) AS cnt FROM $table GROUP BY $colsJoined HAVING cnt > 1;',
      ).get();
      for (final r in rows) {
        final count = r.data['cnt'];
        violations.add(PreflightViolation(
          type: PreflightViolationType.duplicateUniqueKey,
          table: table,
          column: '($colsJoined)',
          message: 'Duplicate key in target composite constraint ($colsJoined): $count occurrences',
        ));
      }
    }

    // 7. Business Invariants
    // Prescription items: quantityDispensed cannot exceed quantityPrescribed
    final rxQtyRows = await db.customSelect(
      'SELECT id, quantity_prescribed, quantity_dispensed FROM prescription_items WHERE quantity_dispensed > quantity_prescribed;',
    ).get();
    for (final r in rxQtyRows) {
      final id = r.data['id']?.toString();
      final prescribed = r.data['quantity_prescribed'];
      final dispensed = r.data['quantity_dispensed'];
      violations.add(PreflightViolation(
        type: PreflightViolationType.businessInvariant,
        table: 'prescription_items',
        recordId: id,
        message: 'Dispensed quantity ($dispensed) exceeds prescribed quantity ($prescribed)',
      ));
    }

    return PreflightReport(violations, expiryCheck.$2);
  }
}
