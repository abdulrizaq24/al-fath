import { Router } from "express";
import {
  createPurchaseController,
  getPurchasesController,
  receivePurchaseController,
} from "./purchases.controller.js";
import { authenticate, requireRole } from "../../middleware/auth.middleware.js";

const router = Router();

router.post(
  "/",
  authenticate,
  requireRole("ADMIN", "PHARMACIST"),
  createPurchaseController,
);

router.get(
  "/",
  authenticate,
  requireRole("ADMIN", "PHARMACIST"),
  getPurchasesController,
);

router.post(
  "/:id/receive",
  authenticate,
  requireRole("ADMIN", "PHARMACIST"),
  receivePurchaseController,
);

export default router;
