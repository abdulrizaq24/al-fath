import 'package:drift/drift.dart';
import 'package:intl/intl.dart';

import '../core/errors/exceptions.dart';
import '../core/utils/uuid_generator.dart';
import '../data/daos/prescription_dao.dart';
import '../data/daos/sale_dao.dart';
import '../data/database/database.dart';
import '../domain/enums/app_enums.dart';
import 'sale_service.dart';

class CreatePrescriptionItemInput {
  final String medicineId;
  final double quantityPrescribed;
  final String? directions;
  final String? notes;

  const CreatePrescriptionItemInput({
    required this.medicineId,
    required this.quantityPrescribed,
    this.directions,
    this.notes,
  });
}

class DispenseItemInput {
  final String prescriptionItemId;
  final double quantityToDispense;

  const DispenseItemInput({
    required this.prescriptionItemId,
    required this.quantityToDispense,
  });
}

abstract class IPrescriptionService {
  Future<PrescriptionWithDetails> createPrescription({
    required String pharmacyId,
    required String patientId,
    required String createdById,
    required String prescriberName,
    required DateTime prescriptionDate,
    required List<CreatePrescriptionItemInput> items,
    String? notes,
  });

  Future<SaleWithDetails> dispensePrescription({
    required String prescriptionId,
    required String pharmacyId,
    required String dispensedById,
    required List<DispenseItemInput> itemsToDispense,
    required SalePaymentInput payment,
  });
}

class PrescriptionService implements IPrescriptionService {
  final AppDatabase _db;
  final IPrescriptionDao _prescriptionDao;
  final ISaleService _saleService;

  const PrescriptionService(
    this._db,
    this._prescriptionDao,
    this._saleService,
  );

  String _generateRxNumber() {
    final now = DateTime.now();
    final dateStr = DateFormat('yyyyMMdd').format(now);
    final randomPart = UuidGenerator.v4().substring(0, 5).toUpperCase();
    return 'RX-$dateStr-$randomPart';
  }

  @override
  Future<PrescriptionWithDetails> createPrescription({
    required String pharmacyId,
    required String patientId,
    required String createdById,
    required String prescriberName,
    required DateTime prescriptionDate,
    required List<CreatePrescriptionItemInput> items,
    String? notes,
  }) async {
    if (items.isEmpty) {
      throw const ValidationException('Resep harus memiliki minimal 1 item obat.');
    }

    final prescriptionId = UuidGenerator.v4();
    final rxNumber = _generateRxNumber();

    return _db.transaction(() async {
      await _prescriptionDao.insertPrescription(
        PrescriptionsCompanion(
          id: Value(prescriptionId),
          pharmacyId: Value(pharmacyId),
          patientId: Value(patientId),
          createdById: Value(createdById),
          prescriptionNumber: Value(rxNumber),
          prescriberName: Value(prescriberName.trim()),
          prescriptionDate: Value(prescriptionDate),
          status: const Value(PrescriptionStatus.pending),
          notes: Value(notes?.trim()),
          createdAt: Value(DateTime.now()),
          updatedAt: Value(DateTime.now()),
        ),
      );

      final itemCompanions = items.map((i) {
        return PrescriptionItemsCompanion(
          id: Value(UuidGenerator.v4()),
          prescriptionId: Value(prescriptionId),
          medicineId: Value(i.medicineId),
          quantityPrescribed: Value(i.quantityPrescribed),
          quantityDispensed: const Value(0.0),
          directions: Value(i.directions?.trim()),
          notes: Value(i.notes?.trim()),
          createdAt: Value(DateTime.now()),
          updatedAt: Value(DateTime.now()),
        );
      }).toList();

      await _prescriptionDao.insertPrescriptionItems(itemCompanions);

      final result = await _prescriptionDao.getById(prescriptionId);
      return result!;
    });
  }

  @override
  Future<SaleWithDetails> dispensePrescription({
    required String prescriptionId,
    required String pharmacyId,
    required String dispensedById,
    required List<DispenseItemInput> itemsToDispense,
    required SalePaymentInput payment,
  }) async {
    final prescription = await _prescriptionDao.getById(prescriptionId);
    if (prescription == null) {
      throw const NotFoundException('Resep tidak ditemukan.');
    }

    if (prescription.prescription.status == PrescriptionStatus.dispensed ||
        prescription.prescription.status == PrescriptionStatus.cancelled) {
      throw BusinessLogicException(
        'Resep dengan status ${prescription.prescription.status.name} tidak dapat diproses.',
      );
    }

    final cartItems = <SaleCartItemInput>[];
    final updatedQuantities = <String, double>{};

    for (final dispenseReq in itemsToDispense) {
      if (dispenseReq.quantityToDispense <= 0) continue;

      final pItem = prescription.items.firstWhere(
        (it) => it.item.id == dispenseReq.prescriptionItemId,
      );

      final alreadyDispensed = pItem.item.quantityDispensed;
      final newTotalDispensed =
          alreadyDispensed + dispenseReq.quantityToDispense;

      if (newTotalDispensed > pItem.item.quantityPrescribed) {
        throw ValidationException(
          'Kuantitas pengambilan melebihi resep untuk obat ${pItem.medicine.name}.',
        );
      }

      updatedQuantities[pItem.item.id] = newTotalDispensed;

      cartItems.add(SaleCartItemInput(
        medicineId: pItem.medicine.id,
        medicineName: pItem.medicine.name,
        quantity: dispenseReq.quantityToDispense,
        unitPrice: pItem.medicine.sellingPrice,
      ));
    }

    if (cartItems.isEmpty) {
      throw const ValidationException('Tidak ada item yang dapat dilayani.');
    }

    // Eksekusi penjualan kasir & pemotongan FEFO melalui SaleService
    final saleResult = await _saleService.createSale(
      pharmacyId: pharmacyId,
      soldById: dispensedById,
      patientId: prescription.patient.id,
      items: cartItems,
      payment: payment,
    );

    // Update kuantitas dispensed pada prescription_items
    for (final entry in updatedQuantities.entries) {
      await _prescriptionDao.updateItemDispensedQuantity(
        entry.key,
        entry.value,
      );
    }

    // Refresh data untuk update status resep
    final refreshed = await _prescriptionDao.getById(prescriptionId);
    if (refreshed != null) {
      bool isAllDispensed = true;
      for (final it in refreshed.items) {
        if (it.item.quantityDispensed < it.item.quantityPrescribed) {
          isAllDispensed = false;
          break;
        }
      }

      final nextStatus = isAllDispensed
          ? PrescriptionStatus.dispensed
          : PrescriptionStatus.partiallyDispensed;

      await _prescriptionDao.updateStatus(prescriptionId, nextStatus);
    }

    return saleResult;
  }
}
