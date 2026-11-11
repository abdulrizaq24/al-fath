import 'package:flutter_test/flutter_test.dart';
import 'package:pharmacy_flutter/data/database/migrations/v1_to_v2_preflight.dart';

import 'version_1_fixture.dart';

void main() {
  group('V1ToV2MigrationPreflight', () {
    test('accepts the deterministic valid version 1 fixture with explicit canonical expiry dates', () async {
      final fixture = await Version1Fixture.create();
      try {
        final report = await V1ToV2MigrationPreflight.run(
          fixture.db,
          explicitExpiryDates: {
            fixture.ids['batchToday']!: '2025-01-15',
            fixture.ids['batchFuture']!: '2025-02-15',
          },
        );
        expect(report.isValid, isTrue, reason: report.violations.toString());
      } finally {
        await fixture.close();
      }
    });

    test('blocks unresolved legacy timestamps in raw version 1 fixture', () async {
      final fixture = await Version1Fixture.create();
      try {
        final report = await V1ToV2MigrationPreflight.run(fixture.db);
        expect(report.isValid, isFalse);
        expect(
          report.violations.any(
            (v) => v.type == PreflightViolationType.historicalExpiry,
          ),
          isTrue,
        );
      } finally {
        await fixture.close();
      }
    });

    test('rejects unsupported precision without changing source data', () async {
      final fixture = await Version1Fixture.create();
      try {
        await fixture.db.customStatement(
          "UPDATE medicines SET selling_price = 10.555 WHERE id = '${fixture.ids['medicine']}';",
        );
        final report = await V1ToV2MigrationPreflight.run(fixture.db);
        expect(report.violations.any((v) => v.type == PreflightViolationType.excessPrecision), isTrue);
        final source = await (fixture.db.select(fixture.db.medicines)
              ..where((t) => t.id.equals(fixture.ids['medicine']!)))
            .getSingle();
        expect(source.sellingPrice, 10.555);
        expect(fixture.db.schemaVersion, 1);
      } finally {
        await fixture.close();
      }
    });

    test('rejects quantity precision, negative invariant, enum, and prescription violations', () async {
      final fixture = await Version1Fixture.create();
      try {
        await fixture.db.customStatement(
          "UPDATE batches SET current_quantity = 1.2345 WHERE id = '${fixture.ids['batchFuture']}';",
        );
        await fixture.db.customStatement(
          "UPDATE medicines SET prescription_status = 99 WHERE id = '${fixture.ids['medicine']}';",
        );
        await fixture.db.customStatement(
          "UPDATE prescription_items SET quantity_dispensed = 3.000 WHERE id = '${fixture.ids['prescriptionItem']}';",
        );
        final report = await V1ToV2MigrationPreflight.run(fixture.db);
        expect(report.violations.any((v) => v.type == PreflightViolationType.excessPrecision), isTrue);
        expect(report.violations.any((v) => v.type == PreflightViolationType.invalidEnum), isTrue);
        expect(report.violations.any((v) => v.type == PreflightViolationType.businessInvariant), isTrue);
      } finally {
        await fixture.close();
      }
    });

    test('source schema prevents duplicate target composite keys', () async {
      final fixture = await Version1Fixture.create();
      try {
        // Version 1 already declares this unique constraint, so an invalid duplicate
        // cannot be represented through the verified source schema. The insertion is
        // rejected before preflight, which is itself a useful fixture limitation.
        expect(
          () => fixture.db.customStatement(
            "INSERT INTO categories (id, pharmacy_id, name) VALUES ('duplicate-category', '${fixture.ids['pharmacy']}', 'Fixture Category');",
          ),
          throwsException,
        );
        final report = await V1ToV2MigrationPreflight.run(fixture.db);
        expect(report.violations.any((v) => v.type == PreflightViolationType.duplicateUniqueKey), isFalse);
      } finally {
        await fixture.close();
      }
    });

    test('reports violations through ensureValid without mutating source schema', () async {
      final fixture = await Version1Fixture.create();
      try {
        await fixture.db.customStatement(
          "UPDATE payments SET amount = 999999999999999999999.00 WHERE id = '${fixture.ids['payment']}';",
        );
        final report = await V1ToV2MigrationPreflight.run(fixture.db);
        expect(report.isValid, isFalse);
        expect(report.violations.any((v) => v.type == PreflightViolationType.overflow), isTrue);
        expect(() => report.ensureValid(), throwsA(isA<MigrationPreflightException>()));
        expect(fixture.db.schemaVersion, 1);
        final payment = await (fixture.db.select(fixture.db.payments)
              ..where((t) => t.id.equals(fixture.ids['payment']!)))
            .getSingle();
        expect(payment.amount, 999999999999999999999.00);
      } finally {
        await fixture.close();
      }
    });
  });
}
