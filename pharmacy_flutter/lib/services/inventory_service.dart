import 'package:drift/drift.dart';

import '../core/errors/exceptions.dart';
import '../core/utils/uuid_generator.dart';
import '../data/daos/batch_dao.dart';
import '../data/daos/inventory_dao.dart';
import '../data/database/database.dart';
import '../domain/enums/app_enums.dart';

abstract class IInventoryService {
  Future<void> adjustStock({
    required String pharmacyId,
    required String medicineId,
    required String batchId,
    required double newPhysicalQuantity,
    required InventoryTransactionType type,
    required String reason,
    required String userId,
  });

  Future<List<LowStockMedicine>> getLowStockMedicines(String pharmacyId);
  Future<List<Batche>> getExpiringBatches(
    String pharmacyId, {
    int daysThreshold,
  });
  Future<List<Batche>> getExpiredBatches(String pharmacyId);
}

class InventoryService implements IInventoryService {
  final AppDatabase _db;
  final IBatchDao _batchDao;
  final IInventoryDao _inventoryDao;

  const InventoryService(this._db, this._batchDao, this._inventoryDao);

  @override
  Future<void> adjustStock({
    required String pharmacyId,
    required String medicineId,
    required String batchId,
    required double newPhysicalQuantity,
    required InventoryTransactionType type,
    required String reason,
    required String userId,
  }) async {
    if (newPhysicalQuantity < 0) {
      throw const ValidationException('Physical quantity cannot be negative.');
    }

    final batch = await _batchDao.getById(batchId);
    if (batch == null) {
      throw const NotFoundException('Medicine batch not found.');
    }

    final delta = newPhysicalQuantity - batch.currentQuantity;
    if (delta == 0) return; // Tidak ada perubahan kuantitas

    await _db.transaction(() async {
      await _batchDao.updateQuantity(batchId, newPhysicalQuantity);

      await _inventoryDao.recordTransaction(
        InventoryTransactionsCompanion(
          id: Value(UuidGenerator.v4()),
          pharmacyId: Value(pharmacyId),
          medicineId: Value(medicineId),
          batchId: Value(batchId),
          transactionType: Value(type),
          quantity: Value(delta),
          referenceType: const Value(ReferenceType.adjustment),
          reason: Value(reason.trim()),
          createdById: Value(userId),
          createdAt: Value(DateTime.now()),
        ),
      );
    });
  }

  @override
  Future<List<LowStockMedicine>> getLowStockMedicines(String pharmacyId) async {
    return _inventoryDao.getLowStockMedicines(pharmacyId);
  }

  @override
  Future<List<Batche>> getExpiringBatches(
    String pharmacyId, {
    int daysThreshold = 60,
  }) async {
    return _batchDao.getExpiringBatches(
      pharmacyId,
      daysThreshold: daysThreshold,
    );
  }

  @override
  Future<List<Batche>> getExpiredBatches(String pharmacyId) async {
    return _batchDao.getExpiredBatches(pharmacyId);
  }
}
