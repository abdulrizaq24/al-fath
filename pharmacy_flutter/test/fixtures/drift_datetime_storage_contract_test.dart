import 'package:drift/drift.dart' as drift;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';

class _TestRow {
  final int id;
  final String label;
  final DateTime recordedAt;

  const _TestRow({
    required this.id,
    required this.label,
    required this.recordedAt,
  });
}

class _TestTable extends drift.Table with drift.TableInfo<_TestTable, _TestRow> {
  @override
  final String actualTableName = 'test_records';
  @override
  final drift.DatabaseConnectionUser attachedDatabase;
  final String? _alias;

  _TestTable(this.attachedDatabase, [this._alias]);

  late final drift.GeneratedColumn<int> id = drift.GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    type: drift.DriftSqlType.int,
  );

  late final drift.GeneratedColumn<String> label = drift.GeneratedColumn<String>(
    'label',
    aliasedName,
    false,
    type: drift.DriftSqlType.string,
  );

  late final drift.GeneratedColumn<DateTime> recordedAt =
      drift.GeneratedColumn<DateTime>(
    'recorded_at',
    aliasedName,
    false,
    type: drift.DriftSqlType.dateTime,
  );

  @override
  List<drift.GeneratedColumn<Object>> get $columns => [id, label, recordedAt];

  @override
  String get aliasedName => _alias ?? actualTableName;

  @override
  Set<drift.GeneratedColumn> get $primaryKey => {id};

  @override
  _TestTable createAlias(String alias) => _TestTable(attachedDatabase, alias);

  @override
  _TestRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return _TestRow(
      id: attachedDatabase.typeMapping.read(
        drift.DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      label: attachedDatabase.typeMapping.read(
        drift.DriftSqlType.string,
        data['${effectivePrefix}label'],
      )!,
      recordedAt: attachedDatabase.typeMapping.read(
        drift.DriftSqlType.dateTime,
        data['${effectivePrefix}recorded_at'],
      )!,
    );
  }
}

class _StorageExperimentDb extends drift.GeneratedDatabase {
  _StorageExperimentDb(super.executor);

  late final _TestTable testTable = _TestTable(this);

  @override
  Iterable<drift.TableInfo> get allTables => [testTable];

  @override
  int get schemaVersion => 1;

  @override
  drift.MigrationStrategy get migration => drift.MigrationStrategy(
        beforeOpen: (details) async {},
      );
}

class ExperimentResult {
  final int id;
  final String caseLabel;
  final DateTime input;
  final int rawSqliteValue;
  final String sqliteStorageType;
  final DateTime decodedValue;
  final bool instantMatchesExact;
  final bool instantMatchesTruncated;
  final bool subsecondLost;
  final bool inputIsUtc;
  final bool decodedIsUtc;

  const ExperimentResult({
    required this.id,
    required this.caseLabel,
    required this.input,
    required this.rawSqliteValue,
    required this.sqliteStorageType,
    required this.decodedValue,
    required this.instantMatchesExact,
    required this.instantMatchesTruncated,
    required this.subsecondLost,
    required this.inputIsUtc,
    required this.decodedIsUtc,
  });

  @override
  String toString() =>
      'Case $id ($caseLabel): input=$input (utc=$inputIsUtc), '
      'raw=$rawSqliteValue (type=$sqliteStorageType), '
      'decoded=$decodedValue (utc=$decodedIsUtc), '
      'exactMatch=$instantMatchesExact, subsecondLost=$subsecondLost';
}

