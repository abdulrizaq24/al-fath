import 'package:drift/drift.dart';

import '../../domain/enums/app_enums.dart';
import '../database/database.dart';

class SalesFinancialSummary {
  final double grossSales;
  final double totalDiscount;
  final double totalTax;
  final double netSales;
  final double totalCogs;
  final double grossProfit;
  final double grossMarginPercentage;
  final int totalTransactions;

  const SalesFinancialSummary({
    required this.grossSales,
    required this.totalDiscount,
    required this.totalTax,
    required this.netSales,
    required this.totalCogs,
    required this.grossProfit,
    required this.grossMarginPercentage,
    required this.totalTransactions,
  });
}

class TopSellingMedicine {
  final String medicineId;
  final String medicineName;
  final double totalQuantity;
  final double totalRevenue;

  const TopSellingMedicine({
    required this.medicineId,
    required this.medicineName,
    required this.totalQuantity,
    required this.totalRevenue,
  });
}

class PaymentMethodSummary {
  final PaymentMethod method;
  final double totalAmount;
  final int transactionCount;

  const PaymentMethodSummary({
    required this.method,
    required this.totalAmount,
    required this.transactionCount,
  });
}

abstract class IReportDao {
  Future<SalesFinancialSummary> getFinancialSummary(
    String pharmacyId, {
    DateTime? startDate,
    DateTime? endDate,
  });
  Future<List<TopSellingMedicine>> getTopSellingMedicines(
    String pharmacyId, {
    int limit = 10,
    DateTime? startDate,
    DateTime? endDate,
  });
  Future<List<PaymentMethodSummary>> getPaymentMethodSummaries(
    String pharmacyId, {
    DateTime? startDate,
    DateTime? endDate,
  });
}

class ReportDao implements IReportDao {
  final AppDatabase _db;

  const ReportDao(this._db);

