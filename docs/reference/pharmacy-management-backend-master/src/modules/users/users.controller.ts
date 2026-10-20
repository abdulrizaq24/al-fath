import type { Request, Response } from "express";
import { createPharmacist } from "./users.service.js";

export async function createPharmacistController(req: Request, res: Response) {
  try {
    const { name, username, password } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({
        message: "Name, username, and password are required",
      });
    }

    const authenticatedUser = (
      req as Request & {
        user?: {
          userId: string;
          pharmacyId: string;
          role: "ADMIN" | "PHARMACIST";
        };
      }
    ).user;

    if (!authenticatedUser) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const pharmacist = await createPharmacist(
      authenticatedUser.pharmacyId,
      name,
      username,
      password,
    );

    return res.status(201).json({
      message: "Pharmacist created successfully",
      user: pharmacist,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(400).json({
      message: "Unable to create pharmacist",
    });
  }
}
