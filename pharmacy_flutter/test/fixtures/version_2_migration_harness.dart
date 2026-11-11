import 'package:drift/drift.dart' as drift;
import 'package:drift/native.dart';
import 'package:pharmacy_flutter/data/database/database.dart';
import 'package:pharmacy_flutter/data/database/migrations/v1_to_v2_preflight.dart';
import 'package:pharmacy_flutter/data/database/migrations/v1_to_v2_copy.dart';
import 'package:timezone/data/latest_all.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

import 'version_2_schema.dart';

class MigrationFailureInjectionException implements Exception {
  final String message;
  const MigrationFailureInjectionException(this.message);

  @override
  String toString() => 'MigrationFailureInjectionException: $message';
}

/// Classification status for historical batch expiry values during v1 -> v2 preflight.
enum HistoricalExpiryClassification {
  /// Date is explicitly provided as a canonical ISO YYYY-MM-DD date string.
  explicitDateOnly,

  /// Instant has proven authoritative pharmacy-local calendar date evidence
  /// in a valid, verified IANA timezone.
  authoritativePharmacyLocalTimestamp,

  /// Timestamp falls at local midnight for the device or an assumed zone, but
  /// lacks authoritative historical provenance for the pharmacy.
  ambiguousLocalMidnight,

  /// Timestamp falls at exact UTC midnight (00:00:00 UTC), but pharmacy timezone
  /// is not UTC, causing ambiguity about whether it was recorded relative to UTC
  /// or a local calendar day.
  ambiguousUtcMidnight,

  /// Timestamp contains arbitrary non-midnight time components (hour/minute/second)
  /// without authoritative provenance.
  nonMidnightTimestamp,

  /// Interpreted calendar date differs across relevant timezones (pharmacy vs UTC vs device),
  /// creating an unresolved boundary discrepancy.
  timezoneDateDisagreement,

  /// Associated pharmacy has a missing (null or blank) timezone.
  missingPharmacyTimezone,

  /// Associated pharmacy has an invalid or unrecognized IANA timezone.
  invalidPharmacyTimezone,

  /// Expiry value is null, negative, non-finite, out of supported calendar range (1970-2100),
  /// or has an invalid/malformed string or type.
  malformedOrUnsupported,
}

class HistoricalExpiryClassificationResult {
  final HistoricalExpiryClassification classification;
  final String? isoDate;
  final Object? rawValue;
  final String? pharmacyTimezone;
  final String message;

  const HistoricalExpiryClassificationResult({
    required this.classification,
    this.isoDate,
    required this.rawValue,
    required this.pharmacyTimezone,
    required this.message,
  });

  bool get isMigratable =>
      classification == HistoricalExpiryClassification.explicitDateOnly ||
      classification ==
          HistoricalExpiryClassification.authoritativePharmacyLocalTimestamp;

  @override
  String toString() =>
      '[$classification] raw: $rawValue, tz: $pharmacyTimezone, isoDate: $isoDate - $message';
}

class HistoricalExpiryViolation {
  final String batchId;
  final String pharmacyId;
  final HistoricalExpiryClassification classification;
  final Object? rawValue;
  final String? pharmacyTimezone;
  final String message;

  const HistoricalExpiryViolation({
    required this.batchId,
    required this.pharmacyId,
    required this.classification,
    required this.rawValue,
    required this.pharmacyTimezone,
    required this.message,
  });

  @override
  String toString() =>
      'Batch "$batchId" (pharmacy "$pharmacyId"): [$classification] '
      'raw=$rawValue, tz=$pharmacyTimezone - $message';
}

class HistoricalExpiryPreflightReport {
  final List<HistoricalExpiryViolation> violations;
  final Map<String, String> resolvedDates;

  const HistoricalExpiryPreflightReport({
    required this.violations,
    required this.resolvedDates,
  });

  bool get isValid => violations.isEmpty;

  void ensureValid() {
    if (!isValid) {
      throw HistoricalExpiryPreflightException(violations);
    }
  }
}

