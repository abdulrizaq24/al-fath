import type { Request, Response } from "express";

import {
  createPrescription,
  getPrescription,
  getPrescriptions,
  updatePrescriptionStatus,
  dispensePrescription,
  type PrescriptionStatus,
} from "./prescriptions.service.js";

interface AuthenticatedUser {
  userId: string;
  pharmacyId: string;
  role: "ADMIN" | "PHARMACIST";
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export async function createPrescriptionController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const authenticatedUser = req.user;

    if (!authenticatedUser) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const {
      patientId,
      prescriptionNumber,
      prescriberName,
      prescriptionDate,
      notes,
      items,
    } = req.body;

    if (typeof patientId !== "string" || !patientId.trim()) {
      return res.status(400).json({
        message: "Patient ID is required",
      });
    }

    if (typeof prescriptionNumber !== "string" || !prescriptionNumber.trim()) {
      return res.status(400).json({
        message: "Prescription number is required",
      });
    }

    if (typeof prescriberName !== "string" || !prescriberName.trim()) {
      return res.status(400).json({
        message: "Prescriber name is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Prescription must contain at least one item",
      });
    }

    if (
      prescriptionDate !== undefined &&
      (typeof prescriptionDate !== "string" ||
        Number.isNaN(new Date(prescriptionDate).getTime()))
    ) {
      return res.status(400).json({
        message: "Invalid prescription date",
      });
    }

    if (notes !== undefined && notes !== null && typeof notes !== "string") {
      return res.status(400).json({
        message: "Invalid prescription notes",
      });
    }

    for (const item of items) {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof item.medicineId !== "string" ||
        !item.medicineId.trim() ||
        typeof item.quantity !== "number"
      ) {
        return res.status(400).json({
          message: "Each prescription item requires medicineId and quantity",
        });
      }

      if (
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0 ||
        !Number.isInteger(item.quantity)
      ) {
        return res.status(400).json({
          message: "Prescription quantity must be a positive whole number",
        });
      }

      if (
        item.directions !== undefined &&
        item.directions !== null &&
        typeof item.directions !== "string"
      ) {
        return res.status(400).json({
          message: "Invalid medicine directions",
        });
      }

      if (
        item.notes !== undefined &&
        item.notes !== null &&
        typeof item.notes !== "string"
      ) {
        return res.status(400).json({
          message: "Invalid prescription item notes",
        });
      }
    }

    const prescription = await createPrescription(
      authenticatedUser.pharmacyId,
      authenticatedUser.userId,
      {
        patientId,
        prescriptionNumber,
        prescriberName,
        prescriptionDate:
          prescriptionDate !== undefined
            ? new Date(prescriptionDate)
            : new Date(),
        notes,
        items,
      },
    );

    return res.status(201).json({
      message: "Prescription created successfully",
      prescription,
    });
  } catch (error) {
    console.error("Create prescription error:", error);

    if (error instanceof Error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Unable to create prescription",
    });
  }
}

export async function getPrescriptionsController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const authenticatedUser = req.user;

    if (!authenticatedUser) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const prescriptions = await getPrescriptions(authenticatedUser.pharmacyId);

    return res.status(200).json({
      prescriptions,
    });
  } catch (error) {
    console.error("Get prescriptions error:", error);

    return res.status(500).json({
      message: "Unable to load prescriptions",
    });
  }
}

export async function getPrescriptionController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const authenticatedUser = req.user;

    if (!authenticatedUser) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const prescriptionId = req.params.id;

    if (typeof prescriptionId !== "string" || !prescriptionId.trim()) {
      return res.status(400).json({
        message: "Prescription ID is required",
      });
    }

    const prescription = await getPrescription(
      authenticatedUser.pharmacyId,
      prescriptionId,
    );

    if (!prescription) {
      return res.status(404).json({
        message: "Prescription not found",
      });
    }

    return res.status(200).json({
      prescription,
    });
  } catch (error) {
    console.error("Get prescription error:", error);

    return res.status(500).json({
      message: "Unable to load prescription",
    });
  }
}

export async function updatePrescriptionStatusController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const authenticatedUser = req.user;

    if (!authenticatedUser) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const prescriptionId = req.params.id;

    if (typeof prescriptionId !== "string" || !prescriptionId.trim()) {
      return res.status(400).json({
        message: "Prescription ID is required",
      });
    }

    const { status } = req.body;

    const validStatuses: PrescriptionStatus[] = [
      "PENDING",
      "PARTIALLY_DISPENSED",
      "DISPENSED",
      "CANCELLED",
    ];

    if (
      typeof status !== "string" ||
      !validStatuses.includes(status as PrescriptionStatus)
    ) {
      return res.status(400).json({
        message: "Invalid prescription status",
      });
    }

    const prescription = await updatePrescriptionStatus(
      authenticatedUser.pharmacyId,
      prescriptionId,
      status as PrescriptionStatus,
    );

    return res.status(200).json({
      message: "Prescription status updated successfully",
      prescription,
    });
  } catch (error) {
    console.error("Update prescription status error:", error);

    if (error instanceof Error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Unable to update prescription status",
    });
  }
}

export async function dispensePrescriptionController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const authenticatedUser = req.user;

    if (!authenticatedUser) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const prescriptionId = req.params.id;

    if (typeof prescriptionId !== "string" || !prescriptionId.trim()) {
      return res.status(400).json({
        message: "Prescription ID is required",
      });
    }

    const prescription = await dispensePrescription(
      authenticatedUser.pharmacyId,
      prescriptionId,
    );

    return res.status(200).json({
      message: "Prescription dispensed successfully",
      prescription,
    });
  } catch (error) {
    console.error("Dispense prescription error:", error);

    if (error instanceof Error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Unable to dispense prescription",
    });
  }
}
