import type { Request, Response } from "express";

import {
  createSupplier,
  getSuppliers,
  updateSupplier,
  updateSupplierStatus,
} from "./suppliers.service.js";

interface AuthenticatedUser {
  userId: string;
  pharmacyId: string;
  role: "ADMIN" | "PHARMACIST";
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export async function createSupplierController(
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

    const { name, contactPerson, phone, email, address, notes } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Supplier name is required",
      });
    }

    const supplier = await createSupplier(authenticatedUser.pharmacyId, {
      name: name.trim(),

      ...(contactPerson !== undefined && {
        contactPerson,
      }),

      ...(phone !== undefined && {
        phone,
      }),

      ...(email !== undefined && {
        email,
      }),

      ...(address !== undefined && {
        address,
      }),

      ...(notes !== undefined && {
        notes,
      }),
    });

    return res.status(201).json({
      message: "Supplier created successfully",
      supplier,
    });
  } catch (error) {
    console.error("Create supplier error:", error);

    if (error instanceof Error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Unable to create supplier",
    });
  }
}

export async function getSuppliersController(
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

    const suppliers = await getSuppliers(authenticatedUser.pharmacyId);

    return res.status(200).json({
      suppliers,
    });
  } catch (error) {
    console.error("Get suppliers error:", error);

    return res.status(500).json({
      message: "Unable to retrieve suppliers",
    });
  }
}

export async function updateSupplierController(
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

    const supplierId = req.params.id;

    if (typeof supplierId !== "string" || !supplierId.trim()) {
      return res.status(400).json({
        message: "Supplier ID is required",
      });
    }

    const { name, contactPerson, phone, email, address, notes } = req.body;

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return res.status(400).json({
        message: "Supplier name cannot be empty",
      });
    }

    if (contactPerson !== undefined && typeof contactPerson !== "string") {
      return res.status(400).json({
        message: "Invalid contact person",
      });
    }

    if (phone !== undefined && typeof phone !== "string") {
      return res.status(400).json({
        message: "Invalid phone number",
      });
    }

    if (email !== undefined && typeof email !== "string") {
      return res.status(400).json({
        message: "Invalid email",
      });
    }

    if (address !== undefined && typeof address !== "string") {
      return res.status(400).json({
        message: "Invalid address",
      });
    }

    if (notes !== undefined && typeof notes !== "string") {
      return res.status(400).json({
        message: "Invalid notes",
      });
    }

    const supplier = await updateSupplier(
      authenticatedUser.pharmacyId,
      supplierId,
      {
        ...(name !== undefined && {
          name: name.trim(),
        }),

        ...(contactPerson !== undefined && {
          contactPerson,
        }),

        ...(phone !== undefined && {
          phone,
        }),

        ...(email !== undefined && {
          email,
        }),

        ...(address !== undefined && {
          address,
        }),

        ...(notes !== undefined && {
          notes,
        }),
      },
    );

    return res.status(200).json({
      message: "Supplier updated successfully",
      supplier,
    });
  } catch (error) {
    console.error("Update supplier error:", error);

    if (error instanceof Error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Unable to update supplier",
    });
  }
}

export async function updateSupplierStatusController(
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

    const supplierId = req.params.id;

    if (typeof supplierId !== "string" || !supplierId.trim()) {
      return res.status(400).json({
        message: "Supplier ID is required",
      });
    }

    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive must be a boolean",
      });
    }

    const supplier = await updateSupplierStatus(
      authenticatedUser.pharmacyId,
      supplierId,
      isActive,
    );

    return res.status(200).json({
      message: "Supplier status updated successfully",
      supplier,
    });
  } catch (error) {
    console.error("Update supplier status error:", error);

    if (error instanceof Error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Unable to update supplier status",
    });
  }
}