class HistoricalExpiryPreflightException implements Exception {
  final List<HistoricalExpiryViolation> violations;
  const HistoricalExpiryPreflightException(this.violations);

  @override
  String toString() =>
      'HistoricalExpiryPreflightException: ${violations.length} unresolved/ambiguous expiry value(s) blocked migration:\n'
      '${violations.map((v) => '  - $v').join('\n')}';
}

/// Conservative classifier for legacy batch expiry values using verified IANA timezone data.
class HistoricalExpiryClassifier {
  HistoricalExpiryClassifier._();

  static bool _tzInitialized = false;

  static void ensureInitialized() {
    if (!_tzInitialized) {
      tz_data.initializeTimeZones();
      _tzInitialized = true;
    }
  }

  static HistoricalExpiryClassificationResult classify({
    required Object? rawValue,
    required String? pharmacyTimezone,
    bool isAuthoritative = false,
  }) {
    ensureInitialized();

    // 1. Check for null or unsupported types
    if (rawValue == null) {
      return const HistoricalExpiryClassificationResult(
        classification: HistoricalExpiryClassification.malformedOrUnsupported,
        rawValue: null,
        pharmacyTimezone: null,
        message: 'Expiry date is null',
      );
    }

    // 2. Check for explicit ISO date-only string input (YYYY-MM-DD)
    if (rawValue is String) {
      final isoRegex = RegExp(r'^\d{4}-\d{2}-\d{2}$');
      if (isoRegex.hasMatch(rawValue)) {
        final parsed = DateTime.tryParse(rawValue);
        if (parsed != null &&
            parsed.year >= 1970 &&
            parsed.year <= 2100 &&
            _formatIso(parsed) == rawValue) {
          return HistoricalExpiryClassificationResult(
            classification: HistoricalExpiryClassification.explicitDateOnly,
            isoDate: rawValue,
            rawValue: rawValue,
            pharmacyTimezone: pharmacyTimezone,
            message: 'Explicit canonical date-only value',
          );
        }
      }
      return HistoricalExpiryClassificationResult(
        classification: HistoricalExpiryClassification.malformedOrUnsupported,
        rawValue: rawValue,
        pharmacyTimezone: pharmacyTimezone,
        message:
            'Expiry string "$rawValue" is not a valid ISO YYYY-MM-DD date between 1970 and 2100',
      );
    }

    if (rawValue is! num) {
      return HistoricalExpiryClassificationResult(
        classification: HistoricalExpiryClassification.malformedOrUnsupported,
        rawValue: rawValue,
        pharmacyTimezone: pharmacyTimezone,
        message: 'Unsupported type for expiry date: ${rawValue.runtimeType}',
      );
    }

    if (!rawValue.isFinite) {
      return HistoricalExpiryClassificationResult(
        classification: HistoricalExpiryClassification.malformedOrUnsupported,
        rawValue: rawValue,
        pharmacyTimezone: pharmacyTimezone,
        message: 'Expiry timestamp is non-finite: $rawValue',
      );
    }

    if (rawValue < 0) {
      return HistoricalExpiryClassificationResult(
        classification: HistoricalExpiryClassification.malformedOrUnsupported,
        rawValue: rawValue,
        pharmacyTimezone: pharmacyTimezone,
        message: 'Expiry timestamp is negative: $rawValue',
      );
    }

    // The v1 Drift fixture exposes DateTime INTEGER values as whole Unix
    // seconds. Milliseconds and fractional seconds are not part of this
    // source contract and are rejected rather than guessed or truncated.
    if (rawValue != rawValue.round()) {
      return HistoricalExpiryClassificationResult(
        classification: HistoricalExpiryClassification.malformedOrUnsupported,
        rawValue: rawValue,
        pharmacyTimezone: pharmacyTimezone,
        message: 'Fractional Unix-second expiry values are unsupported',
      );
    }
    if (rawValue > 253402300799) {
      return HistoricalExpiryClassificationResult(
        classification: HistoricalExpiryClassification.malformedOrUnsupported,
        rawValue: rawValue,
        pharmacyTimezone: pharmacyTimezone,
        message: 'Unix-second expiry is outside the supported 1970-2100 range',
      );
    }
    final seconds = rawValue.toInt();
    if (seconds < 0) {
      return HistoricalExpiryClassificationResult(
        classification: HistoricalExpiryClassification.malformedOrUnsupported,
        rawValue: rawValue,
        pharmacyTimezone: pharmacyTimezone,
        message: 'Unix-second expiry is outside the supported 1970-2100 range',
      );
    }
    final instantUtc = DateTime.fromMillisecondsSinceEpoch(
      seconds * 1000,
      isUtc: true,
    );
    if (instantUtc.year < 1970 || instantUtc.year > 2100) {
      return HistoricalExpiryClassificationResult(
        classification: HistoricalExpiryClassification.malformedOrUnsupported,
        rawValue: rawValue,
        pharmacyTimezone: pharmacyTimezone,
        message:
            'Expiry timestamp year ${instantUtc.year} outside supported range 1970-2100',
      );
    }

    // 3. Validate pharmacy timezone
    final trimmedTz = pharmacyTimezone?.trim();
    if (trimmedTz == null || trimmedTz.isEmpty) {
      return HistoricalExpiryClassificationResult(
        classification: HistoricalExpiryClassification.missingPharmacyTimezone,
        rawValue: rawValue,
        pharmacyTimezone: pharmacyTimezone,
        message: 'Pharmacy timezone is missing or blank',
      );
    }

    final tz.Location location;
    try {
      location = tz.getLocation(trimmedTz);
    } catch (_) {
      return HistoricalExpiryClassificationResult(
        classification: HistoricalExpiryClassification.invalidPharmacyTimezone,
        rawValue: rawValue,
        pharmacyTimezone: pharmacyTimezone,
        message: 'Unrecognized IANA timezone: "$trimmedTz"',
      );
    }

    // 4. Timezone-aware date calculations
    final local = tz.TZDateTime.from(instantUtc, location);
    final localDate = _formatIso(local);
    final isLocalMidnight =
        local.hour == 0 &&
        local.minute == 0 &&
        local.second == 0 &&
        local.millisecond == 0;
    final isUtcMidnight =
        instantUtc.hour == 0 &&
        instantUtc.minute == 0 &&
        instantUtc.second == 0 &&
        instantUtc.millisecond == 0;
    // If authoritative synthetic metadata proves this pharmacy-local calendar date:
    if (isAuthoritative) {
      return HistoricalExpiryClassificationResult(
        classification:
            HistoricalExpiryClassification.authoritativePharmacyLocalTimestamp,
        isoDate: localDate,
        rawValue: rawValue,
        pharmacyTimezone: trimmedTz,
        message:
            'Authoritative timestamp interpreted in pharmacy timezone $trimmedTz',
      );
    }

    // Unresolved historical timestamps without proven provenance block migration:
    if (isUtcMidnight && !isLocalMidnight) {
      return HistoricalExpiryClassificationResult(
        classification: HistoricalExpiryClassification.ambiguousUtcMidnight,
        rawValue: rawValue,
        pharmacyTimezone: trimmedTz,
        message:
            'Timestamp is UTC midnight, but not pharmacy midnight in $trimmedTz (local time: ${_formatTime(local)})',
      );
    }

    if (isLocalMidnight) {
      return HistoricalExpiryClassificationResult(
        classification: HistoricalExpiryClassification.ambiguousLocalMidnight,
        rawValue: rawValue,
        pharmacyTimezone: trimmedTz,
        message:
            'Local midnight timestamp lacks authoritative historical provenance for pharmacy $trimmedTz',
      );
    }

    return HistoricalExpiryClassificationResult(
      classification: HistoricalExpiryClassification.nonMidnightTimestamp,
      rawValue: rawValue,
      pharmacyTimezone: trimmedTz,
      message:
          'Non-midnight timestamp (${_formatTime(local)}) lacks authoritative historical provenance',
    );
  }

