import 'package:flutter_test/flutter_test.dart';

import 'version_1_fixture.dart';

void main() {
  group('Version 1 SQLite Effective Foreign Key Behavior', () {
    test('inspects PRAGMA foreign_key_list across all tables with foreign keys', () async {
      final fixture = await Version1Fixture.create();
      try {
        final tablesWithFks = [
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
          'audit_logs',
        ];

        final fksByTable = <String, List<Map<String, Object?>>>{};

        for (final table in tablesWithFks) {
          final rows = await fixture.db.customSelect('PRAGMA foreign_key_list($table);').get();
          final list = rows.map((r) => r.data).toList();
          fksByTable[table] = list;

          for (final fk in list) {
            // Document each effective foreign-key onDelete action
            final onDelete = fk['on_delete'] as String?;
            // In SQLite, omitted onDelete defaults to NO ACTION
            expect(onDelete, 'NO ACTION', reason: 'Table $table has unexpected onDelete action: $fk');
          }
        }

        // Verify specific known relationships in version 1
        // Sales.patient_id in version 1 has NO ACTION (not yet SET NULL)
        final salesFks = fksByTable['sales']!;
        final patientFk = salesFks.firstWhere((fk) => fk['from'] == 'patient_id');
        expect(patientFk['table'], 'patients');
        expect(patientFk['on_delete'], 'NO ACTION');

        // Batches.medicine_id in version 1
        final batchesFks = fksByTable['batches']!;
        final batchMedFk = batchesFks.firstWhere((fk) => fk['from'] == 'medicine_id');
        expect(batchMedFk['table'], 'medicines');
        expect(batchMedFk['on_delete'], 'NO ACTION');

        // AuditLogs.user_id in version 1
        final auditFks = fksByTable['audit_logs']!;
        final auditUserFk = auditFks.firstWhere((fk) => fk['from'] == 'user_id');
        expect(auditUserFk['table'], 'users');
        expect(auditUserFk['on_delete'], 'NO ACTION');
      } finally {
        await fixture.close();
      }
    });

    test('verifies runtime deletion of referenced parents is rejected (NO ACTION / RESTRICT)', () async {
      final fixture = await Version1Fixture.create();
      try {
        // Attempting to delete Pharmacy when referenced by Users, Categories, etc.
        expect(
          () => fixture.db.customStatement("DELETE FROM pharmacies WHERE id = '${fixture.ids['pharmacy']}';"),
          throwsException,
        );

        // Attempting to delete Role when referenced by User
        expect(
          () => fixture.db.customStatement("DELETE FROM roles WHERE id = '${fixture.ids['role']}';"),
          throwsException,
        );

        // Attempting to delete Category when referenced by Medicine
        expect(
          () => fixture.db.customStatement("DELETE FROM categories WHERE id = '${fixture.ids['category']}';"),
          throwsException,
        );

        // Attempting to delete Medicine when referenced by Batches, SaleItems, etc.
        expect(
          () => fixture.db.customStatement("DELETE FROM medicines WHERE id = '${fixture.ids['medicine']}';"),
          throwsException,
        );

        // Attempting to delete Patient when referenced by Sales in version 1
        // (In version 1, Sales.patientId is NO ACTION; future version 2 will be ON DELETE SET NULL)
        expect(
          () => fixture.db.customStatement("DELETE FROM patients WHERE id = '${fixture.ids['patient']}';"),
          throwsException,
        );

        // Attempting to delete User when referenced by Sales.sold_by_id
        expect(
          () => fixture.db.customStatement("DELETE FROM users WHERE id = '${fixture.ids['user']}';"),
          throwsException,
        );

        // Attempting to delete Batch when referenced by SaleItemBatches
        expect(
          () => fixture.db.customStatement("DELETE FROM batches WHERE id = '${fixture.ids['batchFuture']}';"),
          throwsException,
        );

        // Attempting to delete Sale when referenced by Payments
        expect(
          () => fixture.db.customStatement("DELETE FROM sales WHERE id = '${fixture.ids['sale']}';"),
          throwsException,
        );
      } finally {
        await fixture.close();
      }
    });
  });
}
