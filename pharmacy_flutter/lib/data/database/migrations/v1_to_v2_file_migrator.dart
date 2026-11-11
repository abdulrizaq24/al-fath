// ignore_for_file: depend_on_referenced_packages

import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import 'package:sqlite3/sqlite3.dart' as sqlite;

import 'read_only_migration_source.dart';
import 'v1_to_v2_copy.dart';
import 'v1_to_v2_preflight.dart';
import 'version_2_schema.dart';

/// Exception thrown when target post-migration validation fails.
class MigrationValidationException implements Exception {
  final String message;
  const MigrationValidationException(this.message);

  @override
  String toString() => 'MigrationValidationException: $message';
}

/// Result metadata returned upon successful file migration.
class MigrationResult {
  final String sourcePath;
  final String targetPath;
  final int tablesCopied;
  final Map<String, int> tableRowCounts;

  const MigrationResult({
    required this.sourcePath,
    required this.targetPath,
    required this.tablesCopied,
    required this.tableRowCounts,
  });
}

/// Isolated file-backed migrator from legacy v1 schema to target v2 schema.
///
/// Opens the source database in SQLite-enforced read-only mode, runs preflight,
/// stages a new v2 database file at [targetPath], copies rows in dependency order,
/// and validates target integrity.
///
/// Never modifies or replaces the source database file.
class V1ToV2FileMigrator {
  V1ToV2FileMigrator._();

  static const expectedTables = <String>{

    'pharmacies',
    'roles',
    'users',
    'categories',
    'medicines',
    'medicine_packages',
    'batches',
    'suppliers',
    'purchases',
    'purchase_items',
    'purchase_receipts',
    'purchase_receipt_items',
    'patients',
    'prescriptions',
    'prescription_items',
    'sales',
    'sale_items',
    'sale_item_batches',
    'payments',
    'inventory_transactions',
    'sale_idempotency',
    'audit_logs',
  };

