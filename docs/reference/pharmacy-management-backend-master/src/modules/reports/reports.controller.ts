import type { Request, Response } from "express";
import { getDashboardStatistics } from "./reports.service.js";
import { getReportsAnalytics } from "./reports.analytics.service.js";

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    pharmacyId: string;
    role: "ADMIN" | "PHARMACIST";
  };
}

export async function getDashboardStatisticsController(
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

    const dashboard = await getDashboardStatistics(
      authenticatedUser.pharmacyId,
    );

    return res.json({
      dashboard,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Unable to retrieve dashboard statistics",
    });
  }
}

export async function getReportsAnalyticsController(
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

    const fromParam =
      typeof req.query.from === "string" ? req.query.from : undefined;

    const toParam = typeof req.query.to === "string" ? req.query.to : undefined;

    if (!fromParam || !toParam) {
      return res.status(400).json({
        message: "Both from and to dates are required",
      });
    }

    const from = new Date(`${fromParam}T00:00:00`);

    const to = new Date(`${toParam}T00:00:00`);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return res.status(400).json({
        message: "Invalid date range",
      });
    }

    if (from >= to) {
      return res.status(400).json({
        message: "The from date must be before the to date",
      });
    }

    // Include the complete "to" date.
    to.setDate(to.getDate() + 1);

    const analytics = await getReportsAnalytics(authenticatedUser.pharmacyId, {
      from,
      to,
    });

    return res.json({
      analytics,
    });
  } catch (error) {
    console.error("Get reports analytics error:", error);

    if (error instanceof Error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Unable to retrieve reports analytics",
    });
  }
}
