"use client";

import { useEffect, useState } from "react";

import { useI18n } from "@/lib/i18n/I18nProvider";
import AppLayout from "@/components/AppLayout";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { getReportsAnalytics, type ReportsAnalytics } from "@/lib/reports";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";

import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* =========================================================
   FORMATTING
   ========================================================= */

function formatNumber(value: number, language: "en" | "ar") {
  return new Intl.NumberFormat(language === "ar" ? "ar" : "en-US").format(
    value,
  );
}

function formatCurrency(value: number, language: "en" | "ar") {
  return new Intl.NumberFormat(language === "ar" ? "ar" : "id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number, language: "en" | "ar") {
  return (
    new Intl.NumberFormat(language === "ar" ? "ar" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value) + "%"
  );
}

function formatDate(value: string, language: "en" | "ar") {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getFirstDayOfMonth() {
  const date = new Date();

  return new Date(date.getFullYear(), date.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

/* =========================================================
   CHART COLORS
   ========================================================= */

const chartDataColors = ["#00452a", "#2563eb", "#16a34a", "#d97706", "#dc2626"];

/* =========================================================
   PAGE
   ========================================================= */

export default function ReportsPage() {
  const { t, language } = useI18n();

  const [from, setFrom] = useState(getFirstDayOfMonth);

  const [to, setTo] = useState(getToday);

  const [analytics, setAnalytics] = useState<ReportsAnalytics | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const isArabic = language === "ar";

  /* =========================================================
     PAYMENT METHOD TRANSLATION
     ========================================================= */

  function paymentLabel(value: string) {
    const normalized = value
      .replaceAll("_", "")
      .replaceAll("-", "")
      .replaceAll(" ", "")
      .toLowerCase();

    const labels: Record<string, string> = {
      cash: t("reports.cash"),
      card: t("reports.card"),
      creditcard: t("reports.card"),
      debitcard: t("reports.card"),
      banktransfer: t("reports.bankTransfer"),
      transfer: t("reports.bankTransfer"),
      qris: t("reports.qris"),
      ewallet: t("reports.eWallet"),
    };

    if (labels[normalized]) {
      return labels[normalized];
    }

    return value
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  /* =========================================================
     LOAD REPORTS
     ========================================================= */

  async function loadAnalytics() {
    if (!from || !to) {
      return;
    }

    if (from > to) {
      setError(t("reports.invalidDateRange"));
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await getReportsAnalytics(from, to);

      setAnalytics(data);
    } catch (err) {
      console.error("Load analytics error:", err);

      setError(err instanceof Error ? err.message : t("reports.error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();

    // Initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================================================
     APPLY FILTER
     ========================================================= */

  function handleApplyFilter() {
    loadAnalytics();
  }

  /* =========================================================
     EXCEL EXPORT
     ========================================================= */

  function exportExcel() {
    if (!analytics) {
      return;
    }

    const workbook = XLSX.utils.book_new();

    const summaryData = [
      [t("reports.pdfTitle")],

      [],

      [t("reports.reportFrom"), formatDate(from, language)],

      [t("reports.reportTo"), formatDate(to, language)],

      [],

      [t("reports.salesSummary").toUpperCase()],

      [t("reports.totalSales"), analytics.sales.totalSales],

      [t("reports.subtotal"), analytics.sales.subtotal],

      [t("reports.discounts"), analytics.sales.discounts],

      [t("reports.tax"), analytics.sales.tax],

      [t("reports.revenue"), analytics.sales.revenue],

      [t("reports.netRevenueBeforeTax"), analytics.sales.netRevenueBeforeTax],

      [t("reports.averageSaleValue"), analytics.sales.averageSaleValue],

      [],

      [t("reports.profitMargin").toUpperCase()],

      [t("reports.revenue"), analytics.profit.revenue],

      [t("reports.costOfGoodsSold"), analytics.profit.costOfGoodsSold],

      [t("reports.grossProfit"), analytics.profit.grossProfit],

      [t("reports.grossMarginPercent"), analytics.profit.grossMargin],

      [],

      [t("reports.purchaseSummary").toUpperCase()],

      [t("reports.totalPurchases"), analytics.purchases.totalPurchases],

      [t("reports.totalPurchaseAmount"), analytics.purchases.totalAmount],

      [t("reports.draft"), analytics.purchases.draft],

      [t("reports.ordered"), analytics.purchases.ordered],

      [t("reports.partiallyReceived"), analytics.purchases.partiallyReceived],

      [t("reports.received"), analytics.purchases.received],

      [t("reports.cancelled"), analytics.purchases.cancelled],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    const revenueSheetData = analytics.revenueTrend.map((item) => ({
      [t("reports.date")]: formatDate(item.date, language),

      [t("reports.revenue")]: item.revenue,

      [t("reports.sales")]: item.sales,
    }));

    const revenueSheet = XLSX.utils.json_to_sheet(revenueSheetData);

    XLSX.utils.book_append_sheet(workbook, revenueSheet, "Revenue Trend");

    const medicineSheetData = analytics.salesByMedicine.map((medicine) => ({
      [t("reports.medicine")]: medicine.medicineName,

      [t("reports.genericName")]: medicine.genericName ?? "",

      [t("reports.quantitySold")]: medicine.quantitySold,

      [t("reports.grossRevenue")]: medicine.grossRevenue,

      [t("reports.saleDiscount")]: medicine.allocatedSaleDiscount,

      [t("reports.tax")]: medicine.allocatedTax,

      [t("reports.revenue")]: medicine.revenue,

      [t("reports.cogs")]: medicine.costOfGoodsSold,

      [t("reports.grossProfit")]: medicine.grossProfit,

      [t("reports.marginPercent")]: medicine.margin,
    }));

    const medicineSheet = XLSX.utils.json_to_sheet(medicineSheetData);

    XLSX.utils.book_append_sheet(workbook, medicineSheet, "Sales by Medicine");

    const paymentSheetData = analytics.salesByPaymentMethod.map((payment) => ({
      [t("reports.paymentMethod")]: paymentLabel(payment.paymentMethod),

      [t("reports.amount")]: payment.amount,

      [t("reports.transactions")]: payment.transactions,
    }));

    const paymentSheet = XLSX.utils.json_to_sheet(paymentSheetData);

    XLSX.utils.book_append_sheet(workbook, paymentSheet, "Payment Methods");

    const supplierSheetData = analytics.purchasesBySupplier.map((supplier) => ({
      [t("reports.supplier")]: supplier.supplierName,

      [t("reports.purchaseCount")]: supplier.purchaseCount,

      [t("reports.totalAmount")]: supplier.totalAmount,
    }));

    const supplierSheet = XLSX.utils.json_to_sheet(supplierSheetData);

    XLSX.utils.book_append_sheet(
      workbook,
      supplierSheet,
      "Purchases by Supplier",
    );

    const purchaseMedicineSheetData = analytics.purchasesByMedicine.map(
      (medicine) => ({
        [t("reports.medicine")]: medicine.medicineName,

        [t("reports.quantityOrdered")]: medicine.quantityOrdered,

        [t("reports.totalCost")]: medicine.totalCost,
      }),
    );

    const purchaseMedicineSheet = XLSX.utils.json_to_sheet(
      purchaseMedicineSheetData,
    );

    XLSX.utils.book_append_sheet(
      workbook,
      purchaseMedicineSheet,
      "Purchases by Medicine",
    );

    const filename = `pharmacy-report-${from}-to-${to}.xlsx`;

    XLSX.writeFile(workbook, filename);
  }

  /* =========================================================
     PDF EXPORT
     ========================================================= */

  function exportPdf() {
    if (!analytics) {
      return;
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();

    const pageHeight = pdf.internal.pageSize.getHeight();

    let y = 20;

    function pdfText(
      text: string,
      x: number,
      yPosition: number,
      options?: {
        align?: "left" | "center" | "right";
      },
    ) {
      pdf.text(text, x, yPosition, options);
    }

    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");

    pdfText(t("reports.pdfTitle"), isArabic ? pageWidth - 14 : 14, y, {
      align: isArabic ? "right" : "left",
    });

    y += 8;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");

    pdfText(
      `${t("reports.reportPeriod")}: ${formatDate(
        from,
        language,
      )} - ${formatDate(to, language)}`,
      isArabic ? pageWidth - 14 : 14,
      y,
      {
        align: isArabic ? "right" : "left",
      },
    );

    y += 12;

    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");

    pdfText(t("reports.salesSummary"), isArabic ? pageWidth - 14 : 14, y, {
      align: isArabic ? "right" : "left",
    });

    y += 5;

    autoTable(pdf, {
      startY: y,

      head: [[t("reports.metric"), t("reports.value")]],

      body: [
        [
          t("reports.totalSales"),
          formatNumber(analytics.sales.totalSales, language),
        ],

        [
          t("reports.subtotal"),
          formatCurrency(analytics.sales.subtotal, language),
        ],

        [
          t("reports.discounts"),
          formatCurrency(analytics.sales.discounts, language),
        ],

        [t("reports.tax"), formatCurrency(analytics.sales.tax, language)],

        [
          t("reports.revenue"),
          formatCurrency(analytics.sales.revenue, language),
        ],

        [
          t("reports.netRevenueBeforeTax"),
          formatCurrency(analytics.sales.netRevenueBeforeTax, language),
        ],

        [
          t("reports.averageSaleValue"),
          formatCurrency(analytics.sales.averageSaleValue, language),
        ],
      ],

      theme: "grid",

      styles: {
        fontSize: 9,
        halign: isArabic ? "right" : "left",
      },

      headStyles: {
        fillColor: [0, 69, 42],
        halign: isArabic ? "right" : "left",
      },
    });

    y =
      (
        pdf as jsPDF & {
          lastAutoTable?: {
            finalY: number;
          };
        }
      ).lastAutoTable?.finalY ?? y + 45;

    y += 12;

    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");

    pdfText(
      t("reports.profitMarginAnalysis"),
      isArabic ? pageWidth - 14 : 14,
      y,
      {
        align: isArabic ? "right" : "left",
      },
    );

    y += 5;

    autoTable(pdf, {
      startY: y,

      head: [[t("reports.metric"), t("reports.value")]],

      body: [
        [
          t("reports.revenueBeforeTax"),
          formatCurrency(analytics.profit.revenue, language),
        ],

        [
          t("reports.costOfGoodsSold"),
          formatCurrency(analytics.profit.costOfGoodsSold, language),
        ],

        [
          t("reports.grossProfit"),
          formatCurrency(analytics.profit.grossProfit, language),
        ],

        [
          t("reports.grossMarginPercent"),
          formatPercent(analytics.profit.grossMargin, language),
        ],
      ],

      theme: "grid",

      styles: {
        fontSize: 9,
        halign: isArabic ? "right" : "left",
      },

      headStyles: {
        fillColor: [0, 69, 42],
        halign: isArabic ? "right" : "left",
      },
    });

    pdf.addPage();

    y = 20;

    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");

    pdfText(t("reports.salesByMedicine"), isArabic ? pageWidth - 14 : 14, y, {
      align: isArabic ? "right" : "left",
    });

    y += 5;

    autoTable(pdf, {
      startY: y,

      head: [
        [
          t("reports.medicine"),
          t("reports.quantitySoldShort"),
          t("reports.revenue"),
          t("reports.cogs"),
          t("reports.grossProfitShort"),
          t("reports.margin"),
        ],
      ],

      body: analytics.salesByMedicine.map((medicine) => [
        medicine.medicineName,

        formatNumber(medicine.quantitySold, language),

        formatCurrency(medicine.revenue, language),

        formatCurrency(medicine.costOfGoodsSold, language),

        formatCurrency(medicine.grossProfit, language),

        formatPercent(medicine.margin, language),
      ]),

      theme: "grid",

      styles: {
        fontSize: 8,
        halign: isArabic ? "right" : "left",
      },

      headStyles: {
        fillColor: [0, 69, 42],
        halign: isArabic ? "right" : "left",
      },
    });

    y =
      (
        pdf as jsPDF & {
          lastAutoTable?: {
            finalY: number;
          };
        }
      ).lastAutoTable?.finalY ?? 70;

    y += 12;

    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");

    pdfText(
      t("reports.salesByPaymentMethod"),
      isArabic ? pageWidth - 14 : 14,
      y,
      {
        align: isArabic ? "right" : "left",
      },
    );

    y += 5;

    autoTable(pdf, {
      startY: y,

      head: [
        [
          t("reports.paymentMethod"),
          t("reports.transactions"),
          t("reports.amount"),
        ],
      ],

      body: analytics.salesByPaymentMethod.map((payment) => [
        paymentLabel(payment.paymentMethod),

        formatNumber(payment.transactions, language),

        formatCurrency(payment.amount, language),
      ]),

      theme: "grid",

      styles: {
        fontSize: 8,
        halign: isArabic ? "right" : "left",
      },

      headStyles: {
        fillColor: [0, 69, 42],
        halign: isArabic ? "right" : "left",
      },
    });

    pdf.addPage();

    y = 20;

    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");

    pdfText(t("reports.purchaseAnalysis"), isArabic ? pageWidth - 14 : 14, y, {
      align: isArabic ? "right" : "left",
    });

    y += 5;

    autoTable(pdf, {
      startY: y,

      head: [[t("reports.metric"), t("reports.value")]],

      body: [
        [
          t("reports.totalPurchases"),
          formatNumber(analytics.purchases.totalPurchases, language),
        ],

        [
          t("reports.totalPurchaseAmount"),
          formatCurrency(analytics.purchases.totalAmount, language),
        ],

        [t("reports.draft"), formatNumber(analytics.purchases.draft, language)],

        [
          t("reports.ordered"),
          formatNumber(analytics.purchases.ordered, language),
        ],

        [
          t("reports.partiallyReceived"),
          formatNumber(analytics.purchases.partiallyReceived, language),
        ],

        [
          t("reports.received"),
          formatNumber(analytics.purchases.received, language),
        ],

        [
          t("reports.cancelled"),
          formatNumber(analytics.purchases.cancelled, language),
        ],
      ],

      theme: "grid",

      styles: {
        fontSize: 9,
        halign: isArabic ? "right" : "left",
      },

      headStyles: {
        fillColor: [0, 69, 42],
        halign: isArabic ? "right" : "left",
      },
    });

    y =
      (
        pdf as jsPDF & {
          lastAutoTable?: {
            finalY: number;
          };
        }
      ).lastAutoTable?.finalY ?? 70;

    y += 12;

    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");

    pdfText(
      t("reports.purchasesBySupplier"),
      isArabic ? pageWidth - 14 : 14,
      y,
      {
        align: isArabic ? "right" : "left",
      },
    );

    y += 5;

    autoTable(pdf, {
      startY: y,

      head: [
        [
          t("reports.supplier"),
          t("reports.purchases"),
          t("reports.totalAmount"),
        ],
      ],

      body: analytics.purchasesBySupplier.map((supplier) => [
        supplier.supplierName,

        formatNumber(supplier.purchaseCount, language),

        formatCurrency(supplier.totalAmount, language),
      ]),

      theme: "grid",

      styles: {
        fontSize: 8,
        halign: isArabic ? "right" : "left",
      },

      headStyles: {
        fillColor: [0, 69, 42],
        halign: isArabic ? "right" : "left",
      },
    });

    pdf.addPage();

    y = 20;

    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");

    pdfText(
      t("reports.purchasesByMedicine"),
      isArabic ? pageWidth - 14 : 14,
      y,
      {
        align: isArabic ? "right" : "left",
      },
    );

    y += 5;

    autoTable(pdf, {
      startY: y,

      head: [
        [
          t("reports.medicine"),
          t("reports.quantityOrdered"),
          t("reports.totalCost"),
        ],
      ],

      body: analytics.purchasesByMedicine.map((medicine) => [
        medicine.medicineName,

        formatNumber(medicine.quantityOrdered, language),

        formatCurrency(medicine.totalCost, language),
      ]),

      theme: "grid",

      styles: {
        fontSize: 8,
        halign: isArabic ? "right" : "left",
      },

      headStyles: {
        fillColor: [0, 69, 42],
        halign: isArabic ? "right" : "left",
      },
    });

    const totalPages = pdf.getNumberOfPages();

    for (let page = 1; page <= totalPages; page++) {
      pdf.setPage(page);

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");

      const footerText = `${t("reports.pharmacyManagementSystem")} • ${t(
        "reports.page",
      )} ${page} ${t("reports.of")} ${totalPages}`;

      pdfText(footerText, isArabic ? pageWidth - 14 : 14, pageHeight - 10, {
        align: isArabic ? "right" : "left",
      });

      pdfText(
        `${formatDate(from, language)} - ${formatDate(to, language)}`,
        isArabic ? 14 : pageWidth - 14,
        pageHeight - 10,
        {
          align: isArabic ? "left" : "right",
        },
      );
    }

    pdf.save(`pharmacy-report-${from}-to-${to}.pdf`);
  }

  /* =========================================================
     LOADING
     ========================================================= */

  if (loading && !analytics) {
    return (
      <AppLayout>
        <div className="flex min-h-[500px] items-center justify-center">
          <div className="text-center">
            <div
              className="
                mx-auto
                h-8
                w-8
                animate-spin
                rounded-full
                border-2
                border-border
                border-t-primary
              "
            />

            <p
              className="
                mt-4
                text-sm
                text-text-muted
              "
            >
              {t("reports.loading")}
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  /* =========================================================
     ERROR
     ========================================================= */

  if (error && !analytics) {
    return (
      <AppLayout>
        <div className="pb-8">
          <Card>
            <div className="mb-4">
              <h2
                className="
                  text-base
                  font-bold
                  text-text-primary
                "
              >
                {t("reports.title")}
              </h2>

              <p
                className="
                  mt-1
                  text-xs
                  text-text-muted
                "
              >
                {t("reports.description")}
              </p>
            </div>

            <div
              className="
                rounded-xl
                border
                border-danger/20
                bg-danger-soft
                px-5
                py-4
                text-sm
                font-medium
                text-danger
              "
            >
              {error}
            </div>

            <div className="mt-5">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={loadAnalytics}
              >
                {t("reports.tryAgain")}
              </Button>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!analytics) {
    return (
      <AppLayout>
        <div />
      </AppLayout>
    );
  }

  /* =========================================================
     CHART DATA
     ========================================================= */

  const revenueChartData = analytics.revenueTrend.map((item) => ({
    ...item,

    label: formatDate(item.date, language),
  }));

  const paymentChartData = analytics.salesByPaymentMethod.map((item) => ({
    ...item,

    label: paymentLabel(item.paymentMethod),
  }));

  /* =========================================================
     MAIN UI
     ========================================================= */

  return (
    <AppLayout>
      <div className="space-y-5 pb-8" dir={isArabic ? "rtl" : "ltr"}>
        {/* =====================================================
            REPORT CONTROLS
            ===================================================== */}

        <Card padding="none" className="overflow-hidden">
          <div
            className="
              flex
              flex-wrap
              items-center
              justify-between
              gap-4
              border-b
              border-border-light
              px-5
              py-5
              lg:px-6
            "
          >
            <div>
              <h2
                className="
                  text-base
                  font-bold
                  text-text-primary
                "
              >
                {t("reports.reportPeriod")}
              </h2>

              <p
                className="
                  mt-1
                  text-xs
                  text-text-muted
                "
              >
                {t("reports.selectDateRange")}
              </p>
            </div>

            <div
              className="
                flex
                flex-wrap
                gap-2
              "
            >
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={exportExcel}
                disabled={loading || !analytics}
              >
                {t("reports.exportExcel")}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={exportPdf}
                disabled={loading || !analytics}
              >
                {t("reports.exportPdf")}
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={loadAnalytics}
                disabled={loading}
              >
                {loading ? t("reports.refreshing") : t("reports.refresh")}
              </Button>
            </div>
          </div>

          <div
            className="
              grid
              gap-4
              p-5
              md:grid-cols-[1fr_1fr_auto]
              md:items-end
              lg:p-6
            "
          >
            <Input
              label={t("reports.from")}
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              lang={isArabic ? "ar-SA" : "en-GB"}
              disabled={loading}
            />

            <Input
              label={t("reports.to")}
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              lang={isArabic ? "ar-SA" : "en-GB"}
              disabled={loading}
            />

            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleApplyFilter}
              disabled={loading}
            >
              {t("reports.applyFilter")}
            </Button>
          </div>

          {error && (
            <div
              className="
                border-t
                border-danger/10
                bg-danger-soft
                px-5
                py-3
                text-sm
                font-medium
                text-danger
              "
            >
              {error}
            </div>
          )}
        </Card>

        {/* =====================================================
            SALES SUMMARY
            ===================================================== */}

        <section>
          <div className="mb-3">
            <h2
              className="
                text-base
                font-bold
                text-text-primary
              "
            >
              {t("reports.salesSummary")}
            </h2>

            <p
              className="
                mt-1
                text-xs
                text-text-muted
              "
            >
              {t("reports.salesPerformance")}
            </p>
          </div>

          <div
            className="
              grid
              gap-4
              sm:grid-cols-2
              xl:grid-cols-4
            "
          >
            <MetricCard
              label={t("reports.totalSales")}
              value={formatNumber(analytics.sales.totalSales, language)}
              description={t("reports.completedTransactions")}
            />

            <MetricCard
              label={t("reports.revenue")}
              value={formatCurrency(analytics.sales.revenue, language)}
              description={t("reports.completedSaleRevenue")}
            />

            <MetricCard
              label={t("reports.averageSale")}
              value={formatCurrency(analytics.sales.averageSaleValue, language)}
              description={t("reports.averageSaleValue")}
            />

            <MetricCard
              label={t("reports.discounts")}
              value={formatCurrency(analytics.sales.discounts, language)}
              description={t("reports.saleLevelDiscounts")}
            />
          </div>
        </section>

        {/* =====================================================
            REVENUE + PROFIT
            ===================================================== */}

        <section
          className="
            grid
            gap-5
            xl:grid-cols-3
          "
        >
          <Card className="xl:col-span-2">
            <div className="mb-5">
              <h2
                className="
                  text-base
                  font-bold
                  text-text-primary
                "
              >
                {t("reports.revenueTrend")}
              </h2>

              <p
                className="
                  mt-1
                  text-xs
                  text-text-muted
                "
              >
                {t("reports.dailyRevenue")}
              </p>
            </div>

            {revenueChartData.length === 0 ? (
              <EmptyChart message={t("reports.noSalesData")} />
            ) : (
              <div
                className="
                  h-72
                  w-full
                "
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={revenueChartData}
                    margin={{
                      top: 10,
                      right: 20,
                      left: 20,
                      bottom: 10,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 11,
                      }}
                    />

                    <YAxis
                      tick={{
                        fontSize: 11,
                      }}
                      tickFormatter={(value) =>
                        `Rp ${Number(value).toLocaleString("en-US")}`
                      }
                    />

                    <Tooltip
                      formatter={(value) =>
                        formatCurrency(Number(value), language)
                      }
                    />

                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#00452a"
                      strokeWidth={2}
                      dot={{
                        r: 4,
                      }}
                      activeDot={{
                        r: 6,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card>
            <div className="mb-5">
              <h2
                className="
                  text-base
                  font-bold
                  text-text-primary
                "
              >
                {t("reports.profitMargin")}
              </h2>

              <p
                className="
                  mt-1
                  text-xs
                  text-text-muted
                "
              >
                {t("reports.grossProfitability")}
              </p>
            </div>

            <div className="space-y-3">
              <ReportValue
                label={t("reports.revenueBeforeTax")}
                value={formatCurrency(analytics.profit.revenue, language)}
              />

              <ReportValue
                label={t("reports.costOfGoodsSold")}
                value={formatCurrency(
                  analytics.profit.costOfGoodsSold,
                  language,
                )}
              />

              <ReportValue
                label={t("reports.grossProfit")}
                value={formatCurrency(analytics.profit.grossProfit, language)}
                valueClassName="text-success"
              />

              <div
                className="
                  rounded-xl
                  bg-primary
                  p-4
                "
              >
                <p
                  className="
                    text-xs
                    text-white/60
                  "
                >
                  {t("reports.grossMargin")}
                </p>

                <p
                  className="
                    mt-1
                    text-2xl
                    font-bold
                    text-white
                  "
                >
                  {formatPercent(analytics.profit.grossMargin, language)}
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* =====================================================
            SALES BY MEDICINE
            ===================================================== */}

        <ReportTable
          title={t("reports.salesByMedicine")}
          description={t("reports.medicineSalesDescription")}
          emptyMessage={t("reports.noMedicineSales")}
        >
          <thead>
            <tr>
              <TableHeader>{t("reports.medicine")}</TableHeader>

              <TableHeader align="right">
                {t("reports.quantitySoldShort")}
              </TableHeader>

              <TableHeader align="right">{t("reports.revenue")}</TableHeader>

              <TableHeader align="right">{t("reports.cogs")}</TableHeader>

              <TableHeader align="right">
                {t("reports.grossProfitShort")}
              </TableHeader>

              <TableHeader align="right">{t("reports.margin")}</TableHeader>
            </tr>
          </thead>

          <tbody className="divide-y divide-border-light">
            {analytics.salesByMedicine.map((medicine) => (
              <tr
                key={medicine.medicineId}
                className="
                    transition-colors
                    duration-150
                    hover:bg-surface-subtle
                  "
              >
                <td className="px-5 py-4">
                  <p
                    className="
                        text-sm
                        font-semibold
                        text-text-primary
                      "
                  >
                    {medicine.medicineName}
                  </p>

                  {medicine.genericName && (
                    <p
                      className="
                          mt-0.5
                          text-xs
                          text-text-muted
                        "
                    >
                      {medicine.genericName}
                    </p>
                  )}
                </td>

                <td
                  className="
                      px-5
                      py-4
                      text-right
                      text-sm
                      text-text-secondary
                    "
                >
                  {formatNumber(medicine.quantitySold, language)}
                </td>

                <td
                  className="
                      px-5
                      py-4
                      text-right
                      text-sm
                      font-medium
                      text-text-primary
                    "
                >
                  {formatCurrency(medicine.revenue, language)}
                </td>

                <td
                  className="
                      px-5
                      py-4
                      text-right
                      text-sm
                      text-text-secondary
                    "
                >
                  {formatCurrency(medicine.costOfGoodsSold, language)}
                </td>

                <td
                  className="
                      px-5
                      py-4
                      text-right
                      text-sm
                      font-semibold
                      text-success
                    "
                >
                  {formatCurrency(medicine.grossProfit, language)}
                </td>

                <td className="px-5 py-4 text-right">
                  <Badge
                    variant={
                      medicine.margin >= 40
                        ? "success"
                        : medicine.margin >= 20
                          ? "warning"
                          : "danger"
                    }
                  >
                    {formatPercent(medicine.margin, language)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </ReportTable>

        {/* =====================================================
            PAYMENT METHODS
            ===================================================== */}

        <section
          className="
            grid
            gap-5
            xl:grid-cols-2
          "
        >
          <Card>
            <div className="mb-5">
              <h2
                className="
                  text-base
                  font-bold
                  text-text-primary
                "
              >
                {t("reports.salesByPaymentMethod")}
              </h2>

              <p
                className="
                  mt-1
                  text-xs
                  text-text-muted
                "
              >
                {t("reports.paymentDistribution")}
              </p>
            </div>

            {paymentChartData.length === 0 ? (
              <EmptyChart message={t("reports.noPaymentData")} />
            ) : (
              <div
                className="
                  h-72
                  w-full
                "
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentChartData}
                      dataKey="amount"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={false}
                      labelLine={false}
                    >
                      {paymentChartData.map((entry, index) => (
                        <Cell
                          key={entry.paymentMethod}
                          fill={chartDataColors[index % chartDataColors.length]}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      formatter={(value) =>
                        formatCurrency(Number(value), language)
                      }
                    />

                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card>
            <div className="mb-5">
              <h2
                className="
                  text-base
                  font-bold
                  text-text-primary
                "
              >
                {t("reports.paymentDetails")}
              </h2>

              <p
                className="
                  mt-1
                  text-xs
                  text-text-muted
                "
              >
                {t("reports.transactionPaymentDescription")}
              </p>
            </div>

            <div className="space-y-3">
              {paymentChartData.length === 0 ? (
                <p
                  className="
                    py-10
                    text-center
                    text-sm
                    text-text-muted
                  "
                >
                  {t("reports.noPaymentData")}
                </p>
              ) : (
                paymentChartData.map((payment) => (
                  <div
                    key={payment.paymentMethod}
                    className="
                        flex
                        items-center
                        justify-between
                        gap-4
                        rounded-xl
                        border
                        border-border-light
                        bg-surface-subtle
                        px-4
                        py-3
                      "
                  >
                    <div className="min-w-0">
                      <p
                        className="
                            text-sm
                            font-semibold
                            text-text-primary
                          "
                      >
                        {payment.label}
                      </p>

                      <p
                        className="
                            mt-0.5
                            text-xs
                            text-text-muted
                          "
                      >
                        {formatNumber(payment.transactions, language)}{" "}
                        {t("reports.transactions")}
                      </p>
                    </div>

                    <p
                      className="
                          shrink-0
                          text-sm
                          font-semibold
                          text-text-primary
                        "
                    >
                      {formatCurrency(payment.amount, language)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </section>

        {/* =====================================================
            PURCHASE SUMMARY
            ===================================================== */}

        <section>
          <div className="mb-3">
            <h2
              className="
                text-base
                font-bold
                text-text-primary
              "
            >
              {t("reports.purchaseAnalysis")}
            </h2>

            <p
              className="
                mt-1
                text-xs
                text-text-muted
              "
            >
              {t("reports.purchaseDescription")}
            </p>
          </div>

          <div
            className="
              grid
              gap-4
              sm:grid-cols-2
              xl:grid-cols-4
            "
          >
            <MetricCard
              label={t("reports.purchases")}
              value={formatNumber(analytics.purchases.totalPurchases, language)}
            />

            <MetricCard
              label={t("reports.purchaseValue")}
              value={formatCurrency(analytics.purchases.totalAmount, language)}
            />

            <MetricCard
              label={t("reports.received")}
              value={formatNumber(analytics.purchases.received, language)}
              valueClassName="text-success"
            />

            <MetricCard
              label={t("reports.cancelled")}
              value={formatNumber(analytics.purchases.cancelled, language)}
              valueClassName="text-danger"
            />
          </div>
        </section>

        {/* =====================================================
            PURCHASES BY SUPPLIER
            ===================================================== */}

        <ReportTable
          title={t("reports.purchasesBySupplier")}
          description={t("reports.supplierPurchaseDescription")}
          emptyMessage={t("reports.noSupplierPurchases")}
        >
          <thead>
            <tr>
              <TableHeader>{t("reports.supplier")}</TableHeader>

              <TableHeader align="right">{t("reports.purchases")}</TableHeader>

              <TableHeader align="right">
                {t("reports.totalAmount")}
              </TableHeader>
            </tr>
          </thead>

          <tbody className="divide-y divide-border-light">
            {analytics.purchasesBySupplier.map((supplier) => (
              <tr
                key={supplier.supplierId}
                className="
                    transition-colors
                    duration-150
                    hover:bg-surface-subtle
                  "
              >
                <td
                  className="
                      px-5
                      py-4
                      text-sm
                      font-semibold
                      text-text-primary
                    "
                >
                  {supplier.supplierName}
                </td>

                <td
                  className="
                      px-5
                      py-4
                      text-right
                      text-sm
                      text-text-secondary
                    "
                >
                  {formatNumber(supplier.purchaseCount, language)}
                </td>

                <td
                  className="
                      px-5
                      py-4
                      text-right
                      text-sm
                      font-semibold
                      text-text-primary
                    "
                >
                  {formatCurrency(supplier.totalAmount, language)}
                </td>
              </tr>
            ))}
          </tbody>
        </ReportTable>

        {/* =====================================================
            PURCHASES BY MEDICINE
            ===================================================== */}

        <ReportTable
          title={t("reports.purchasesByMedicine")}
          description={t("reports.medicinePurchaseDescription")}
          emptyMessage={t("reports.noMedicinePurchases")}
        >
          <thead>
            <tr>
              <TableHeader>{t("reports.medicine")}</TableHeader>

              <TableHeader align="right">
                {t("reports.quantityOrdered")}
              </TableHeader>

              <TableHeader align="right">{t("reports.totalCost")}</TableHeader>
            </tr>
          </thead>

          <tbody className="divide-y divide-border-light">
            {analytics.purchasesByMedicine.map((medicine) => (
              <tr
                key={medicine.medicineId}
                className="
                    transition-colors
                    duration-150
                    hover:bg-surface-subtle
                  "
              >
                <td
                  className="
                      px-5
                      py-4
                      text-sm
                      font-semibold
                      text-text-primary
                    "
                >
                  {medicine.medicineName}
                </td>

                <td
                  className="
                      px-5
                      py-4
                      text-right
                      text-sm
                      text-text-secondary
                    "
                >
                  {formatNumber(medicine.quantityOrdered, language)}
                </td>

                <td
                  className="
                      px-5
                      py-4
                      text-right
                      text-sm
                      font-semibold
                      text-text-primary
                    "
                >
                  {formatCurrency(medicine.totalCost, language)}
                </td>
              </tr>
            ))}
          </tbody>
        </ReportTable>

        {/* =====================================================
            REPORT PERIOD FOOTER
            ===================================================== */}

        <div
          className="
            rounded-xl
            border
            border-border-light
            bg-surface
            px-5
            py-4
            shadow-card
          "
        >
          <p
            className="
              text-xs
              text-text-muted
            "
          >
            {t("reports.reportPeriod")}:{" "}
            <span
              className="
                font-semibold
                text-text-secondary
              "
            >
              {formatDate(from, language)}
            </span>{" "}
            {t("reports.to")}{" "}
            <span
              className="
                font-semibold
                text-text-secondary
              "
            >
              {formatDate(to, language)}
            </span>
          </p>
        </div>
      </div>
    </AppLayout>
  );
}

/* ================================================================
   METRIC CARD
   ================================================================ */

function MetricCard({
  label,
  value,
  description,
  valueClassName = "",
}: {
  label: string;
  value: string;
  description?: string;
  valueClassName?: string;
}) {
  return (
    <Card>
      <p
        className="
          text-[10px]
          font-bold
          uppercase
          tracking-[0.1em]
          text-text-muted
        "
      >
        {label}
      </p>

      <p
        className={`
          mt-2
          text-2xl
          font-bold
          text-text-primary
          ${valueClassName}
        `}
      >
        {value}
      </p>

      {description && (
        <p
          className="
            mt-1
            text-xs
            text-text-muted
          "
        >
          {description}
        </p>
      )}
    </Card>
  );
}

/* ================================================================
   REPORT VALUE
   ================================================================ */

function ReportValue({
  label,
  value,
  valueClassName = "",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-border-light
        bg-surface-subtle
        p-4
      "
    >
      <p
        className="
          text-xs
          text-text-muted
        "
      >
        {label}
      </p>

      <p
        className={`
          mt-1
          text-lg
          font-bold
          text-text-primary
          ${valueClassName}
        `}
      >
        {value}
      </p>
    </div>
  );
}

/* ================================================================
   EMPTY CHART
   ================================================================ */

function EmptyChart({ message }: { message: string }) {
  return (
    <div
      className="
        flex
        h-72
        items-center
        justify-center
        rounded-xl
        bg-surface-subtle
        text-sm
        text-text-muted
      "
    >
      {message}
    </div>
  );
}

/* ================================================================
   REPORT TABLE
   ================================================================ */

function ReportTable({
  title,
  description,
  emptyMessage,
  children,
}: {
  title: string;
  description: string;
  emptyMessage: string;
  children: React.ReactNode;
}) {
  const hasRows = typeof children === "object";

  return (
    <Card padding="none" className="overflow-hidden">
      <div
        className="
          border-b
          border-border-light
          px-5
          py-5
        "
      >
        <h2
          className="
            text-base
            font-bold
            text-text-primary
          "
        >
          {title}
        </h2>

        <p
          className="
            mt-1
            text-xs
            text-text-muted
          "
        >
          {description}
        </p>
      </div>

      {!hasRows ? (
        <div
          className="
            px-5
            py-12
            text-center
            text-sm
            text-text-muted
          "
        >
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table
            className="
              w-full
              min-w-[700px]
            "
          >
            {children}
          </table>
        </div>
      )}
    </Card>
  );
}

/* ================================================================
   TABLE HEADER
   ================================================================ */

function TableHeader({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`
        px-5
        py-3.5
        text-${align}
        text-[10px]
        font-bold
        uppercase
        tracking-[0.1em]
        text-text-muted
      `}
    >
      {children}
    </th>
  );
}
