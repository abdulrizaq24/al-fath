import 'package:flutter_test/flutter_test.dart';
import 'package:timezone/data/latest_all.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

void main() {
  setUpAll(() {
    // Embedded in-memory initialization. Requires no network access or external files.
    tz_data.initializeTimeZones();
  });

  group('Zone lookup', () {
    test('resolves canonical UTC and Etc/UTC locations', () {
      final utc = tz.getLocation('UTC');
      final etcUtc = tz.getLocation('Etc/UTC');

      expect(utc.name, 'UTC');
      expect(etcUtc.name, 'Etc/UTC');
      expect(utc.currentTimeZone.offset, Duration.zero);
      expect(etcUtc.currentTimeZone.offset, Duration.zero);
    });

    test('resolves pharmacy target location Africa/Khartoum', () {
      final khartoum = tz.getLocation('Africa/Khartoum');
      expect(khartoum.name, 'Africa/Khartoum');
    });

    test('resolves DST-observing location America/New_York', () {
      final newYork = tz.getLocation('America/New_York');
      expect(newYork.name, 'America/New_York');
    });

    test('resolves DST-observing location Europe/Berlin', () {
      final berlin = tz.getLocation('Europe/Berlin');
      expect(berlin.name, 'Europe/Berlin');
    });
  });

  group('Invalid configuration handling', () {
    test('rejects missing, blank, malformed, and unknown identifiers without fallback', () {
      final invalidIdentifiers = <String?>[
        null,
        '',
        '   ',
        'NotAnIanaTimezone',
        'Africa',
        'Africa/NonExistentCity',
        'Invalid/Timezone',
        'UnknownZone',
      ];

      for (final identifier in invalidIdentifiers) {
        expect(
          () {
            if (identifier == null || identifier.trim().isEmpty) {
              throw ArgumentError('Timezone identifier cannot be null or empty');
            }
            return tz.getLocation(identifier);
          },
          throwsA(anything),
          reason: 'Identifier "$identifier" must be rejected without falling back to host timezone',
        );
      }
    });

    test('tz.getLocation throws LocationNotFoundException for unrecognized zones', () {
      expect(
        () => tz.getLocation('Invalid/Timezone'),
        throwsA(isA<tz.LocationNotFoundException>()),
      );
    });
  });

  group('Date conversion and boundaries', () {
    test('converts UTC instant near pharmacy-local midnight in Africa/Khartoum', () {
      final khartoum = tz.getLocation('Africa/Khartoum');

      // 30 minutes before local midnight: 2024-01-31 21:30:00 UTC + 2h = 2024-01-31 23:30:00 local
      final beforeMidnightUtc = DateTime.utc(2024, 1, 31, 21, 30);
      final beforeLocal = tz.TZDateTime.from(beforeMidnightUtc, khartoum);

      expect(beforeLocal.year, 2024);
      expect(beforeLocal.month, 1);
      expect(beforeLocal.day, 31);
      expect(beforeLocal.hour, 23);
      expect(beforeLocal.minute, 30);
      expect(beforeLocal.timeZone.offset, const Duration(hours: 2));

      // 30 minutes after local midnight: 2024-01-31 22:30:00 UTC + 2h = 2024-02-01 00:30:00 local
      // Calendar date in Khartoum is Feb 1, while UTC calendar date is still Jan 31
      final afterMidnightUtc = DateTime.utc(2024, 1, 31, 22, 30);
      final afterLocal = tz.TZDateTime.from(afterMidnightUtc, khartoum);

      expect(afterLocal.year, 2024);
      expect(afterLocal.month, 2);
      expect(afterLocal.day, 1);
      expect(afterLocal.hour, 0);
      expect(afterLocal.minute, 30);
      expect(afterLocal.timeZone.offset, const Duration(hours: 2));
    });

    test('converts UTC instant near midnight where local date lags UTC in America/New_York', () {
      final newYork = tz.getLocation('America/New_York');

      // UTC has crossed into July 1 (03:30 UTC), but New York (EDT, UTC-4) is 23:30 on June 30
      final instantUtc = DateTime.utc(2024, 7, 1, 3, 30);
      final local = tz.TZDateTime.from(instantUtc, newYork);

      expect(local.year, 2024);
      expect(local.month, 6);
      expect(local.day, 30);
      expect(local.hour, 23);
      expect(local.minute, 30);
      expect(local.timeZone.offset, const Duration(hours: -4));
      expect(local.timeZone.isDst, isTrue);
    });

    test('resolves historical offsets for Africa/Khartoum', () {
      final khartoum = tz.getLocation('Africa/Khartoum');

      // Between 2000-01-15 and 2017-10-31, Sudan observed East Africa Time (EAT, UTC+3)
      final eatInstant = DateTime.utc(2010, 6, 15, 12, 0);
      final eatLocal = tz.TZDateTime.from(eatInstant, khartoum);
      expect(eatLocal.timeZone.offset, const Duration(hours: 3));
      expect(eatLocal.timeZone.abbreviation, 'EAT');
      expect(eatLocal.timeZone.isDst, isFalse);

      // On 2017-11-01, Sudan returned to Central Africa Time (CAT, UTC+2)
      final catInstant = DateTime.utc(2024, 6, 15, 12, 0);
      final catLocal = tz.TZDateTime.from(catInstant, khartoum);
      expect(catLocal.timeZone.offset, const Duration(hours: 2));
      expect(catLocal.timeZone.abbreviation, 'CAT');
      expect(catLocal.timeZone.isDst, isFalse);
    });

    test('resolves winter and summer offsets in DST-observing America/New_York', () {
      final newYork = tz.getLocation('America/New_York');

      // Winter: EST (UTC-5)
      final winterInstant = DateTime.utc(2023, 1, 15, 12, 0);
      final winterLocal = tz.TZDateTime.from(winterInstant, newYork);
      expect(winterLocal.timeZone.offset, const Duration(hours: -5));
      expect(winterLocal.timeZone.abbreviation, 'EST');
      expect(winterLocal.timeZone.isDst, isFalse);

      // Summer: EDT (UTC-4)
      final summerInstant = DateTime.utc(2023, 7, 15, 12, 0);
      final summerLocal = tz.TZDateTime.from(summerInstant, newYork);
      expect(summerLocal.timeZone.offset, const Duration(hours: -4));
      expect(summerLocal.timeZone.abbreviation, 'EDT');
      expect(summerLocal.timeZone.isDst, isTrue);
    });

    test('resolves instants immediately before and after New York spring DST transition', () {
      final newYork = tz.getLocation('America/New_York');

      // In 2023, New York clocks advanced from 02:00 EST to 03:00 EDT on March 12 at 07:00 UTC
      // 1 second before transition: 2023-03-12 06:59:59 UTC -> 01:59:59 EST (UTC-5)
      final beforeUtc = DateTime.utc(2023, 3, 12, 6, 59, 59);
      final beforeLocal = tz.TZDateTime.from(beforeUtc, newYork);
      expect(beforeLocal.hour, 1);
      expect(beforeLocal.minute, 59);
      expect(beforeLocal.second, 59);
      expect(beforeLocal.timeZone.offset, const Duration(hours: -5));
      expect(beforeLocal.timeZone.isDst, isFalse);

      // At transition: 2023-03-12 07:00:00 UTC -> 03:00:00 EDT (UTC-4)
      final atTransitionUtc = DateTime.utc(2023, 3, 12, 7, 0, 0);
      final atTransitionLocal = tz.TZDateTime.from(atTransitionUtc, newYork);
      expect(atTransitionLocal.hour, 3);
      expect(atTransitionLocal.minute, 0);
      expect(atTransitionLocal.second, 0);
      expect(atTransitionLocal.timeZone.offset, const Duration(hours: -4));
      expect(atTransitionLocal.timeZone.isDst, isTrue);

      // Calendar date remains identical across the transition
      expect(beforeLocal.year, 2023);
      expect(beforeLocal.month, 3);
      expect(beforeLocal.day, 12);
      expect(atTransitionLocal.day, 12);
    });

    test('resolves historical dates outside a 10-year window (>10 years prior) with latest_all', () {
      final khartoum = tz.getLocation('Africa/Khartoum');

      // Summer 1985 (41 years ago relative to 2026): Sudan observed Daylight Saving Time (CAST, UTC+3)
      final summer1985 = DateTime.utc(1985, 7, 1, 12, 0);
      final summer1985Local = tz.TZDateTime.from(summer1985, khartoum);
      expect(summer1985Local.year, 1985);
      expect(summer1985Local.month, 7);
      expect(summer1985Local.day, 1);
      expect(summer1985Local.timeZone.offset, const Duration(hours: 3));
      expect(summer1985Local.timeZone.isDst, isTrue);
      expect(summer1985Local.timeZone.abbreviation, 'CAST');

      // Winter 1985: Sudan was on Central Africa Time (CAT, UTC+2)
      final winter1985 = DateTime.utc(1985, 1, 1, 12, 0);
      final winter1985Local = tz.TZDateTime.from(winter1985, khartoum);
      expect(winter1985Local.year, 1985);
      expect(winter1985Local.month, 1);
      expect(winter1985Local.day, 1);
      expect(winter1985Local.timeZone.offset, const Duration(hours: 2));
      expect(winter1985Local.timeZone.isDst, isFalse);
      expect(winter1985Local.timeZone.abbreviation, 'CAT');
    });
  });

  group('Device-timezone independence', () {
    test('explicit location conversion is completely independent of package local location', () {
      final originalLocal = tz.local;
      try {
        final khartoum = tz.getLocation('Africa/Khartoum');
        final newYork = tz.getLocation('America/New_York');
        final tokyo = tz.getLocation('Asia/Tokyo');

        final instant = DateTime.utc(2024, 6, 15, 23, 0);

        // Convert with default local location
        final khartoumResult1 = tz.TZDateTime.from(instant, khartoum);
        final newYorkResult1 = tz.TZDateTime.from(instant, newYork);

        // Change the package's local location to Asia/Tokyo
        tz.setLocalLocation(tokyo);

        // Convert the same instant with explicit location
        final khartoumResult2 = tz.TZDateTime.from(instant, khartoum);
        final newYorkResult2 = tz.TZDateTime.from(instant, newYork);

        // Verify that mutating package local location has zero effect on explicit conversions
        expect(khartoumResult1.toIso8601String(), khartoumResult2.toIso8601String());
        expect(khartoumResult1.year, khartoumResult2.year);
        expect(khartoumResult1.month, khartoumResult2.month);
        expect(khartoumResult1.day, khartoumResult2.day);

        expect(newYorkResult1.toIso8601String(), newYorkResult2.toIso8601String());
        expect(newYorkResult1.year, newYorkResult2.year);
        expect(newYorkResult1.month, newYorkResult2.month);
        expect(newYorkResult1.day, newYorkResult2.day);
      } finally {
        tz.setLocalLocation(originalLocal);
      }
    });

    test('deterministic calendar date derivation does not read DateTime.now() or host zone', () {
      final khartoum = tz.getLocation('Africa/Khartoum');

      // Fixed timestamp: 1706740200000 ms (2024-01-31 22:30:00.000 UTC)
      const timestampMs = 1706740200000;
      final instant = DateTime.fromMillisecondsSinceEpoch(timestampMs, isUtc: true);
      final local = tz.TZDateTime.from(instant, khartoum);

      // Must strictly be 2024-02-01 regardless of host clock or timezone
      final dateIsoString =
          '${local.year.toString().padLeft(4, '0')}-'
          '${local.month.toString().padLeft(2, '0')}-'
          '${local.day.toString().padLeft(2, '0')}';

      expect(dateIsoString, '2024-02-01');
    });
  });

  group('Offline and data metadata verification', () {
    test('timeZoneDatabase is populated entirely from embedded latest_all database', () {
      expect(tz.timeZoneDatabase.isInitialized, isTrue);
      // latest_all contains over 400 locations
      expect(tz.timeZoneDatabase.locations.length, greaterThan(400));
      expect(tz.timeZoneDatabase.locations.containsKey('Africa/Khartoum'), isTrue);
      expect(tz.timeZoneDatabase.locations.containsKey('UTC'), isTrue);
      expect(tz.timeZoneDatabase.locations.containsKey('Etc/UTC'), isTrue);
    });
  });
}
