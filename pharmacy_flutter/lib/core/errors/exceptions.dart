class AppException implements Exception {
  final String message;
  final String? code;

  const AppException(this.message, [this.code]);

  @override
  String toString() => code != null ? '[$code] $message' : message;
}

class ValidationException extends AppException {
  const ValidationException(super.message, [super.code]);
}

class NotFoundException extends AppException {
  const NotFoundException(super.message, [super.code]);
}

class AuthenticationException extends AppException {
  const AuthenticationException(super.message, [super.code]);
}

class InsufficientStockException extends AppException {
  const InsufficientStockException(super.message, [super.code]);
}

class BusinessLogicException extends AppException {
  const BusinessLogicException(super.message, [super.code]);
}
