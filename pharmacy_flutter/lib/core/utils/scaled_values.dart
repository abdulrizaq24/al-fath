/// Thrown when a numeric value cannot be represented exactly at the requested
/// scale without rounding.
///
/// This indicates unsupported precision during migration preflight or strict
/// validation, preventing silent data loss.
class ExactPrecisionException implements Exception {
  final num value;
  final int scale;
  final String message;

  ExactPrecisionException(this.value, this.scale, [String? message])
      : message = message ??
            'Value $value has unsupported precision and cannot be represented '
                'exactly at scale $scale without rounding.';

  @override
  String toString() => 'ExactPrecisionException: $message';
}

/// Conversion helpers for values stored as scaled SQLite integers.
///
/// Monetary values default to minor units (scale 100, e.g. cents or piastres);
/// quantities default to thousandths (scale 1000, e.g. milligrams or milliliters).
/// Conversion uses decimal-string parsing and arbitrary-precision [BigInt] arithmetic
/// to avoid binary floating-point rounding drift.
///
/// ### Intentional Half-Up Rounding vs. Exact Migration Conversion
/// - **Ordinary runtime conversions** ([toStorage], [moneyToStorage], [quantityToStorage]):
///   Apply deterministic half-up rounding away from zero. This is standard for computed
///   runtime business operations such as taxes, discounts, and pro-rated line totals.
/// - **Migration preflight & strict validation** ([toStorageExact], [moneyToStorageExact],
///   [quantityToStorageExact], [hasExcessPrecision]):
///   Validate that the input requires no rounding. If any fractional precision would be
///   discarded, [ExactPrecisionException] is thrown. Migration preflight uses this to abort
///   before replacing tables when legacy double records contain unrounded values.
///
/// ### Numeric Representation Limitations
/// In Dart, `num` is either a 64-bit signed [int] or an IEEE-754 64-bit [double].
/// A `double` provides 53 bits of significand (approximately 15–17 decimal digits of precision).
/// If a numeric input has already lost precision before being passed to this converter
/// (for example, floating-point arithmetic drift or values exceeding 53 bits of precision),
/// this converter cannot recover precision already lost at the language level.
class ScaledValueConverter {
  ScaledValueConverter._();

  static const int moneyScale = 100;
  static const int quantityScale = 1000;
  static const int int64Min = -9223372036854775808;
  static const int int64Max = 9223372036854775807;

  // --- Runtime Half-Up Conversions ---

  static int moneyToStorage(num value) => toStorage(value, moneyScale);

  static double storageToMoney(int value) => value / moneyScale;

  static int quantityToStorage(num value) => toStorage(value, quantityScale);

  static double storageToQuantity(int value) => value / quantityScale;

  // --- Exact Migration / Validation Conversions ---

  static int moneyToStorageExact(num value) => toStorageExact(value, moneyScale);

  static int quantityToStorageExact(num value) => toStorageExact(value, quantityScale);

  static bool hasExcessMoneyPrecision(num value) => hasExcessPrecision(value, moneyScale);

  static bool hasExcessQuantityPrecision(num value) => hasExcessPrecision(value, quantityScale);

  /// Checks whether [value] has excess fractional precision that cannot be represented
  /// at [scale] without rounding.
  ///
  /// Returns `true` if scaling requires rounding (non-zero remainder).
  /// Returns `false` if [value] is exactly representable at [scale].
  ///
  /// Throws [ArgumentError] if [scale] <= 0.
  /// Throws [FormatException] if [value] is not a finite number.
  static bool hasExcessPrecision(num value, int scale) {
    final parsed = _parseAndScale(value, scale);
    return parsed.hasExcess;
  }