  static bool _sameColumns(List<String> a, List<String> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  static String _objectName(String ddl) {
    final parts = ddl.trim().split(RegExp(r'\s+'));
    return parts.length > 2 ? parts[2] : '';
  }

  /// Migrates a v1 SQLite database at [sourcePath] to a new v2 file at [targetPath].
  static Future<MigrationResult> migrate({
    required String sourcePath,
    required String targetPath,
    Map<String, String>? explicitExpiryDates,
    @visibleForTesting
    Future<void> Function(GeneratedDatabase target, String table, int rowCount)?
        onTableCopied,
    @visibleForTesting
    Future<void> Function(GeneratedDatabase target)? onPostCopy,
  }) async {
    // 1. Path validations
    if (sourcePath.trim().isEmpty) {
      throw ArgumentError.value(sourcePath, 'sourcePath', 'Source path cannot be empty');
    }
    if (targetPath.trim().isEmpty) {
      throw ArgumentError.value(targetPath, 'targetPath', 'Target path cannot be empty');
    }

    final canonicalSource = p.canonicalize(p.normalize(sourcePath));
    final canonicalTarget = p.canonicalize(p.normalize(targetPath));
    if (canonicalSource == canonicalTarget) {
      throw ArgumentError('Source and target paths cannot point to the same file');
    }

    final sourceFile = File(sourcePath);
    if (!sourceFile.existsSync()) {
      throw FileSystemException('Source database file does not exist', sourcePath);
    }

    final targetFile = File(targetPath);
    if (targetFile.existsSync()) {
      throw StateError('Target file already exists; refusing to overwrite: $targetPath');
    }

    // 2. Validate source schema version in read-only mode before opening Drift adapter
    final sourceProbe = sqlite.sqlite3.open(sourceFile.path, mode: sqlite.OpenMode.readOnly);
    try {
      final userVersionRow = sourceProbe.select('PRAGMA user_version;');
      final userVersion = userVersionRow.first.values.first as int? ?? 0;
      if (userVersion != 1) {
        throw MigrationPreflightException([
          PreflightViolation(
            type: PreflightViolationType.schemaVersion,
            table: '',
            column: '',
            recordId: '',
            message: 'Expected schema version 1, found user_version=$userVersion',
          ),
        ]);
      }
    } finally {
      sourceProbe.dispose();
    }

    // 3. Open source strictly read-only and execute preflight
    final sourceDb = ReadOnlyMigrationSource.open(sourceFile.path);
    PreflightReport preflightReport;
    try {
      preflightReport = await V1ToV2MigrationPreflight.run(
        sourceDb,
        explicitExpiryDates: explicitExpiryDates,
      );
      preflightReport.ensureValid();
    } catch (_) {
      await sourceDb.close();
      rethrow;
    }

    // 3. Source preflight succeeded; prepare target database
    bool targetCreated = false;
    _TargetDatabase? targetDb;

    try {
      targetFile.parent.createSync(recursive: true);
      targetDb = _TargetDatabase(NativeDatabase(
        targetFile,
        setup: (rawDb) {
          rawDb.execute('PRAGMA foreign_keys = ON;');
        },
      ));
      targetCreated = true;

      // 4. Create v2 schema, copy tables transactionally
      await targetDb.transaction(() async {
        for (final statement in Version2Schema.createTableStatements) {
          await targetDb!.customStatement(statement);
        }
        for (final statement in Version2Schema.createIndexStatements) {
          await targetDb!.customStatement(statement);
        }

        await V1ToV2Copy.copyAll(
          sourceDb,
          targetDb!,
          resolvedExpiryDates: preflightReport.resolvedExpiryDates,
          onTableCopied: onTableCopied,
        );

        await targetDb!.customStatement('PRAGMA user_version = 2;');
      });

      // Test-only seam runs after copying and before validation, allowing
      // validation-failure and cleanup behavior to be exercised.
      if (onPostCopy != null) {
        await onPostCopy(targetDb);
      }

      // 5. Target validations
      final targetVersionRow =
          await targetDb.customSelect('PRAGMA user_version;').getSingle();
      if ((targetVersionRow.data['user_version'] as int? ?? 0) != 2) {
        throw const MigrationValidationException('Target user_version is not 2');
      }

      final fkViolations =
          await targetDb.customSelect('PRAGMA foreign_key_check;').get();
      if (fkViolations.isNotEmpty) {
        throw MigrationValidationException(
          'Target foreign_key_check failed with ${fkViolations.length} violation(s)',
        );
      }

      final integrityRows =
          await targetDb.customSelect('PRAGMA integrity_check;').get();
      final integrityResult =
          integrityRows.firstOrNull?.data.values.firstOrNull?.toString();
      if (integrityResult != 'ok') {
        throw MigrationValidationException(
          'Target integrity_check failed: $integrityResult',
        );
      }

      final tableRows = await targetDb
          .customSelect(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';",
          )
          .get();
      final actualTables =
          tableRows.map((r) => r.data['name'] as String).toSet();
      if (!actualTables.containsAll(expectedTables)) {
        final missing = expectedTables.difference(actualTables);
        throw MigrationValidationException(
          'Target is missing expected tables: $missing',
        );
      }

      final actualIndexes = (await targetDb
          .customSelect("SELECT name FROM sqlite_master WHERE type = 'index';")
          .get())
          .map((row) => row.data['name'] as String)
          .toSet();
      final expectedIndexes = <String>{
        for (final statement in Version2Schema.createIndexStatements)
          _objectName(statement),
      };
      if (!actualIndexes.containsAll(expectedIndexes)) {
        throw MigrationValidationException(
          'Target is missing expected indexes: ${expectedIndexes.difference(actualIndexes)}',
        );
      }

      const expectedUniqueConstraints = <String, List<String>>{
        'roles': ['name'],
        'users': ['username'],
        'categories': ['pharmacy_id', 'name'],
        'batches': ['pharmacy_id', 'medicine_id', 'batch_number'],
        'purchases': ['pharmacy_id', 'purchase_number'],
        'purchase_receipts': ['pharmacy_id', 'receipt_number'],
        'patients': ['pharmacy_id', 'patient_number'],
        'prescriptions': ['pharmacy_id', 'prescription_number'],
        'sales': ['pharmacy_id', 'invoice_number'],
        'sale_idempotency': ['pharmacy_id', 'idempotency_key'],
      };
      for (final entry in expectedUniqueConstraints.entries) {
        final indexes = await targetDb
            .customSelect('PRAGMA index_list(${entry.key});')
            .get();
        var found = false;
        for (final index in indexes) {
          final unique = index.data['unique'];
          if (unique != 1) continue;
          final indexName = index.data['name'] as String;
          final columns = await targetDb
              .customSelect('PRAGMA index_info("$indexName");')
              .get();
          final actualColumns = columns
              .map((column) => column.data['name'] as String)
              .toList();
          if (_sameColumns(actualColumns, entry.value)) {
            found = true;
            break;
          }
        }
        if (!found) {
          throw MigrationValidationException(
            'Target is missing unique constraint on ${entry.key}(${entry.value.join(', ')})',
          );
        }
      }

      // Verify row counts for all 21 copied tables
      final tableRowCounts = <String, int>{};
      for (final table in V1ToV2Copy.orderedTables) {
        final sourceCountRow = await sourceDb
            .customSelect('SELECT COUNT(*) AS c FROM $table;')
            .getSingle();
        final targetCountRow = await targetDb
            .customSelect('SELECT COUNT(*) AS c FROM $table;')
            .getSingle();
        final sourceCount = sourceCountRow.data['c'] as int? ?? 0;
        final targetCount = targetCountRow.data['c'] as int? ?? 0;
        if (sourceCount != targetCount) {
          throw MigrationValidationException(
            'Row count mismatch for $table: source=$sourceCount, target=$targetCount',
          );
        }
        tableRowCounts[table] = targetCount;
      }

      // Verify sale_idempotency is initially empty
      final idempotencyCountRow = await targetDb
          .customSelect('SELECT COUNT(*) AS c FROM sale_idempotency;')
          .getSingle();
      final idempotencyCount = idempotencyCountRow.data['c'] as int? ?? 0;
      if (idempotencyCount != 0) {
        throw MigrationValidationException(
          'Target sale_idempotency is not empty: found $idempotencyCount row(s)',
        );
      }

      // Representative conversion checks use the copied fixture-independent
      // metadata contract without duplicating row mappings.
      final expiryType = await targetDb
          .customSelect("SELECT typeof(expiry_date) AS t FROM batches LIMIT 1;")
          .get();
      if (expiryType.isNotEmpty && expiryType.first.data['t'] != 'text') {
        throw const MigrationValidationException('Target expiry_date is not stored as TEXT');
      }
      final timestampType = await targetDb
          .customSelect("SELECT typeof(created_at) AS t FROM pharmacies LIMIT 1;")
          .get();
      if (timestampType.isNotEmpty && timestampType.first.data['t'] != 'integer') {
        throw const MigrationValidationException('Target timestamps are not stored as INTEGER');
      }

      // Close writable target handle
      await targetDb.close();
      targetDb = null;

      // 6. Verify target can be reopened in genuine read-only mode
      final roTarget = sqlite.sqlite3.open(
        targetPath,
        mode: sqlite.OpenMode.readOnly,
      );
      try {
        final verifyRows = roTarget.select('SELECT COUNT(*) FROM pharmacies;');
        if (verifyRows.isEmpty || (verifyRows.first.values.first as int? ?? 0) < 1) {
          throw const MigrationValidationException('Target reopen verification failed');
        }
      } finally {
        roTarget.dispose();
      }

      return MigrationResult(
        sourcePath: sourcePath,
        targetPath: targetPath,
        tablesCopied: V1ToV2Copy.orderedTables.length,
        tableRowCounts: tableRowCounts,
      );
    } catch (e) {
      if (targetDb != null) {
        try {
          await targetDb.close();
        } catch (_) {}
      }
      if (targetCreated && targetFile.existsSync()) {
        try {
          targetFile.deleteSync();
        } catch (_) {}
        // Also clean up any SQLite sidecars created alongside target
        for (final ext in ['-wal', '-shm', '-journal']) {
          final sidecar = File('$targetPath$ext');
          if (sidecar.existsSync()) {
            try {
              sidecar.deleteSync();
            } catch (_) {}
          }
        }
      }
      rethrow;
    } finally {
      await sourceDb.close();
    }
  }
}

class _TargetDatabase extends GeneratedDatabase {
  _TargetDatabase(super.executor);

  @override
  Iterable<TableInfo> get allTables => const [];

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (_) async {},
        onUpgrade: (m, from, to) async {},
        beforeOpen: (details) async {
          await customStatement('PRAGMA foreign_keys = ON;');
        },
      );
}
