import { Router } from "express";
import { createPharmacistController } from "./users.controller.js";
import { authenticate, requireRole } from "../../middleware/auth.middleware.js";

const router = Router();

router.post(
  "/pharmacists",
  authenticate,
  requireRole("ADMIN"),
  createPharmacistController,
);

export default router;
