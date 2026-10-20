import { Router } from "express";

import {
  createPrescriptionController,
  getPrescriptionsController,
  getPrescriptionController,
  updatePrescriptionStatusController,
  dispensePrescriptionController,
} from "./prescriptions.controller.js";

import { authenticate, requireRole } from "../../middleware/auth.middleware.js";

const router = Router();

router.post(
  "/",
  authenticate,
  requireRole("ADMIN", "PHARMACIST"),
  createPrescriptionController,
);

router.patch(
  "/:id/dispense",
  authenticate,
  requireRole("ADMIN", "PHARMACIST"),
  dispensePrescriptionController,
);
router.get(
  "/",
  authenticate,
  requireRole("ADMIN", "PHARMACIST"),
  getPrescriptionsController,
);

router.get(
  "/:id",
  authenticate,
  requireRole("ADMIN", "PHARMACIST"),
  getPrescriptionController,
);

router.patch(
  "/:id/status",
  authenticate,
  requireRole("ADMIN", "PHARMACIST"),
  updatePrescriptionStatusController,
);

export default router;
