/// Schema version 2 DDL definitions for isolated test validation and table rebuilds.
///
/// Contains all 22 tables:
/// - 20 business tables (including [sale_idempotency] and [audit_logs] with [actor_id])
/// - 2 compatibility tables ([users], [roles])
///
/// Implements:
/// - Integer money storage (scale 100)
/// - Integer quantity storage (scale 1,000)
/// - Nullable actor IDs without Users foreign keys
/// - [sales.patient_id] ON DELETE SET NULL
/// - [sale_idempotency.sale_id] ON DELETE SET NULL
/// - 8 composite unique constraints
class Version2Schema {
  Version2Schema._();

  static const List<String> createTableStatements = [
    '''
    CREATE TABLE pharmacies (
      id TEXT NOT NULL PRIMARY KEY,
      name TEXT NOT NULL,
      license_number TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      country TEXT NOT NULL DEFAULT 'Sudan',
      currency TEXT NOT NULL DEFAULT 'SDG',
      timezone TEXT,
      logo_url TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );
    ''',
    '''
    CREATE TABLE roles (
      id TEXT NOT NULL PRIMARY KEY,
      name INTEGER NOT NULL UNIQUE,
      description TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );
    ''',
    '''
    CREATE TABLE users (
      id TEXT NOT NULL PRIMARY KEY,
      pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id),
      role_id TEXT NOT NULL REFERENCES roles(id),
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT,
      password_hash TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_login_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );
    ''',
    '''
    CREATE TABLE categories (
      id TEXT NOT NULL PRIMARY KEY,
      pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id),
      name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      CONSTRAINT categories_pharmacy_id_name_unique UNIQUE (pharmacy_id, name)
    );
    ''',
    '''
    CREATE TABLE medicines (
      id TEXT NOT NULL PRIMARY KEY,
      pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id),
      category_id TEXT NOT NULL REFERENCES categories(id),
      name TEXT NOT NULL,
      generic_name TEXT,
      brand_name TEXT,
      manufacturer TEXT,
      dosage_form TEXT NOT NULL,
      strength TEXT,
      base_unit TEXT NOT NULL,
      prescription_status INTEGER NOT NULL DEFAULT 0,
      selling_price INTEGER NOT NULL,
      reorder_level INTEGER NOT NULL DEFAULT 0,
      barcode TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );
    ''',
    '''
    CREATE TABLE medicine_packages (
      id TEXT NOT NULL PRIMARY KEY,
      medicine_id TEXT NOT NULL REFERENCES medicines(id),
      name TEXT NOT NULL,
      quantity_in_base_units INTEGER NOT NULL,
      barcode TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );
    ''',
    '''
    CREATE TABLE batches (
      id TEXT NOT NULL PRIMARY KEY,
      pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id),
      medicine_id TEXT NOT NULL REFERENCES medicines(id),
      batch_number TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      purchase_price INTEGER NOT NULL,
      received_quantity INTEGER NOT NULL,
      current_quantity INTEGER NOT NULL,
      received_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      CONSTRAINT batches_pharmacy_id_medicine_id_batch_number_unique UNIQUE (pharmacy_id, medicine_id, batch_number)
    );
    ''',
    '''
    CREATE TABLE suppliers (
      id TEXT NOT NULL PRIMARY KEY,
      pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id),
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );
    ''',
    '''
    CREATE TABLE purchases (
      id TEXT NOT NULL PRIMARY KEY,
      pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id),
      supplier_id TEXT NOT NULL REFERENCES suppliers(id),
      created_by_id TEXT,
      purchase_number TEXT NOT NULL,
      status INTEGER NOT NULL DEFAULT 0,
      purchase_date INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      expected_date INTEGER,
      total_amount INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      CONSTRAINT purchases_pharmacy_id_purchase_number_unique UNIQUE (pharmacy_id, purchase_number)
    );
    ''',
    '''
    CREATE TABLE purchase_items (
      id TEXT NOT NULL PRIMARY KEY,
      purchase_id TEXT NOT NULL REFERENCES purchases(id),
      medicine_id TEXT NOT NULL REFERENCES medicines(id),
      ordered_quantity INTEGER NOT NULL,
      unit_cost INTEGER NOT NULL,
      total_cost INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );
    ''',
    '''
    CREATE TABLE purchase_receipts (
      id TEXT NOT NULL PRIMARY KEY,
      pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id),
      purchase_id TEXT NOT NULL REFERENCES purchases(id),
      created_by_id TEXT,
      receipt_number TEXT NOT NULL,
      received_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      CONSTRAINT purchase_receipts_pharmacy_id_receipt_number_unique UNIQUE (pharmacy_id, receipt_number)
    );
    ''',
    '''
    CREATE TABLE purchase_receipt_items (
      id TEXT NOT NULL PRIMARY KEY,
      receipt_id TEXT NOT NULL REFERENCES purchase_receipts(id),
      purchase_item_id TEXT NOT NULL REFERENCES purchase_items(id),
      batch_id TEXT NOT NULL REFERENCES batches(id),
      quantity_received INTEGER NOT NULL,
      unit_cost INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );
    ''',
    '''
    CREATE TABLE patients (
      id TEXT NOT NULL PRIMARY KEY,
      pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id),
      patient_number TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT,
      date_of_birth INTEGER,
      sex TEXT,
      phone TEXT,
      address TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      CONSTRAINT patients_pharmacy_id_patient_number_unique UNIQUE (pharmacy_id, patient_number)
    );
    ''',
    '''
    CREATE TABLE prescriptions (
      id TEXT NOT NULL PRIMARY KEY,
      pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id),
      patient_id TEXT NOT NULL REFERENCES patients(id),
      created_by_id TEXT,
      prescription_number TEXT NOT NULL,
      prescriber_name TEXT NOT NULL,
      prescription_date INTEGER NOT NULL,
      status INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      CONSTRAINT prescriptions_pharmacy_id_prescription_number_unique UNIQUE (pharmacy_id, prescription_number)
    );
    ''',
    '''
    CREATE TABLE prescription_items (
      id TEXT NOT NULL PRIMARY KEY,
      prescription_id TEXT NOT NULL REFERENCES prescriptions(id),
      medicine_id TEXT NOT NULL REFERENCES medicines(id),
      quantity_prescribed INTEGER NOT NULL,
      quantity_dispensed INTEGER NOT NULL DEFAULT 0,
      directions TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );
    ''',
    '''
    CREATE TABLE sales (
      id TEXT NOT NULL PRIMARY KEY,
      pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id),
      patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
      sold_by_id TEXT,
      invoice_number TEXT NOT NULL,
      subtotal INTEGER NOT NULL,
      discount INTEGER NOT NULL DEFAULT 0,
      tax INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL,
      status INTEGER NOT NULL DEFAULT 0,
      sale_date INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      CONSTRAINT sales_pharmacy_id_invoice_number_unique UNIQUE (pharmacy_id, invoice_number)
    );
    ''',
    '''
    CREATE TABLE sale_items (
      id TEXT NOT NULL PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES sales(id),
      medicine_id TEXT NOT NULL REFERENCES medicines(id),
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL,
      discount INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );
    ''',
    '''
    CREATE TABLE sale_item_batches (
      id TEXT NOT NULL PRIMARY KEY,
      sale_item_id TEXT NOT NULL REFERENCES sale_items(id),
      batch_id TEXT NOT NULL REFERENCES batches(id),
      quantity INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );
    ''',
    '''
    CREATE TABLE payments (
      id TEXT NOT NULL PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES sales(id),
      payment_method INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      status INTEGER NOT NULL DEFAULT 1,
      transaction_reference TEXT,
      paid_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );
    ''',
    '''
    CREATE TABLE inventory_transactions (
      id TEXT NOT NULL PRIMARY KEY,
      pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id),
      medicine_id TEXT NOT NULL REFERENCES medicines(id),
      batch_id TEXT NOT NULL REFERENCES batches(id),
      transaction_type INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      reference_type INTEGER NOT NULL,
      reference_id TEXT,
      reason TEXT,
      created_by_id TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );
    ''',
    '''
    CREATE TABLE sale_idempotency (
      id TEXT NOT NULL PRIMARY KEY,
      pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id),
      idempotency_key TEXT NOT NULL,
      sale_id TEXT REFERENCES sales(id) ON DELETE SET NULL,
      status TEXT NOT NULL,
      response_payload TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER,
      expires_at INTEGER,
      CONSTRAINT sale_idempotency_pharmacy_id_idempotency_key_unique UNIQUE (pharmacy_id, idempotency_key)
    );
    ''',
    '''
    CREATE TABLE audit_logs (
      id TEXT NOT NULL PRIMARY KEY,
      pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id),
      actor_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );
    ''',
  ];

