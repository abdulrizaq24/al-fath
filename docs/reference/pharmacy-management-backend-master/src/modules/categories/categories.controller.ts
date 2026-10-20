import type { Request, Response } from "express";
import { createCategory, getCategories } from "./categories.service.js";

export async function createCategoryController(req: Request, res: Response) {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Category name is required",
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

    const category = await createCategory(
      authenticatedUser.pharmacyId,
      name,
      description,
    );

    return res.status(201).json({
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(400).json({
      message: "Unable to create category",
    });
  }
}

export async function getCategoriesController(req: Request, res: Response) {
  try {
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

    const categories = await getCategories(authenticatedUser.pharmacyId);

    return res.json({
      categories,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Unable to retrieve categories",
    });
  }
}
