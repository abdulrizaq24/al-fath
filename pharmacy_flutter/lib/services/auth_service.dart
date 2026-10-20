import 'package:drift/drift.dart';

import '../core/errors/exceptions.dart';
import '../core/utils/password_hasher.dart';
import '../core/utils/uuid_generator.dart';
import '../data/daos/auth_dao.dart';
import '../data/database/database.dart';
import '../domain/enums/app_enums.dart';

abstract class IAuthService {
  Future<bool> isSetupRequired();
  Future<User> setupInitialPharmacy({
    required String pharmacyName,
    String? licenseNumber,
    String? address,
    String? phone,
    required String adminName,
    required String adminUsername,
    required String adminPassword,
  });
  Future<User> login(String username, String password);
}

class AuthService implements IAuthService {
  final IAuthDao _authDao;
  final PasswordHasher _hasher;

  const AuthService(this._authDao, [this._hasher = const BcryptPasswordHasher()]);

  @override
  Future<bool> isSetupRequired() async {
    final pharmacy = await _authDao.getPharmacy();
    return pharmacy == null;
  }

  @override
  Future<User> setupInitialPharmacy({
    required String pharmacyName,
    String? licenseNumber,
    String? address,
    String? phone,
    required String adminName,
    required String adminUsername,
    required String adminPassword,
  }) async {
    final existing = await _authDao.getPharmacy();
    if (existing != null) {
      throw const BusinessLogicException('Apotek sudah dikonfigurasi sebelumnya.');
    }

    final pharmacyId = UuidGenerator.v4();
    await _authDao.insertPharmacy(
      PharmaciesCompanion(
        id: Value(pharmacyId),
        name: Value(pharmacyName.trim()),
        licenseNumber: Value(licenseNumber?.trim()),
        address: Value(address?.trim()),
        phone: Value(phone?.trim()),
        createdAt: Value(DateTime.now()),
        updatedAt: Value(DateTime.now()),
      ),
    );

    // Pastikan roles ADMIN dan PHARMACIST dibuat
    var adminRole = await _authDao.getRoleByName(RoleName.admin);
    adminRole ??= await _authDao.insertRole(
      RolesCompanion(
        id: Value(UuidGenerator.v4()),
        name: const Value(RoleName.admin),
        description: const Value('Administrator dengan akses penuh'),
        createdAt: Value(DateTime.now()),
        updatedAt: Value(DateTime.now()),
      ),
    );

    var pharmacistRole = await _authDao.getRoleByName(RoleName.pharmacist);
    if (pharmacistRole == null) {
      await _authDao.insertRole(
        RolesCompanion(
          id: Value(UuidGenerator.v4()),
          name: const Value(RoleName.pharmacist),
          description: const Value('Kasir dan Apoteker'),
          createdAt: Value(DateTime.now()),
          updatedAt: Value(DateTime.now()),
        ),
      );
    }

    final passwordHash = _hasher.hash(adminPassword);
    final adminUser = await _authDao.insertUser(
      UsersCompanion(
        id: Value(UuidGenerator.v4()),
        pharmacyId: Value(pharmacyId),
        roleId: Value(adminRole.id),
        name: Value(adminName.trim()),
        username: Value(adminUsername.trim().toLowerCase()),
        passwordHash: Value(passwordHash),
        isActive: const Value(true),
        createdAt: Value(DateTime.now()),
        updatedAt: Value(DateTime.now()),
      ),
    );

    return adminUser;
  }

  @override
  Future<User> login(String username, String password) async {
    final cleanUsername = username.trim().toLowerCase();
    final user = await _authDao.getUserByUsername(cleanUsername);

    if (user == null || !user.isActive) {
      throw const AuthenticationException('Username atau password tidak valid.');
    }

    final isMatched = _hasher.verify(password, user.passwordHash);
    if (!isMatched) {
      throw const AuthenticationException('Username atau password tidak valid.');
    }

    await _authDao.updateUser(
      UsersCompanion(
        id: Value(user.id),
        lastLoginAt: Value(DateTime.now()),
      ),
    );

    return user;
  }
}
