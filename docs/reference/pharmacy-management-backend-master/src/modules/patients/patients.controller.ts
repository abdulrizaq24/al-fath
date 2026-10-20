import type { Request, Response } from "express";
import { prisma } from "../../config/prisma.js";

interface AuthenticatedUser {
  userId: string;
  pharmacyId: string;
  role: "ADMIN" | "PHARMACIST";
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export async function getPatientsController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const patients = await prisma.patient.findMany({
      where: {
        pharmacyId: user.pharmacyId,
      },

      orderBy: [
        {
          firstName: "asc",
        },
        {
          lastName: "asc",
        },
      ],

      select: {
        id: true,
        patientNumber: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        sex: true,
        phone: true,
        address: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      patients: patients.map((patient) => ({
        ...patient,
        name: `${patient.firstName} ${patient.lastName ?? ""}`.trim(),
      })),
    });
  } catch (error) {
    console.error("Get patients error:", error);

    return res.status(500).json({
      message: "Unable to load patients",
    });
  }
}

export async function getPatientController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const patientId = req.params.id;

    if (typeof patientId !== "string") {
      return res.status(400).json({
        message: "Invalid patient ID",
      });
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        pharmacyId: user.pharmacyId,
      },

      include: {
        prescriptions: {
          orderBy: {
            createdAt: "desc",
          },

          select: {
            id: true,
            prescriptionNumber: true,
            prescriberName: true,
            prescriptionDate: true,
            status: true,
            notes: true,
            createdAt: true,
          },
        },
      },
    });

    if (!patient) {
      return res.status(404).json({
        message: "Patient not found",
      });
    }

    return res.status(200).json({
      patient: {
        ...patient,
        name: `${patient.firstName} ${patient.lastName ?? ""}`.trim(),
      },
    });
  } catch (error) {
    console.error("Get patient error:", error);

    return res.status(500).json({
      message: "Unable to load patient",
    });
  }
}

export async function createPatientController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const {
      patientNumber,
      firstName,
      lastName,
      dateOfBirth,
      sex,
      phone,
      address,
      notes,
    } = req.body;

    if (typeof patientNumber !== "string" || !patientNumber.trim()) {
      return res.status(400).json({
        message: "Patient number is required",
      });
    }

    if (typeof firstName !== "string" || !firstName.trim()) {
      return res.status(400).json({
        message: "First name is required",
      });
    }

    const existingPatient = await prisma.patient.findFirst({
      where: {
        pharmacyId: user.pharmacyId,
        patientNumber: patientNumber.trim(),
      },
      select: {
        id: true,
      },
    });

    if (existingPatient) {
      return res.status(409).json({
        message: "A patient with this patient number already exists",
      });
    }

    const patient = await prisma.patient.create({
      data: {
        pharmacyId: user.pharmacyId,
        patientNumber: patientNumber.trim(),
        firstName: firstName.trim(),
        lastName:
          typeof lastName === "string" && lastName.trim()
            ? lastName.trim()
            : null,
        dateOfBirth:
          typeof dateOfBirth === "string" && dateOfBirth.trim()
            ? new Date(dateOfBirth)
            : null,
        sex: typeof sex === "string" && sex.trim() ? sex.trim() : null,
        phone: typeof phone === "string" && phone.trim() ? phone.trim() : null,
        address:
          typeof address === "string" && address.trim() ? address.trim() : null,
        notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
      },

      select: {
        id: true,
        patientNumber: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        sex: true,
        phone: true,
        address: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(201).json({
      message: "Patient created successfully",

      patient: {
        ...patient,
        name: `${patient.firstName} ${patient.lastName ?? ""}`.trim(),
      },
    });
  } catch (error) {
    console.error("Create patient error:", error);

    return res.status(500).json({
      message: "Unable to create patient",
    });
  }
}
