import prescriptionsRoutes from "./modules/prescriptions/prescriptions.routes.js";
import patientsRoutes from "./modules/patients/patients.routes.js";
import reportsRoutes from "./modules/reports/reports.routes.js";
import salesRoutes from "./modules/sales/sales.routes.js";
import inventoryRoutes from "./modules/inventory/inventory.routes.js";
import purchasesRoutes from "./modules/purchases/purchases.routes.js";
import suppliersRoutes from "./modules/suppliers/suppliers.routes.js";
import medicinesRoutes from "./modules/medicines/medicines.routes.js";
import categoriesRoutes from "./modules/categories/categories.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";

import { prisma } from "./config/prisma.js";

import express from "express";
import cors from "cors";
import helmet from "helmet";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/medicines", medicinesRoutes);
app.use("/api/suppliers", suppliersRoutes);
app.use("/api/purchases", purchasesRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/prescriptions", prescriptionsRoutes);
app.use("/api/patients", patientsRoutes);

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: "ok",
      database: "connected",
      service: "pharmacy-api",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      database: "disconnected",
      service: "pharmacy-api",
    });
  }
});

export default app;
