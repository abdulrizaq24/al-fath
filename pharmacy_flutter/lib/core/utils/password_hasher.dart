import 'package:bcrypt/bcrypt.dart';

abstract class PasswordHasher {
  String hash(String plainPassword);
  bool verify(String plainPassword, String hashedPassword);
}

class BcryptPasswordHasher implements PasswordHasher {
  const BcryptPasswordHasher();

  @override
  String hash(String plainPassword) {
    return BCrypt.hashpw(plainPassword, BCrypt.gensalt());
  }

  @override
  bool verify(String plainPassword, String hashedPassword) {
    return BCrypt.checkpw(plainPassword, hashedPassword);
  }
}
