import { prisma } from "../../config/prisma.js";

interface AnalyticsDateRange {
  from: Date;
  to: Date;
}

function toNumber(value: unknown): number {
  return Number(value ?? 0);
}

function getDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getReportsAnalytics(
  pharmacyId: string,
  range: AnalyticsDateRange,
) {
  const { from, to } = range;

  /*
   * ------------------------------------------------------------
   * SALES
   * ------------------------------------------------------------
   */

  const sales = await prisma.sale.findMany({
    where: {
      pharmacyId,
      saleDate: {
        gte: from,
        lt: to,
      },
    },
    include: {
      items: {
        include: {
          medicine: true,
          batchAllocations: {
            include: {
              batch: true,
            },
          },
        },
      },
      payments: true,
    },
    orderBy: {
      saleDate: "asc",
    },
  });

  const completedSales = sales.filter((sale) => sale.status === "COMPLETED");

  const salesSummary = {
    totalSales: completedSales.length,

    subtotal: completedSales.reduce(
      (total, sale) => total + toNumber(sale.subtotal),
      0,
    ),

    discounts: completedSales.reduce(
      (total, sale) => total + toNumber(sale.discount),
      0,
    ),

    tax: completedSales.reduce((total, sale) => total + toNumber(sale.tax), 0),

    revenue: completedSales.reduce(
      (total, sale) => total + toNumber(sale.total),
      0,
    ),
  };

  const netRevenueBeforeTax = salesSummary.subtotal - salesSummary.discounts;

  const averageSaleValue =
    salesSummary.totalSales > 0
      ? salesSummary.revenue / salesSummary.totalSales
      : 0;

  /*
   * ------------------------------------------------------------
   * REVENUE TREND
   * ------------------------------------------------------------
   */

  const revenueByDate = new Map<
    string,
    {
      date: string;
      revenue: number;
      sales: number;
    }
  >();

  for (const sale of completedSales) {
    const date = getDateKey(sale.saleDate);

    const existing = revenueByDate.get(date);

    if (existing) {
      existing.revenue += toNumber(sale.total);
      existing.sales += 1;
    } else {
      revenueByDate.set(date, {
        date,
        revenue: toNumber(sale.total),
        sales: 1,
      });
    }
  }

  const revenueTrend = Array.from(revenueByDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  /*
   * ------------------------------------------------------------
   * SALES BY MEDICINE
   * ------------------------------------------------------------
   *
   * SaleItem.total already includes the item's own discount.
   *
   * Sale-level discount and tax are allocated proportionally
   * according to each item's value.
   *
   * This keeps the medicine-level report consistent with
   * the overall sale.
   */

  const medicineMap = new Map<
    string,
    {
      medicineId: string;
      medicineName: string;
      genericName: string | null;
      quantitySold: number;
      grossRevenue: number;
      allocatedSaleDiscount: number;
      allocatedTax: number;
      revenue: number;
      costOfGoodsSold: number;
    }
  >();

  for (const sale of completedSales) {
    const saleSubtotal = toNumber(sale.subtotal);
    const saleDiscount = toNumber(sale.discount);
    const saleTax = toNumber(sale.tax);

    const itemTotals = sale.items.map((item) => toNumber(item.total));

    const totalItemValue = itemTotals.reduce(
      (total, value) => total + value,
      0,
    );

    for (let index = 0; index < sale.items.length; index++) {
      const item = sale.items[index];

      if (!item) {
        continue;
      }

      const itemTotal = itemTotals[index] ?? 0;

      /*
       * If the sale contains items, allocate sale-level
       * discount/tax proportionally to each item.
       *
       * Normally totalItemValue should equal the sale
       * subtotal after item-level discounts.
       */
      const allocationRatio =
        totalItemValue > 0 ? itemTotal / totalItemValue : 0;

      const allocatedSaleDiscount = saleDiscount * allocationRatio;

      const allocatedTax = saleTax * allocationRatio;

      /*
       * Revenue here includes the allocated tax so that
       * medicine revenue reconciles with Sale.total.
       */
      const medicineRevenue = itemTotal - allocatedSaleDiscount + allocatedTax;

      const medicineId = item.medicineId;

      let existing = medicineMap.get(medicineId);

      if (!existing) {
        existing = {
          medicineId,
          medicineName: item.medicine.name,
          genericName: item.medicine.genericName,
          quantitySold: 0,
          grossRevenue: 0,
          allocatedSaleDiscount: 0,
          allocatedTax: 0,
          revenue: 0,
          costOfGoodsSold: 0,
        };

        medicineMap.set(medicineId, existing);
      }

      existing.quantitySold += toNumber(item.quantity);

      existing.grossRevenue += itemTotal;

      existing.allocatedSaleDiscount += allocatedSaleDiscount;

      existing.allocatedTax += allocatedTax;

      existing.revenue += medicineRevenue;

      /*
       * Actual batch-based COGS.
       */
      for (const allocation of item.batchAllocations) {
        const quantity = toNumber(allocation.quantity);

        const purchasePrice = toNumber(allocation.batch.purchasePrice);

        existing.costOfGoodsSold += quantity * purchasePrice;
      }
    }
  }

  const salesByMedicine = Array.from(medicineMap.values())
    .map((item) => {
      const grossProfit = item.revenue - item.costOfGoodsSold;

      const margin = item.revenue > 0 ? (grossProfit / item.revenue) * 100 : 0;

      return {
        ...item,
        grossProfit,
        margin,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  /*
   * ------------------------------------------------------------
   * PAYMENT METHODS
   * ------------------------------------------------------------
   */

  const paymentMap = new Map<
    string,
    {
      paymentMethod: string;
      amount: number;
      transactions: number;
    }
  >();

  for (const sale of completedSales) {
    for (const payment of sale.payments) {
      if (payment.status !== "COMPLETED") {
        continue;
      }

      const method = payment.paymentMethod;
      const amount = toNumber(payment.amount);

      const existing = paymentMap.get(method);

      if (existing) {
        existing.amount += amount;
        existing.transactions += 1;
      } else {
        paymentMap.set(method, {
          paymentMethod: method,
          amount,
          transactions: 1,
        });
      }
    }
  }

  const salesByPaymentMethod = Array.from(paymentMap.values()).sort(
    (a, b) => b.amount - a.amount,
  );

  /*
   * ------------------------------------------------------------
   * PROFIT / MARGIN
   * ------------------------------------------------------------
   *
   * Sales tax is not treated as pharmacy profit.
   *
   * Therefore:
   *
   * Net revenue before tax
   * - COGS
   * = Gross profit
   */

  const totalCostOfGoodsSold = salesByMedicine.reduce(
    (total, medicine) => total + medicine.costOfGoodsSold,
    0,
  );

  const grossProfit = netRevenueBeforeTax - totalCostOfGoodsSold;

  const grossMargin =
    netRevenueBeforeTax > 0 ? (grossProfit / netRevenueBeforeTax) * 100 : 0;

  /*
   * ------------------------------------------------------------
   * PURCHASES
   * ------------------------------------------------------------
   */

  const purchases = await prisma.purchase.findMany({
    where: {
      pharmacyId,
      purchaseDate: {
        gte: from,
        lt: to,
      },
    },
    include: {
      supplier: true,
      items: {
        include: {
          medicine: true,
        },
      },
    },
    orderBy: {
      purchaseDate: "asc",
    },
  });

  const activePurchases = purchases.filter(
    (purchase) => purchase.status !== "CANCELLED",
  );

  const purchaseSummary = {
    totalPurchases: activePurchases.length,

    totalAmount: activePurchases.reduce(
      (total, purchase) => total + toNumber(purchase.totalAmount),
      0,
    ),

    draft: purchases.filter((purchase) => purchase.status === "DRAFT").length,

    ordered: purchases.filter((purchase) => purchase.status === "ORDERED")
      .length,

    partiallyReceived: purchases.filter(
      (purchase) => purchase.status === "PARTIALLY_RECEIVED",
    ).length,

    received: purchases.filter((purchase) => purchase.status === "RECEIVED")
      .length,

    cancelled: purchases.filter((purchase) => purchase.status === "CANCELLED")
      .length,
  };

  /*
   * ------------------------------------------------------------
   * PURCHASES BY SUPPLIER
   * ------------------------------------------------------------
   */

  const supplierMap = new Map<
    string,
    {
      supplierId: string;
      supplierName: string;
      purchaseCount: number;
      totalAmount: number;
    }
  >();

  for (const purchase of activePurchases) {
    const supplierId = purchase.supplierId;

    const existing = supplierMap.get(supplierId);

    if (existing) {
      existing.purchaseCount += 1;
      existing.totalAmount += toNumber(purchase.totalAmount);
    } else {
      supplierMap.set(supplierId, {
        supplierId,
        supplierName: purchase.supplier.name,
        purchaseCount: 1,
        totalAmount: toNumber(purchase.totalAmount),
      });
    }
  }

  const purchasesBySupplier = Array.from(supplierMap.values()).sort(
    (a, b) => b.totalAmount - a.totalAmount,
  );

  /*
   * ------------------------------------------------------------
   * PURCHASES BY MEDICINE
   * ------------------------------------------------------------
   */

  const purchaseMedicineMap = new Map<
    string,
    {
      medicineId: string;
      medicineName: string;
      quantityOrdered: number;
      totalCost: number;
    }
  >();

  for (const purchase of activePurchases) {
    for (const item of purchase.items) {
      const existing = purchaseMedicineMap.get(item.medicineId);

      if (existing) {
        existing.quantityOrdered += toNumber(item.orderedQuantity);

        existing.totalCost += toNumber(item.totalCost);
      } else {
        purchaseMedicineMap.set(item.medicineId, {
          medicineId: item.medicineId,
          medicineName: item.medicine.name,
          quantityOrdered: toNumber(item.orderedQuantity),
          totalCost: toNumber(item.totalCost),
        });
      }
    }
  }

  const purchasesByMedicine = Array.from(purchaseMedicineMap.values()).sort(
    (a, b) => b.totalCost - a.totalCost,
  );

  /*
   * ------------------------------------------------------------
   * FINAL RESULT
   * ------------------------------------------------------------
   */

  return {
    range: {
      from: from.toISOString(),
      to: to.toISOString(),
    },

    sales: {
      ...salesSummary,
      netRevenueBeforeTax,
      averageSaleValue,
    },

    revenueTrend,

    salesByMedicine,

    salesByPaymentMethod,

    profit: {
      revenue: netRevenueBeforeTax,
      costOfGoodsSold: totalCostOfGoodsSold,
      grossProfit,
      grossMargin,
    },

    purchases: purchaseSummary,

    purchasesBySupplier,

    purchasesByMedicine,
  };
}
