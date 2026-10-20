import { prisma } from "../../config/prisma.js";

export async function getDashboardStatistics(pharmacyId: string) {
  const now = new Date();

  // Start of today
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  // Start of tomorrow
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  // Inventory considered "expiring soon"
  // Same 90-day concept used by the dashboard.
  const expiryLimit = new Date(now);
  expiryLimit.setDate(expiryLimit.getDate() + 90);

  const [
    totalMedicines,
    totalStockResult,
    lowStockMedicines,
    expiringInventory,
    expiredInventory,
    todaySales,
    recentTransactions,
  ] = await Promise.all([
    // =========================================================
    // Total active medicines
    // =========================================================

    prisma.medicine.count({
      where: {
        pharmacyId,
        isActive: true,
      },
    }),

    // =========================================================
    // Total current stock across all batches
    // =========================================================

    prisma.batch.aggregate({
      where: {
        pharmacyId,
        currentQuantity: {
          gt: 0,
        },
      },
      _sum: {
        currentQuantity: true,
      },
    }),

    // =========================================================
    // Get active medicines and their available batches
    // =========================================================

    prisma.medicine.findMany({
      where: {
        pharmacyId,
        isActive: true,
      },
      include: {
        batches: {
          where: {
            currentQuantity: {
              gt: 0,
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    }),

    // =========================================================
    // Inventory expiring within 90 days
    // =========================================================

    prisma.batch.count({
      where: {
        pharmacyId,
        currentQuantity: {
          gt: 0,
        },
        expiryDate: {
          gte: now,
          lte: expiryLimit,
        },
      },
    }),

    // =========================================================
    // Inventory that has already expired
    // =========================================================

    prisma.batch.count({
      where: {
        pharmacyId,
        currentQuantity: {
          gt: 0,
        },
        expiryDate: {
          lt: now,
        },
      },
    }),

    // =========================================================
    // Today's completed sales
    // =========================================================

    prisma.sale.aggregate({
      where: {
        pharmacyId,
        status: "COMPLETED",
        saleDate: {
          gte: startOfToday,
          lt: startOfTomorrow,
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        total: true,
      },
    }),

    // =========================================================
    // Most recent inventory transactions
    // =========================================================

    prisma.inventoryTransaction.findMany({
      where: {
        pharmacyId,
      },
      include: {
        medicine: true,
        batch: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    }),
  ]);

  // ===========================================================
  // LOW STOCK
  // ===========================================================
  //
  // A batch is considered low stock when:
  //
  // currentQuantity <= medicine.reorderLevel
  //
  // This matches the Inventory page.
  //
  // Example:
  //
  // Paracetamol
  //   BATCH-20  = 10
  //   Batch-1   = 479
  //
  // Reorder level = 10
  //
  // BATCH-20:
  //   10 <= 10 -> LOW STOCK
  //
  // Batch-1:
  //   479 <= 10 -> NOT LOW STOCK
  //
  // Result:
  //   1 low-stock batch
  // ===========================================================

  const lowStockCount = lowStockMedicines.reduce((count, medicine) => {
    const lowStockBatches = medicine.batches.filter(
      (batch) => Number(batch.currentQuantity) <= Number(medicine.reorderLevel),
    );

    return count + lowStockBatches.length;
  }, 0);

  return {
    totalMedicines,

    totalStock: Number(totalStockResult._sum.currentQuantity ?? 0),

    // Number of individual low-stock batches
    lowStockMedicines: lowStockCount,

    expiringInventory,

    expiredInventory,

    todaySales: todaySales._count.id,

    todayRevenue: Number(todaySales._sum.total ?? 0),

    recentTransactions,
  };
}