void main() {
  test('Drift 2.28.2 DateTime storage contract experiment', () async {
    final db = _StorageExperimentDb(
      NativeDatabase.memory(
        setup: (rawDb) => rawDb.execute(
          'CREATE TABLE test_records ('
          '  id INTEGER PRIMARY KEY,'
          '  label TEXT NOT NULL,'
          '  recorded_at INTEGER NOT NULL'
          ');',
        ),
      ),
    );

    try {
      // 1. UTC DateTime with whole-second precision
      final case1UtcWhole = DateTime.utc(2025, 1, 15, 12, 30, 45);

      // 2. Local DateTime representing the exact same absolute instant as Case 1
      final case2LocalWhole = case1UtcWhole.toLocal();

      // 3. UTC DateTime containing milliseconds
      final case3UtcMillis = DateTime.utc(2025, 1, 15, 12, 30, 45, 789);

      // 4. Local DateTime containing milliseconds
      final case4LocalMillis = case3UtcMillis.toLocal();

      // 5. Two values with identical displayed calendar fields but different instant meanings
      final case5aUtcFields = DateTime.utc(2025, 1, 15, 8, 0, 0);
      final case5bLocalFields = DateTime(2025, 1, 15, 8, 0, 0);

      final testCases = <(int id, String label, DateTime dt)>[
        (1, 'UTC whole second', case1UtcWhole),
        (2, 'Local same instant whole second', case2LocalWhole),
        (3, 'UTC with milliseconds', case3UtcMillis),
        (4, 'Local with milliseconds', case4LocalMillis),
        (5, 'Displayed calendar fields in UTC', case5aUtcFields),
        (6, 'Displayed calendar fields in local', case5bLocalFields),
      ];

      // A. Insert each row through Drift's typed API
      for (final tc in testCases) {
        await db.into(db.testTable).insert(
          drift.RawValuesInsertable({
            'id': drift.Variable<int>(tc.$1),
            'label': drift.Variable<String>(tc.$2),
            'recorded_at': drift.Variable<DateTime>(tc.$3),
          }),
        );
      }

      // B. Query raw SQLite values and types
      final rawRows = await db.customSelect(
        'SELECT id, label, recorded_at, typeof(recorded_at) AS storage_type '
        'FROM test_records ORDER BY id;',
      ).get();
      expect(rawRows, hasLength(testCases.length));

      // C. Read back through Drift's typed read API
      final decodedRows = await db.select(db.testTable).get();
      expect(decodedRows, hasLength(testCases.length));

      final results = <ExperimentResult>[];

      for (var i = 0; i < testCases.length; i++) {
        final tc = testCases[i];
        final rawRow = rawRows[i].data;
        final decoded = decodedRows[i];

        final rawValue = rawRow['recorded_at'] as int;
        final storageType = rawRow['storage_type'] as String;
        final expectedSeconds = tc.$3.millisecondsSinceEpoch ~/ 1000;

        // Verify SQLite storage type is integer and matches expected serialization expression
        expect(storageType, 'integer');
        expect(rawValue, expectedSeconds);

        final exactMatch = decoded.recordedAt.isAtSameMomentAs(tc.$3);
        final truncatedExpected =
            DateTime.fromMillisecondsSinceEpoch(expectedSeconds * 1000);
        final truncatedMatch =
            decoded.recordedAt.isAtSameMomentAs(truncatedExpected);
        final subsecondLost = tc.$3.millisecond > 0 && decoded.recordedAt.millisecond == 0;

        // Drift reconstructs with whole seconds (millisecond == 0)
        expect(decoded.recordedAt.millisecond, 0);
        expect(truncatedMatch, isTrue);

        results.add(
          ExperimentResult(
            id: tc.$1,
            caseLabel: tc.$2,
            input: tc.$3,
            rawSqliteValue: rawValue,
            sqliteStorageType: storageType,
            decodedValue: decoded.recordedAt,
            instantMatchesExact: exactMatch,
            instantMatchesTruncated: truncatedMatch,
            subsecondLost: subsecondLost,
            inputIsUtc: tc.$3.isUtc,
            decodedIsUtc: decoded.recordedAt.isUtc,
          ),
        );
      }

      // D. Case-specific assertions

      // Case 1 & 2: Same instant in UTC and local serialize to identical raw integer
      expect(case1UtcWhole.isAtSameMomentAs(case2LocalWhole), isTrue);
      expect(results[0].rawSqliteValue, results[1].rawSqliteValue);
      expect(results[0].instantMatchesExact, isTrue);
      expect(results[1].instantMatchesExact, isTrue);

      // Case 3 & 4: Subsecond precision is lost
      expect(case3UtcMillis.millisecond, 789);
      expect(case4LocalMillis.millisecond, 789);
      expect(results[2].subsecondLost, isTrue);
      expect(results[3].subsecondLost, isTrue);
      expect(results[2].instantMatchesExact, isFalse);
      expect(results[3].instantMatchesExact, isFalse);
      expect(results[2].rawSqliteValue, results[3].rawSqliteValue);

      // Case 5 & 6: Same displayed calendar fields serialize differently if local offset != 0
      if (case5bLocalFields.timeZoneOffset != Duration.zero) {
        expect(
          results[4].rawSqliteValue,
          isNot(equals(results[5].rawSqliteValue)),
          reason: 'Different instants with identical displayed calendar fields '
              'must serialize to different Unix timestamps',
        );
      }

      // E. Decoded isUtc flag behavior
      // Drift's default numeric mapping reconstructs DateTime.fromMillisecondsSinceEpoch(ms)
      // which produces isUtc == false (device-local DateTime), regardless of original isUtc flag.
      for (final r in results) {
        expect(r.decodedIsUtc, isFalse);
      }
    } finally {
      await db.close();
    }
  });
}
