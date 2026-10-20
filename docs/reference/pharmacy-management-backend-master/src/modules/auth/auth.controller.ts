import type { Request, Response } from "express";
import { login } from "./auth.service.js";

export async function loginController(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required",
      });
    }

    const result = await login(username, password);

    return res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(401).json({
        message: error.message,
      });
    }

    return res.status(401).json({
      message: "Authentication failed",
    });
  }
}

export function meController(req: Request, res: Response) {
  const user = (
    req as Request & {
      user?: {
        userId: string;
        pharmacyId: string;
        role: "ADMIN" | "PHARMACIST";
      };
    }
  ).user;

  return res.json({
    user,
  });
}
