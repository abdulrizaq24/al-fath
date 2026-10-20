import 'package:drift/drift.dart' as drift;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pharmacy_flutter/core/utils/uuid_generator.dart';
import 'package:pharmacy_flutter/data/daos/auth_dao.dart';
import 'package:pharmacy_flutter/data/daos/batch_dao.dart';
import 'package:pharmacy_flutter/data/daos/inventory_dao.dart';
import 'package:pharmacy_flutter/data/daos/patient_dao.dart';
import 'package:pharmacy_flutter/data/daos/prescription_dao.dart';
import 'package:pharmacy_flutter/data/daos/sale_dao.dart';
import 'package:pharmacy_flutter/data/database/database.dart';
import 'package:pharmacy_flutter/domain/enums/app_enums.dart';
import 'package:pharmacy_flutter/services/prescription_service.dart';
import 'package:pharmacy_flutter/services/sale_service.dart';

void main() {
  late AppDatabase db;
  late PrescriptionDao prescriptionDao;
  late PatientDao patientDao;
  late SaleDao saleDao;
  late BatchDao batchDao;
  late InventoryDao inventoryDao;
  late AuthDao authDao;
  late SaleService saleService;
  late PrescriptionService prescriptionService;

  final pharmacyId = UuidGenerator.v4();
  final pharmacistId = UuidGenerator.v4();
  final patientId = UuidGenerator.v4();
  final categoryId = UuidGenerator.v4();
  final medicineId = UuidGenerator.v4();

  setUp(() async {
    db = AppDatabase(NativeDatabase.memory());
    prescriptionDao = PrescriptionDao(db);
    patientDao = PatientDao(db);
    saleDao = SaleDao(db);
    batchDao = BatchDao(db);
    inventoryDao = InventoryDao(db);
    authDao = AuthDao(db);

    saleService = SaleService(db, saleDao, batchDao, inventoryDao);
    prescriptionService =
        PrescriptionService(db, prescriptionDao, saleService);

    await authDao.insertPharmacy(
      PharmaciesCompanion(
        id: drift.Value(pharmacyId),
        name: const drift.Value('Apotek Sehat'),
      ),
    );

    final role = await authDao.insertRole(
      RolesCompanion(
        id: drift.Value(UuidGenerator.v4()),
        name: const drift.Value(RoleName.pharmacist),
      ),
    );

    await authDao.insertUser(
      UsersCompanion(
        id: drift.Value(pharmacistId),
        pharmacyId: drift.Value(pharmacyId),
        roleId: drift.Value(role.id),
        name: const drift.Value('Apoteker Jaga'),
        username: const drift.Value('pharmacist'),
        passwordHash: const drift.Value('hash'),
      ),
    );

    await patientDao.insert(
      PatientsCompanion(
        id: drift.Value(patientId),
        pharmacyId: drift.Value(pharmacyId),
        patientNumber: const drift.Value('RM-001'),
        firstName: const drift.Value('Ahmad'),
        lastName: const drift.Value('Subarjo'),
      ),
    );

    await db.into(db.categories).insert(
          CategoriesCompanion(
            id: drift.Value(categoryId),
            pharmacyId: drift.Value(pharmacyId),
            name: const drift.Value('Antihipertensi'),
          ),
        );

    await db.into(db.medicines).insert(
          MedicinesCompanion(
            id: drift.Value(medicineId),
            pharmacyId: drift.Value(pharmacyId),
            categoryId: drift.Value(categoryId),
            name: const drift.Value('Amlodipine 10mg'),
            dosageForm: const drift.Value('Tablet'),
            baseUnit: const drift.Value('Strip'),
            sellingPrice: const drift.Value(25000.0),
          ),
        );

    // Initial stock
    await batchDao.insert(
      BatchesCompanion(
        id: drift.Value(UuidGenerator.v4()),
        pharmacyId: drift.Value(pharmacyId),
        medicineId: drift.Value(medicineId),
        batchNumber: const drift.Value('AML-001'),
        expiryDate: drift.Value(DateTime.now().add(const Duration(days: 180))),
        purchasePrice: const drift.Value(18000.0),
        receivedQuantity: const drift.Value(50.0),
        currentQuantity: const drift.Value(50.0),
      ),
    );
  });

  tearDown(() async {
    await db.close();
  });

  test('Prescription Workflow: Create -> Dispense (FEFO deduction & POS sale)', () async {
    // 1. Create Prescription
    final rx = await prescriptionService.createPrescription(
      pharmacyId: pharmacyId,
      patientId: patientId,
      createdById: pharmacistId,
      prescriberName: 'dr. Budi Santoso, Sp.JP',
      prescriptionDate: DateTime.now(),
      items: [
        CreatePrescriptionItemInput(
          medicineId: medicineId,
          quantityPrescribed: 10.0,
          directions: '1x1 malam hari',
        ),
      ],
    );

    expect(rx.prescription.status, PrescriptionStatus.pending);
    expect(rx.items.first.item.quantityPrescribed, 10.0);
    expect(rx.items.first.item.quantityDispensed, 0.0);

    // 2. Dispense Prescription
    final pItemId = rx.items.first.item.id;
    final saleResult = await prescriptionService.dispensePrescription(
      prescriptionId: rx.prescription.id,
      pharmacyId: pharmacyId,
      dispensedById: pharmacistId,
      itemsToDispense: [
        DispenseItemInput(
          prescriptionItemId: pItemId,
          quantityToDispense: 10.0,
        ),
      ],
      payment: const SalePaymentInput(
        method: PaymentMethod.cash,
        amount: 250000.0,
      ),
    );

    expect(saleResult.sale.total, 250000.0);

    // Verify Prescription status is now DISPENSED
    final updatedRx = await prescriptionDao.getById(rx.prescription.id);
    expect(updatedRx!.prescription.status, PrescriptionStatus.dispensed);
    expect(updatedRx.items.first.item.quantityDispensed, 10.0);

    // Verify stock is deducted
    final remainingStock =
        await batchDao.getTotalAvailableStock(pharmacyId, medicineId);
    expect(remainingStock, 40.0); // 50 - 10 = 40
  });
}
