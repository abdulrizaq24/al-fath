import 'dart:io';

import 'package:sqlite3/sqlite3.dart' as sqlite;

/// Complete disposable v1 SQLite schema for file-backed migration tests.
/// This is test-only DDL and never derives a path from application settings.
class Version1FileSchema {
  Version1FileSchema._();

  static const tables = <String>[
    'pharmacies', 'roles', 'users', 'categories', 'medicines',
    'medicine_packages', 'batches', 'suppliers', 'purchases', 'purchase_items',
    'purchase_receipts', 'purchase_receipt_items', 'patients', 'prescriptions',
    'prescription_items', 'sales', 'sale_items', 'sale_item_batches', 'payments',
    'inventory_transactions', 'audit_logs',
  ];

  static void create(String path) {
    if (path.trim().isEmpty) throw ArgumentError.value(path, 'path');
    final file = File(path);
    if (file.existsSync()) throw StateError('Refusing to overwrite existing file: $path');
    file.parent.createSync(recursive: true);
    final db = sqlite.sqlite3.open(file.absolute.path);
    try {
      db.execute('PRAGMA foreign_keys = ON;');
      if (db.select('PRAGMA foreign_keys;').first.values.first != 1) {
        throw StateError('Foreign-key enforcement could not be enabled');
      }
      for (final statement in _ddl) {
        db.execute(statement);
      }
      db.execute('PRAGMA user_version = 1;');
      db.execute("INSERT INTO pharmacies (id, name, timezone, created_at, updated_at) VALUES ('ph-1', 'Test Pharmacy', 'Africa/Khartoum', 1736899200, 1736899200);");
      db.execute("INSERT INTO roles (id, name, created_at, updated_at) VALUES ('role-1', 0, 1736899200, 1736899200);");
      db.execute("INSERT INTO users (id, pharmacy_id, role_id, name, username, password_hash, created_at, updated_at) VALUES ('user-1', 'ph-1', 'role-1', 'Test User', 'test-user', 'hash', 1736899200, 1736899200);");
      db.execute("INSERT INTO categories (id, pharmacy_id, name, created_at, updated_at) VALUES ('cat-1', 'ph-1', 'Test Category', 1736899200, 1736899200);");
      db.execute("INSERT INTO medicines (id, pharmacy_id, category_id, name, dosage_form, base_unit, selling_price, created_at, updated_at) VALUES ('med-1', 'ph-1', 'cat-1', 'Test Medicine', 'Tablet', 'unit', 10.5, 1736899200, 1736899200);");
      db.execute("INSERT INTO batches (id, pharmacy_id, medicine_id, batch_number, expiry_date, purchase_price, received_quantity, current_quantity, received_at, created_at, updated_at) VALUES ('batch-1', 'ph-1', 'med-1', 'BATCH-1', 1736899200, 8.25, 20.0, 15.0, 1736899200, 1736899200, 1736899200);");
    } finally {
      db.dispose();
    }
  }

