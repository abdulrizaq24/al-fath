import { Router } from "express";

import {
  createSupplierController,
  getSuppliersController,
  updateSupplierController,
  updateSupplierStatusController,
} from "./suppliers.controller.js";

import { authenticate, requireRole } from "../../middleware/auth.middleware.js";

const router = Router();

router.post("/", authenticate, requireRole("ADMIN"), createSupplierController);

router.get(
  "/",
  authenticate,
  requireRole("ADMIN", "PHARMACIST"),
  getSuppliersController,
);

router.patch(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  updateSupplierController,
);

router.patch(
  "/:id/status",
  authenticate,
  requireRole("ADMIN"),
  updateSupplierStatusController,
);

export default router;
