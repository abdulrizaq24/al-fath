import type { Request, Response } from "express";
import {
  createPurchase,
  getPurchases,
  receivePurchase,
} from "./purchases.service.js";

export async function createPurchaseController(req: Request, res: Response) {
  try {
    const { supplierId, purchaseNumber, expectedDate, notes, items } = req.body;

    if (
      !supplierId ||
      !purchaseNumber ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message:
          "Supplier, purchase number, and at least one item are required",
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

    const purchase = await createPurchase(
      authenticatedUser.pharmacyId,
      authenticatedUser.userId,
      {
        supplierId,
        purchaseNumber,

        ...(expectedDate !== undefined && {
          expectedDate,
        }),

        ...(notes !== undefined && {
          notes,
        }),

        items: items.map(
          (item: {
            medicineId: string;
            orderedQuantity: number;
            unitCost: number;
          }) => ({
            medicineId: item.medicineId,
            orderedQuantity: Number(item.orderedQuantity),
            unitCost: Number(item.unitCost),
          }),
        ),
      },
    );

    return res.status(201).json({
      message: "Purchase created successfully",
      purchase,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(400).json({
      message: "Unable to create purchase",
    });
  }
}

export async function getPurchasesController(req: Request, res: Response) {
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

    const purchases = await getPurchases(authenticatedUser.pharmacyId);

    return res.json({
      purchases,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Unable to retrieve purchases",
    });
  }
}

export async function receivePurchaseController(req: Request, res: Response) {
  try {
    const purchaseId = req.params.id;

    if (typeof purchaseId !== "string") {
      return res.status(400).json({
        message: "Invalid purchase ID",
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

    const { receiptNumber, items, notes } = req.body;

    if (!receiptNumber || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Receipt number and at least one item are required",
      });
    }

    const receipt = await receivePurchase(
      authenticatedUser.pharmacyId,
      authenticatedUser.userId,
      purchaseId,
      receiptNumber,
      items.map(
        (item: {
          purchaseItemId: string;
          batchNumber: string;
          expiryDate: string;
          quantityReceived: number;
        }) => ({
          purchaseItemId: item.purchaseItemId,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          quantityReceived: Number(item.quantityReceived),
        }),
      ),
      notes,
    );

    return res.status(201).json({
      message: "Purchase received successfully",
      receipt,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(400).json({
      message: "Unable to receive purchase",
    });
  }
}
