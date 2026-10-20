import { apiFetch } from "./api";

export interface ReportTransaction {
  id: string;
  pharmacyId: string;
  medicineId: string;
  batchId: string;
  transactionType: string;
  quantity: string | number;
  referenceType: string;
  referenceId: string | null;
  reason: string | null;
  createdById: string;
  createdAt: string;

  medicine?: {
    id: string;
    name: string;
    genericName: string | null;
    strength: string | null;
  };

  batch?: {
    id: string;
    batchNumber: string;
    expiryDate: string;
  };

  createdBy?: {
    id: string;
    name: string;
    username: string;
  };
}

/*
|--------------------------------------------------------------------------
| Dashboard
|--------------------------------------------------------------------------
*/

export interface DashboardStatistics {
  totalMedicines: number;
  totalStock: number;
  lowStockMedicines: number;
  expiringInventory: number;
  expiredInventory: number;
  todaySales: number;
  todayRevenue: number;
  recentTransactions: ReportTransaction[];
}

interface DashboardResponse {
  dashboard: DashboardStatistics;
}

export async function getDashboardStatistics(): Promise<DashboardStatistics> {
  const response = await apiFetch<DashboardResponse>("/reports/dashboard");

  return response.dashboard;
}

/*
|--------------------------------------------------------------------------
| Analytical Reports
|--------------------------------------------------------------------------
*/

export interface RevenueTrendItem {
  date: string;
  revenue: number;
  sales: number;
}

export interface SalesByMedicineItem {
  medicineId: string;
  medicineName: string;
  genericName: string | null;
  quantitySold: number;
  grossRevenue: number;
  allocatedSaleDiscount: number;
  allocatedTax: number;
  revenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  margin: number;
}

export interface SalesByPaymentMethodItem {
  paymentMethod: string;
  amount: number;
  transactions: number;
}

export interface PurchaseSummary {
  totalPurchases: number;
  totalAmount: number;
  draft: number;
  ordered: number;
  partiallyReceived: number;
  received: number;
  cancelled: number;
}

export interface PurchasesBySupplierItem {
  supplierId: string;
  supplierName: string;
  purchaseCount: number;
  totalAmount: number;
}

export interface PurchasesByMedicineItem {
  medicineId: string;
  medicineName: string;
  quantityOrdered: number;
  totalCost: number;
}

export interface ReportsAnalytics {
  range: {
    from: string;
    to: string;
  };

  sales: {
    totalSales: number;
    subtotal: number;
    discounts: number;
    tax: number;
    revenue: number;
    netRevenueBeforeTax: number;
    averageSaleValue: number;
  };

  revenueTrend: RevenueTrendItem[];

  salesByMedicine: SalesByMedicineItem[];

  salesByPaymentMethod: SalesByPaymentMethodItem[];

  profit: {
    revenue: number;
    costOfGoodsSold: number;
    grossProfit: number;
    grossMargin: number;
  };

  purchases: PurchaseSummary;

  purchasesBySupplier: PurchasesBySupplierItem[];

  purchasesByMedicine: PurchasesByMedicineItem[];
}

interface ReportsAnalyticsResponse {
  analytics: ReportsAnalytics;
}

/*
|--------------------------------------------------------------------------
| Get Analytical Reports
|--------------------------------------------------------------------------
*/

export async function getReportsAnalytics(
  from: string,
  to: string,
): Promise<ReportsAnalytics> {
  const response = await apiFetch<ReportsAnalyticsResponse>(
    `/reports/analytics?from=${encodeURIComponent(
      from,
    )}&to=${encodeURIComponent(to)}`,
  );

  return response.analytics;
}