  /// Converts a finite decimal number to an int64-compatible scaled integer.
  /// Half values are rounded away from zero (deterministic half-up behavior).
  ///
  /// Throws [ArgumentError] if [scale] <= 0.
  /// Throws [FormatException] if [value] is not a finite number.
  /// Throws [RangeError] if the scaled integer exceeds signed 64-bit bounds.
  static int toStorage(num value, int scale) {
    final parsed = _parseAndScale(value, scale);
    final min = BigInt.from(int64Min);
    final max = BigInt.from(int64Max);
    if (parsed.roundedScaled < min || parsed.roundedScaled > max) {
      throw RangeError('Scaled value does not fit in signed 64-bit storage.');
    }
    return parsed.roundedScaled.toInt();
  }

  /// Converts a finite decimal number to an int64-compatible scaled integer without rounding.
  ///
  /// Throws [ExactPrecisionException] if [value] has excess precision that would require rounding.
  /// Throws [ArgumentError] if [scale] <= 0.
  /// Throws [FormatException] if [value] is not a finite number.
  /// Throws [RangeError] if the exact scaled integer exceeds signed 64-bit bounds.
  static int toStorageExact(num value, int scale) {
    final parsed = _parseAndScale(value, scale);
    if (parsed.hasExcess) {
      throw ExactPrecisionException(value, scale);
    }
    final min = BigInt.from(int64Min);
    final max = BigInt.from(int64Max);
    if (parsed.exactScaled < min || parsed.exactScaled > max) {
      throw RangeError('Scaled value does not fit in signed 64-bit storage.');
    }
    return parsed.exactScaled.toInt();
  }

  static _ParsedScaled _parseAndScale(num value, int scale) {
    if (scale <= 0) {
      throw ArgumentError.value(scale, 'scale', 'must be positive');
    }
    if (value is double && (!value.isFinite || value.isNaN)) {
      throw FormatException('Value must be finite.');
    }

    final decimal = value.toString().toLowerCase();
    final parts = decimal.split('e');
    final mantissa = parts.first;
    final exponent = parts.length == 2 ? int.tryParse(parts[1]) : 0;
    if (exponent == null) throw FormatException('Invalid numeric value: $value');

    final negative = mantissa.startsWith('-');
    final unsigned = (mantissa.startsWith('-') || mantissa.startsWith('+'))
        ? mantissa.substring(1)
        : mantissa;
    final digits = unsigned.replaceFirst('.', '');
    final dotIndex = unsigned.indexOf('.');
    final fractionalDigits = dotIndex < 0 ? 0 : unsigned.length - dotIndex - 1;
    if (digits.isEmpty || !RegExp(r'^\d+$').hasMatch(digits)) {
      throw FormatException('Invalid numeric value: $value');
    }

    final numerator = BigInt.parse(digits);
    final decimalPlaces = fractionalDigits - exponent;
    final scaleBig = BigInt.from(scale);

    BigInt roundedScaled;
    BigInt exactScaled;
    bool hasExcess;

    if (decimalPlaces <= 0) {
      final factor = BigInt.from(10).pow(-decimalPlaces);
      exactScaled = numerator * factor * scaleBig;
      roundedScaled = exactScaled;
      hasExcess = false;
    } else {
      final denominator = BigInt.from(10).pow(decimalPlaces);
      final product = numerator * scaleBig;
      final quotient = product ~/ denominator;
      final remainder = product.remainder(denominator).abs();
      hasExcess = remainder != BigInt.zero;
      roundedScaled = remainder * BigInt.from(2) >= denominator
          ? quotient + BigInt.one
          : quotient;
      exactScaled = quotient;
    }

    if (negative) {
      roundedScaled = -roundedScaled;
      exactScaled = -exactScaled;
    }

    return _ParsedScaled(
      roundedScaled: roundedScaled,
      exactScaled: exactScaled,
      hasExcess: hasExcess,
    );
  }
}

class _ParsedScaled {
  final BigInt roundedScaled;
  final BigInt exactScaled;
  final bool hasExcess;

  const _ParsedScaled({
    required this.roundedScaled,
    required this.exactScaled,
    required this.hasExcess,
  });
}
