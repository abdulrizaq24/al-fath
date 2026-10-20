import { Router } from "express";

import {
  createPatientController,
  getPatientController,
  getPatientsController,
} from "./patients.controller.js";

import { authenticate, requireRole } from "../../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requireRole("ADMIN", "PHARMACIST"),
  getPatientsController,
);

router.get(
  "/:id",
  authenticate,
  requireRole("ADMIN", "PHARMACIST"),
  getPatientController,
);

router.post(
  "/",
  authenticate,
  requireRole("ADMIN", "PHARMACIST"),
  createPatientController,
);

export default router;
