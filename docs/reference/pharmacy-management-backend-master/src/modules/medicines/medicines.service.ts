import { prisma } from "../../config/prisma.js";

interface CreateMedicineInput {
  categoryId: string;
  name: string;
  genericName?: string;
  brandName?: string;
  manufacturer?: string;
  dosageForm: string;
  strength?: string;
  baseUnit: string;
  prescriptionStatus?: "OTC" | "PRESCRIPTION" | "CONTROLLED";
  sellingPrice: number;
  reorderLevel?: number;
  barcode?: string;
  notes?: string;
}

export async function createMedicine(
  pharmacyId: string,
  data: CreateMedicineInput,
) {
  const category = await prisma.category.findFirst({
    where: {
      id: data.categoryId,
      pharmacyId,
      isActive: true,
    },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  if (data.barcode) {
    const existingMedicine = await prisma.medicine.findFirst({
      where: {
        pharmacyId,
        barcode: data.barcode,
      },
    });

    if (existingMedicine) {
      throw new Error("Barcode already exists");
    }
  }

  return prisma.medicine.create({
    data: {
      pharmacyId,
      categoryId: data.categoryId,
      name: data.name,
      dosageForm: data.dosageForm,
      baseUnit: data.baseUnit,
      prescriptionStatus: data.prescriptionStatus ?? "OTC",
      sellingPrice: data.sellingPrice,
      reorderLevel: data.reorderLevel ?? 0,

      ...(data.genericName !== undefined && {
        genericName: data.genericName,
      }),

      ...(data.brandName !== undefined && {
        brandName: data.brandName,
      }),

      ...(data.manufacturer !== undefined && {
        manufacturer: data.manufacturer,
      }),

      ...(data.strength !== undefined && {
        strength: data.strength,
      }),

      ...(data.barcode !== undefined && {
        barcode: data.barcode,
      }),

      ...(data.notes !== undefined && {
        notes: data.notes,
      }),
    },
    include: {
      category: true,
    },
  });
}

export async function getMedicines(pharmacyId: string) {
  return prisma.medicine.findMany({
    where: {
      pharmacyId,
      isActive: true,
    },
    include: {
      category: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function getMedicineById(pharmacyId: string, medicineId: string) {
  return prisma.medicine.findFirst({
    where: {
      id: medicineId,
      pharmacyId,
    },
    include: {
      category: true,
      packages: true,
      batches: {
        orderBy: {
          expiryDate: "asc",
        },
      },
    },
  });
}

export async function updateMedicine(
  pharmacyId: string,
  medicineId: string,
  data: {
    categoryId?: string;
    name?: string;
    genericName?: string;
    brandName?: string;
    manufacturer?: string;
    dosageForm?: string;
    strength?: string;
    baseUnit?: string;
    prescriptionStatus?: "OTC" | "PRESCRIPTION" | "CONTROLLED";
    sellingPrice?: number;
    reorderLevel?: number;
    barcode?: string;
    notes?: string;
  },
) {
  const existingMedicine = await prisma.medicine.findFirst({
    where: {
      id: medicineId,
      pharmacyId,
    },
  });

  if (!existingMedicine) {
    throw new Error("Medicine not found");
  }

  if (data.categoryId !== undefined) {
    const category = await prisma.category.findFirst({
      where: {
        id: data.categoryId,
        pharmacyId,
        isActive: true,
      },
    });

    if (!category) {
      throw new Error("Category not found");
    }
  }

  if (data.barcode !== undefined && data.barcode !== existingMedicine.barcode) {
    const barcodeExists = await prisma.medicine.findFirst({
      where: {
        pharmacyId,
        barcode: data.barcode,
        NOT: {
          id: medicineId,
        },
      },
    });

    if (barcodeExists) {
      throw new Error("Barcode already exists");
    }
  }

  return prisma.medicine.update({
    where: {
      id: medicineId,
    },
    data: {
      ...(data.categoryId !== undefined && {
        categoryId: data.categoryId,
      }),
      ...(data.name !== undefined && {
        name: data.name,
      }),
      ...(data.genericName !== undefined && {
        genericName: data.genericName,
      }),
      ...(data.brandName !== undefined && {
        brandName: data.brandName,
      }),
      ...(data.manufacturer !== undefined && {
        manufacturer: data.manufacturer,
      }),
      ...(data.dosageForm !== undefined && {
        dosageForm: data.dosageForm,
      }),
      ...(data.strength !== undefined && {
        strength: data.strength,
      }),
      ...(data.baseUnit !== undefined && {
        baseUnit: data.baseUnit,
      }),
      ...(data.prescriptionStatus !== undefined && {
        prescriptionStatus: data.prescriptionStatus,
      }),
      ...(data.sellingPrice !== undefined && {
        sellingPrice: data.sellingPrice,
      }),
      ...(data.reorderLevel !== undefined && {
        reorderLevel: data.reorderLevel,
      }),
      ...(data.barcode !== undefined && {
        barcode: data.barcode,
      }),
      ...(data.notes !== undefined && {
        notes: data.notes,
      }),
    },
    include: {
      category: true,
    },
  });
}

