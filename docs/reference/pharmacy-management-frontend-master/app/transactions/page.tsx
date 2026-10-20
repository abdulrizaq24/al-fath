"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { useI18n } from "@/lib/i18n/I18nProvider";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";

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

type TransactionsResponse = {
  transactions: Transaction[];
};

/* =========================================================
   DATE HELPERS
   ========================================================= */

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
   PAGE
   ========================================================= */

export default function TransactionsPage() {
  const { t, language } = useI18n();

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  /* =========================================================
     FILTER STATE
     ========================================================= */

  const [search, setSearch] = useState("");

  const [from, setFrom] = useState(getFirstDayOfMonth);

  const [to, setTo] = useState(getToday);

  const [appliedSearch, setAppliedSearch] = useState("");

  const [appliedFrom, setAppliedFrom] = useState(getFirstDayOfMonth);

  const [appliedTo, setAppliedTo] = useState(getToday);

  const isArabic = language === "ar";

  /* =========================================================
     LOAD TRANSACTIONS
     ========================================================= */

  async function loadTransactions() {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch<TransactionsResponse>(
        "/inventory/transactions",
      );

      setTransactions(response.transactions);
    } catch (err) {
      console.error("Load transactions error:", err);

      setError(
        err instanceof Error ? err.message : t("transactions.unableToLoad"),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();

    // Initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================================================
     APPLY FILTER
     ========================================================= */

  function handleApplyFilter() {
    if (from && to && from > to) {
      setError(t("reports.invalidDateRange"));
      return;
    }

    setError("");

    setAppliedSearch(search.trim());

    setAppliedFrom(from);

    setAppliedTo(to);
  }

  /* =========================================================
     CLEAR FILTER
     ========================================================= */

  function handleClearFilter() {
    const defaultFrom = getFirstDayOfMonth();

    const defaultTo = getToday();

    setSearch("");

    setFrom(defaultFrom);

    setTo(defaultTo);

    setAppliedSearch("");

    setAppliedFrom(defaultFrom);

    setAppliedTo(defaultTo);

    setError("");
  }

  /* =========================================================
     FILTER TRANSACTIONS
     ========================================================= */

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = appliedSearch.toLowerCase();

    return transactions.filter((transaction) => {
      /* -------------------------------------------------------
         Medicine search
         ------------------------------------------------------- */

      if (normalizedSearch) {
        const medicineName = transaction.medicine?.name?.toLowerCase() ?? "";

        const batchNumber = transaction.batch?.batchNumber?.toLowerCase() ?? "";

        const transactionType =
          transaction.transactionType?.toLowerCase() ?? "";

        const reason = transaction.reason?.toLowerCase() ?? "";

        const createdBy = transaction.createdBy?.name?.toLowerCase() ?? "";

        const username = transaction.createdBy?.username?.toLowerCase() ?? "";

        const matchesSearch =
          medicineName.includes(normalizedSearch) ||
          batchNumber.includes(normalizedSearch) ||
          transactionType.includes(normalizedSearch) ||
          reason.includes(normalizedSearch) ||
          createdBy.includes(normalizedSearch) ||
          username.includes(normalizedSearch);

        if (!matchesSearch) {
          return false;
        }
      }

      /* -------------------------------------------------------
         Date filtering
         ------------------------------------------------------- */

      const transactionDate = new Date(transaction.createdAt);

      if (Number.isNaN(transactionDate.getTime())) {
        return false;
      }

      const transactionDateOnly = transactionDate.toISOString().slice(0, 10);

      if (appliedFrom && transactionDateOnly < appliedFrom) {
        return false;
      }

      if (appliedTo && transactionDateOnly > appliedTo) {
        return false;
      }

      return true;
    });
  }, [transactions, appliedSearch, appliedFrom, appliedTo]);

  /* =========================================================
     FORMAT TRANSACTION TYPE
     ========================================================= */

  function formatTransactionType(type: string) {
    const normalizedType = type.toLowerCase().replace(/_/g, " ").trim();

    if (language === "ar") {
      const arabicTypes: Record<string, string> = {
        adjustment: "تعديل",
        sale: "بيع",
        purchase: "شراء",
        return: "مرتجع",
        "purchase return": "مرتجع شراء",
        "sale return": "مرتجع بيع",
        "stock adjustment": "تعديل المخزون",
        transfer: "نقل",
        expiry: "انتهاء الصلاحية",
        damaged: "تالف",
        expired: "منتهي الصلاحية",
        "opening stock": "المخزون الافتتاحي",
      };

      return arabicTypes[normalizedType] ?? type;
    }

    return normalizedType.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  /* =========================================================
     FORMAT DATE
     ========================================================= */

  function formatDate(date: string) {
    const locale = language === "ar" ? "ar-SA" : "en-GB";

    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  }

  /* =========================================================
     TRANSACTION BADGE
     ========================================================= */

  function getTransactionVariant(
    type: string,
  ): "success" | "warning" | "danger" | "info" | "neutral" {
    const normalizedType = type.toLowerCase().replace(/_/g, " ").trim();

    if (normalizedType === "sale" || normalizedType === "sale return") {
      return "info";
    }

    if (normalizedType === "purchase" || normalizedType === "purchase return") {
      return "success";
    }

    if (
      normalizedType === "damaged" ||
      normalizedType === "expired" ||
      normalizedType === "expiry"
    ) {
      return "danger";
    }

    if (
      normalizedType === "adjustment" ||
      normalizedType === "stock adjustment"
    ) {
      return "warning";
    }

    if (normalizedType === "transfer") {
      return "info";
    }

    if (normalizedType === "opening stock") {
      return "success";
    }

    return "neutral";
  }

  /* =========================================================
     QUANTITY
     ========================================================= */

  function getQuantity(quantity: string) {
    const numericQuantity = Number(quantity);

    if (Number.isNaN(numericQuantity)) {
      return {
        value: quantity,
        positive: false,
        negative: false,
      };
    }

    return {
      value: numericQuantity > 0 ? `+${quantity}` : quantity,

      positive: numericQuantity > 0,

      negative: numericQuantity < 0,
    };
  }

  /* =========================================================
     COUNT LABEL
     ========================================================= */

  function getTransactionCountLabel() {
    if (language === "ar") {
      return filteredTransactions.length === 1 ? "معاملة" : "معاملات";
    }

    return filteredTransactions.length === 1 ? "transaction" : "transactions";
  }

  /* =========================================================
     LOADING
     ========================================================= */

  if (loading) {
    return (
      <AppLayout>
        <div
          className="
            flex
            min-h-[500px]
            items-center
            justify-center
          "
          dir={isArabic ? "rtl" : "ltr"}
        >
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
              {t("transactions.loading")}
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  /* =========================================================
     MAIN UI
     ========================================================= */

  return (
    <AppLayout>
      <div className="space-y-5 pb-8" dir={isArabic ? "rtl" : "ltr"}>
        {/* =====================================================
            FILTER CARD
            ===================================================== */}

        <Card padding="none" className="overflow-hidden">
          {/* Filter header */}

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
                {t("transactions.title")}
              </h2>

              <p
                className="
                  mt-1
                  text-xs
                  text-text-muted
                "
              >
                {t("transactions.subtitle")}
              </p>
            </div>

            <div
              className="
                rounded-pill
                bg-surface-muted
                px-3
                py-1.5
                text-xs
                font-semibold
                text-text-secondary
              "
            >
              {filteredTransactions.length} {getTransactionCountLabel()}
            </div>
          </div>

          {/* ===================================================
              FILTER CONTROLS
              =================================================== */}

          <div className="p-5 lg:p-6">
            <div
              className="
                grid
                gap-4
                md:grid-cols-2
                xl:grid-cols-[1.5fr_1fr_1fr_auto_auto]
                xl:items-end
              "
            >
              {/* Search */}

              <Input
                label={t("transactions.medicine")}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search medicine..."
                autoComplete="off"
              />

              {/* From */}

              <Input
                label={t("reports.from")}
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                lang={isArabic ? "ar-SA" : "en-GB"}
              />

              {/* To */}

              <Input
                label={t("reports.to")}
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                lang={isArabic ? "ar-SA" : "en-GB"}
              />

              {/* Apply */}

              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleApplyFilter}
              >
                {t("reports.applyFilter")}
              </Button>

              {/* Clear */}

              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleClearFilter}
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Error */}

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
            TRANSACTIONS TABLE
            ===================================================== */}

        <Card padding="none" className="overflow-hidden">
          {/* Table header */}

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
                {t("transactions.inventoryTransactions")}
              </h2>

              <p
                className="
                  mt-1
                  text-xs
                  text-text-muted
                "
              >
                {t("transactions.inventoryTransactionsDescription")}
              </p>
            </div>

            {(appliedSearch || appliedFrom || appliedTo) && (
              <div
                className="
                  text-xs
                  text-text-muted
                "
              >
                {appliedSearch && (
                  <span>
                    {t("transactions.medicine")}:{" "}
                    <span className="font-semibold text-text-secondary">
                      {appliedSearch}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ===================================================
              EMPTY FILTER RESULT
              =================================================== */}

          {filteredTransactions.length === 0 ? (
            <div
              className="
                flex
                min-h-[300px]
                items-center
                justify-center
                px-6
                py-16
              "
            >
              <div className="text-center">
                <div
                  className="
                    mx-auto
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-xl
                    bg-primary-soft
                    text-primary
                  "
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="7" />

                    <path d="m20 20-4-4" />
                  </svg>
                </div>

                <p
                  className="
                    mt-4
                    text-sm
                    font-semibold
                    text-text-primary
                  "
                >
                  {t("transactions.noTransactions")}
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    text-text-muted
                  "
                >
                  Try changing the search or date range.
                </p>

                <div className="mt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleClearFilter}
                  >
                    Clear filters
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* =================================================
               TABLE
               ================================================= */

            <div className="overflow-x-auto">
              <table
                className="
                  w-full
                  min-w-[1050px]
                "
              >
                <thead
                  className="
                    border-b
                    border-border-light
                    bg-surface-muted
                  "
                >
                  <tr>
                    <TableHeader>{t("transactions.date")}</TableHeader>

                    <TableHeader>{t("transactions.type")}</TableHeader>

                    <TableHeader>{t("transactions.medicine")}</TableHeader>

                    <TableHeader>{t("transactions.batch")}</TableHeader>

                    <TableHeader>{t("transactions.quantity")}</TableHeader>

                    <TableHeader>{t("transactions.reason")}</TableHeader>

                    <TableHeader>{t("transactions.createdBy")}</TableHeader>
                  </tr>
                </thead>

                <tbody
                  className="
                    divide-y
                    divide-border-light
                  "
                >
                  {filteredTransactions.map((transaction) => {
                    const quantity = getQuantity(transaction.quantity);

                    return (
                      <tr
                        key={transaction.id}
                        className="
                            transition-colors
                            duration-150
                            hover:bg-surface-subtle
                          "
                      >
                        {/* Date */}

                        <td
                          className="
                              whitespace-nowrap
                              px-5
                              py-4
                              text-sm
                              text-text-secondary
                            "
                        >
                          {formatDate(transaction.createdAt)}
                        </td>

                        {/* Type */}

                        <td className="px-5 py-4">
                          <Badge
                            variant={getTransactionVariant(
                              transaction.transactionType,
                            )}
                          >
                            {formatTransactionType(transaction.transactionType)}
                          </Badge>
                        </td>

                        {/* Medicine */}

                        <td className="px-5 py-4">
                          <div
                            className="
                                flex
                                items-center
                                gap-3
                              "
                          >
                            <div
                              className="
                                  flex
                                  h-9
                                  w-9
                                  shrink-0
                                  items-center
                                  justify-center
                                  rounded-xl
                                  bg-primary-soft
                                  text-xs
                                  font-bold
                                  text-primary
                                "
                            >
                              {(transaction.medicine?.name ?? "M")
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <p
                              className="
                                  text-sm
                                  font-semibold
                                  text-text-primary
                                "
                            >
                              {transaction.medicine?.name ??
                                t("transactions.unknownMedicine")}
                            </p>
                          </div>
                        </td>

                        {/* Batch */}

                        <td
                          className="
                              px-5
                              py-4
                              text-sm
                              text-text-secondary
                            "
                        >
                          {transaction.batch?.batchNumber ?? "—"}
                        </td>

                        {/* Quantity */}

                        <td className="px-5 py-4">
                          <span
                            className={`
                                text-sm
                                font-bold
                                ${
                                  quantity.positive
                                    ? "text-success"
                                    : quantity.negative
                                      ? "text-danger"
                                      : "text-text-secondary"
                                }
                              `}
                          >
                            {quantity.value}
                          </span>
                        </td>

                        {/* Reason */}

                        <td
                          className="
                              max-w-xs
                              px-5
                              py-4
                              text-sm
                              leading-6
                              text-text-secondary
                            "
                        >
                          {transaction.reason ?? "—"}
                        </td>

                        {/* Created By */}

                        <td className="px-5 py-4">
                          <div>
                            <p
                              className="
                                  text-sm
                                  font-semibold
                                  text-text-primary
                                "
                            >
                              {transaction.createdBy?.name ?? "—"}
                            </p>

                            {transaction.createdBy?.username && (
                              <p
                                className="
                                    mt-0.5
                                    text-xs
                                    text-text-muted
                                  "
                              >
                                @{transaction.createdBy.username}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

/* ================================================================
   TABLE HEADER
   ================================================================ */

function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="
        px-5
        py-3.5
        text-start
        text-[10px]
        font-bold
        uppercase
        tracking-[0.1em]
        text-text-muted
      "
    >
      {children}
    </th>
  );
}
