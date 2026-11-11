import 'package:flutter_test/flutter_test.dart';
import 'package:pharmacy_flutter/core/utils/scaled_values.dart';

void main() {
  group('ScaledValueConverter - Money (scale 100)', () {
    test('converts exact integers and decimals', () {
      expect(ScaledValueConverter.moneyToStorage(0), 0);
      expect(ScaledValueConverter.moneyToStorage(1), 100);
      expect(ScaledValueConverter.moneyToStorage(10.50), 1050);
      expect(ScaledValueConverter.moneyToStorage(99.99), 9999);
      expect(ScaledValueConverter.moneyToStorage(-15.25), -1525);
    });

    test('deterministic half-up rounding (away from zero)', () {
      expect(ScaledValueConverter.moneyToStorage(10.505), 1051);
      expect(ScaledValueConverter.moneyToStorage(10.504), 1050);
      expect(ScaledValueConverter.moneyToStorage(10.506), 1051);
      expect(ScaledValueConverter.moneyToStorage(-10.505), -1051);
      expect(ScaledValueConverter.moneyToStorage(-10.504), -1050);
      expect(ScaledValueConverter.moneyToStorage(-10.506), -1051);
    });

    test('avoids binary floating-point representation drift', () {
      expect(ScaledValueConverter.moneyToStorage(0.29), 29);
      expect(ScaledValueConverter.moneyToStorage(0.07), 7);
      expect(ScaledValueConverter.moneyToStorage(1.005), 101);
    });

    test('storageToMoney accurately divides by 100', () {
      expect(ScaledValueConverter.storageToMoney(1050), 10.5);
      expect(ScaledValueConverter.storageToMoney(0), 0.0);
      expect(ScaledValueConverter.storageToMoney(-1525), -15.25);
      expect(ScaledValueConverter.storageToMoney(7), 0.07);
    });
  });

  group('ScaledValueConverter - Quantity (scale 1000)', () {
    test('converts exact integers and decimals', () {
      expect(ScaledValueConverter.quantityToStorage(0), 0);
      expect(ScaledValueConverter.quantityToStorage(1), 1000);
      expect(ScaledValueConverter.quantityToStorage(1.5), 1500);
      expect(ScaledValueConverter.quantityToStorage(0.001), 1);
      expect(ScaledValueConverter.quantityToStorage(-2.5), -2500);
    });

    test('deterministic half-up rounding (away from zero)', () {
      expect(ScaledValueConverter.quantityToStorage(0.0005), 1);
      expect(ScaledValueConverter.quantityToStorage(0.0004), 0);
      expect(ScaledValueConverter.quantityToStorage(0.0006), 1);
      expect(ScaledValueConverter.quantityToStorage(-0.0005), -1);
      expect(ScaledValueConverter.quantityToStorage(-0.0004), 0);
      expect(ScaledValueConverter.quantityToStorage(-2.5005), -2501);
    });

    test('storageToQuantity accurately divides by 1000', () {
      expect(ScaledValueConverter.storageToQuantity(1500), 1.5);
      expect(ScaledValueConverter.storageToQuantity(1), 0.001);
      expect(ScaledValueConverter.storageToQuantity(0), 0.0);
      expect(ScaledValueConverter.storageToQuantity(-2500), -2.5);
    });
  });

  group('ScaledValueConverter - Exact Precision', () {
    test('detects and rejects excess monetary precision', () {
      expect(ScaledValueConverter.hasExcessPrecision(10.50, 100), isFalse);
      expect(ScaledValueConverter.hasExcessPrecision(10.555, 100), isTrue);
      expect(
        () => ScaledValueConverter.toStorageExact(10.555, 100),
        throwsA(isA<ExactPrecisionException>()),
      );
      expect(ScaledValueConverter.moneyToStorage(10.555), 1056);
    });

    test('detects and rejects excess quantity precision', () {
      expect(ScaledValueConverter.hasExcessPrecision(1.234, 1000), isFalse);
      expect(ScaledValueConverter.hasExcessPrecision(1.2345, 1000), isTrue);
      expect(
        () => ScaledValueConverter.toStorageExact(1.2345, 1000),
        throwsA(isA<ExactPrecisionException>()),
      );
      expect(ScaledValueConverter.quantityToStorage(1.2345), 1235);
    });

    test('handles exact and excess negative precision', () {
      expect(ScaledValueConverter.toStorageExact(-10.50, 100), -1050);
      expect(ScaledValueConverter.hasExcessPrecision(-10.555, 100), isTrue);
      expect(
        () => ScaledValueConverter.toStorageExact(-10.555, 100),
        throwsA(isA<ExactPrecisionException>()),
      );
    });

    test('handles zero, negative zero, and trailing zeros', () {
      expect(ScaledValueConverter.toStorageExact(0, 100), 0);
      expect(ScaledValueConverter.toStorageExact(-0.0, 100), 0);
      expect(ScaledValueConverter.hasExcessPrecision(10.5000, 100), isFalse);
      expect(ScaledValueConverter.toStorageExact(10.5000, 100), 1050);
    });

    test('handles scientific notation exactly', () {
      expect(ScaledValueConverter.toStorageExact(1e-2, 100), 1);
      expect(ScaledValueConverter.toStorageExact(1.234e3, 1000), 1234000);
      expect(ScaledValueConverter.hasExcessPrecision(1.2345e0, 1000), isTrue);
    });

    test('detection and exact conversion agree', () {
      for (final value in <num>[0, 10.50, -2.25, 1.234, -1.234]) {
        expect(
          () => ScaledValueConverter.toStorageExact(value, 1000),
          returnsNormally,
          reason: 'Expected $value to be exact',
        );
        expect(ScaledValueConverter.hasExcessPrecision(value, 1000), isFalse);
      }
      for (final value in <num>[10.555, -10.555, 1.2345]) {
        expect(ScaledValueConverter.hasExcessPrecision(value, 100), isTrue);
        expect(
          () => ScaledValueConverter.toStorageExact(value, 100),
          throwsA(isA<ExactPrecisionException>()),
        );
      }
    });
  });

  group('ScaledValueConverter - Validation and Edge Cases', () {
    test('throws FormatException on non-finite values', () {
      for (final value in <num>[double.nan, double.infinity, double.negativeInfinity]) {
        expect(() => ScaledValueConverter.moneyToStorage(value), throwsFormatException);
        expect(() => ScaledValueConverter.hasExcessPrecision(value, 100), throwsFormatException);
        expect(() => ScaledValueConverter.toStorageExact(value, 100), throwsFormatException);
      }
    });

    test('throws ArgumentError on invalid scale', () {
      for (final scale in [0, -100]) {
        expect(() => ScaledValueConverter.toStorage(10, scale), throwsArgumentError);
        expect(() => ScaledValueConverter.hasExcessPrecision(10, scale), throwsArgumentError);
        expect(() => ScaledValueConverter.toStorageExact(10, scale), throwsArgumentError);
      }
    });

    test('handles signed 64-bit boundaries and overflow', () {
      // 64-bit int boundaries at scale 1
      expect(
        ScaledValueConverter.toStorageExact(9223372036854775807, 1),
        9223372036854775807,
      );
      expect(
        ScaledValueConverter.toStorageExact(-9223372036854775808, 1),
        -9223372036854775808,
      );

      // Boundaries at scale 100 with integer inputs
      expect(
        ScaledValueConverter.toStorageExact(92233720368547758, 100),
        9223372036854775800,
      );
      expect(
        ScaledValueConverter.toStorageExact(-92233720368547758, 100),
        -9223372036854775800,
      );
      expect(
        () => ScaledValueConverter.toStorageExact(92233720368547759, 100),
        throwsRangeError,
      );
      expect(
        () => ScaledValueConverter.toStorageExact(-92233720368547759, 100),
        throwsRangeError,
      );

      // Large doubles within 53-bit IEEE-754 precision
      expect(
        ScaledValueConverter.toStorageExact(90071992547409.92, 100),
        9007199254740992,
      );
      expect(
        ScaledValueConverter.toStorageExact(-90071992547409.92, 100),
        -9007199254740992,
      );

      // Values exceeding 64-bit bounds
      expect(() => ScaledValueConverter.toStorage(1e20, 100), throwsRangeError);
      expect(() => ScaledValueConverter.toStorage(-1e20, 100), throwsRangeError);
      expect(() => ScaledValueConverter.toStorageExact(1e20, 100), throwsRangeError);
      expect(() => ScaledValueConverter.toStorageExact(-1e20, 100), throwsRangeError);
    });

    test('handles scientific notation for ordinary conversion', () {
      expect(ScaledValueConverter.toStorage(1e-2, 100), 1);
      expect(ScaledValueConverter.toStorage(2.5e1, 100), 2500);
    });
  });
}
