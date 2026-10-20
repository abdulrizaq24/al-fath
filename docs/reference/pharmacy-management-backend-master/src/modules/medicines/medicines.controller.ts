import type { Request, Response } from "express";
import {
  createMedicine,
  getMedicines,
  getMedicineById,
  updateMedicine,
} from "./medicines.service.js";

export async function createMedicineController(req: Request, res: Response) {
  try {
    const {
      categoryId,
      name,
      genericName,
      brandName,
      manufacturer,
      dosageForm,
      strength,
      baseUnit,
      prescriptionStatus,
      sellingPrice,
      reorderLevel,
      barcode,
      notes,
      
    } = req.body;

    if (
      !categoryId ||
      !name ||
      !dosageForm ||
      !baseUnit ||
      sellingPrice === undefined
    ) {
      return res.status(400).json({
        message:
          "Category, name, dosage form, base unit, and selling price are required",
      });
    }

    const authenticatedUser = (
      req as Request & {
        user?: {
          userId: string;
          pharmacyId: string;
          role: "ADMIN" | "PHARMACIST";
        };
      }
    ).user;

    if (!authenticatedUser) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const medicine = await createMedicine(authenticatedUser.pharmacyId, {
      categoryId,
      name,

      ...(genericName !== undefined && {
        genericName,
      }),

      ...(brandName !== undefined && {
        brandName,
      }),

      ...(manufacturer !== undefined && {
        manufacturer,
      }),

      dosageForm,

      ...(strength !== undefined && {
        strength,
      }),

      baseUnit,

      ...(prescriptionStatus !== undefined && {
        prescriptionStatus,
      }),

      sellingPrice: Number(sellingPrice),

      ...(reorderLevel !== undefined && {
        reorderLevel: Number(reorderLevel),
      }),

      ...(barcode !== undefined && {
        barcode,
      }),

      ...(notes !== undefined && {
        notes,
      }),
    });

    return res.status(201).json({
      message: "Medicine created successfully",
      medicine,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(400).json({
      message: "Unable to create medicine",
    });
  }
}

export async function getMedicinesController(req: Request, res: Response) {
  try {
    const authenticatedUser = (
      req as Request & {
        user?: {
          userId: string;
          pharmacyId: string;
          role: "ADMIN" | "PHARMACIST";
        };
      }
    ).user;

    if (!authenticatedUser) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const medicines = await getMedicines(authenticatedUser.pharmacyId);

    return res.json({
      medicines,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Unable to retrieve medicines",
    });
  }
}
export async function getMedicineByIdController(req: Request, res: Response) {
  try {
    const authenticatedUser = (
      req as Request & {
        user?: {
          userId: string;
          pharmacyId: string;
          role: "ADMIN" | "PHARMACIST";
        };
      }
    ).user;

    if (!authenticatedUser) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const medicineId = req.params.id;

    if (typeof medicineId !== "string") {
      return res.status(400).json({
        message: "Invalid medicine ID",
      });
    }

    const medicine = await getMedicineById(
      authenticatedUser.pharmacyId,
      medicineId,
    );

    if (!medicine) {
      return res.status(404).json({
        message: "Medicine not found",
      });
    }

    return res.json({
      medicine,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Unable to retrieve medicine",
    });
  }
}

export async function updateMedicineController(req: Request, res: Response) {
  try {
    const medicineId = req.params.id;

    if (typeof medicineId !== "string") {
      return res.status(400).json({
        message: "Invalid medicine ID",
      });
    }

    const authenticatedUser = (
      req as Request & {
        user?: {
          userId: string;
          pharmacyId: string;
          role: "ADMIN" | "PHARMACIST";
        };
      }
    ).user;

    if (!authenticatedUser) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const {
      categoryId,
      name,
      genericName,
      brandName,
      manufacturer,
      dosageForm,
      strength,
      baseUnit,
      prescriptionStatus,
      sellingPrice,
      reorderLevel,
      barcode,
      notes,
    } = req.body;

    const medicine = await updateMedicine(
      authenticatedUser.pharmacyId,
      medicineId,
      {
        ...(categoryId !== undefined && { categoryId }),
        ...(name !== undefined && { name }),
        ...(genericName !== undefined && { genericName }),
        ...(brandName !== undefined && { brandName }),
        ...(manufacturer !== undefined && { manufacturer }),
        ...(dosageForm !== undefined && { dosageForm }),
        ...(strength !== undefined && { strength }),
        ...(baseUnit !== undefined && { baseUnit }),
        ...(prescriptionStatus !== undefined && {
          prescriptionStatus,
        }),
        ...(sellingPrice !== undefined && {
          sellingPrice: Number(sellingPrice),
        }),
        ...(reorderLevel !== undefined && {
          reorderLevel: Number(reorderLevel),
        }),
        ...(barcode !== undefined && { barcode }),
        ...(notes !== undefined && { notes }),
      },
    );

    return res.json({
      message: "Medicine updated successfully",
      medicine,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(400).json({
      message: "Unable to update medicine",
    });
  }
}
