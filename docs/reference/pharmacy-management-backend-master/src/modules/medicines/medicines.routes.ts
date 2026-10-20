import { Router } from "express";

import {
  createMedicineController,
  getMedicinesController,
  getMedicineByIdController,
  updateMedicineController,
} from "./medicines.controller.js";

import { authenticate, requireRole } from "../../middleware/auth.middleware.js";

const router = Router();

router.post("/", authenticate, requireRole("ADMIN"), createMedicineController);

router.get(
  "/",
  authenticate,
  requireRole("ADMIN", "PHARMACIST"),
  getMedicinesController,
);

router.get(
  "/:id",
  authenticate,
  requireRole("ADMIN", "PHARMACIST"),
  getMedicineByIdController,
);

router.patch(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  updateMedicineController,
);

export default router;
