import 'dart:io';

import 'package:drift/drift.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;
import 'package:pharmacy_flutter/data/database/migrations/read_only_migration_source.dart';
import 'package:pharmacy_flutter/data/database/migrations/v1_to_v2_preflight.dart';
import 'package:sqlite3/sqlite3.dart' as sqlite;

import 'fixtures/version_1_file_schema.dart';

void main() {
  late Directory tempDir;
  late File sourceFile;

  setUp(() {
    tempDir = Directory.systemTemp.createTempSync('ro_source_test_');
    sourceFile = File(p.join(tempDir.path, 'sample_v1.sqlite'));

    Version1FileSchema.create(sourceFile.path);
  });

  tearDown(() {
    if (tempDir.existsSync()) {
      tempDir.deleteSync(recursive: true);
    }
  });

  test('rejects empty or whitespace paths without creating files', () {
    expect(() => ReadOnlyMigrationSource.open(''), throwsArgumentError);
    expect(() => ReadOnlyMigrationSource.open('   '), throwsArgumentError);
  });

  test('rejects nonexistent file without creating it', () {
    final nonExistentPath = p.join(tempDir.path, 'does_not_exist.sqlite');
    expect(
      () => ReadOnlyMigrationSource.open(nonExistentPath),
      throwsA(isA<FileSystemException>()),
    );
    expect(File(nonExistentPath).existsSync(), isFalse);
  });

  test('opens valid file, executes queries, and runs preflight', () async {
    final source = ReadOnlyMigrationSource.open(sourceFile.path);
    try {
      final rows = await source.customSelect('SELECT name FROM pharmacies WHERE id = ?;', variables: [
        Variable.withString('ph-1'),
      ]).get();
      expect(rows.length, 1);
      expect(rows.first.data['name'], 'Test Pharmacy');

      final preflight = await V1ToV2MigrationPreflight.run(
        source,
        explicitExpiryDates: {'batch-1': '2025-01-15'},
      );
      expect(preflight.isValid, isTrue, reason: preflight.violations.toString());
    } finally {
      await source.close();
    }
  });

  test('unresolved expiry blocks preflight before any write is possible', () async {
    final source = ReadOnlyMigrationSource.open(sourceFile.path);
    try {
      final report = await V1ToV2MigrationPreflight.run(source);
      expect(report.isValid, isFalse);
      expect(
        report.violations.any((v) => v.type == PreflightViolationType.historicalExpiry),
        isTrue,
      );
    } finally {
      await source.close();
    }
  });

  test('invalid and unknown expiry resolutions remain rejected', () async {
    final source = ReadOnlyMigrationSource.open(sourceFile.path);
    try {
      final invalid = await V1ToV2MigrationPreflight.run(
        source,
        explicitExpiryDates: {'batch-1': '2025-02-30'},
      );
      expect(invalid.isValid, isFalse);
      final unknown = await V1ToV2MigrationPreflight.run(
        source,
        explicitExpiryDates: {'unknown': '2025-01-15'},
      );
      expect(unknown.isValid, isFalse);
    } finally {
      await source.close();
    }
  });

  test('SQLite enforces read-only mode and rejects INSERT/UPDATE/DELETE data modifications', () async {
    final source = ReadOnlyMigrationSource.open(sourceFile.path);
    try {
      await expectLater(
        source.customStatement(
          "INSERT INTO pharmacies (id, name, created_at, updated_at) VALUES ('ph-2', 'Blocked', 1, 1);",
        ),
        throwsA(isA<sqlite.SqliteException>().having(
          (e) => e.message.toLowerCase(),
          'message',
          contains('readonly'),
        )),
      );

      await expectLater(
        source.customStatement("UPDATE pharmacies SET name = 'Mutated';"),
        throwsA(isA<sqlite.SqliteException>().having(
          (e) => e.message.toLowerCase(),
          'message',
          contains('readonly'),
        )),
      );

      await expectLater(
        source.customStatement("DELETE FROM pharmacies WHERE id = 'ph-1';"),
        throwsA(isA<sqlite.SqliteException>().having(
          (e) => e.message.toLowerCase(),
          'message',
          contains('readonly'),
        )),
      );
    } finally {
      await source.close();
    }

    // Verify original database file is completely unmodified
    final checkDb = sqlite.sqlite3.open(sourceFile.path);
    final count = checkDb.select('SELECT COUNT(*) AS c FROM pharmacies;').first['c'];
    final name = checkDb.select("SELECT name FROM pharmacies WHERE id = 'ph-1';").first['name'];
    checkDb.dispose();

    expect(count, 1);
    expect(name, 'Test Pharmacy');
  });

  test('SQLite enforces read-only mode and rejects schema modifications (CREATE/DROP/ALTER)', () async {
    final source = ReadOnlyMigrationSource.open(sourceFile.path);
    try {
      await expectLater(
        source.customStatement('CREATE TABLE should_fail (id TEXT PRIMARY KEY);'),
        throwsA(isA<sqlite.SqliteException>().having(
          (e) => e.message.toLowerCase(),
          'message',
          contains('readonly'),
        )),
      );

      await expectLater(
        source.customStatement('DROP TABLE pharmacies;'),
        throwsA(isA<sqlite.SqliteException>().having(
          (e) => e.message.toLowerCase(),
          'message',
          contains('readonly'),
        )),
      );
    } finally {
      await source.close();
    }
  });

  test('handles close cleanly and releases file locks', () async {
    final source = ReadOnlyMigrationSource.open(sourceFile.path);
    final countRow = await source.customSelect('SELECT COUNT(*) AS count FROM pharmacies;').getSingle();
    expect(countRow.data['count'], 1);

    await source.close();

    // Verify file can be deleted immediately on Windows without file locking errors
    expect(sourceFile.existsSync(), isTrue);
    sourceFile.deleteSync();
    expect(sourceFile.existsSync(), isFalse);
  });
}
