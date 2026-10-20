import { Router } from "express";

import {
  getDashboardStatisticsController,
  getReportsAnalyticsController,
} from "./reports.controller.js";

import { authenticate, requireRole } from "../../middleware/auth.middleware.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| Dashboard
|--------------------------------------------------------------------------
*/

router.get(
  "/dashboard",
  authenticate,
  requireRole("ADMIN", "PHARMACIST"),
  getDashboardStatisticsController,
);

/*
|--------------------------------------------------------------------------
| Analytical Reports
|--------------------------------------------------------------------------
|
| Example:
|
| GET /api/reports/analytics?from=2026-08-01&to=2026-08-23
|
*/

router.get(
  "/analytics",
  authenticate,
  requireRole("ADMIN"),
  getReportsAnalyticsController,
);

export default router;
  