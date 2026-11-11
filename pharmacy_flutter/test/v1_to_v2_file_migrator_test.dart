// ignore_for_file: depend_on_referenced_packages

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:pharmacy_flutter/data/database/migrations/read_only_migration_source.dart';
import 'package:pharmacy_flutter/data/database/migrations/v1_to_v2_copy.dart';
import 'package:pharmacy_flutter/data/database/migrations/v1_to_v2_file_migrator.dart';
import 'package:pharmacy_flutter/data/database/migrations/v1_to_v2_preflight.dart';
import 'package:pharmacy_flutter/data/database/migrations/version_2_schema.dart';
import 'package:sqlite3/sqlite3.dart' as sqlite;

import 'fixtures/version_1_file_schema.dart';

void main() {
  late Directory tempDir;
  late String sourcePath;
  late String targetPath;

  setUp(() {
    tempDir = Directory.systemTemp.createTempSync('v1_v2_file_migrator_');
    sourcePath = '${tempDir.path}${Platform.pathSeparator}source.sqlite';
    targetPath = '${tempDir.path}${Platform.pathSeparator}target.sqlite';
    Version1FileSchema.create(sourcePath);
  });

  tearDown(() {
    if (tempDir.existsSync()) {
      tempDir.deleteSync(recursive: true);
    }
  });

  test('successful migration validates tables, row counts, schema, and converted values', () async {
    final result = await V1ToV2FileMigrator.migrate(
      sourcePath: sourcePath,
      targetPath: targetPath,
      explicitExpiryDates: {'batch-1': '2025-01-15'},
    );

    expect(result.tablesCopied, 21);
    expect(result.sourcePath, sourcePath);
    expect(result.targetPath, targetPath);
    expect(File(targetPath).existsSync(), isTrue);
    expect(File(sourcePath).existsSync(), isTrue);

    // Verify all 21 table counts in result
    for (final table in V1ToV2Copy.orderedTables) {
      expect(result.tableRowCounts.containsKey(table), isTrue);
    }

    // Inspect target directly using an independent SQLite connection
    final targetRaw = sqlite.sqlite3.open(targetPath, mode: sqlite.OpenMode.readOnly);
    try {
      // 1. User version is 2
      final versionRow = targetRaw.select('PRAGMA user_version;');
      expect(versionRow.first.values.first, 2);

      // 2. All 22 tables exist
      final tables = targetRaw
          .select("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';")
          .map((r) => r['name'] as String)
          .toSet();
      expect(tables.length, 22);
      expect(tables, containsAll(V1ToV2FileMigrator.expectedTables));

      // 3. sale_idempotency is initially empty
      final idempotencyRows = targetRaw.select('SELECT COUNT(*) FROM sale_idempotency;');
      expect(idempotencyRows.first.values.first, 0);

      // 4. FK and integrity pass
      final fkChecks = targetRaw.select('PRAGMA foreign_key_check;');
      expect(fkChecks, isEmpty);
      final integrity = targetRaw.select('PRAGMA integrity_check;');
      expect(integrity.first.values.first, 'ok');

      // 5. Check representative conversions for batch-1
      final batch = targetRaw.select("SELECT * FROM batches WHERE id = 'batch-1';").first;
      expect(batch['expiry_date'], '2025-01-15'); // TEXT ISO-8601
      expect(batch['purchase_price'], 825); // 8.25 -> 825 (money scale 100)
      expect(batch['received_quantity'], 20000); // 20.0 -> 20000 (quantity scale 1000)
      expect(batch['current_quantity'], 15000); // 15.0 -> 15000 (quantity scale 1000)
      expect(batch['created_at'], 1736899200000); // ms timestamp
      expect(batch['received_at'], 1736899200000);

      // 6. Check representative conversions for med-1
      final medicine = targetRaw.select("SELECT * FROM medicines WHERE id = 'med-1';").first;
      expect(medicine['selling_price'], 1050); // 10.5 -> 1050 (money scale 100)
      expect(medicine['reorder_level'], 0); // 0.0 -> 0 (quantity scale 1000)

      // 7. Check audit_logs has actor_id and not user_id
      final auditCols = targetRaw
          .select("PRAGMA table_info(audit_logs);")
          .map((r) => r['name'] as String)
          .toSet();
      expect(auditCols.contains('actor_id'), isTrue);
      expect(auditCols.contains('user_id'), isFalse);

      // 8. All required indexes exist
      final actualIndexes = targetRaw
          .select("SELECT name FROM sqlite_master WHERE type = 'index';")
          .map((r) => r['name'] as String)
          .toSet();
      expect(actualIndexes.length, greaterThanOrEqualTo(Version2Schema.createIndexStatements.length));
    } finally {
      targetRaw.dispose();
    }

    // Verify target can be reopened strictly read-only and queried
    final roDb = sqlite.sqlite3.open(targetPath, mode: sqlite.OpenMode.readOnly);
    try {
      final pharm = roDb.select('SELECT name FROM pharmacies;');
      expect(pharm.first['name'], 'Test Pharmacy');
    } finally {
      roDb.dispose();
    }

    // Verify source database remains intact and unchanged
    final sourceDb = ReadOnlyMigrationSource.open(sourcePath);
    try {
      final pharm = await sourceDb.customSelect('SELECT name FROM pharmacies;').getSingle();
      expect(pharm.data['name'], 'Test Pharmacy');
    } finally {
      await sourceDb.close();
    }
  });

  test('rejects empty paths and equivalent paths without modifying files', () async {
    await expectLater(
      V1ToV2FileMigrator.migrate(sourcePath: '', targetPath: targetPath),
      throwsArgumentError,
    );
    await expectLater(
      V1ToV2FileMigrator.migrate(sourcePath: '   ', targetPath: targetPath),
      throwsArgumentError,
    );
    await expectLater(
      V1ToV2FileMigrator.migrate(sourcePath: sourcePath, targetPath: ''),
      throwsArgumentError,
    );
    await expectLater(
      V1ToV2FileMigrator.migrate(sourcePath: sourcePath, targetPath: '   '),
      throwsArgumentError,
    );
    await expectLater(
      V1ToV2FileMigrator.migrate(sourcePath: sourcePath, targetPath: sourcePath),
      throwsArgumentError,
    );
    expect(File(targetPath).existsSync(), isFalse);
  });

  test('rejects missing source and preserves pre-existing target', () async {
    final missing = '${tempDir.path}${Platform.pathSeparator}missing.sqlite';
    await expectLater(
      V1ToV2FileMigrator.migrate(sourcePath: missing, targetPath: targetPath),
      throwsA(isA<FileSystemException>()),
    );
    expect(File(targetPath).existsSync(), isFalse);

    // Pre-existing target must be preserved byte-for-byte
    final preExistingFile = File(targetPath);
    preExistingFile.writeAsStringSync('PRESERVE_EXISTING_TARGET_BYTES_EXACTLY');
    final expectedBytes = preExistingFile.readAsBytesSync();

    await expectLater(
      V1ToV2FileMigrator.migrate(
        sourcePath: sourcePath,
        targetPath: targetPath,
        explicitExpiryDates: {'batch-1': '2025-01-15'},
      ),
      throwsStateError,
    );

    expect(preExistingFile.readAsBytesSync(), expectedBytes);
  });

  test('unsupported source schema version is rejected before target creation', () async {
    // Modify source database schema version to 0
    final raw = sqlite.sqlite3.open(sourcePath);
    raw.execute('PRAGMA user_version = 0;');
    raw.dispose();

    await expectLater(
      V1ToV2FileMigrator.migrate(
        sourcePath: sourcePath,
        targetPath: targetPath,
        explicitExpiryDates: {'batch-1': '2025-01-15'},
      ),
      throwsA(isA<MigrationPreflightException>()),
    );
    expect(File(targetPath).existsSync(), isFalse);
  });

  test('unresolved historical expiry blocks migration before target creation', () async {
    await expectLater(
      V1ToV2FileMigrator.migrate(
        sourcePath: sourcePath,
        targetPath: targetPath,
        // no explicitExpiryDates provided; batch-1 requires explicit resolution
      ),
      throwsA(isA<MigrationPreflightException>()),
    );
    expect(File(targetPath).existsSync(), isFalse);
  });

  test('malformed and unknown expiry resolutions block before target creation', () async {
    // Malformed calendar date
    await expectLater(
      V1ToV2FileMigrator.migrate(
        sourcePath: sourcePath,
        targetPath: targetPath,
        explicitExpiryDates: {'batch-1': '2025-02-30'},
      ),
      throwsA(isA<MigrationPreflightException>()),
    );
    expect(File(targetPath).existsSync(), isFalse);

    // Unknown batch ID
    await expectLater(
      V1ToV2FileMigrator.migrate(
        sourcePath: sourcePath,
        targetPath: targetPath,
        explicitExpiryDates: {'batch-1': '2025-01-15', 'unknown-batch-id': '2025-01-15'},
      ),
      throwsA(isA<MigrationPreflightException>()),
    );
    expect(File(targetPath).existsSync(), isFalse);
  });

  test('injected copy failure preserves source and cleans up staging target', () async {
    await expectLater(
      V1ToV2FileMigrator.migrate(
        sourcePath: sourcePath,
        targetPath: targetPath,
        explicitExpiryDates: {'batch-1': '2025-01-15'},
        onTableCopied: (target, table, count) async {
          if (table == 'batches') {
            throw StateError('Injected controlled copy failure on batches');
          }
        },
      ),
      throwsStateError,
    );

    // Target staging file was deleted
    expect(File(targetPath).existsSync(), isFalse);

    // Source remains queryable and intact
    final sourceDb = ReadOnlyMigrationSource.open(sourcePath);
    try {
      final pharm = await sourceDb.customSelect('SELECT name FROM pharmacies;').getSingle();
      expect(pharm.data['name'], 'Test Pharmacy');
    } finally {
      await sourceDb.close();
    }
  });

  test('injected post-copy validation failure preserves source and cleans up staging target', () async {
    await expectLater(
      V1ToV2FileMigrator.migrate(
        sourcePath: sourcePath,
        targetPath: targetPath,
        explicitExpiryDates: {'batch-1': '2025-01-15'},
        onPostCopy: (target) async {
          throw const MigrationValidationException('Injected controlled post-copy validation failure');
        },
      ),
      throwsA(isA<MigrationValidationException>()),
    );

    // Staging target was cleaned up
    expect(File(targetPath).existsSync(), isFalse);

    // Source remains queryable and intact
    final sourceDb = ReadOnlyMigrationSource.open(sourcePath);
    try {
      final pharm = await sourceDb.customSelect('SELECT name FROM pharmacies;').getSingle();
      expect(pharm.data['name'], 'Test Pharmacy');
    } finally {
      await sourceDb.close();
    }
  });

  test('post-copy foreign key violation is detected and cleaned up', () async {
    await expectLater(
      V1ToV2FileMigrator.migrate(
        sourcePath: sourcePath,
        targetPath: targetPath,
        explicitExpiryDates: {'batch-1': '2025-01-15'},
        onPostCopy: (target) async {
          // Temporarily disable FKs inside callback to insert an invalid reference, then re-enable
          await target.customStatement('PRAGMA foreign_keys = OFF;');
          await target.customStatement(
            "INSERT INTO categories (id, pharmacy_id, name, created_at, updated_at) "
            "VALUES ('cat-orphan', 'ph-nonexistent', 'Orphan Category', 1736899200000, 1736899200000);",
          );
          await target.customStatement('PRAGMA foreign_keys = ON;');
        },
      ),
      throwsA(isA<MigrationValidationException>()),
    );

    // Target staging file cleaned up
    expect(File(targetPath).existsSync(), isFalse);
    expect(File(sourcePath).existsSync(), isTrue);
  });
}