  static const _ddl = <String>[
    '''CREATE TABLE pharmacies (id TEXT PRIMARY KEY, name TEXT NOT NULL, license_number TEXT, address TEXT, phone TEXT, email TEXT, country TEXT NOT NULL DEFAULT 'Sudan', currency TEXT NOT NULL DEFAULT 'SDG', timezone TEXT, logo_url TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);''',
    '''CREATE TABLE roles (id TEXT PRIMARY KEY, name INTEGER NOT NULL UNIQUE, description TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);''',
    '''CREATE TABLE users (id TEXT PRIMARY KEY, pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id), role_id TEXT NOT NULL REFERENCES roles(id), name TEXT NOT NULL, username TEXT NOT NULL UNIQUE, email TEXT, password_hash TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1, last_login_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);''',
    '''CREATE TABLE categories (id TEXT PRIMARY KEY, pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id), name TEXT NOT NULL, description TEXT, is_active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(pharmacy_id, name));''',
    '''CREATE TABLE medicines (id TEXT PRIMARY KEY, pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id), category_id TEXT NOT NULL REFERENCES categories(id), name TEXT NOT NULL, generic_name TEXT, brand_name TEXT, manufacturer TEXT, dosage_form TEXT NOT NULL, strength TEXT, base_unit TEXT NOT NULL, prescription_status INTEGER NOT NULL DEFAULT 0, selling_price REAL NOT NULL, reorder_level REAL NOT NULL DEFAULT 0, barcode TEXT, is_active INTEGER NOT NULL DEFAULT 1, notes TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);''',
    '''CREATE TABLE medicine_packages (id TEXT PRIMARY KEY, medicine_id TEXT NOT NULL REFERENCES medicines(id), name TEXT NOT NULL, quantity_in_base_units REAL NOT NULL, barcode TEXT, is_default INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);''',
    '''CREATE TABLE batches (id TEXT PRIMARY KEY, pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id), medicine_id TEXT NOT NULL REFERENCES medicines(id), batch_number TEXT NOT NULL, expiry_date INTEGER NOT NULL, purchase_price REAL NOT NULL, received_quantity REAL NOT NULL, current_quantity REAL NOT NULL, received_at INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(pharmacy_id, medicine_id, batch_number));''',
    '''CREATE TABLE suppliers (id TEXT PRIMARY KEY, pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id), name TEXT NOT NULL, contact_person TEXT, phone TEXT, email TEXT, address TEXT, is_active INTEGER NOT NULL DEFAULT 1, notes TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);''',
    '''CREATE TABLE purchases (id TEXT PRIMARY KEY, pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id), supplier_id TEXT NOT NULL REFERENCES suppliers(id), created_by_id TEXT REFERENCES users(id), purchase_number TEXT NOT NULL, status INTEGER NOT NULL DEFAULT 0, purchase_date INTEGER NOT NULL, expected_date INTEGER, total_amount REAL NOT NULL DEFAULT 0, notes TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(pharmacy_id, purchase_number));''',
    '''CREATE TABLE purchase_items (id TEXT PRIMARY KEY, purchase_id TEXT NOT NULL REFERENCES purchases(id), medicine_id TEXT NOT NULL REFERENCES medicines(id), ordered_quantity REAL NOT NULL, unit_cost REAL NOT NULL, total_cost REAL NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);''',
    '''CREATE TABLE purchase_receipts (id TEXT PRIMARY KEY, pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id), purchase_id TEXT NOT NULL REFERENCES purchases(id), created_by_id TEXT REFERENCES users(id), receipt_number TEXT NOT NULL, received_at INTEGER NOT NULL, notes TEXT, created_at INTEGER NOT NULL, UNIQUE(pharmacy_id, receipt_number));''',
    '''CREATE TABLE purchase_receipt_items (id TEXT PRIMARY KEY, receipt_id TEXT NOT NULL REFERENCES purchase_receipts(id), purchase_item_id TEXT NOT NULL REFERENCES purchase_items(id), batch_id TEXT NOT NULL REFERENCES batches(id), quantity_received REAL NOT NULL, unit_cost REAL NOT NULL, created_at INTEGER NOT NULL);''',
    '''CREATE TABLE patients (id TEXT PRIMARY KEY, pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id), patient_number TEXT NOT NULL, first_name TEXT NOT NULL, last_name TEXT, date_of_birth INTEGER, sex TEXT, phone TEXT, address TEXT, notes TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(pharmacy_id, patient_number));''',
    '''CREATE TABLE prescriptions (id TEXT PRIMARY KEY, pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id), patient_id TEXT NOT NULL REFERENCES patients(id), created_by_id TEXT REFERENCES users(id), prescription_number TEXT NOT NULL, prescriber_name TEXT NOT NULL, prescription_date INTEGER NOT NULL, status INTEGER NOT NULL DEFAULT 0, notes TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(pharmacy_id, prescription_number));''',
    '''CREATE TABLE prescription_items (id TEXT PRIMARY KEY, prescription_id TEXT NOT NULL REFERENCES prescriptions(id), medicine_id TEXT NOT NULL REFERENCES medicines(id), quantity_prescribed REAL NOT NULL, quantity_dispensed REAL NOT NULL DEFAULT 0, directions TEXT, notes TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);''',
    '''CREATE TABLE sales (id TEXT PRIMARY KEY, pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id), patient_id TEXT REFERENCES patients(id), sold_by_id TEXT REFERENCES users(id), invoice_number TEXT NOT NULL, subtotal REAL NOT NULL, discount REAL NOT NULL DEFAULT 0, tax REAL NOT NULL DEFAULT 0, total REAL NOT NULL, status INTEGER NOT NULL DEFAULT 0, sale_date INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(pharmacy_id, invoice_number));''',
    '''CREATE TABLE sale_items (id TEXT PRIMARY KEY, sale_id TEXT NOT NULL REFERENCES sales(id), medicine_id TEXT NOT NULL REFERENCES medicines(id), quantity REAL NOT NULL, unit_price REAL NOT NULL, discount REAL NOT NULL DEFAULT 0, total REAL NOT NULL, created_at INTEGER NOT NULL);''',
    '''CREATE TABLE sale_item_batches (id TEXT PRIMARY KEY, sale_item_id TEXT NOT NULL REFERENCES sale_items(id), batch_id TEXT NOT NULL REFERENCES batches(id), quantity REAL NOT NULL, created_at INTEGER NOT NULL);''',
    '''CREATE TABLE payments (id TEXT PRIMARY KEY, sale_id TEXT NOT NULL REFERENCES sales(id), payment_method INTEGER NOT NULL, amount REAL NOT NULL, status INTEGER NOT NULL DEFAULT 1, transaction_reference TEXT, paid_at INTEGER NOT NULL, created_at INTEGER NOT NULL);''',
    '''CREATE TABLE inventory_transactions (id TEXT PRIMARY KEY, pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id), medicine_id TEXT NOT NULL REFERENCES medicines(id), batch_id TEXT NOT NULL REFERENCES batches(id), transaction_type INTEGER NOT NULL, quantity REAL NOT NULL, reference_type INTEGER NOT NULL, reference_id TEXT, reason TEXT, created_by_id TEXT REFERENCES users(id), created_at INTEGER NOT NULL);''',
    '''CREATE TABLE audit_logs (id TEXT PRIMARY KEY, pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id), user_id TEXT NOT NULL REFERENCES users(id), action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT, old_values TEXT, new_values TEXT, ip_address TEXT, user_agent TEXT, created_at INTEGER NOT NULL);''',
  ];
}
