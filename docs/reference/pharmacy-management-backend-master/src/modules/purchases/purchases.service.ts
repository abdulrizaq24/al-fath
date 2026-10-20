import { prisma } from "../../config/prisma.js";

interface PurchaseItemInput {
  medicineId: string;
  orderedQuantity: number;
  unitCost: number;
}

interface CreatePurchaseInput {
  supplierId: string;
  purchaseNumber: string;
  expectedDate?: string;
  notes?: string;
  items: PurchaseItemInput[];
}

/*
|--------------------------------------------------------------------------
| Create Purchase
|--------------------------------------------------------------------------
*/

export async function createPurchase(
  pharmacyId: string,
  createdById: string,
  data: CreatePurchaseInput,
) {
  if (!data.purchaseNumber.trim()) {
    throw new Error("Purchase number is required");
  }

  const supplier = await prisma.supplier.findFirst({
    where: {
      id: data.supplierId,
      pharmacyId,
      isActive: true,
    },
  });

  if (!supplier) {
    throw new Error("Supplier not found");
  }

  if (data.items.length === 0) {
    throw new Error("Purchase must contain at least one item");
  }

  for (const item of data.items) {
    if (!Number.isFinite(item.orderedQuantity) || item.orderedQuantity <= 0) {
      throw new Error("Ordered quantity must be greater than zero");
    }

    if (!Number.isFinite(item.unitCost) || item.unitCost < 0) {
      throw new Error("Unit cost must be zero or greater");
    }
  }

  if (data.expectedDate !== undefined) {
    const expectedDate = new Date(data.expectedDate);

    if (Number.isNaN(expectedDate.getTime())) {
      throw new Error("Invalid expected date");
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Prevent duplicate medicines in one purchase
  |--------------------------------------------------------------------------
  */

  const medicineIds = data.items.map((item) => item.medicineId);

  const uniqueMedicineIds = new Set(medicineIds);

  if (uniqueMedicineIds.size !== medicineIds.length) {
    throw new Error(
      "A medicine cannot appear more than once in the same purchase",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Validate medicines
  |--------------------------------------------------------------------------
  */

  const medicines = await prisma.medicine.findMany({
    where: {
      id: {
        in: medicineIds,
      },
      pharmacyId,
      isActive: true,
    },
  });

  if (medicines.length !== medicineIds.length) {
    throw new Error("One or more medicines were not found");
  }

  /*
  |--------------------------------------------------------------------------
  | Calculate total
  |--------------------------------------------------------------------------
  */

  const totalAmount = data.items.reduce(
    (total, item) => total + item.orderedQuantity * item.unitCost,
    0,
  );

  /*
  |--------------------------------------------------------------------------
  | Create purchase
  |--------------------------------------------------------------------------
  */

  return prisma.purchase.create({
    data: {
      pharmacyId,
      supplierId: data.supplierId,
      createdById,
      purchaseNumber: data.purchaseNumber,

      ...(data.expectedDate !== undefined && {
        expectedDate: new Date(data.expectedDate),
      }),

      ...(data.notes !== undefined && {
        notes: data.notes,
      }),

      totalAmount,

      items: {
        create: data.items.map((item) => ({
          medicineId: item.medicineId,
          orderedQuantity: item.orderedQuantity,
          unitCost: item.unitCost,
          totalCost: item.orderedQuantity * item.unitCost,
        })),
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
  });
}

/*
|--------------------------------------------------------------------------
| Get Purchases
|--------------------------------------------------------------------------
*/

export async function getPurchases(pharmacyId: string) {
  return prisma.purchase.findMany({
    where: {
      pharmacyId,
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
      createdAt: "desc",
    },
  });
}

/*
|--------------------------------------------------------------------------
| Receive Purchase
|--------------------------------------------------------------------------
*/

export async function receivePurchase(
  pharmacyId: string,
  createdById: string,
  purchaseId: string,
  receiptNumber: string,
  items: {
    purchaseItemId: string;
    batchNumber: string;
    expiryDate: string;
    quantityReceived: number;
  }[],
  notes?: string,
) {
  /*
  |--------------------------------------------------------------------------
  | Basic validation
  |--------------------------------------------------------------------------
  */

  if (!receiptNumber.trim()) {
    throw new Error("Receipt number is required");
  }

  if (items.length === 0) {
    throw new Error("At least one receipt item is required");
  }

  /*
  |--------------------------------------------------------------------------
  | Validate receipt items before opening transaction
  |--------------------------------------------------------------------------
  */

  const purchaseItemIds = new Set<string>();

  for (const item of items) {
    if (purchaseItemIds.has(item.purchaseItemId)) {
      throw new Error(
        `Purchase item ${item.purchaseItemId} appears more than once in the receipt`,
      );
    }

    purchaseItemIds.add(item.purchaseItemId);

    if (!item.batchNumber.trim()) {
      throw new Error("Batch number is required");
    }

    if (!Number.isFinite(item.quantityReceived) || item.quantityReceived <= 0) {
      throw new Error("Received quantity must be greater than zero");
    }

    if (!Number.isFinite(Number(item.quantityReceived))) {
      throw new Error("Received quantity must be a valid number");
    }

    const expiryDate = new Date(item.expiryDate);

    if (Number.isNaN(expiryDate.getTime())) {
      throw new Error(`Invalid expiry date for batch ${item.batchNumber}`);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Transaction
  |--------------------------------------------------------------------------
  |
  | The purchase row is explicitly locked before we calculate
  | previously received quantities.
  |
  | This prevents two simultaneous receipt requests for the
  | same purchase from both seeing the same remaining quantity.
  |
  */

  return prisma.$transaction(async (tx) => {
    /*
    |--------------------------------------------------------------------------
    | LOCK PURCHASE ROW
    |--------------------------------------------------------------------------
    |
    | PostgreSQL FOR UPDATE:
    |
    | - locks this purchase row
    | - another receipt transaction for the same purchase waits
    | - lock remains until this transaction commits/rolls back
    |
    */

    await tx.$queryRaw`
      SELECT "id"
      FROM "Purchase"
      WHERE "id" = ${purchaseId}
        AND "pharmacyId" = ${pharmacyId}
      FOR UPDATE
    `;

    /*
    |--------------------------------------------------------------------------
    | Re-read purchase AFTER acquiring lock
    |--------------------------------------------------------------------------
    |
    | This is important.
    |
    | We do not trust the state read before the lock.
    |
    */

    const purchase = await tx.purchase.findFirst({
      where: {
        id: purchaseId,
        pharmacyId,
      },

      include: {
        items: true,
      },
    });

    if (!purchase) {
      throw new Error("Purchase not found");
    }

    /*
    |--------------------------------------------------------------------------
    | Validate purchase state
    |--------------------------------------------------------------------------
    */

    if (purchase.status === "CANCELLED") {
      throw new Error("Cannot receive a cancelled purchase");
    }

    if (purchase.status === "RECEIVED") {
      throw new Error("Purchase has already been fully received");
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent duplicate receipt number
    |--------------------------------------------------------------------------
    */

    const existingReceipt = await tx.purchaseReceipt.findFirst({
      where: {
        pharmacyId,
        receiptNumber,
      },
    });

    if (existingReceipt) {
      throw new Error("Receipt number already exists");
    }

    /*
    |--------------------------------------------------------------------------
    | Validate all purchase items belong to this purchase
    |--------------------------------------------------------------------------
    */

    for (const item of items) {
      const purchaseItem = purchase.items.find(
        (purchaseItem) => purchaseItem.id === item.purchaseItemId,
      );

      if (!purchaseItem) {
        throw new Error(`Purchase item ${item.purchaseItemId} not found`);
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Create receipt
    |--------------------------------------------------------------------------
    */

    const receipt = await tx.purchaseReceipt.create({
      data: {
        pharmacyId,
        purchaseId,
        createdById,
        receiptNumber,

        ...(notes !== undefined && {
          notes,
        }),
      },
    });

    /*
    |--------------------------------------------------------------------------
    | Process receipt items
    |--------------------------------------------------------------------------
    */

    for (const item of items) {
      const purchaseItem = purchase.items.find(
        (purchaseItem) => purchaseItem.id === item.purchaseItemId,
      );

      if (!purchaseItem) {
        throw new Error(`Purchase item ${item.purchaseItemId} not found`);
      }

      /*
      |--------------------------------------------------------------------------
      | Calculate previously received quantity
      |--------------------------------------------------------------------------
      */

      const previousReceipts = await tx.purchaseReceiptItem.findMany({
        where: {
          purchaseItemId: item.purchaseItemId,
        },
      });

      const previouslyReceived = previousReceipts.reduce(
        (total, receiptItem) => total + Number(receiptItem.quantityReceived),
        0,
      );

      const orderedQuantity = Number(purchaseItem.orderedQuantity);

      const remainingQuantity = orderedQuantity - previouslyReceived;

      /*
      |--------------------------------------------------------------------------
      | Prevent over-receiving
      |--------------------------------------------------------------------------
      */

      if (remainingQuantity <= 0) {
        throw new Error(
          `Purchase item ${item.purchaseItemId} has already been fully received`,
        );
      }

      if (item.quantityReceived > remainingQuantity) {
        throw new Error(
          `Cannot receive more than the remaining quantity for ${item.purchaseItemId}. Remaining: ${remainingQuantity}, requested: ${item.quantityReceived}`,
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Parse expiry
      |--------------------------------------------------------------------------
      */

      const expiryDate = new Date(item.expiryDate);

      /*
      |--------------------------------------------------------------------------
      | Find existing batch
      |--------------------------------------------------------------------------
      */

      const existingBatch = await tx.batch.findFirst({
        where: {
          pharmacyId,
          medicineId: purchaseItem.medicineId,
          batchNumber: item.batchNumber,
        },
      });

      let batch;

      /*
      |--------------------------------------------------------------------------
      | Existing batch
      |--------------------------------------------------------------------------
      */

      if (existingBatch) {
        /*
        |--------------------------------------------------------------------------
        | Validate expiry date
        |--------------------------------------------------------------------------
        */

        if (existingBatch.expiryDate.getTime() !== expiryDate.getTime()) {
          throw new Error(
            `Batch ${item.batchNumber} already exists with a different expiry date`,
          );
        }

        /*
        |--------------------------------------------------------------------------
        | Update existing batch
        |--------------------------------------------------------------------------
        */

        batch = await tx.batch.update({
          where: {
            id: existingBatch.id,
          },

          data: {
            receivedQuantity:
              Number(existingBatch.receivedQuantity) + item.quantityReceived,

            currentQuantity:
              Number(existingBatch.currentQuantity) + item.quantityReceived,
          },
        });
      } else {

      /*
      |--------------------------------------------------------------------------
      | New batch
      |--------------------------------------------------------------------------
      */
        batch = await tx.batch.create({
          data: {
            pharmacyId,
            medicineId: purchaseItem.medicineId,
            batchNumber: item.batchNumber,
            expiryDate,
            purchasePrice: purchaseItem.unitCost,
            receivedQuantity: item.quantityReceived,
            currentQuantity: item.quantityReceived,
          },
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Create receipt item
      |--------------------------------------------------------------------------
      */

      await tx.purchaseReceiptItem.create({
        data: {
          receiptId: receipt.id,
          purchaseItemId: purchaseItem.id,
          batchId: batch.id,
          quantityReceived: item.quantityReceived,
          unitCost: purchaseItem.unitCost,
        },
      });

      /*
      |--------------------------------------------------------------------------
      | Create inventory transaction
      |--------------------------------------------------------------------------
      */

      await tx.inventoryTransaction.create({
        data: {
          pharmacyId,
          medicineId: purchaseItem.medicineId,
          batchId: batch.id,
          transactionType: "PURCHASE",
          quantity: item.quantityReceived,
          referenceType: "PURCHASE_RECEIPT",
          referenceId: receipt.id,
          reason: "Stock received from purchase",
          createdById,
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Recalculate complete purchase receipt state
    |--------------------------------------------------------------------------
    */

    const allReceiptItems = await tx.purchaseReceiptItem.findMany({
      where: {
        purchaseItem: {
          purchaseId,
        },
      },
    });

    let fullyReceived = true;

    for (const purchaseItem of purchase.items) {
      const received = allReceiptItems
        .filter((receiptItem) => receiptItem.purchaseItemId === purchaseItem.id)
        .reduce(
          (total, receiptItem) => total + Number(receiptItem.quantityReceived),
          0,
        );

      if (received < Number(purchaseItem.orderedQuantity)) {
        fullyReceived = false;
        break;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Update purchase status
    |--------------------------------------------------------------------------
    */

    const status = fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED";

    await tx.purchase.update({
      where: {
        id: purchaseId,
      },

      data: {
        status,
      },
    });

    /*
    |--------------------------------------------------------------------------
    | Return receipt
    |--------------------------------------------------------------------------
    */

    return tx.purchaseReceipt.findUnique({
      where: {
        id: receipt.id,
      },

      include: {
        items: {
          include: {
            batch: true,

            purchaseItem: {
              include: {
                medicine: true,
              },
            },
          },
        },
      },
    });
  });
}
