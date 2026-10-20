"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { apiFetch, getToken, removeToken } from "@/lib/api";

import AppLayout from "@/components/AppLayout";
import { useI18n } from "@/lib/i18n/I18nProvider";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

type DashboardData = {
  totalMedicines: number;
  totalStock: number;
  lowStockMedicines: number;
  expiringInventory: number;
  expiredInventory: number;
  todaySales: number;
  todayRevenue: number;
  recentTransactions: Transaction[];
};

type Transaction = {
  id: string;
  transactionType: string;
  quantity: string;
  reason?: string | null;
  createdAt: string;

  medicine?: {
    name: string;
  };

  batch?: {
    batchNumber: string;
    currentQuantity: string;
    expiryDate: string;
  };

  createdBy?: {
    name: string;
    username: string;
  };
};

type DashboardResponse = {
  dashboard: DashboardData;
};

export default function DashboardPage() {
  const router = useRouter();

  const { t, language } = useI18n();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.replace("/");
      return;
    }

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const response =
          await apiFetch<DashboardResponse>("/reports/dashboard");

        setDashboard(response.dashboard);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("dashboard.errors.loadFailed");

        if (
          message.toLowerCase().includes("authentication") ||
          message.toLowerCase().includes("unauthorized")
        ) {
          removeToken();

          localStorage.removeItem("pharmacy_user");

          router.replace("/");
          return;
        }

        setError(message);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router, t]);

  function formatNumber(value: number) {
    return new Intl.NumberFormat(language === "ar" ? "ar" : "en-US").format(
      value,
    );
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat(language === "ar" ? "ar" : "id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatTransactionType(type: string) {
    return type
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[500px] items-center justify-center">
          <Card padding="lg" className="text-center">
            <div
              className="
                mx-auto
                h-9
                w-9
                animate-spin
                rounded-full
                border-[3px]
                border-border
                border-t-primary
              "
            />

            <p
              className="
                mt-4
                text-sm
                font-medium
                text-text-secondary
              "
            >
              {t("dashboard.loading")}
            </p>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const lowStockCount = dashboard?.lowStockMedicines ?? 0;

  const expiringCount = dashboard?.expiringInventory ?? 0;

  const expiredCount = dashboard?.expiredInventory ?? 0;

  const todaySales = dashboard?.todaySales ?? 0;

  const todayRevenue = dashboard?.todayRevenue ?? 0;

  return (
    <AppLayout>
      <div className="pb-8">
        {/* =====================================================
            ERROR
            ===================================================== */}

        {error && (
          <div
            className="
              mb-5
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
        )}

        {/* =====================================================
            KPI CARDS
            ===================================================== */}

        <div
          className="
            grid
            gap-4
            sm:grid-cols-2
            xl:grid-cols-4
          "
        >
          <Link
            href="/medicines"
            className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <StatCard
              highlighted
              label={t("dashboard.stats.totalMedicines")}
              value={formatNumber(dashboard?.totalMedicines ?? 0)}
              description={t("dashboard.stats.totalMedicinesDescription")}
            />
          </Link>

          <Link
            href="/inventory"
            className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <StatCard
              label={t("dashboard.stats.totalStock")}
              value={formatNumber(dashboard?.totalStock ?? 0)}
              description={t("dashboard.stats.totalStockDescription")}
            />
          </Link>

          <Link
            href="/inventory?filter=low-stock"
            className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <StatCard
              label={t("dashboard.stats.lowStock")}
              value={formatNumber(lowStockCount)}
              description={t("dashboard.stats.lowStockDescription")}
              danger={lowStockCount > 0}
            />
          </Link>

          <Link
            href="/inventory?filter=expiring"
            className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <StatCard
              label={t("dashboard.stats.expiringSoon")}
              value={formatNumber(expiringCount)}
              description={t("dashboard.stats.expiringSoonDescription")}
              warning={expiringCount > 0}
            />
          </Link>
        </div>

        {/* =====================================================
            SALES SUMMARY
            ===================================================== */}

        <div
          className="
            mt-4
            grid
            gap-4
            md:grid-cols-2
          "
        >
          <Link
            href="/sales"
            className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <Card>
              <div
                className="
                  flex
                  items-start
                  justify-between
                  gap-4
                "
              >
                <div>
                  <p
                    className="
                      text-sm
                      font-bold
                      text-text-primary
                    "
                  >
                    {t("dashboard.sales.todaySales")}
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      text-text-muted
                    "
                  >
                    {t("dashboard.sales.todaySalesDescription")}
                  </p>
                </div>

                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-primary-soft
                    text-sm
                    font-bold
                    text-primary
                  "
                >
                  Rp
                </div>
              </div>

              <p
                className="
                  mt-6
                  text-3xl
                  font-bold
                  tracking-tight
                  text-text-primary
                "
              >
                {formatNumber(todaySales)}
              </p>
            </Card>
          </Link>

          <Link
            href="/sales"
            className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <Card>
              <div
                className="
                  flex
                  items-start
                  justify-between
                  gap-4
                "
              >
                <div>
                  <p
                    className="
                      text-sm
                      font-bold
                      text-text-primary
                    "
                  >
                    {t("dashboard.sales.todayRevenue")}
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      text-text-muted
                    "
                  >
                    {t("dashboard.sales.todayRevenueDescription")}
                  </p>
                </div>

                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-primary
                    text-xs
                    font-bold
                    text-white
                  "
                >
                  IDR
                </div>
              </div>

              <p
                className="
                  mt-6
                  text-3xl
                  font-bold
                  tracking-tight
                  text-text-primary
                "
              >
                {formatCurrency(todayRevenue)}
              </p>
            </Card>
          </Link>
        </div>

        {/* =====================================================
            INVENTORY + TRANSACTIONS
            ===================================================== */}

        <div
          className="
            mt-4
            grid
            gap-4
            xl:grid-cols-2
          "
        >
          {/* ===================================================
              INVENTORY OVERVIEW
              =================================================== */}

          <Card>
            <div
              className="
                flex
                items-start
                justify-between
                gap-4
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
                  {t("dashboard.inventory.title")}
                </h2>

                <p
                  className="
                    mt-1
                    text-xs
                    text-text-muted
                  "
                >
                  {t("dashboard.inventory.description")}
                </p>
              </div>

              <Link href="/inventory" className="shrink-0">
                <Button variant="ghost" size="sm">
                  {t("dashboard.inventory.viewInventory")}

                  <span aria-hidden="true">→</span>
                </Button>
              </Link>
            </div>

            <div className="mt-6 space-y-2">
              <Link
                href="/inventory"
                className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <InventoryRow
                  label={t("dashboard.inventory.totalStock")}
                  value={formatNumber(dashboard?.totalStock ?? 0)}
                />
              </Link>

              <Link
                href="/inventory?filter=low-stock"
                className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <InventoryRow
                  label={t("dashboard.inventory.lowStockMedicines")}
                  value={formatNumber(lowStockCount)}
                  danger={lowStockCount > 0}
                />
              </Link>

              <Link
                href="/inventory?filter=expiring"
                className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <InventoryRow
                  label={t("dashboard.inventory.expiringInventory")}
                  value={formatNumber(expiringCount)}
                  warning={expiringCount > 0}
                />
              </Link>

              <Link
                href="/inventory?filter=expired"
                className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <InventoryRow
                  label={t("dashboard.inventory.expiredInventory")}
                  value={formatNumber(expiredCount)}
                  danger={expiredCount > 0}
                />
              </Link>
            </div>
          </Card>

          {/* ===================================================
              RECENT TRANSACTIONS
              =================================================== */}

          <Card>
            <div
              className="
                flex
                items-start
                justify-between
                gap-4
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
                  {t("dashboard.transactions.title")}
                </h2>

                <p
                  className="
                    mt-1
                    text-xs
                    text-text-muted
                  "
                >
                  {t("dashboard.transactions.description")}
                </p>
              </div>

              <Link href="/transactions" className="shrink-0">
                <Button variant="ghost" size="sm">
                  {t("dashboard.transactions.viewAll")}

                  <span aria-hidden="true">→</span>
                </Button>
              </Link>
            </div>

            <div className="mt-6 space-y-2">
              {dashboard?.recentTransactions?.length ? (
                dashboard.recentTransactions.slice(0, 5).map((transaction) => (
                  <Link
                    key={transaction.id}
                    href="/transactions"
                    className="
                        block
                        rounded-xl
                        focus:outline-none
                        focus:ring-2
                        focus:ring-primary
                      "
                  >
                    <TransactionRow
                      type={formatTransactionType(transaction.transactionType)}
                      medicine={
                        transaction.medicine?.name ??
                        t("dashboard.transactions.medicineTransaction")
                      }
                      quantity={transaction.quantity}
                    />
                  </Link>
                ))
              ) : (
                <div
                  className="
                    rounded-xl
                    border
                    border-border-light
                    bg-surface-muted
                    px-4
                    py-10
                    text-center
                  "
                >
                  <p
                    className="
                      text-sm
                      text-text-muted
                    "
                  >
                    {t("dashboard.transactions.noTransactions")}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

/* ================================================================
   STAT CARD
   ================================================================ */

function StatCard({
  label,
  value,
  description,
  highlighted = false,
  warning = false,
  danger = false,
}: {
  label: string;
  value: string;
  description: string;
  highlighted?: boolean;
  warning?: boolean;
  danger?: boolean;
}) {
  if (highlighted) {
    return (
      <div
        className="
          min-h-[138px]
          rounded-xl
          border
          border-primary
          bg-primary
          p-5
          text-white
          shadow-primary
          transition-all
          duration-200
          hover:-translate-y-[1px]
          hover:shadow-lg
        "
      >
        <p
          className="
            text-xs
            font-semibold
            text-white/70
          "
        >
          {label}
        </p>

        <p
          className="
            mt-4
            text-3xl
            font-bold
            leading-none
            tracking-tight
            text-white
          "
        >
          {value}
        </p>

        <p
          className="
            mt-3
            text-[11px]
            text-white/60
          "
        >
          {description}
        </p>
      </div>
    );
  }

  const statusVariant = danger ? "danger" : warning ? "warning" : "neutral";

  return (
    <div
      className={`
        min-h-[138px]
        rounded-xl
        border
        p-5
        shadow-card
        transition-all
        duration-200
        hover:-translate-y-[1px]
        hover:shadow-lg
        ${
          danger
            ? "border-red-200 bg-danger-soft"
            : warning
              ? "border-amber-200 bg-warning-soft"
              : "border-border-light bg-surface"
        }
      `}
    >
      <div
        className="
          flex
          items-start
          justify-between
          gap-3
        "
      >
        <p
          className={`
            text-xs
            font-semibold
            ${
              danger
                ? "text-red-700"
                : warning
                  ? "text-amber-700"
                  : "text-text-secondary"
            }
          `}
        >
          {label}
        </p>

        {(danger || warning) && <Badge variant={statusVariant}>!</Badge>}
      </div>

      <p
        className={`
          mt-4
          text-3xl
          font-bold
          leading-none
          tracking-tight
          ${
            danger
              ? "text-danger"
              : warning
                ? "text-warning"
                : "text-text-primary"
          }
        `}
      >
        {value}
      </p>

      <p
        className={`
          mt-3
          text-[11px]
          ${
            danger
              ? "text-red-500"
              : warning
                ? "text-amber-600"
                : "text-text-muted"
          }
        `}
      >
        {description}
      </p>
    </div>
  );
}

/* ================================================================
   INVENTORY ROW
   ================================================================ */

function InventoryRow({
  label,
  value,
  warning = false,
  danger = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`
        flex
        min-h-[50px]
        items-center
        justify-between
        rounded-xl
        px-4
        transition
        hover:opacity-80
        ${
          danger
            ? "bg-danger-soft"
            : warning
              ? "bg-warning-soft"
              : "bg-surface-muted"
        }
      `}
    >
      <span
        className={`
          text-sm
          ${
            danger
              ? "text-red-700"
              : warning
                ? "text-amber-700"
                : "text-text-secondary"
          }
        `}
      >
        {label}
      </span>

      <span
        className={`
          text-sm
          font-bold
          ${
            danger
              ? "text-danger"
              : warning
                ? "text-warning"
                : "text-text-primary"
          }
        `}
      >
        {value}
      </span>
    </div>
  );
}

/* ================================================================
   TRANSACTION ROW
   ================================================================ */

function TransactionRow({
  type,
  medicine,
  quantity,
}: {
  type: string;
  medicine: string;
  quantity: string;
}) {
  const positive = Number(quantity) > 0;

  return (
    <div
      className="
        flex
        min-h-[60px]
        items-center
        justify-between
        rounded-xl
        border
        border-border-light
        bg-surface
        px-4
        transition-all
        duration-150
        hover:border-border-green
        hover:bg-surface-subtle
      "
    >
      <div
        className="
          flex
          min-w-0
          items-center
          gap-3
        "
      >
        <div
          className={`
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-xl
            text-sm
            font-bold
            ${
              positive
                ? "bg-primary-soft text-primary"
                : "bg-danger-soft text-danger"
            }
          `}
        >
          {positive ? "+" : "−"}
        </div>

        <div className="min-w-0">
          <p
            className="
              truncate
              text-sm
              font-semibold
              text-text-primary
            "
          >
            {type}
          </p>

          <p
            className="
              mt-0.5
              truncate
              text-[11px]
              text-text-muted
            "
          >
            {medicine}
          </p>
        </div>
      </div>

      <span
        className={`
          ms-4
          shrink-0
          text-sm
          font-bold
          ${positive ? "text-primary-light" : "text-danger"}
        `}
      >
        {positive ? "+" : ""}
        {quantity}
      </span>
    </div>
  );
}
