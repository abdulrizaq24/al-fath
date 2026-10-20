import type { Request, Response } from "express";
import { createSale, getSale, getSales } from "./sales.service.js";

type PaymentMethod =
  | "CASH"
  | "CARD"
  | "BANK_TRANSFER"
  | "MOBILE_PAYMENT"
  | "OTHER";

interface AuthenticatedUser {
  userId: string;
  pharmacyId: string;
  role: "ADMIN" | "PHARMACIST";
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export async function createSaleController(
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
      invoiceNumber,
      discount,
      tax,
      paymentMethod,
      transactionReference,
      items,
    } = req.body;

    if (typeof invoiceNumber !== "string" || !invoiceNumber.trim()) {
      return res.status(400).json({
        message: "Invoice number is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Sale must contain at least one item",
      });
    }

    if (patientId !== undefined && typeof patientId !== "string") {
      return res.status(400).json({
        message: "Invalid patient ID",
      });
    }

    if (
      discount !== undefined &&
      (typeof discount !== "number" || discount < 0)
    ) {
      return res.status(400).json({
        message: "Discount must be a non-negative number",
      });
    }

    if (tax !== undefined && (typeof tax !== "number" || tax < 0)) {
      return res.status(400).json({
        message: "Tax must be a non-negative number",
      });
    }

    const validPaymentMethods: PaymentMethod[] = [
      "CASH",
      "CARD",
      "BANK_TRANSFER",
      "MOBILE_PAYMENT",
      "OTHER",
    ];

    if (
      typeof paymentMethod !== "string" ||
      !validPaymentMethods.includes(paymentMethod as PaymentMethod)
    ) {
      return res.status(400).json({
        message: "Invalid payment method",
      });
    }

    if (
      transactionReference !== undefined &&
      typeof transactionReference !== "string"
    ) {
      return res.status(400).json({
        message: "Invalid transaction reference",
      });
    }

    for (const item of items) {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof item.medicineId !== "string" ||
        typeof item.quantity !== "number" ||
        typeof item.unitPrice !== "number"
      ) {
        return res.status(400).json({
          message:
            "Each sale item requires medicineId, quantity, and unitPrice",
        });
      }

      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        return res.status(400).json({
          message: "Sale item quantity must be greater than zero",
        });
      }

      if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
        return res.status(400).json({
          message: "Sale item unit price cannot be negative",
        });
      }

      if (
        item.discount !== undefined &&
        (typeof item.discount !== "number" ||
          !Number.isFinite(item.discount) ||
          item.discount < 0)
      ) {
        return res.status(400).json({
          message: "Sale item discount must be a non-negative number",
        });
      }
    }

    const sale = await createSale(
      authenticatedUser.pharmacyId,
      authenticatedUser.userId,
      {
        ...(patientId !== undefined && {
          patientId,
        }),

        invoiceNumber,

        ...(discount !== undefined && {
          discount,
        }),

        ...(tax !== undefined && {
          tax,
        }),

        paymentMethod: paymentMethod as PaymentMethod,

        ...(transactionReference !== undefined && {
          transactionReference,
        }),

        items,
      },
    );

    return res.status(201).json({
      message: "Sale created successfully",
      sale,
    });
  } catch (error) {
    console.error("Create sale error:", error);

    if (error instanceof Error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Unable to create sale",
    });
  }
}

export async function getSalesController(
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

    const sales = await getSales(authenticatedUser.pharmacyId);

    return res.json({
      sales,
    });
  } catch (error) {
    console.error("Get sales error:", error);

    return res.status(500).json({
      message: "Unable to retrieve sales",
    });
  }
}

export async function getSaleController(
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

    const saleId = req.params.id;

    if (typeof saleId !== "string" || !saleId.trim()) {
      return res.status(400).json({
        message: "Invalid sale ID",
      });
    }

    const sale = await getSale(authenticatedUser.pharmacyId, saleId);

    if (!sale) {
      return res.status(404).json({
        message: "Sale not found",
      });
    }

    return res.json({
      sale,
    });
  } catch (error) {
    console.error("Get sale error:", error);

    return res.status(500).json({
      message: "Unable to retrieve sale",
    });
  }
}
