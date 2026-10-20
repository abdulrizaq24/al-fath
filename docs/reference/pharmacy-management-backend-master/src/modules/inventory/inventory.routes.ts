import { Router } from "express";
import {
  getInventoryController,
  getLowStockController,
  getExpiringInventoryController,
  getExpiredInventoryController,
  adjustStockController,
  getInventoryTransactionsController,
} from "./inventory.controller.js";
import { authenticate, requireRole } from "../../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requireRole("ADMIN", "PHARMACIST"),
  getInventoryController,
);

router.get(
  "/low-stock",
  authenticate,
  requireRole("ADMIN", "PHARMACIST"),
  getLowStockController,
);

router.get(
  "/expiring",
  authenticate,
  requireRole("ADMIN", "PHARMACIST"),
  getExpiringInventoryController,
);

router.get(
  "/expired",
  authenticate,
  requireRole("ADMIN", "PHARMACIST"),
  getExpiredInventoryController,
);

router.post(
  "/adjust",
  authenticate,
  requireRole("ADMIN", "PHARMACIST"),
  adjustStockController,
);

router.get(
  "/transactions",
  authenticate,
  requireRole("ADMIN", "PHARMACIST"),
  getInventoryTransactionsController,
);

export default router;