  static const List<String> createIndexStatements = [
    'CREATE INDEX users_pharmacy_id_idx ON users(pharmacy_id);',
    'CREATE INDEX users_role_id_idx ON users(role_id);',
    'CREATE INDEX categories_pharmacy_id_idx ON categories(pharmacy_id);',
    'CREATE INDEX medicines_pharmacy_id_idx ON medicines(pharmacy_id);',
    'CREATE INDEX medicines_category_id_idx ON medicines(category_id);',
    'CREATE INDEX medicines_name_idx ON medicines(name);',
    'CREATE INDEX medicines_generic_name_idx ON medicines(generic_name);',
    'CREATE INDEX medicines_barcode_idx ON medicines(barcode);',
    'CREATE INDEX medicine_packages_medicine_id_idx ON medicine_packages(medicine_id);',
    'CREATE INDEX medicine_packages_barcode_idx ON medicine_packages(barcode);',
    'CREATE INDEX batches_pharmacy_id_idx ON batches(pharmacy_id);',
    'CREATE INDEX batches_medicine_id_idx ON batches(medicine_id);',
    'CREATE INDEX batches_expiry_date_idx ON batches(expiry_date);',
    'CREATE INDEX suppliers_pharmacy_id_idx ON suppliers(pharmacy_id);',
    'CREATE INDEX suppliers_name_idx ON suppliers(name);',
    'CREATE INDEX purchases_pharmacy_id_idx ON purchases(pharmacy_id);',
    'CREATE INDEX purchases_supplier_id_idx ON purchases(supplier_id);',
    'CREATE INDEX purchases_status_idx ON purchases(status);',
    'CREATE INDEX purchase_items_purchase_id_idx ON purchase_items(purchase_id);',
    'CREATE INDEX purchase_items_medicine_id_idx ON purchase_items(medicine_id);',
    'CREATE INDEX purchase_receipts_purchase_id_idx ON purchase_receipts(purchase_id);',
    'CREATE INDEX purchase_receipt_items_receipt_id_idx ON purchase_receipt_items(receipt_id);',
    'CREATE INDEX purchase_receipt_items_purchase_item_id_idx ON purchase_receipt_items(purchase_item_id);',
    'CREATE INDEX purchase_receipt_items_batch_id_idx ON purchase_receipt_items(batch_id);',
    'CREATE INDEX patients_pharmacy_id_idx ON patients(pharmacy_id);',
    'CREATE INDEX patients_last_name_idx ON patients(last_name);',
    'CREATE INDEX prescriptions_pharmacy_id_idx ON prescriptions(pharmacy_id);',
    'CREATE INDEX prescriptions_patient_id_idx ON prescriptions(patient_id);',
    'CREATE INDEX prescription_items_prescription_id_idx ON prescription_items(prescription_id);',
    'CREATE INDEX prescription_items_medicine_id_idx ON prescription_items(medicine_id);',
    'CREATE INDEX sales_pharmacy_id_idx ON sales(pharmacy_id);',
    'CREATE INDEX sales_patient_id_idx ON sales(patient_id);',
    'CREATE INDEX sales_sale_date_idx ON sales(sale_date);',
    'CREATE INDEX sale_items_sale_id_idx ON sale_items(sale_id);',
    'CREATE INDEX sale_items_medicine_id_idx ON sale_items(medicine_id);',
    'CREATE INDEX sale_item_batches_sale_item_id_idx ON sale_item_batches(sale_item_id);',
    'CREATE INDEX sale_item_batches_batch_id_idx ON sale_item_batches(batch_id);',
    'CREATE INDEX payments_sale_id_idx ON payments(sale_id);',
    'CREATE INDEX inv_trans_pharmacy_id_idx ON inventory_transactions(pharmacy_id);',
    'CREATE INDEX inv_trans_medicine_id_idx ON inventory_transactions(medicine_id);',
    'CREATE INDEX inv_trans_batch_id_idx ON inventory_transactions(batch_id);',
    'CREATE INDEX inv_trans_created_at_idx ON inventory_transactions(created_at);',
    'CREATE INDEX audit_logs_pharmacy_id_idx ON audit_logs(pharmacy_id);',
    'CREATE INDEX audit_logs_actor_id_idx ON audit_logs(actor_id);',
    'CREATE INDEX audit_logs_entity_idx ON audit_logs(entity_type, entity_id);',
    'CREATE INDEX audit_logs_created_at_idx ON audit_logs(created_at);',
  ];
}
