import { Router } from "express";

import {
  createSaleController,
  getSalesController,
  getSaleController,
} from "./sales.controller.js";

import { authenticate, requireRole } from "../../middleware/auth.middleware.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| Create Sale
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  authenticate,
  requireRole("ADMIN", "PHARMACIST"),
  createSaleController,
);

/*
|--------------------------------------------------------------------------
| Get Sales
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  authenticate,
  requireRole("ADMIN", "PHARMACIST"),
  getSalesController,
);

/*
|--------------------------------------------------------------------------
| Get Sale Details
|--------------------------------------------------------------------------
|
| IMPORTANT:
| This route must come AFTER GET "/"
| and uses the dynamic :id parameter.
|
*/

router.get(
  "/:id",
  authenticate,
  requireRole("ADMIN", "PHARMACIST"),
  getSaleController,
);

export default router;
