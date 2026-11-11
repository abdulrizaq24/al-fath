import 'package:flutter_test/flutter_test.dart';
import 'package:pharmacy_flutter/data/database/migrations/v1_to_v2_preflight.dart';

import 'fixtures/version_1_fixture.dart';

void main() {
  Future<Version1Fixture> createValidTestFixture({
    String firstDate = '2025-01-15',
    String secondDate = '2025-02-15',
  }) async {
    final fixture = await Version1Fixture.create();
    await fixture.db.customStatement(
      "UPDATE batches SET expiry_date = '$firstDate' WHERE id = '${fixture.ids['batchToday']}';",
    );
    await fixture.db.customStatement(
      "UPDATE batches SET expiry_date = '$secondDate' WHERE id = '${fixture.ids['batchFuture']}';",
    );
    return fixture;
  }

  group('V1ToV2MigrationPreflight Historical Expiry Integration', () {
    test('1. accepts valid explicit canonical date-only values', () async {
      final fixture = await createValidTestFixture(
        firstDate: '2025-06-15',
        secondDate: '2025-11-30',
      );
      try {
        final report = await V1ToV2MigrationPreflight.run(fixture.db);
        expect(report.isValid, isTrue, reason: report.violations.toString());
        expect(report.violations, isEmpty);
        expect(
          report.resolvedExpiryDates[fixture.ids['batchToday']],
          '2025-06-15',
        );
        expect(
          report.resolvedExpiryDates[fixture.ids['batchFuture']],
          '2025-11-30',
        );
      } finally {
        await fixture.close();
      }
    });

    test('2. accepts valid leap-day date', () async {
      final fixture = await createValidTestFixture(
        secondDate: '2024-02-29',
      );
      try {
        final report = await V1ToV2MigrationPreflight.run(fixture.db);
        expect(
          report.violations.where((v) => v.type == PreflightViolationType.historicalExpiry),
          isEmpty,
        );
        expect(
          report.resolvedExpiryDates[fixture.ids['batchFuture']],
          '2024-02-29',
        );
      } finally {
        await fixture.close();
      }
    });

    test('3. rejects invalid calendar dates (non-leap year, invalid month/day)', () async {
      final fixture = await createValidTestFixture(
        secondDate: '2023-02-29', // 2023 is not a leap year
      );
      try {
        final report = await V1ToV2MigrationPreflight.run(fixture.db);
        expect(report.isValid, isFalse);
        final violation = report.violations.singleWhere(
          (v) => v.type == PreflightViolationType.historicalExpiry,
        ) as HistoricalExpiryViolation;
        expect(violation.recordId, fixture.ids['batchFuture']);
        expect(
          violation.classification,
          HistoricalExpiryClassification.malformedOrUnsupported,
        );
        expect(violation.rawValue, '2023-02-29');
      } finally {
        await fixture.close();
      }
    });

    test('4. blocks ambiguous UTC-midnight timestamps', () async {
      final fixture = await createValidTestFixture();
      try {
        // In Africa/Khartoum (UTC+2), 2025-01-15 00:00:00 UTC (1736899200) is 02:00:00 local
        await fixture.db.customStatement(
          "UPDATE batches SET expiry_date = 1736899200 WHERE id = '${fixture.ids['batchFuture']}';",
        );
        final report = await V1ToV2MigrationPreflight.run(fixture.db);
        expect(report.isValid, isFalse);
        final violation = report.violations.singleWhere(
          (v) => v.type == PreflightViolationType.historicalExpiry,
        ) as HistoricalExpiryViolation;
        expect(
          violation.classification,
          HistoricalExpiryClassification.ambiguousUtcMidnight,
        );
        expect(violation.recordId, fixture.ids['batchFuture']);
      } finally {
        await fixture.close();
      }
    });

    test('5. blocks ambiguous pharmacy-local midnight timestamps without provenance', () async {
      final fixture = await createValidTestFixture();
      try {
        // In Africa/Khartoum (UTC+2), local midnight 2025-01-15 00:00:00 is 2025-01-14 22:00:00 UTC (1736892000)
        await fixture.db.customStatement(
          "UPDATE batches SET expiry_date = 1736892000 WHERE id = '${fixture.ids['batchFuture']}';",
        );
        final report = await V1ToV2MigrationPreflight.run(fixture.db);
        expect(report.isValid, isFalse);
        final violation = report.violations.singleWhere(
          (v) => v.type == PreflightViolationType.historicalExpiry,
        ) as HistoricalExpiryViolation;
        expect(
          violation.classification,
          HistoricalExpiryClassification.ambiguousLocalMidnight,
        );
        expect(violation.recordId, fixture.ids['batchFuture']);
      } finally {
        await fixture.close();
      }
    });

    test('6. blocks non-midnight timestamps without provenance', () async {
      final fixture = await createValidTestFixture();
      try {
        // Non-midnight instant: 1736944245 (12:30:45 UTC, 14:30:45 in Khartoum)
        await fixture.db.customStatement(
          "UPDATE batches SET expiry_date = 1736944245 WHERE id = '${fixture.ids['batchFuture']}';",
        );
        final report = await V1ToV2MigrationPreflight.run(fixture.db);
        expect(report.isValid, isFalse);
        final violation = report.violations.singleWhere(
          (v) => v.type == PreflightViolationType.historicalExpiry,
        ) as HistoricalExpiryViolation;
        expect(
          violation.classification,
          HistoricalExpiryClassification.nonMidnightTimestamp,
        );
        expect(violation.recordId, fixture.ids['batchFuture']);
      } finally {
        await fixture.close();
      }
    });

    test('7. blocks when pharmacy timezone is missing or blank', () async {
      final fixture = await createValidTestFixture();
      try {
        await fixture.db.customStatement("UPDATE pharmacies SET timezone = NULL;");
        await fixture.db.customStatement(
          "UPDATE batches SET expiry_date = 1736899200 WHERE id = '${fixture.ids['batchFuture']}';",
        );
        final report = await V1ToV2MigrationPreflight.run(fixture.db);
        expect(report.isValid, isFalse);
        final violation = report.violations.singleWhere(
          (v) => v.type == PreflightViolationType.historicalExpiry,
        ) as HistoricalExpiryViolation;
        expect(
          violation.classification,
          HistoricalExpiryClassification.missingPharmacyTimezone,
        );
      } finally {
        await fixture.close();
      }
    });

    test('8. blocks when pharmacy timezone is an unrecognized IANA timezone', () async {
      final fixture = await createValidTestFixture();
      try {
        await fixture.db.customStatement("UPDATE pharmacies SET timezone = 'Invalid/Not_A_Zone';");
        await fixture.db.customStatement(
          "UPDATE batches SET expiry_date = 1736899200 WHERE id = '${fixture.ids['batchFuture']}';",
        );
        final report = await V1ToV2MigrationPreflight.run(fixture.db);
        expect(report.isValid, isFalse);
        final violation = report.violations.singleWhere(
          (v) => v.type == PreflightViolationType.historicalExpiry,
        ) as HistoricalExpiryViolation;
        expect(
          violation.classification,
          HistoricalExpiryClassification.invalidPharmacyTimezone,
        );
      } finally {
        await fixture.close();
      }
    });

    test('9. rejects fractional numeric values', () async {
      final fixture = await createValidTestFixture();
      try {
        await fixture.db.customStatement(
          "UPDATE batches SET expiry_date = 1736899200.5 WHERE id = '${fixture.ids['batchFuture']}';",
        );
        final report = await V1ToV2MigrationPreflight.run(fixture.db);
        expect(report.isValid, isFalse);
        final violation = report.violations.singleWhere(
          (v) => v.type == PreflightViolationType.historicalExpiry,
        ) as HistoricalExpiryViolation;
        expect(
          violation.classification,
          HistoricalExpiryClassification.malformedOrUnsupported,
        );
        expect(violation.message, contains('unsupported, fractional, negative, or non-finite'));
      } finally {
        await fixture.close();
      }
    });

    test('10. rejects negative and out-of-range values', () async {
      final fixture = await createValidTestFixture();
      try {
        await fixture.db.customStatement(
          "UPDATE batches SET expiry_date = -1 WHERE id = '${fixture.ids['batchFuture']}';",
        );
        final report = await V1ToV2MigrationPreflight.run(fixture.db);
        expect(report.isValid, isFalse);
        final violation = report.violations.singleWhere(
          (v) => v.type == PreflightViolationType.historicalExpiry,
        ) as HistoricalExpiryViolation;
        expect(
          violation.classification,
          HistoricalExpiryClassification.malformedOrUnsupported,
        );
      } finally {
        await fixture.close();
      }
    });

    test('11. preserves all 6 required diagnostic fields in violation', () async {
      final fixture = await createValidTestFixture();
      try {
        await fixture.db.customStatement(
          "UPDATE batches SET expiry_date = 1736899200 WHERE id = '${fixture.ids['batchFuture']}';",
        );
        final report = await V1ToV2MigrationPreflight.run(fixture.db);
        final violation = report.violations.singleWhere(
          (v) => v.type == PreflightViolationType.historicalExpiry,
        ) as HistoricalExpiryViolation;

        // Verify all 6 required structured diagnostic fields:
        expect(violation.batchId, fixture.ids['batchFuture']);
        expect(violation.pharmacyId, fixture.ids['pharmacy']);
        expect(violation.rawValue, 1736899200);
        expect(violation.pharmacyTimezone, 'Africa/Khartoum');
        expect(
          violation.classification,
          HistoricalExpiryClassification.ambiguousUtcMidnight,
        );
        expect(violation.message, isNotEmpty);

        // Verify base PreflightViolation properties:
        expect(violation.type, PreflightViolationType.historicalExpiry);
        expect(violation.table, 'batches');
        expect(violation.column, 'expiry_date');
        expect(violation.recordId, fixture.ids['batchFuture']);
      } finally {
        await fixture.close();
      }
    });

    test('12. reports multiple expiry violations deterministically in batch id order', () async {
      final fixture = await createValidTestFixture();
      try {
        // Both batches violate:
        // fixture-batch-future has fractional value
        // fixture-batch-today has non-midnight value
        await fixture.db.customStatement(
          "UPDATE batches SET expiry_date = 1736899200.25 WHERE id = '${fixture.ids['batchFuture']}';",
        );
        await fixture.db.customStatement(
          "UPDATE batches SET expiry_date = 1736944245 WHERE id = '${fixture.ids['batchToday']}';",
        );
        final report = await V1ToV2MigrationPreflight.run(fixture.db);
        final expiryViolations = report.violations
            .where((v) => v.type == PreflightViolationType.historicalExpiry)
            .toList();

        expect(expiryViolations, hasLength(2));
        // ORDER BY b.id: 'fixture-batch-future' comes before 'fixture-batch-today'
        expect(expiryViolations[0].recordId, fixture.ids['batchFuture']);
        expect(expiryViolations[1].recordId, fixture.ids['batchToday']);
        expect(
          (expiryViolations[0] as HistoricalExpiryViolation).classification,
          HistoricalExpiryClassification.malformedOrUnsupported,
        );
        expect(
          (expiryViolations[1] as HistoricalExpiryViolation).classification,
          HistoricalExpiryClassification.nonMidnightTimestamp,
        );
      } finally {
        await fixture.close();
      }
    });

    test('13. unresolved expiry records block the preflight result via ensureValid', () async {
      final fixture = await createValidTestFixture();
      try {
        await fixture.db.customStatement(
          "UPDATE batches SET expiry_date = 1736899200 WHERE id = '${fixture.ids['batchFuture']}';",
        );
        final report = await V1ToV2MigrationPreflight.run(fixture.db);
        expect(report.isValid, isFalse);
        expect(
          () => report.ensureValid(),
          throwsA(
            isA<MigrationPreflightException>().having(
              (e) => e.violations.any(
                (v) =>
                    v.type == PreflightViolationType.historicalExpiry &&
                    v.recordId == fixture.ids['batchFuture'],
              ),
              'contains historical expiry violation',
              isTrue,
            ),
          ),
        );
      } finally {
        await fixture.close();
      }
    });

    test('14. synthetic-only authority override cannot bypass production preflight', () async {
      final fixture = await createValidTestFixture();
      try {
        // A legacy timestamp without an explicit canonical date cannot pass through preflight.
        // There is no authoritativeBatchIds bypass in V1ToV2MigrationPreflight.
        await fixture.db.customStatement(
          "UPDATE batches SET expiry_date = 1736892000 WHERE id = '${fixture.ids['batchFuture']}';",
        );
        final report = await V1ToV2MigrationPreflight.run(fixture.db);
        expect(report.isValid, isFalse);
        expect(
          report.violations.any(
            (v) =>
                v.type == PreflightViolationType.historicalExpiry &&
                v.recordId == fixture.ids['batchFuture'],
          ),
          isTrue,
        );
      } finally {
        await fixture.close();
      }
    });

    test('16. explicit resolution contract accepts canonical dates and rejects bad entries', () async {
      final fixture = await createValidTestFixture();
      try {
        final valid = await V1ToV2MigrationPreflight.run(
          fixture.db,
          explicitExpiryDates: {
            fixture.ids['batchToday']!: '2025-01-15',
            fixture.ids['batchFuture']!: '2025-02-15',
          },
        );
        expect(valid.isValid, isTrue, reason: valid.violations.toString());
        expect(valid.resolvedExpiryDates, {
          fixture.ids['batchToday']!: '2025-01-15',
          fixture.ids['batchFuture']!: '2025-02-15',
        });

        final unknown = await V1ToV2MigrationPreflight.run(
          fixture.db,
          explicitExpiryDates: {'unknown-batch': '2025-01-15'},
        );
        expect(unknown.isValid, isFalse);
        expect(unknown.violations.any((v) => v.message.contains('unknown batch ID')), isTrue);

        final malformed = await V1ToV2MigrationPreflight.run(
          fixture.db,
          explicitExpiryDates: {
            fixture.ids['batchFuture']!: '2025-02-30',
          },
        );
        expect(malformed.isValid, isFalse);
        expect(malformed.violations.any((v) => v.message.contains('canonical')), isTrue);
      } finally {
        await fixture.close();
      }
    });

    test('17. existing non-expiry preflight validations continue to behave as before', () async {
      final fixture = await createValidTestFixture();
      try {
        // Trigger non-expiry violations: excess money precision and invalid enum
        await fixture.db.customStatement(
          "UPDATE medicines SET selling_price = 10.555 WHERE id = '${fixture.ids['medicine']}';",
        );
        await fixture.db.customStatement(
          "UPDATE medicines SET prescription_status = 99 WHERE id = '${fixture.ids['medicine']}';",
        );
        final report = await V1ToV2MigrationPreflight.run(fixture.db);
        expect(
          report.violations.any((v) => v.type == PreflightViolationType.excessPrecision),
          isTrue,
        );
        expect(
          report.violations.any((v) => v.type == PreflightViolationType.invalidEnum),
          isTrue,
        );
        // Expiry validations pass because batches have valid canonical dates
        expect(
          report.violations.any((v) => v.type == PreflightViolationType.historicalExpiry),
          isFalse,
        );
      } finally {
        await fixture.close();
      }
    });
  });
}