  static String _formatIso(DateTime dt) =>
      '${dt.year.toString().padLeft(4, '0')}-'
      '${dt.month.toString().padLeft(2, '0')}-'
      '${dt.day.toString().padLeft(2, '0')}';

  static String _formatTime(DateTime dt) =>
      '${dt.hour.toString().padLeft(2, '0')}:'
      '${dt.minute.toString().padLeft(2, '0')}:'
      '${dt.second.toString().padLeft(2, '0')}';
}

/// Preflight inspection engine for historical expiry values.
class HistoricalExpiryPreflight {
  HistoricalExpiryPreflight._();

  static Future<HistoricalExpiryPreflightReport> run(
    drift.GeneratedDatabase db, {
    Set<String>? authoritativeBatchIds,
    Map<String, String>? explicitExpiryDates,
  }) async {
    final violations = <HistoricalExpiryViolation>[];
    final resolvedDates = <String, String>{};

    final rows = await db.customSelect('''
      SELECT b.id AS batch_id, b.expiry_date, b.pharmacy_id, p.timezone AS pharmacy_timezone
      FROM batches b
      LEFT JOIN pharmacies p ON b.pharmacy_id = p.id;
    ''').get();

    for (final row in rows) {
      final batchId = row.data['batch_id']?.toString() ?? '';
      final pharmacyId = row.data['pharmacy_id']?.toString() ?? '';
      final rawValue = explicitExpiryDates?[batchId] ?? row.data['expiry_date'];
      final pharmacyTimezone = row.data['pharmacy_timezone'] as String?;
      final isAuthoritative = authoritativeBatchIds?.contains(batchId) ?? false;

      final result = HistoricalExpiryClassifier.classify(
        rawValue: rawValue,
        pharmacyTimezone: pharmacyTimezone,
        isAuthoritative: isAuthoritative,
      );

      if (!result.isMigratable) {
        violations.add(
          HistoricalExpiryViolation(
            batchId: batchId,
            pharmacyId: pharmacyId,
            classification: result.classification,
            rawValue: result.rawValue,
            pharmacyTimezone: result.pharmacyTimezone,
            message: result.message,
          ),
        );
      } else {
        resolvedDates[batchId] = result.isoDate!;
      }
    }

    return HistoricalExpiryPreflightReport(
      violations: violations,
      resolvedDates: resolvedDates,
    );
  }
}