  @override
  Future<SalesFinancialSummary> getFinancialSummary(
    String pharmacyId, {
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final query = _db.select(_db.sales)
      ..where((tbl) =>
          tbl.pharmacyId.equals(pharmacyId) &
          tbl.status.equals(SaleStatus.completed.index));

    if (startDate != null) {
      query.where((tbl) => tbl.saleDate.isBiggerOrEqualValue(startDate));
    }
    if (endDate != null) {
      query.where((tbl) => tbl.saleDate.isSmallerOrEqualValue(endDate));
    }

    final sales = await query.get();
    if (sales.isEmpty) {
      return const SalesFinancialSummary(
        grossSales: 0.0,
        totalDiscount: 0.0,
        totalTax: 0.0,
        netSales: 0.0,
        totalCogs: 0.0,
        grossProfit: 0.0,
        grossMarginPercentage: 0.0,
        totalTransactions: 0,
      );
    }

    double grossSales = 0.0;
    double totalDiscount = 0.0;
    double totalTax = 0.0;
    double netSales = 0.0;

    for (final s in sales) {
      grossSales += s.subtotal;
      totalDiscount += s.discount;
      totalTax += s.tax;
      netSales += s.total;
    }

    // Hitung COGS akurat dari batch yang terjual
    final saleIds = sales.map((s) => s.id).toList();
    final batchAllocationsQuery = _db.select(_db.saleItemBatches).join([
      innerJoin(
        _db.saleItems,
        _db.saleItems.id.equalsExp(_db.saleItemBatches.saleItemId),
      ),
      innerJoin(
        _db.batches,
        _db.batches.id.equalsExp(_db.saleItemBatches.batchId),
      ),
    ])..where(_db.saleItems.saleId.isIn(saleIds));

    final allocationRows = await batchAllocationsQuery.get();
    double totalCogs = 0.0;
    for (final row in allocationRows) {
      final allocated = row.readTable(_db.saleItemBatches);
      final batch = row.readTable(_db.batches);
      totalCogs += allocated.quantity * batch.purchasePrice;
    }

    final grossProfit = (netSales - totalTax) - totalCogs;
    final revenueBeforeTax = netSales - totalTax;
    final marginPct = revenueBeforeTax > 0
        ? (grossProfit / revenueBeforeTax) * 100
        : 0.0;

    return SalesFinancialSummary(
      grossSales: grossSales,
      totalDiscount: totalDiscount,
      totalTax: totalTax,
      netSales: netSales,
      totalCogs: totalCogs,
      grossProfit: grossProfit,
      grossMarginPercentage: marginPct,
      totalTransactions: sales.length,
    );
  }

  @override
  Future<List<TopSellingMedicine>> getTopSellingMedicines(
    String pharmacyId, {
    int limit = 10,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final query = _db.select(_db.saleItems).join([
      innerJoin(
        _db.sales,
        _db.sales.id.equalsExp(_db.saleItems.saleId),
      ),
      innerJoin(
        _db.medicines,
        _db.medicines.id.equalsExp(_db.saleItems.medicineId),
      ),
    ])
      ..where(
        _db.sales.pharmacyId.equals(pharmacyId) &
            _db.sales.status.equals(SaleStatus.completed.index),
      );

    if (startDate != null) {
      query.where(_db.sales.saleDate.isBiggerOrEqualValue(startDate));
    }
    if (endDate != null) {
      query.where(_db.sales.saleDate.isSmallerOrEqualValue(endDate));
    }

    final rows = await query.get();
    final map = <String, _AggregatedMedicine>{};

    for (final row in rows) {
      final item = row.readTable(_db.saleItems);
      final med = row.readTable(_db.medicines);

      if (!map.containsKey(med.id)) {
        map[med.id] = _AggregatedMedicine(
          id: med.id,
          name: med.name,
          quantity: 0.0,
          revenue: 0.0,
        );
      }
      final current = map[med.id]!;
      current.quantity += item.quantity;
      current.revenue += item.total;
    }

    final list = map.values.toList()
      ..sort((a, b) => b.quantity.compareTo(a.quantity));

    return list.take(limit).map((agg) {
      return TopSellingMedicine(
        medicineId: agg.id,
        medicineName: agg.name,
        totalQuantity: agg.quantity,
        totalRevenue: agg.revenue,
      );
    }).toList();
  }

  @override
  Future<List<PaymentMethodSummary>> getPaymentMethodSummaries(
    String pharmacyId, {
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final query = _db.select(_db.payments).join([
      innerJoin(
        _db.sales,
        _db.sales.id.equalsExp(_db.payments.saleId),
      ),
    ])
      ..where(
        _db.sales.pharmacyId.equals(pharmacyId) &
            _db.sales.status.equals(SaleStatus.completed.index) &
            _db.payments.status.equals(PaymentStatus.completed.index),
      );

    if (startDate != null) {
      query.where(_db.sales.saleDate.isBiggerOrEqualValue(startDate));
    }
    if (endDate != null) {
      query.where(_db.sales.saleDate.isSmallerOrEqualValue(endDate));
    }

    final rows = await query.get();
    final map = <PaymentMethod, _AggregatedPayment>{};

    for (final row in rows) {
      final payment = row.readTable(_db.payments);
      final method = payment.paymentMethod;

      if (!map.containsKey(method)) {
        map[method] = _AggregatedPayment(method: method, total: 0.0, count: 0);
      }
      final agg = map[method]!;
      agg.total += payment.amount;
      agg.count += 1;
    }

    return map.values.map((agg) {
      return PaymentMethodSummary(
        method: agg.method,
        totalAmount: agg.total,
        transactionCount: agg.count,
      );
    }).toList();
  }
}

class _AggregatedMedicine {
  final String id;
  final String name;
  double quantity;
  double revenue;

  _AggregatedMedicine({
    required this.id,
    required this.name,
    required this.quantity,
    required this.revenue,
  });
}

class _AggregatedPayment {
  final PaymentMethod method;
  double total;
  int count;

  _AggregatedPayment({
    required this.method,
    required this.total,
    required this.count,
  });
}
