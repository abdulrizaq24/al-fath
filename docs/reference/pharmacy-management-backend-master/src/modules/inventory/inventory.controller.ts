import type { Request, Response } from "express";
import {
  getInventory,
  getLowStockMedicines,
  getExpiringInventory,
  getExpiredInventory,
  adjustStock,
  getInventoryTransactions,
} from "./inventory.service.js";

export async function getInventoryController(req: Request, res: Response) {
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

    const inventory = await getInventory(authenticatedUser.pharmacyId);

    return res.json({
      inventory,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Unable to retrieve inventory",
    });
  }
}

export async function getLowStockController(req: Request, res: Response) {
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

    const lowStock = await getLowStockMedicines(authenticatedUser.pharmacyId);

    return res.json({
      lowStock,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Unable to retrieve low-stock medicines",
    });
  }
}

export async function getExpiringInventoryController(
  req: Request,
  res: Response,
) {
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

    const daysParam = req.query.days;

    let days = 90;

    if (daysParam !== undefined) {
      const parsedDays = Number(daysParam);

      if (!Number.isInteger(parsedDays) || parsedDays <= 0) {
        return res.status(400).json({
          message: "Days must be a positive integer",
        });
      }

      days = parsedDays;
    }

    const expiringInventory = await getExpiringInventory(
      authenticatedUser.pharmacyId,
      days,
    );

    return res.json({
      days,
      expiringInventory,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "Unable to retrieve expiring inventory",
    });
  }
}

export async function getExpiredInventoryController(
  req: Request,
  res: Response,
) {
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

    const expiredInventory = await getExpiredInventory(
      authenticatedUser.pharmacyId,
    );

    return res.json({
      expiredInventory,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Unable to retrieve expired inventory",
    });
  }
}

export async function adjustStockController(req: Request, res: Response) {
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

    const { batchId, quantity, reason } = req.body;

    if (!batchId) {
      return res.status(400).json({
        message: "Batch ID is required",
      });
    }

    if (quantity === undefined || Number(quantity) === 0) {
      return res.status(400).json({
        message: "Adjustment quantity must be greater than or less than zero",
      });
    }

    if (typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({
        message: "Adjustment reason is required",
      });
    }

    const updatedBatch = await adjustStock(
      authenticatedUser.pharmacyId,
      authenticatedUser.userId,
      {
        batchId,
        quantity: Number(quantity),
        reason,
      },
    );

    return res.status(200).json({
      message: "Stock adjusted successfully",
      batch: updatedBatch,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "Unable to adjust stock",
    });
  }
}

export async function getInventoryTransactionsController(
  req: Request,
  res: Response,
) {
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

    const medicineId =
      typeof req.query.medicineId === "string"
        ? req.query.medicineId
        : undefined;

    const batchId =
      typeof req.query.batchId === "string" ? req.query.batchId : undefined;

    const filters: {
      medicineId?: string;
      batchId?: string;
    } = {};

    if (medicineId !== undefined) {
      filters.medicineId = medicineId;
    }

    if (batchId !== undefined) {
      filters.batchId = batchId;
    }

    const transactions = await getInventoryTransactions(
      authenticatedUser.pharmacyId,
      filters,
    );

    return res.json({
      transactions,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Unable to retrieve inventory transactions",
    });
  }
}