/// Disposable raw-SQL proof harness for the proposed v2 schema.
class Version2MigrationHarness {
  Version2MigrationHarness._(this.source, this.target);
  final AppDatabase? source;
  final _RawTarget target; // ignore: library_private_types_in_public_api

  /// Creates a fresh v2 target database without copying from a v1 source.
  static Future<Version2MigrationHarness> createFreshTarget() async {
    final target = _RawTarget(
      NativeDatabase.memory(
        setup: (rawDb) => rawDb.execute('PRAGMA foreign_keys = ON;'),
      ),
    );
    try {
      await target.customStatement('PRAGMA foreign_keys = ON;');
      for (final statement in Version2Schema.createTableStatements) {
        await target.customStatement(statement);
      }
      for (final statement in Version2Schema.createIndexStatements) {
        await target.customStatement(statement);
      }
      await target.customStatement('PRAGMA user_version = 2;');
      return Version2MigrationHarness._(null, target);
    } catch (_) {
      await target.close();
      rethrow;
    }
  }

  /// Migrates from a populated v1 [source] database into an isolated v2 [target] database.
  static Future<Version2MigrationHarness> fromSource(
    AppDatabase source, {
    bool failDuringCopy = false,
    bool failPostCopy = false,
    int? failAfterCopiedTables,
    Set<String>? authoritativeBatchIds,
    Map<String, String>? explicitExpiryDates,
    Future<void> Function(
      drift.GeneratedDatabase target,
      String table,
      int rowCount,
    )?
    onTableCopied,
    Future<void> Function(drift.GeneratedDatabase target)? onPostCopy,
    Future<void> Function(drift.GeneratedDatabase target, Object error)?
    onTargetRollback,
  }) async {
    final target = _RawTarget(
      NativeDatabase.memory(
        setup: (rawDb) => rawDb.execute('PRAGMA foreign_keys = ON;'),
      ),
    );
    try {
      // 1. Ensure foreign keys enabled prior to transaction/tables
      await target.customStatement('PRAGMA foreign_keys = ON;');

      // 2. Validate source data preflight before any target work
      final report = await V1ToV2MigrationPreflight.run(
        source,
        explicitExpiryDates: explicitExpiryDates,
      );
      report.ensureValid();

      // 3. Validate historical expiry preflight
      final expiryReport = await HistoricalExpiryPreflight.run(
        source,
        authoritativeBatchIds: authoritativeBatchIds,
        explicitExpiryDates: explicitExpiryDates,
      );
      expiryReport.ensureValid();

      // 4. Perform transactional schema creation and data migration
      try {
        await target.transaction(() async {
          for (final statement in Version2Schema.createTableStatements) {
            await target.customStatement(statement);
          }
          for (final statement in Version2Schema.createIndexStatements) {
            await target.customStatement(statement);
          }

          await V1ToV2Copy.copyAll(
            source,
            target,
            resolvedExpiryDates: expiryReport.resolvedDates,
            onTableCopied: (target, table, rowCount) async {
              await onTableCopied?.call(target, table, rowCount);
              final copiedCount = V1ToV2Copy.orderedTables.indexOf(table) + 1;
              final threshold = failAfterCopiedTables ?? 1;
              if (failDuringCopy && copiedCount >= threshold) {
                throw MigrationFailureInjectionException(
                  'Injected controlled failure during table copy after $copiedCount tables copied ($table)',
                );
              }
            },
          );

          // 5. Post-copy integrity check
          final fkChecks = await target
              .customSelect('PRAGMA foreign_key_check;')
              .get();
          if (fkChecks.isNotEmpty) {
            throw MigrationPreflightException([
              PreflightViolation(
                type: PreflightViolationType.foreignKey,
                table: fkChecks.first.data['table']?.toString() ?? 'target',
                message: 'Target foreign key check failed after migration',
              ),
            ]);
          }

          if (onPostCopy != null) {
            await onPostCopy(target);
          }

          if (failPostCopy) {
            throw const MigrationFailureInjectionException(
              'Injected controlled failure during post-copy validation',
            );
          }

          await target.customStatement('PRAGMA user_version = 2;');
        });
      } catch (e) {
        if (onTargetRollback != null) {
          await onTargetRollback(target, e);
        }
        rethrow;
      }

      return Version2MigrationHarness._(source, target);
    } catch (_) {
      await target.close();
      rethrow;
    }
  }

  Future<void> close() async {
    await target.close();
    await source?.close();
  }

  Future<List<Map<String, Object?>>> rows(String table) async {
    final result = await target.customSelect('SELECT * FROM $table;').get();
    return result.map((row) => row.data).toList();
  }

  Future<Map<String, String>> targetSchemaColumns(String table) async {
    final result = await target
        .customSelect("PRAGMA table_info('$table');")
        .get();
    return {
      for (final row in result)
        row.data['name'] as String:
            (row.data['type'] as String?)?.toUpperCase() ?? '',
    };
  }

}

class _RawTarget extends drift.GeneratedDatabase {
  _RawTarget(super.executor);

  @override
  Iterable<drift.TableInfo> get allTables => const [];

  @override
  int get schemaVersion => 2;

  @override
  drift.MigrationStrategy get migration => drift.MigrationStrategy(
    beforeOpen: (details) async {
      await customStatement('PRAGMA foreign_keys = ON;');
    },
  );
}
