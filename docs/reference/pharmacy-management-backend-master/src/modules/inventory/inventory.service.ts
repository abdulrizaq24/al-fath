import { prisma } from "../../config/prisma.js";

function startOfToday() {
  const date = new Date();

  date.setHours(0, 0, 0, 0);

  return date;
}

function startOfTomorrow() {
  const date = startOfToday();

  date.setDate(date.getDate() + 1);

  return date;
}

export async function getInventory(pharmacyId: string) {
  return prisma.batch.findMany({
    where: {
      pharmacyId,

      currentQuantity: {
        gt: 0,
      },
    },

    include: {
      medicine: true,
    },

    orderBy: [
      {
        medicine: {
          name: "asc",
        },
      },
      {
        expiryDate: "asc",
      },
    ],
  });
}

export async function getLowStockMedicines(pharmacyId: string) {
  const medicines = await prisma.medicine.findMany({
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

      category: true,
    },

    orderBy: {
      name: "asc",
    },
  });

  return medicines
    .map((medicine) => {
      const currentStock = medicine.batches.reduce(
        (total, batch) => total + Number(batch.currentQuantity),
        0,
      );

      return {
        medicine,
        currentStock,
        reorderLevel: Number(medicine.reorderLevel),
        isLowStock: currentStock <= Number(medicine.reorderLevel),
      };
    })
    .filter((item) => item.isLowStock);
}

export async function getExpiringInventory(pharmacyId: string, days = 90) {
  if (days <= 0) {
    throw new Error("Days must be greater than zero");
  }

  /*
  |--------------------------------------------------------------------------
  | Expiry is treated as a calendar date.
  |
  | A batch expiring today is still considered valid throughout today.
  |
  | Example:
  |
  |   30 Aug 00:00 -> expiring
  |   30 Aug 12:00 -> expiring
  |   30 Aug 23:59 -> expiring
  |   31 Aug 00:00 -> expired
  |--------------------------------------------------------------------------
  */

  const today = startOfToday();

  const expiryLimit = new Date(today);

  expiryLimit.setDate(expiryLimit.getDate() + days);

  return prisma.batch.findMany({
    where: {
      pharmacyId,

      currentQuantity: {
        gt: 0,
      },

      expiryDate: {
        gte: today,
        lt: expiryLimit,
      },
    },

    include: {
      medicine: true,
    },

    orderBy: {
      expiryDate: "asc",
    },
  });
}

export async function getExpiredInventory(pharmacyId: string) {
  /*
  |--------------------------------------------------------------------------
  | A batch becomes expired only when the calendar moves to the next day.
  |
  | Therefore:
  |
  |   expiryDate < startOfTomorrow
  |
  | would technically include today's batches, so we instead use
  | startOfToday as the boundary.
  |
  | Anything before today is expired.
  |--------------------------------------------------------------------------
  */

  const today = startOfToday();

  return prisma.batch.findMany({
    where: {
      pharmacyId,

      currentQuantity: {
        gt: 0,
      },

      expiryDate: {
        lt: today,
      },
    },

    include: {
      medicine: true,
    },

    orderBy: {
      expiryDate: "asc",
    },
  });
}

interface AdjustStockInput {
  batchId: string;
  quantity: number;
  reason: string;
}

export async function adjustStock(
  pharmacyId: string,
  createdById: string,
  data: AdjustStockInput,
) {
  if (data.quantity === 0) {
    throw new Error("Adjustment quantity cannot be zero");
  }

  if (!data.reason.trim()) {
    throw new Error("Adjustment reason is required");
  }

  const batch = await prisma.batch.findFirst({
    where: {
      id: data.batchId,
      pharmacyId,
    },
  });

  if (!batch) {
    throw new Error("Batch not found");
  }

  const currentQuantity = Number(batch.currentQuantity);

  const newQuantity = currentQuantity + data.quantity;

  if (newQuantity < 0) {
    throw new Error("Adjustment would make stock negative");
  }

  return prisma.$transaction(async (tx) => {
    const updatedBatch = await tx.batch.update({
      where: {
        id: batch.id,
      },

      data: {
        currentQuantity: newQuantity,
      },

      include: {
        medicine: true,
      },
    });

    await tx.inventoryTransaction.create({
      data: {
        pharmacyId,
        medicineId: batch.medicineId,
        batchId: batch.id,
        transactionType: "ADJUSTMENT",
        quantity: data.quantity,
        referenceType: "ADJUSTMENT",
        referenceId: batch.id,
        reason: data.reason,
        createdById,
      },
    });

    return updatedBatch;
  });
}

interface InventoryTransactionFilters {
  medicineId?: string;
  batchId?: string;
}

export async function getInventoryTransactions(
  pharmacyId: string,
  filters: InventoryTransactionFilters = {},
) {
  return prisma.inventoryTransaction.findMany({
    where: {
      pharmacyId,

      ...(filters.medicineId !== undefined && {
        medicineId: filters.medicineId,
      }),

      ...(filters.batchId !== undefined && {
        batchId: filters.batchId,
      }),
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
  });
}
