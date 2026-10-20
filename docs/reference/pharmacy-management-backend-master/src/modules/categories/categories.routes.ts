import { Router } from "express";
import {
  createCategoryController,
  getCategoriesController,
} from "./categories.controller.js";
import { authenticate, requireRole } from "../../middleware/auth.middleware.js";

const router = Router();

router.post("/", authenticate, requireRole("ADMIN"), createCategoryController);

router.get("/", authenticate, getCategoriesController);

export default router;
