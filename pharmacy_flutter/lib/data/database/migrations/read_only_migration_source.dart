import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:sqlite3/sqlite3.dart' as sqlite;

/// Opens an existing SQLite file through an OS/SQLite-enforced read-only handle.
///
/// The returned database is suitable for migration preflight and must be closed
/// by the caller. No create, write, or migration-capable file opening is used.
class ReadOnlyMigrationSource extends GeneratedDatabase {
  ReadOnlyMigrationSource._(sqlite.Database database)
      : super(NativeDatabase.opened(database));
  bool _closed = false;

  /// Opens [path] with SQLite's `SQLITE_OPEN_READONLY` mode.
  ///
  /// The file must already exist. SQLite, rather than a Dart-level convention,
  /// rejects data and schema writes on the underlying connection.
  factory ReadOnlyMigrationSource.open(String path) {
    if (path.trim().isEmpty) throw ArgumentError.value(path, 'path');
    final file = File(path);
    if (!file.existsSync()) throw FileSystemException('Source database does not exist', path);
    final native = sqlite.sqlite3.open(file.absolute.path, mode: sqlite.OpenMode.readOnly);
    return ReadOnlyMigrationSource._(native);
  }

  @override
  Iterable<TableInfo> get allTables => const [];

  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (_) async {},
        beforeOpen: (_) async {},
      );

  @override
  Future<void> close() async {
    if (_closed) return;
    _closed = true;
    await super.close();
  }
}
