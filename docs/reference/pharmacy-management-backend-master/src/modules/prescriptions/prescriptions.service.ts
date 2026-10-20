import { prisma } from "../../config/prisma.js";

interface PrescriptionItemInput {
  medicineId: string;
  quantity: number;
  directions?: string;
  notes?: string;
}

interface CreatePrescriptionInput {
  patientId: string;
  prescriptionNumber: string;
  prescriberName: string;
  prescriptionDate: Date;
  notes?: string;
  items: PrescriptionItemInput[];
}

export type PrescriptionStatus =
  | "PENDING"
  | "PARTIALLY_DISPENSED"
  | "DISPENSED"
  | "CANCELLED";

/*
|--------------------------------------------------------------------------
| Create Prescription
|--------------------------------------------------------------------------
*/

export async function createPrescription(
  pharmacyId: string,
  createdById: string,
  data: CreatePrescriptionInput,
) {
  const patient = await prisma.patient.findFirst({
    where: {
      id: data.patientId,
      pharmacyId,
    },
  });

  if (!patient) {
    throw new Error("Patient not found");
  }

  const user = await prisma.user.findFirst({
    where: {
      id: createdById,
      pharmacyId,
      isActive: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const existingPrescription = await prisma.prescription.findFirst({
    where: {
      pharmacyId,
      prescriptionNumber: data.prescriptionNumber,
    },
  });

  if (existingPrescription) {
    throw new Error("Prescription number already exists");
  }

  if (data.items.length === 0) {
    throw new Error("Prescription must contain at least one item");
  }

  for (const item of data.items) {
    const medicine = await prisma.medicine.findFirst({
      where: {
        id: item.medicineId,
        pharmacyId,
      },
    });

    if (!medicine) {
      throw new Error(`Medicine not found: ${item.medicineId}`);
    }

    if (!medicine.isActive) {
      throw new Error(`Medicine ${medicine.name} is inactive`);
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error("Prescription quantities must be positive whole numbers");
    }
  }

  return prisma.prescription.create({
    data: {
      pharmacyId,
      patientId: data.patientId,
      createdById,
      prescriptionNumber: data.prescriptionNumber,
      prescriberName: data.prescriberName,
      prescriptionDate: data.prescriptionDate,
      status: "PENDING",
      notes: data.notes ?? null,

      items: {
        create: data.items.map((item) => ({
          medicine: {
            connect: {
              id: item.medicineId,
            },
          },

          quantityPrescribed: item.quantity,

          directions: item.directions ?? null,

          notes: item.notes ?? null,
        })),
      },
    },

    include: {
      patient: true,

      createdBy: true,

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
| Get Prescriptions
|--------------------------------------------------------------------------
*/

export async function getPrescriptions(pharmacyId: string) {
  return prisma.prescription.findMany({
    where: {
      pharmacyId,
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      patient: true,

      createdBy: true,

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
| Get One Prescription
|--------------------------------------------------------------------------
*/

export async function getPrescription(
  pharmacyId: string,
  prescriptionId: string,
) {
  return prisma.prescription.findFirst({
    where: {
      id: prescriptionId,
      pharmacyId,
    },

    include: {
      patient: true,

      createdBy: true,

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
| Update Prescription Status
|--------------------------------------------------------------------------
*/

export async function updatePrescriptionStatus(
  pharmacyId: string,
  prescriptionId: string,
  status: PrescriptionStatus,
) {
  const prescription = await prisma.prescription.findFirst({
    where: {
      id: prescriptionId,
      pharmacyId,
    },
  });

  if (!prescription) {
    throw new Error("Prescription not found");
  }

  const currentStatus = prescription.status as PrescriptionStatus;

  if (currentStatus === status) {
    return getPrescription(pharmacyId, prescriptionId);
  }

  if (currentStatus === "CANCELLED") {
    throw new Error("A cancelled prescription cannot be changed");
  }

  if (currentStatus === "DISPENSED") {
    throw new Error("A fully dispensed prescription cannot be changed");
  }

  if (currentStatus === "PENDING" && status === "DISPENSED") {
    throw new Error(
      "A pending prescription must be dispensed before it can be marked as fully dispensed",
    );
  }

  if (currentStatus === "PENDING" && status === "PARTIALLY_DISPENSED") {
    throw new Error(
      "Partial dispensing must be handled through the dispensing workflow",
    );
  }

  if (currentStatus === "PARTIALLY_DISPENSED" && status === "PENDING") {
    throw new Error(
      "A partially dispensed prescription cannot return to pending",
    );
  }

  if (currentStatus === "PARTIALLY_DISPENSED" && status === "CANCELLED") {
    throw new Error(
      "A partially dispensed prescription must be resolved before cancellation",
    );
  }

  return prisma.prescription.update({
    where: {
      id: prescription.id,
    },

    data: {
      status,
    },

    include: {
      patient: true,

      createdBy: true,

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
| Dispense Prescription
|--------------------------------------------------------------------------
|
| Concurrency protections:
|
| 1. Lock the prescription row with PostgreSQL FOR UPDATE.
|
| 2. Re-read the prescription after acquiring the lock.
|
| 3. Atomically decrement stock using:
|
|      currentQuantity >= requested
|      +
|      decrement requested
|
| 4. Keep the complete operation inside one transaction.
|
|--------------------------------------------------------------------------
*/

export async function dispensePrescription(
  pharmacyId: string,
  prescriptionId: string,
) {
  return prisma.$transaction(async (tx) => {
    /*
    |--------------------------------------------------------------------------
    | Lock prescription row
    |--------------------------------------------------------------------------
    |
    | Only one dispensing transaction for this prescription
    | can proceed at a time.
    |
    */

    await tx.$queryRaw`
      SELECT "id"
      FROM "Prescription"
      WHERE "id" = ${prescriptionId}
        AND "pharmacyId" = ${pharmacyId}
      FOR UPDATE
    `;

    /*
    |--------------------------------------------------------------------------
    | Re-read prescription after lock
    |--------------------------------------------------------------------------
    */

    const prescription = await tx.prescription.findFirst({
      where: {
        id: prescriptionId,
        pharmacyId,
      },

      include: {
        items: true,
      },
    });

    if (!prescription) {
      throw new Error("Prescription not found");
    }

    /*
    |--------------------------------------------------------------------------
    | Validate prescription status
    |--------------------------------------------------------------------------
    */

    if (prescription.status === "CANCELLED") {
      throw new Error("Cancelled prescription cannot be dispensed");
    }

    if (prescription.status === "DISPENSED") {
      throw new Error("Prescription has already been fully dispensed");
    }

    if (prescription.items.length === 0) {
      throw new Error("Prescription has no items");
    }

    /*
    |--------------------------------------------------------------------------
    | Calculate allocations
    |--------------------------------------------------------------------------
    */

    const allocations: Array<{
      itemId: string;
      medicineId: string;
      quantity: number;
      batchId: string;
    }> = [];

    for (const item of prescription.items) {
      const prescribed = Number(item.quantityPrescribed);

      const alreadyDispensed = Number(item.quantityDispensed);

      const remaining = prescribed - alreadyDispensed;

      if (remaining <= 0) {
        continue;
      }

      /*
      |--------------------------------------------------------------------------
      | Find available batches
      |--------------------------------------------------------------------------
      |
      | FEFO:
      | First Expired, First Out
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
            gte: new Date(),
          },
        },

        orderBy: {
          expiryDate: "asc",
        },
      });

      /*
      |--------------------------------------------------------------------------
      | Calculate available quantity
      |--------------------------------------------------------------------------
      */

      const available = batches.reduce(
        (total, batch) => total + Number(batch.currentQuantity),
        0,
      );

      if (available < remaining) {
        throw new Error(
          `Insufficient stock for medicine ${item.medicineId}. Required: ${remaining}, available: ${available}`,
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Allocate from batches
      |--------------------------------------------------------------------------
      */

      let remainingToAllocate = remaining;

      for (const batch of batches) {
        if (remainingToAllocate <= 0) {
          break;
        }

        const batchQuantity = Number(batch.currentQuantity);

        const allocation = Math.min(batchQuantity, remainingToAllocate);

        allocations.push({
          itemId: item.id,
          medicineId: item.medicineId,
          quantity: allocation,
          batchId: batch.id,
        });

        remainingToAllocate -= allocation;
      }

      /*
      |--------------------------------------------------------------------------
      | Sanity check
      |--------------------------------------------------------------------------
      */

      if (remainingToAllocate > 0) {
        throw new Error(
          `Unable to allocate sufficient stock for medicine ${item.medicineId}`,
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Deduct stock atomically
    |--------------------------------------------------------------------------
    */

    for (const allocation of allocations) {
      /*
      |--------------------------------------------------------------------------
      | Verify batch still belongs to pharmacy
      |--------------------------------------------------------------------------
      */

      const batch = await tx.batch.findFirst({
        where: {
          id: allocation.batchId,
          pharmacyId,
          medicineId: allocation.medicineId,
        },
      });

      if (!batch) {
        throw new Error("Batch not found during dispensing");
      }

      /*
      |--------------------------------------------------------------------------
      | ATOMIC STOCK DECREMENT
      |--------------------------------------------------------------------------
      |
      | PostgreSQL performs the stock check and decrement
      | as one atomic operation.
      |
      */

      const stockUpdate = await tx.batch.updateMany({
        where: {
          id: allocation.batchId,

          pharmacyId,

          medicineId: allocation.medicineId,

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
      | Verify atomic update
      |--------------------------------------------------------------------------
      */

      if (stockUpdate.count !== 1) {
        throw new Error("Insufficient stock while processing prescription");
      }

      /*
      |--------------------------------------------------------------------------
      | Create inventory audit transaction
      |--------------------------------------------------------------------------
      */

      await tx.inventoryTransaction.create({
        data: {
          pharmacyId,

          medicineId: allocation.medicineId,

          batchId: allocation.batchId,

          transactionType: "SALE",

          quantity: -allocation.quantity,

          referenceType: "SALE",

          referenceId: prescription.id,

          reason: `Prescription ${prescription.prescriptionNumber}`,

          createdById: prescription.createdById,
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Update quantityDispensed
    |--------------------------------------------------------------------------
    |
    | Because the prescription row is locked, another dispensing
    | request for the same prescription cannot calculate its
    | remaining quantity simultaneously.
    |
    */

    for (const item of prescription.items) {
      const prescribed = Number(item.quantityPrescribed);

      const alreadyDispensed = Number(item.quantityDispensed);

      const remaining = prescribed - alreadyDispensed;

      if (remaining <= 0) {
        continue;
      }

      await tx.prescriptionItem.update({
        where: {
          id: item.id,
        },

        data: {
          quantityDispensed: prescribed,
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Determine new prescription status
    |--------------------------------------------------------------------------
    */

    const updatedItems = await tx.prescriptionItem.findMany({
      where: {
        prescriptionId: prescription.id,
      },
    });

    const fullyDispensed = updatedItems.every(
      (item) =>
        Number(item.quantityDispensed) >= Number(item.quantityPrescribed),
    );

    const anyDispensed = updatedItems.some(
      (item) => Number(item.quantityDispensed) > 0,
    );

    const newStatus = fullyDispensed
      ? "DISPENSED"
      : anyDispensed
        ? "PARTIALLY_DISPENSED"
        : "PENDING";

    /*
    |--------------------------------------------------------------------------
    | Update prescription status
    |--------------------------------------------------------------------------
    */

    const updatedPrescription = await tx.prescription.update({
      where: {
        id: prescription.id,
      },

      data: {
        status: newStatus,
      },

      include: {
        patient: true,

        createdBy: true,

        items: {
          include: {
            medicine: true,
          },
        },
      },
    });

    return updatedPrescription;
  });
}

