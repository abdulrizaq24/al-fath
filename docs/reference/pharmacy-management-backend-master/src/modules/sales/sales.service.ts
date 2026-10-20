import { prisma } from "../../config/prisma.js";

interface SaleItemInput {
  medicineId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

interface CreateSaleInput {
  patientId?: string;
  invoiceNumber: string;
  discount?: number;
  tax?: number;
  paymentMethod: "CASH" | "CARD" | "BANK_TRANSFER" | "MOBILE_PAYMENT" | "OTHER";
  transactionReference?: string;
  items: SaleItemInput[];
}

export async function createSale(
  pharmacyId: string,
  soldById: string,
  data: CreateSaleInput,
) {
  /*
  |--------------------------------------------------------------------------
  | Basic validation
  |--------------------------------------------------------------------------
  */

  if (!data.invoiceNumber.trim()) {
    throw new Error("Invoice number is required");
  }

  if (data.items.length === 0) {
    throw new Error("Sale must contain at least one item");
  }

  const saleDiscount = data.discount ?? 0;
  const saleTax = data.tax ?? 0;

  if (!Number.isFinite(saleDiscount) || saleDiscount < 0) {
    throw new Error("Discount cannot be negative");
  }

  if (!Number.isFinite(saleTax) || saleTax < 0) {
    throw new Error("Tax cannot be negative");
  }

  for (const item of data.items) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new Error("Sale quantity must be greater than zero");
    }

    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      throw new Error("Unit price cannot be negative");
    }

    if (
      item.discount !== undefined &&
      (!Number.isFinite(item.discount) || item.discount < 0)
    ) {
      throw new Error("Item discount cannot be negative");
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Validate patient belongs to this pharmacy
  |--------------------------------------------------------------------------
  */

  if (data.patientId !== undefined) {
    const patient = await prisma.patient.findFirst({
      where: {
        id: data.patientId,
        pharmacyId,
      },
    });

    if (!patient) {
      throw new Error("Patient not found");
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Validate selling user belongs to this pharmacy
  |--------------------------------------------------------------------------
  */

  const soldBy = await prisma.user.findFirst({
    where: {
      id: soldById,
      pharmacyId,
      isActive: true,
    },
  });

  if (!soldBy) {
    throw new Error("User not found");
  }

  /*
  |--------------------------------------------------------------------------
  | Create the entire sale inside one database transaction
  |--------------------------------------------------------------------------
  */

  return prisma.$transaction(async (tx) => {
    /*
    |--------------------------------------------------------------------------
    | Prevent duplicate invoice numbers
    |--------------------------------------------------------------------------
    */

    const existingSale = await tx.sale.findFirst({
      where: {
        pharmacyId,
        invoiceNumber: data.invoiceNumber,
      },
    });

    if (existingSale) {
      throw new Error("Invoice number already exists");
    }

    /*
    |--------------------------------------------------------------------------
    | Prepare sale items and batch allocations
    |--------------------------------------------------------------------------
    */

    const preparedItems: Array<{
      medicineId: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      total: number;
      allocations: Array<{
        batchId: string;
        quantity: number;
      }>;
    }> = [];

    let subtotal = 0;
    let totalItemDiscount = 0;

    /*
    |--------------------------------------------------------------------------
    | Calculate today's expiry boundary
    |--------------------------------------------------------------------------
    |
    | A medicine expiring today remains sellable today.
    |
    | Example:
    |
    |   Expiry date: 30 Aug 2026
    |
    |   30 Aug 00:00  -> VALID
    |   30 Aug 12:00  -> VALID
    |   30 Aug 23:59  -> VALID
    |   31 Aug 00:00  -> EXPIRED
    |
    | We therefore compare against the start of today rather
    | than comparing expiryDate with the exact current time.
    |
    */

    const startOfToday = new Date();

    startOfToday.setHours(0, 0, 0, 0);

    for (const item of data.items) {
      const itemDiscount = item.discount ?? 0;

      const itemSubtotal = item.quantity * item.unitPrice;

      const itemTotal = itemSubtotal - itemDiscount;

      if (itemTotal < 0) {
        throw new Error("Item discount cannot exceed item subtotal");
      }

      /*
      |--------------------------------------------------------------------------
      | Find valid batches
      |--------------------------------------------------------------------------
      |
      | FEFO:
      | First Expired, First Out
      |
      | Important expiry rule:
      |
      |   expiryDate >= startOfToday
      |
      | This means a batch expiring today is still valid for sale.
      |
      | Once the calendar date moves to tomorrow, that same
      | batch will no longer satisfy this condition.
      |
      */

      const batches = await tx.batch.findMany({
        where: {
          pharmacyId,
          medicineId: item.medicineId,

          currentQuantity: {
            gt: 0,
          },

          expiryDate: {
            gte: startOfToday,
          },
        },

        include: {
          medicine: true,
        },

        orderBy: {
          expiryDate: "asc",
        },
      });

      /*
      |--------------------------------------------------------------------------
      | Validate medicine / stock
      |--------------------------------------------------------------------------
      */

      if (batches.length === 0) {
        const medicine = await tx.medicine.findFirst({
          where: {
            id: item.medicineId,
            pharmacyId,
          },

          select: {
            id: true,
            name: true,
            isActive: true,
          },
        });

        if (!medicine) {
          throw new Error("Medicine not found");
        }

        if (!medicine.isActive) {
          throw new Error(`Medicine ${medicine.name} is inactive`);
        }

        throw new Error(`No valid stock available for ${medicine.name}`);
      }

      const firstBatch = batches[0];

      if (!firstBatch) {
        throw new Error("Medicine batch not found");
      }

      const medicine = firstBatch.medicine;

      if (!medicine) {
        throw new Error("Medicine not found");
      }

      if (!medicine.isActive) {
        throw new Error(`Medicine ${medicine.name} is inactive`);
      }

      if (medicine.pharmacyId !== pharmacyId) {
        throw new Error("Medicine does not belong to this pharmacy");
      }

      /*
      |--------------------------------------------------------------------------
      | Check total available stock
      |--------------------------------------------------------------------------
      */

      const availableQuantity = batches.reduce(
        (total, batch) => total + Number(batch.currentQuantity),
        0,
      );

      if (availableQuantity < item.quantity) {
        throw new Error(
          `Insufficient stock for ${medicine.name}. Available: ${availableQuantity}, requested: ${item.quantity}`,
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Allocate requested quantity across batches
      |--------------------------------------------------------------------------
      */

      let remainingQuantity = item.quantity;

      const allocations: Array<{
        batchId: string;
        quantity: number;
      }> = [];

      for (const batch of batches) {
        if (remainingQuantity <= 0) {
          break;
        }

        const batchQuantity = Number(batch.currentQuantity);

        const allocatedQuantity = Math.min(batchQuantity, remainingQuantity);

        allocations.push({
          batchId: batch.id,
          quantity: allocatedQuantity,
        });

        remainingQuantity -= allocatedQuantity;
      }

      if (remainingQuantity > 0) {
        throw new Error(
          `Unable to allocate sufficient stock for ${medicine.name}`,
        );
      }

      subtotal += itemSubtotal;
      totalItemDiscount += itemDiscount;

      preparedItems.push({
        medicineId: item.medicineId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: itemDiscount,
        total: itemTotal,
        allocations,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Calculate final sale totals
    |--------------------------------------------------------------------------
    */

    const finalDiscount = saleDiscount + totalItemDiscount;

    const total = subtotal - finalDiscount + saleTax;

    if (total < 0) {
      throw new Error("Sale total cannot be negative");
    }

    /*
    |--------------------------------------------------------------------------
    | Create Sale
    |--------------------------------------------------------------------------
    */

    const sale = await tx.sale.create({
      data: {
        pharmacyId,
        soldById,
        invoiceNumber: data.invoiceNumber,
        subtotal,
        discount: finalDiscount,
        tax: saleTax,
        total,
        status: "COMPLETED",
        saleDate: new Date(),

        ...(data.patientId !== undefined && {
          patientId: data.patientId,
        }),
      },
    });

    /*
    |--------------------------------------------------------------------------
    | Create Sale Items
    |--------------------------------------------------------------------------
    */

    for (const item of preparedItems) {
      const saleItem = await tx.saleItem.create({
        data: {
          saleId: sale.id,
          medicineId: item.medicineId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          total: item.total,
        },
      });

      /*
      |--------------------------------------------------------------------------
      | Process each batch allocation
      |--------------------------------------------------------------------------
      */

      for (const allocation of item.allocations) {
        /*
        |--------------------------------------------------------------------------
        | Verify batch belongs to this pharmacy and medicine
        |--------------------------------------------------------------------------
        */

        const batch = await tx.batch.findFirst({
          where: {
            id: allocation.batchId,
            pharmacyId,
            medicineId: item.medicineId,
          },
        });

        if (!batch) {
          throw new Error("Batch not found");
        }

        /*
        |--------------------------------------------------------------------------
        | ATOMIC STOCK DECREMENT
        |--------------------------------------------------------------------------
        */

        const stockUpdate = await tx.batch.updateMany({
          where: {
            id: batch.id,
            pharmacyId,
            medicineId: item.medicineId,

            currentQuantity: {
              gte: allocation.quantity,
            },
          },

          data: {
            currentQuantity: {
              decrement: allocation.quantity,
            },
          },
        });

        /*
        |--------------------------------------------------------------------------
        | Verify atomic stock update succeeded
        |--------------------------------------------------------------------------
        */

        if (stockUpdate.count !== 1) {
          throw new Error("Insufficient stock while processing sale");
        }

        /*
        |--------------------------------------------------------------------------
        | Record which batch supplied the sale
        |--------------------------------------------------------------------------
        */

        await tx.saleItemBatch.create({
          data: {
            saleItemId: saleItem.id,
            batchId: batch.id,
            quantity: allocation.quantity,
          },
        });

        /*
        |--------------------------------------------------------------------------
        | Create inventory audit transaction
        |--------------------------------------------------------------------------
        */

        await tx.inventoryTransaction.create({
          data: {
            pharmacyId,
            medicineId: item.medicineId,
            batchId: batch.id,
            transactionType: "SALE",
            quantity: -allocation.quantity,
            referenceType: "SALE",
            referenceId: sale.id,
            reason: `Sale ${data.invoiceNumber}`,
            createdById: soldById,
          },
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Create Payment
    |--------------------------------------------------------------------------
    */

    await tx.payment.create({
      data: {
        saleId: sale.id,
        paymentMethod: data.paymentMethod,
        amount: total,
        status: "COMPLETED",
        paidAt: new Date(),

        ...(data.transactionReference !== undefined && {
          transactionReference: data.transactionReference,
        }),
      },
    });

    /*
    |--------------------------------------------------------------------------
    | Return complete sale
    |--------------------------------------------------------------------------
    */

    return tx.sale.findUnique({
      where: {
        id: sale.id,
      },

      include: {
        patient: true,

        soldBy: true,

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
    });
  });
}

/*
|--------------------------------------------------------------------------
| Get all sales
|--------------------------------------------------------------------------
*/

export async function getSales(pharmacyId: string) {
  return prisma.sale.findMany({
    where: {
      pharmacyId,
    },

    orderBy: {
      saleDate: "desc",
    },

    include: {
      patient: true,

      soldBy: true,

      items: {
        include: {
          medicine: true,
        },
      },

      payments: true,
    },
  });
}

/*
|--------------------------------------------------------------------------
| Get one sale
|--------------------------------------------------------------------------
*/

export async function getSale(pharmacyId: string, saleId: string) {
  const sale = await prisma.sale.findFirst({
    where: {
      id: saleId,
      pharmacyId,
    },

    include: {
      patient: true,

      soldBy: true,

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
  });

  return sale;
}
