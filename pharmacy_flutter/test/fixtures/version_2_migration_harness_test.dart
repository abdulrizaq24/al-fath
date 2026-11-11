import 'package:flutter_test/flutter_test.dart';
import 'package:drift/drift.dart' as drift;
import 'package:pharmacy_flutter/core/utils/scaled_values.dart';
import 'package:pharmacy_flutter/data/database/database.dart';
import 'package:pharmacy_flutter/data/database/migrations/v1_to_v2_preflight.dart' show MigrationPreflightException;

import 'version_1_fixture.dart';
import 'version_2_migration_harness.dart';

void main() {
  test('populated v1 fixture migrates into the isolated v2 target', () async {
    final fixture = await Version1Fixture.create();
    try {
      final migration = await Version2MigrationHarness.fromSource(
        fixture.db,
        explicitExpiryDates: {
          fixture.ids['batchToday']!: '2025-01-15',
          fixture.ids['batchFuture']!: '2025-02-15',
        },
      );
      try {
        final medicines = await migration.rows('medicines');
        expect(medicines, hasLength(1));
        expect(medicines.single['id'], fixture.ids['medicine']);
        expect(medicines.single['selling_price'], 1050);
        expect(medicines.single['reorder_level'], 1000);

        final batches = await migration.rows('batches');
        expect(batches, hasLength(2));
        expect(batches.every((row) => row['purchase_price'] == 825), isTrue);
        expect(
          batches.every((row) => row['received_quantity'] == 20000),
          isTrue,
        );

        final saleItems = await migration.rows('sale_items');
        expect(saleItems.single['quantity'], 2000);
        expect(saleItems.single['unit_price'], 1050);
        expect(saleItems.single['total'], 2100);

        final inventory = await migration.rows('inventory_transactions');
        expect(inventory.single['quantity'], -2000);

        expect(await migration.rows('sale_idempotency'), isEmpty);
        expect(
          (await migration.rows('audit_logs')).single['actor_id'],
          fixture.ids['user'],
        );
      } finally {
        await migration.close();
      }
    } catch (_) {
      await fixture.close();
      rethrow;
    }
  });

  test('timestamps preserve Unix milliseconds and nullable values', () async {
    final fixture = await Version1Fixture.create();
    try {
      final timestamp = DateTime.utc(2025, 1, 15, 12, 34, 56, 789);
      await (fixture.db.update(fixture.db.pharmacies)
            ..where((t) => t.id.equals(fixture.ids['pharmacy']!)))
          .write(PharmaciesCompanion(updatedAt: drift.Value(timestamp)));
      final migration = await Version2MigrationHarness.fromSource(
        fixture.db,
        explicitExpiryDates: {
          fixture.ids['batchToday']!: '2025-01-15',
          fixture.ids['batchFuture']!: '2025-02-15',
        },
      );
      try {
        final pharmacy = (await migration.rows('pharmacies')).single;
        // Drift 2.28.2 reads SQLite DateTime integers as Unix seconds, so
        // sub-second precision is unavailable in this v1 source representation.
        final sourcePrecision = DateTime.utc(
          timestamp.year,
          timestamp.month,
          timestamp.day,
          timestamp.hour,
          timestamp.minute,
          timestamp.second,
        );
        expect(pharmacy['updated_at'], sourcePrecision.millisecondsSinceEpoch);
        final user = (await migration.rows('users')).single;
        expect(user['last_login_at'], isNull);
        final batches = await migration.rows('batches');
        expect(batches.first['expiry_date'], '2025-01-15');
      } finally {
        await migration.close();
      }
    } finally {
      await fixture.close();
    }
  });

  test('preflight rejects exact-conversion failures before migration', () async {
    final fixture = await Version1Fixture.create();
    try {
      await fixture.db.customStatement(
        "UPDATE medicines SET selling_price = 10.555 WHERE id = '${fixture.ids['medicine']}'",
      );
      await expectLater(
        Version2MigrationHarness.fromSource(
          fixture.db,
          explicitExpiryDates: {
            fixture.ids['batchToday']!: '2025-01-15',
            fixture.ids['batchFuture']!: '2025-02-15',
          },
        ),
        throwsA(isA<Exception>()),
      );
      final source = await (fixture.db.select(
        fixture.db.medicines,
      )..where((t) => t.id.equals(fixture.ids['medicine']!))).getSingle();
      expect(source.sellingPrice, 10.555);
      expect(fixture.db.schemaVersion, 1);
    } finally {
      await fixture.close();
    }
  });

  test(
    'copy failure occurs after rows were copied and rolls back target',
    () async {
      final fixture = await Version1Fixture.create();
      final sourceCount = await fixture.db
          .customSelect('SELECT COUNT(*) AS count FROM pharmacies')
          .getSingle();
      var observedCopiedRows = 0;
      var observedTargetTables = 0;
      try {
        await expectLater(
          Version2MigrationHarness.fromSource(
            fixture.db,
            failDuringCopy: true,
            explicitExpiryDates: {
              fixture.ids['batchToday']!: '2025-01-15',
              fixture.ids['batchFuture']!: '2025-02-15',
            },
            onTableCopied: (target, table, rowCount) async {
              if (table == 'pharmacies') {
                observedCopiedRows =
                    (await target
                                .customSelect(
                                  'SELECT COUNT(*) AS count FROM pharmacies',
                                )
                                .getSingle())
                            .data['count']
                        as int;
                observedTargetTables++;
              }
            },
          ),
          throwsA(isA<MigrationFailureInjectionException>()),
        );
        expect(observedCopiedRows, 1);
        expect(observedTargetTables, 1);
        expect(
          (await fixture.db
                  .customSelect('SELECT COUNT(*) AS count FROM pharmacies')
                  .getSingle())
              .data['count'],
          sourceCount.data['count'],
        );
        expect(fixture.db.schemaVersion, 1);
        expect(
          (await fixture.db.select(fixture.db.pharmacies).getSingle()).id,
          fixture.ids['pharmacy'],
        );
      } finally {
        await fixture.close();
      }
    },
  );

  test(
    'post-copy failure occurs after complete copy and rolls back target',
    () async {
      final fixture = await Version1Fixture.create();
      var copiedTables = 0;
      var postCopyRows = 0;
      try {
        await expectLater(
          Version2MigrationHarness.fromSource(
            fixture.db,
            failPostCopy: true,
            explicitExpiryDates: {
              fixture.ids['batchToday']!: '2025-01-15',
              fixture.ids['batchFuture']!: '2025-02-15',
            },
            onTableCopied: (target, table, rowCount) async {
              copiedTables++;
            },
            onPostCopy: (target) async {
              postCopyRows =
                  (await target
                              .customSelect(
                                'SELECT COUNT(*) AS count FROM audit_logs',
                              )
                              .getSingle())
                          .data['count']
                      as int;
            },
          ),
          throwsA(isA<MigrationFailureInjectionException>()),
        );
        expect(copiedTables, 21);
        expect(postCopyRows, 1);
        expect(fixture.db.schemaVersion, 1);
        expect(
          (await fixture.db.select(fixture.db.auditLogs).getSingle()).id,
          fixture.ids['audit'],
        );
      } finally {
        await fixture.close();
      }
    },
  );

  test(
    'target schema stores expiry as TEXT and event timestamps as INTEGER',
    () async {
      final migration = await Version2MigrationHarness.createFreshTarget();
      try {
        final columns = await migration.targetSchemaColumns('batches');
        expect(columns['expiry_date'], 'TEXT');
        expect(columns['created_at'], 'INTEGER');
        expect(columns['received_at'], 'INTEGER');
        expect(columns['updated_at'], 'INTEGER');
        expect((await migration.rows('batches')), isEmpty);
      } finally {
        await migration.close();
      }
    },
  );

  test('isolated schema metadata and canonical expiry ordering are enforced', () async {
    final fixture = await Version1Fixture.create();
    try {
      late List<Map<String, Object?>> tables;
      late List<Map<String, Object?>> indexes;
      late List<Map<String, Object?>> foreignKeys;
      late List<Map<String, Object?>> orderedDates;
      final migration = await Version2MigrationHarness.fromSource(
        fixture.db,
        explicitExpiryDates: {
          fixture.ids['batchToday']!: '2025-01-15',
          fixture.ids['batchFuture']!: '2025-02-15',
        },
        onPostCopy: (target) async {
          tables =
              (await target
                      .customSelect(
                        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
                      )
                      .get())
                  .map((row) => row.data)
                  .toList();
          indexes =
              (await target
                      .customSelect(
                        "SELECT name FROM sqlite_master WHERE type = 'index' ORDER BY name",
                      )
                      .get())
                  .map((row) => row.data)
                  .toList();
          foreignKeys =
              (await target
                      .customSelect('PRAGMA foreign_key_list(sales);')
                      .get())
                  .map((row) => row.data)
                  .toList();
          final columns =
              (await target.customSelect("PRAGMA table_info('batches');").get())
                  .map((row) => row.data)
                  .toList();
          final expiry = columns.singleWhere(
            (row) => row['name'] == 'expiry_date',
          );
          expect(expiry['type'], 'TEXT');
          expect(expiry['notnull'], 1);
          expect(
            columns.singleWhere((row) => row['name'] == 'created_at')['type'],
            'INTEGER',
          );

          await target.customStatement(
            "INSERT INTO batches (id, pharmacy_id, medicine_id, batch_number, expiry_date, purchase_price, received_quantity, current_quantity) VALUES ('order-1', ?, ?, 'order-1', '2024-02-29', 1, 1, 1), ('order-2', ?, ?, 'order-2', '2023-12-31', 1, 1, 1), ('order-3', ?, ?, 'order-3', '2024-01-01', 1, 1, 1), ('order-4', ?, ?, 'order-4', '2025-01-01', 1, 1, 1);",
            [
              fixture.ids['pharmacy'],
              fixture.ids['medicine'],
              fixture.ids['pharmacy'],
              fixture.ids['medicine'],
              fixture.ids['pharmacy'],
              fixture.ids['medicine'],
              fixture.ids['pharmacy'],
              fixture.ids['medicine'],
            ],
          );
          orderedDates =
              (await target
                      .customSelect(
                        "SELECT expiry_date FROM batches WHERE id LIKE 'order-%' ORDER BY expiry_date ASC",
                      )
                      .get())
                  .map((row) => row.data)
                  .toList();
        },
      );
      try {
        expect(tables.map((row) => row['name']), <Object?>[
          'audit_logs',
          'batches',
          'categories',
          'inventory_transactions',
          'medicine_packages',
          'medicines',
          'patients',
          'payments',
          'pharmacies',
          'prescription_items',
          'prescriptions',
          'purchase_items',
          'purchase_receipt_items',
          'purchase_receipts',
          'purchases',
          'roles',
          'sale_idempotency',
          'sale_item_batches',
          'sale_items',
          'sales',
          'suppliers',
          'users',
        ]);
        expect(
          indexes.map((row) => row['name']),
          contains('batches_expiry_date_idx'),
        );
        expect(
          foreignKeys,
          contains(
            predicate<Map<String, Object?>>(
              (row) =>
                  row['table'] == 'patients' &&
                  row['from'] == 'patient_id' &&
                  row['on_delete'] == 'SET NULL',
            ),
          ),
        );
        final idempotencyForeignKeys =
            (await migration.target
                    .customSelect('PRAGMA foreign_key_list(sale_idempotency);')
                    .get())
                .map((row) => row.data)
                .toList();
        expect(
          idempotencyForeignKeys,
          contains(
            predicate<Map<String, Object?>>(
              (row) =>
                  row['table'] == 'sales' &&
                  row['from'] == 'sale_id' &&
                  row['on_delete'] == 'SET NULL',
            ),
          ),
        );
        expect(orderedDates.map((row) => row['expiry_date']), <Object?>[
          '2023-12-31',
          '2024-01-01',
          '2024-02-29',
          '2025-01-01',
        ]);
      } finally {
        await migration.close();
      }
    } finally {
      await fixture.close();
    }
  });

  test('strict date boundaries and numeric precision are enforced', () {
    for (final value in [
      '1969-12-31',
      '2101-01-01',
      '2024-02-30',
      '2023-02-29',
      '2024-13-01',
      '2024-04-31',
    ]) {
      expect(
        HistoricalExpiryClassifier.classify(
          rawValue: value,
          pharmacyTimezone: 'UTC',
        ).isMigratable,
        isFalse,
      );
    }
    for (final value in ['1970-01-01', '2024-02-29', '2100-12-31']) {
      expect(
        HistoricalExpiryClassifier.classify(
          rawValue: value,
          pharmacyTimezone: null,
        ).classification,
        HistoricalExpiryClassification.explicitDateOnly,
      );
    }
    final fractional = HistoricalExpiryClassifier.classify(
      rawValue: 1736942400.5,
      pharmacyTimezone: 'UTC',
    );
    expect(
      fractional.classification,
      HistoricalExpiryClassification.malformedOrUnsupported,
    );
  });

  test(
    'classifies explicit dates and authoritative pharmacy-local timestamps',
    () {
      final explicit = HistoricalExpiryClassifier.classify(
        rawValue: '2025-01-15',
        pharmacyTimezone: null,
      );
      expect(
        explicit.classification,
        HistoricalExpiryClassification.explicitDateOnly,
      );
      expect(explicit.isoDate, '2025-01-15');

      final authoritative = HistoricalExpiryClassifier.classify(
        rawValue:
            DateTime.utc(2024, 1, 31, 22, 30).millisecondsSinceEpoch ~/ 1000,
        pharmacyTimezone: 'Africa/Khartoum',
        isAuthoritative: true,
      );
      expect(
        authoritative.classification,
        HistoricalExpiryClassification.authoritativePharmacyLocalTimestamp,
      );
      expect(authoritative.isoDate, '2024-02-01');
    },
  );

  test(
    'blocks missing, invalid, ambiguous, non-midnight, and malformed expiry values',
    () {
      final cases = <HistoricalExpiryClassificationResult>[
        HistoricalExpiryClassifier.classify(
          rawValue: 1736942400,
          pharmacyTimezone: null,
        ),
        HistoricalExpiryClassifier.classify(
          rawValue: 1736942400,
          pharmacyTimezone: 'Invalid/Timezone',
        ),
        HistoricalExpiryClassifier.classify(
          rawValue: DateTime.utc(2025, 1, 15).millisecondsSinceEpoch ~/ 1000,
          pharmacyTimezone: 'Africa/Khartoum',
        ),
        HistoricalExpiryClassifier.classify(
          rawValue:
              DateTime.utc(2025, 1, 15, 12).millisecondsSinceEpoch ~/ 1000,
          pharmacyTimezone: 'Africa/Khartoum',
        ),
        HistoricalExpiryClassifier.classify(
          rawValue: '2025-02-30',
          pharmacyTimezone: 'UTC',
        ),
        HistoricalExpiryClassifier.classify(
          rawValue: -1,
          pharmacyTimezone: 'UTC',
        ),
      ];

      expect(
        cases.map((result) => result.classification),
        containsAll(<HistoricalExpiryClassification>[
          HistoricalExpiryClassification.missingPharmacyTimezone,
          HistoricalExpiryClassification.invalidPharmacyTimezone,
          HistoricalExpiryClassification.ambiguousUtcMidnight,
          HistoricalExpiryClassification.nonMidnightTimestamp,
          HistoricalExpiryClassification.malformedOrUnsupported,
        ]),
      );
      expect(cases.every((result) => !result.isMigratable), isTrue);
    },
  );

  test(
    'migration blocks unresolved expiry values before target creation',
    () async {
      final fixture = await Version1Fixture.create();
      try {
        await expectLater(
          Version2MigrationHarness.fromSource(fixture.db),
          throwsA(isA<MigrationPreflightException>()),
        );
        expect(fixture.db.schemaVersion, 1);
      } finally {
        await fixture.close();
      }
    },
  );

  test(
    'conversion helpers define the required exact scales and overflow rejection',
    () {
      expect(ScaledValueConverter.moneyToStorageExact(10.50), 1050);
      expect(ScaledValueConverter.quantityToStorageExact(-2.000), -2000);
      expect(
        () => ScaledValueConverter.moneyToStorageExact(10.555),
        throwsA(isA<ExactPrecisionException>()),
      );
      expect(
        () => ScaledValueConverter.quantityToStorageExact(1.2345),
        throwsA(isA<ExactPrecisionException>()),
      );
      expect(
        () => ScaledValueConverter.moneyToStorageExact(
          ScaledValueConverter.int64Max / 100 + 1,
        ),
        throwsA(isA<RangeError>()),
      );
    },
  );
}
