import 'package:drift/drift.dart';

import '../../domain/enums/app_enums.dart';
import '../database/database.dart';

abstract class IAuthDao {
  Future<Pharmacy?> getPharmacy();
  Future<Pharmacy> insertPharmacy(PharmaciesCompanion entry);
  Future<Role?> getRoleByName(RoleName roleName);
  Future<Role> insertRole(RolesCompanion entry);
  Future<User?> getUserByUsername(String username);
  Future<User?> getUserById(String id);
  Future<User> insertUser(UsersCompanion entry);
  Future<bool> updateUser(UsersCompanion entry);
  Future<List<User>> listUsers(String pharmacyId);
}

class AuthDao implements IAuthDao {
  final AppDatabase _db;

  const AuthDao(this._db);

  @override
  Future<Pharmacy?> getPharmacy() async {
    final query = _db.select(_db.pharmacies)..limit(1);
    return query.getSingleOrNull();
  }

  @override
  Future<Pharmacy> insertPharmacy(PharmaciesCompanion entry) async {
    return _db.into(_db.pharmacies).insertReturning(entry);
  }

  @override
  Future<Role?> getRoleByName(RoleName roleName) async {
    final query = _db.select(_db.roles)
      ..where((tbl) => tbl.name.equals(roleName.index));
    return query.getSingleOrNull();
  }

  @override
  Future<Role> insertRole(RolesCompanion entry) async {
    return _db.into(_db.roles).insertReturning(entry);
  }

  @override
  Future<User?> getUserByUsername(String username) async {
    final query = _db.select(_db.users)
      ..where((tbl) => tbl.username.equals(username));
    return query.getSingleOrNull();
  }

  @override
  Future<User?> getUserById(String id) async {
    final query = _db.select(_db.users)..where((tbl) => tbl.id.equals(id));
    return query.getSingleOrNull();
  }

  @override
  Future<User> insertUser(UsersCompanion entry) async {
    return _db.into(_db.users).insertReturning(entry);
  }

  @override
  Future<bool> updateUser(UsersCompanion entry) async {
    final count = await (_db.update(
      _db.users,
    )..where((tbl) => tbl.id.equals(entry.id.value))).write(entry);
    return count > 0;
  }

  @override
  Future<List<User>> listUsers(String pharmacyId) async {
    final query = _db.select(_db.users)
      ..where((tbl) => tbl.pharmacyId.equals(pharmacyId))
      ..orderBy([(tbl) => OrderingTerm.asc(tbl.name)]);
    return query.get();
  }
}
