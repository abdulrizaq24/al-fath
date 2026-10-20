"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { apiFetch } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { useI18n } from "@/lib/i18n/I18nProvider";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";

type Medicine = {
  id: string;
  name: string;
  genericName: string;
  brandName: string;
  dosageForm: string;
  strength: string;
  baseUnit: string;
  sellingPrice: string;
  reorderLevel: string;
};

type InventoryItem = {
  id: string;
  batchNumber: string;
  expiryDate: string;
  purchasePrice: string;
  receivedQuantity: string;
  currentQuantity: string;
  receivedAt: string;
  medicine: Medicine;
};

type InventoryResponse = {
  inventory: InventoryItem[];
};

type ExpiryStatus = "expired" | "expiringToday" | "expiringSoon" | null;

type InventoryFilter = "all" | "low-stock" | "expiring" | "expired";

export default function InventoryPage() {
  return (
    <Suspense
      fallback={
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

              <p className="mt-4 text-sm text-text-muted">
                Loading inventory...
              </p>
            </div>
          </div>
        </AppLayout>
      }
    >
      <InventoryContent />
    </Suspense>
  );
}

function InventoryContent() {
  const { t, language } = useI18n();

  const searchParams = useSearchParams();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [adjustingBatch, setAdjustingBatch] = useState<InventoryItem | null>(
    null,
  );

  const [adjustmentQuantity, setAdjustmentQuantity] = useState("");

  const [adjustmentReason, setAdjustmentReason] = useState("");

  const [adjusting, setAdjusting] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Read filter from Dashboard URL
  |--------------------------------------------------------------------------
  */

  const filterParam = searchParams.get("filter");

  const activeFilter: InventoryFilter =
    filterParam === "low-stock" ||
    filterParam === "expiring" ||
    filterParam === "expired"
      ? filterParam
      : "all";

  /*
  |--------------------------------------------------------------------------
  | Load inventory
  |--------------------------------------------------------------------------
  */

  async function loadInventory() {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch<InventoryResponse>("/inventory");

      setInventory(response.inventory);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("inventory.errors.load"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Adjustment
  |--------------------------------------------------------------------------
  */

  async function handleAdjustment() {
    if (!adjustingBatch) {
      return;
    }

    const quantity = Number(adjustmentQuantity);

    if (!Number.isInteger(quantity) || quantity === 0) {
      setError(t("inventory.validation.quantity"));
      return;
    }

    if (!adjustmentReason.trim()) {
      setError(t("inventory.validation.reason"));
      return;
    }

    try {
      setAdjusting(true);
      setError("");

      await apiFetch("/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({
          batchId: adjustingBatch.id,
          quantity,
          reason: adjustmentReason.trim(),
        }),
      });

      setAdjustingBatch(null);
      setAdjustmentQuantity("");
      setAdjustmentReason("");

      await loadInventory();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("inventory.errors.adjust"),
      );
    } finally {
      setAdjusting(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Formatting
  |--------------------------------------------------------------------------
  */

  function formatNumber(value: string | number) {
    return new Intl.NumberFormat(language === "ar" ? "ar" : "en-US").format(
      Number(value),
    );
  }

  function formatCurrency(value: string) {
    return new Intl.NumberFormat(language === "ar" ? "ar-SA" : "id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value));
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(language === "ar" ? "ar" : "en-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  }

  /*
  |--------------------------------------------------------------------------
  | DATE HELPERS
  |--------------------------------------------------------------------------
  */

  function startOfToday() {
    const date = new Date();

    date.setHours(0, 0, 0, 0);

    return date;
  }

  function getExpiryStatus(expiryDateValue: string): ExpiryStatus {
    const today = startOfToday();

    const expiryDate = new Date(expiryDateValue);

    expiryDate.setHours(0, 0, 0, 0);

    /*
    |--------------------------------------------------------------------------
    | Expired
    |--------------------------------------------------------------------------
    */

    if (expiryDate < today) {
      return "expired";
    }

    /*
    |--------------------------------------------------------------------------
    | Expiring today
    |--------------------------------------------------------------------------
    */

    if (expiryDate.getTime() === today.getTime()) {
      return "expiringToday";
    }

    /*
    |--------------------------------------------------------------------------
    | Expiring soon
    |--------------------------------------------------------------------------
    |
    | Next 30 calendar days.
    |
    */

    const daysUntilExpiry = Math.floor(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiry <= 30) {
      return "expiringSoon";
    }

    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | LOW STOCK
  |--------------------------------------------------------------------------
  */

  function isLowStock(item: InventoryItem) {
    return Number(item.currentQuantity) <= Number(item.medicine.reorderLevel);
  }

  /*
  |--------------------------------------------------------------------------
  | STATUS LABELS
  |--------------------------------------------------------------------------
  */

  function getExpiryLabel(status: ExpiryStatus) {
    switch (status) {
      case "expired":
        return language === "ar" ? "منتهي الصلاحية" : "Expired";

      case "expiringToday":
        return language === "ar" ? "ينتهي اليوم" : "Expiring Today";

      case "expiringSoon":
        return language === "ar" ? "ينتهي قريبًا" : "Expiring Soon";

      default:
        return "";
    }
  }

  /*
  |--------------------------------------------------------------------------
  | SUMMARY COUNTS
  |--------------------------------------------------------------------------
  */

  const lowStockCount = inventory.filter((item) => isLowStock(item)).length;

  const expiringTodayCount = inventory.filter(
    (item) => getExpiryStatus(item.expiryDate) === "expiringToday",
  ).length;

  const expiringSoonCount = inventory.filter(
    (item) => getExpiryStatus(item.expiryDate) === "expiringSoon",
  ).length;

  const expiredCount = inventory.filter(
    (item) => getExpiryStatus(item.expiryDate) === "expired",
  ).length;

  const expiryAlertCount =
    expiringTodayCount + expiringSoonCount + expiredCount;

  const totalStock = inventory.reduce(
    (total, item) => total + Number(item.currentQuantity),
    0,
  );

  /*
  |--------------------------------------------------------------------------
  | FILTER INVENTORY
  |--------------------------------------------------------------------------
  |
  | This is what makes the Dashboard links work.
  |
  */

  const filteredInventory =
    activeFilter === "all"
      ? inventory
      : inventory.filter((item) => {
          const expiryStatus = getExpiryStatus(item.expiryDate);

          if (activeFilter === "low-stock") {
            return isLowStock(item);
          }

          if (activeFilter === "expiring") {
            return (
              expiryStatus === "expiringToday" ||
              expiryStatus === "expiringSoon"
            );
          }

          if (activeFilter === "expired") {
            return expiryStatus === "expired";
          }

          return true;
        });

  /*
  |--------------------------------------------------------------------------
  | FILTER TITLE
  |--------------------------------------------------------------------------
  */

  function getFilterTitle() {
    switch (activeFilter) {
      case "low-stock":
        return language === "ar" ? "مخزون منخفض" : "Low Stock Batches";

      case "expiring":
        return language === "ar"
          ? "المخزون الذي تنتهي صلاحيته"
          : "Expiring Inventory";

      case "expired":
        return language === "ar"
          ? "المخزون منتهي الصلاحية"
          : "Expired Inventory";

      default:
        return t("inventory.table.title");
    }
  }

  function getFilterDescription() {
    switch (activeFilter) {
      case "low-stock":
        return language === "ar"
          ? "الدفعات التي وصلت إلى مستوى إعادة الطلب أو أقل."
          : "Batches at or below their reorder level.";

      case "expiring":
        return language === "ar"
          ? "الدفعات التي تنتهي صلاحيتها اليوم أو خلال 30 يومًا."
          : "Batches expiring today or within the next 30 days.";

      case "expired":
        return language === "ar"
          ? "الدفعات التي انتهت صلاحيتها قبل اليوم."
          : "Batches that expired before today.";

      default:
        return t("inventory.table.description");
    }
  }

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
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

            <p className="mt-4 text-sm text-text-muted">
              {t("inventory.loading")}
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | PAGE
  |--------------------------------------------------------------------------
  */

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
            SUMMARY
            ===================================================== */}

        <div
          className="
            grid
            gap-4
            sm:grid-cols-2
            xl:grid-cols-4
          "
        >
          <InventoryStatCard
            label={t("inventory.stats.batches")}
            value={formatNumber(inventory.length)}
            description={t("inventory.stats.batchesDescription")}
          />

          <InventoryStatCard
            label={t("inventory.stats.totalStock")}
            value={formatNumber(totalStock)}
            description={t("inventory.stats.totalStockDescription")}
          />

          <InventoryStatCard
            label={t("inventory.stats.lowStock")}
            value={formatNumber(lowStockCount)}
            description={
              lowStockCount === 1
                ? "1 batch needs attention"
                : `${lowStockCount} batches need attention`
            }
            danger={lowStockCount > 0}
          />

          <InventoryStatCard
            label={language === "ar" ? "تنبيهات الصلاحية" : "Expiry Alerts"}
            value={formatNumber(expiryAlertCount)}
            description={
              language === "ar"
                ? `${expiringTodayCount} ينتهي اليوم · ${expiringSoonCount} قريبًا · ${expiredCount} منتهي`
                : `${expiringTodayCount} today · ${expiringSoonCount} soon · ${expiredCount} expired`
            }
            danger={expiryAlertCount > 0}
          />
        </div>

        {/* =====================================================
            INVENTORY TABLE
            ===================================================== */}

        <Card padding="none" className="mt-5 overflow-hidden">
          <div
            className="
              border-b
              border-border-light
              px-5
              py-5
              lg:px-6
            "
          >
            <div
              className="
                flex
                flex-col
                gap-3
                sm:flex-row
                sm:items-center
                sm:justify-between
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
                  {getFilterTitle()}
                </h2>

                <p
                  className="
                    mt-1
                    text-xs
                    text-text-muted
                  "
                >
                  {getFilterDescription()}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Active filter */}

                {activeFilter !== "all" && (
                  <a
                    href="/inventory"
                    className="
                      rounded-lg
                      border
                      border-border
                      bg-surface
                      px-3
                      py-1.5
                      text-xs
                      font-medium
                      text-text-secondary
                      transition
                      hover:border-primary
                      hover:text-primary
                    "
                  >
                    {language === "ar" ? "عرض الكل" : "Show All"}
                  </a>
                )}

                {expiredCount > 0 && (
                  <Badge variant="danger">
                    {formatNumber(expiredCount)}{" "}
                    {language === "ar" ? "منتهي" : "Expired"}
                  </Badge>
                )}

                {expiringTodayCount > 0 && (
                  <Badge variant="warning">
                    {formatNumber(expiringTodayCount)}{" "}
                    {language === "ar" ? "ينتهي اليوم" : "Today"}
                  </Badge>
                )}

                {expiringSoonCount > 0 && (
                  <Badge variant="warning">
                    {formatNumber(expiringSoonCount)}{" "}
                    {language === "ar" ? "ينتهي قريبًا" : "Expiring"}
                  </Badge>
                )}

                {lowStockCount > 0 && (
                  <Badge variant="danger">
                    {formatNumber(lowStockCount)}{" "}
                    {t("inventory.status.lowStock")}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* ===================================================
              EMPTY FILTER RESULT
              =================================================== */}

          {filteredInventory.length === 0 ? (
            <div className="px-5 py-14 text-center">
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
                  text-lg
                  font-bold
                  text-primary
                "
              >
                ✓
              </div>

              <p
                className="
                  mt-4
                  text-sm
                  font-semibold
                  text-text-primary
                "
              >
                {activeFilter === "all"
                  ? t("inventory.empty.title")
                  : language === "ar"
                    ? "لا توجد دفعات مطابقة"
                    : "No matching batches"}
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  text-text-muted
                "
              >
                {activeFilter === "all"
                  ? t("inventory.empty.description")
                  : language === "ar"
                    ? "لا توجد دفعات حاليًا ضمن هذا التصنيف."
                    : "There are currently no batches in this category."}
              </p>

              {activeFilter !== "all" && (
                <a
                  href="/inventory"
                  className="
                    mt-5
                    inline-flex
                    rounded-xl
                    bg-primary
                    px-4
                    py-2.5
                    text-sm
                    font-semibold
                    text-white
                    transition
                    hover:opacity-90
                  "
                >
                  {language === "ar" ? "عرض كل المخزون" : "View All Inventory"}
                </a>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                className="
                  w-full
                  min-w-[1150px]
                  text-start
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
                    <TableHeader>{t("inventory.fields.medicine")}</TableHeader>

                    <TableHeader>{t("inventory.fields.batch")}</TableHeader>

                    <TableHeader>{t("inventory.fields.stock")}</TableHeader>

                    <TableHeader>{t("inventory.fields.received")}</TableHeader>

                    <TableHeader>{t("inventory.fields.expiry")}</TableHeader>

                    <TableHeader>{t("inventory.fields.status")}</TableHeader>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border-light">
                  {filteredInventory.map((item) => {
                    const expiryStatus = getExpiryStatus(item.expiryDate);

                    const lowStock = isLowStock(item);

                    return (
                      <tr
                        key={item.id}
                        className="
                            transition-colors
                            duration-150
                            hover:bg-surface-subtle
                          "
                      >
                        {/* =========================================
                              MEDICINE
                              ========================================= */}

                        <td className="px-5 py-5">
                          <div className="flex items-center gap-3">
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
                              {item.medicine.name.charAt(0).toUpperCase()}
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
                                {item.medicine.name}
                              </p>

                              <p
                                className="
                                    mt-1
                                    truncate
                                    text-xs
                                    text-text-muted
                                  "
                              >
                                {item.medicine.genericName}

                                {" · "}

                                {item.medicine.strength}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* =========================================
                              BATCH
                              ========================================= */}

                        <td className="px-5 py-5">
                          <p
                            className="
                                text-sm
                                font-semibold
                                text-text-secondary
                              "
                          >
                            {item.batchNumber}
                          </p>

                          {expiryStatus === "expiringToday" && (
                            <p
                              className="
                                  mt-1
                                  text-[11px]
                                  font-medium
                                  text-amber-600
                                "
                            >
                              {language === "ar"
                                ? "ينتهي اليوم"
                                : "Expiring Today"}
                            </p>
                          )}
                        </td>

                        {/* =========================================
                              STOCK
                              ========================================= */}

                        <td className="px-5 py-5">
                          <div className="flex items-center gap-2">
                            <p
                              className={`
                                  text-sm
                                  font-bold
                                  ${
                                    lowStock
                                      ? "text-danger"
                                      : "text-text-primary"
                                  }
                                `}
                            >
                              {formatNumber(item.currentQuantity)}
                            </p>

                            {lowStock && (
                              <span
                                className="
                                    h-1.5
                                    w-1.5
                                    rounded-full
                                    bg-danger
                                  "
                                aria-label="Low stock"
                              />
                            )}
                          </div>

                          <p
                            className="
                                mt-1
                                text-xs
                                text-text-muted
                              "
                          >
                            {item.medicine.baseUnit}
                          </p>
                        </td>

                        {/* =========================================
                              RECEIVED
                              ========================================= */}

                        <td className="px-5 py-5">
                          <p
                            className="
                                text-sm
                                text-text-secondary
                              "
                          >
                            {formatNumber(item.receivedQuantity)}
                          </p>

                          <p
                            className="
                                mt-1
                                text-xs
                                text-text-muted
                              "
                          >
                            {formatCurrency(item.purchasePrice)}
                          </p>
                        </td>

                        {/* =========================================
                              EXPIRY
                              ========================================= */}

                        <td className="px-5 py-5">
                          <div>
                            <p
                              className={`
                                  text-sm
                                  font-medium
                                  ${
                                    expiryStatus
                                      ? expiryStatus === "expired"
                                        ? "text-danger"
                                        : "text-warning"
                                      : "text-text-secondary"
                                  }
                                `}
                            >
                              {formatDate(item.expiryDate)}
                            </p>

                            {expiryStatus && (
                              <p
                                className={`
                                    mt-1
                                    text-[11px]
                                    font-medium
                                    ${
                                      expiryStatus === "expired"
                                        ? "text-danger"
                                        : "text-amber-600"
                                    }
                                  `}
                              >
                                {getExpiryLabel(expiryStatus)}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* =========================================
                              STATUS
                              ========================================= */}

                        <td className="px-5 py-5">
                          <div
                            className="
                                flex
                                flex-wrap
                                items-center
                                gap-2
                              "
                          >
                            {/* Expired */}

                            {expiryStatus === "expired" && (
                              <Badge variant="danger">
                                {getExpiryLabel(expiryStatus)}
                              </Badge>
                            )}

                            {/* Expiring today */}

                            {expiryStatus === "expiringToday" && (
                              <Badge variant="warning">
                                {getExpiryLabel(expiryStatus)}
                              </Badge>
                            )}

                            {/* Expiring soon */}

                            {expiryStatus === "expiringSoon" && (
                              <Badge variant="warning">
                                {getExpiryLabel(expiryStatus)}
                              </Badge>
                            )}

                            {/* Low stock */}

                            {lowStock && (
                              <Badge variant="danger">
                                {t("inventory.status.lowStock")}
                              </Badge>
                            )}

                            {/* Normal */}

                            {!expiryStatus && !lowStock && (
                              <Badge variant="success">
                                {t("inventory.status.inStock")}
                              </Badge>
                            )}

                            {/* Adjust */}

                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setAdjustingBatch(item);

                                setAdjustmentQuantity("");

                                setAdjustmentReason("");

                                setError("");
                              }}
                            >
                              {t("inventory.actions.adjust")}
                            </Button>
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

        {/* =====================================================
            ADJUSTMENT MODAL
            ===================================================== */}

        <Modal
          open={Boolean(adjustingBatch)}
          onClose={() => {
            if (adjusting) {
              return;
            }

            setAdjustingBatch(null);
            setAdjustmentQuantity("");
            setAdjustmentReason("");
            setError("");
          }}
          title={
            adjustingBatch
              ? adjustingBatch.medicine.name
              : t("inventory.adjustment.label")
          }
          description={
            adjustingBatch
              ? `${t(
                  "inventory.adjustment.batch",
                )} ${adjustingBatch.batchNumber}`
              : undefined
          }
          size="md"
          closeOnOverlayClick={!adjusting}
          showCloseButton={!adjusting}
          footer={
            <div className="flex w-full justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={adjusting}
                onClick={() => {
                  setAdjustingBatch(null);
                  setAdjustmentQuantity("");
                  setAdjustmentReason("");
                  setError("");
                }}
              >
                {t("inventory.actions.cancel")}
              </Button>

              <Button
                type="button"
                variant="primary"
                disabled={adjusting}
                onClick={handleAdjustment}
              >
                {adjusting
                  ? t("inventory.actions.saving")
                  : t("inventory.actions.saveAdjustment")}
              </Button>
            </div>
          }
        >
          {adjustingBatch && (
            <div className="space-y-5 p-6">
              {/* Current stock */}

              <div
                className="
                  rounded-2xl
                  border
                  border-border-green
                  bg-surface-green
                  p-4
                "
              >
                <p
                  className="
                    text-xs
                    font-medium
                    text-text-muted
                  "
                >
                  {t("inventory.adjustment.currentStock")}
                </p>

                <div
                  className="
                    mt-1
                    flex
                    items-baseline
                    gap-2
                  "
                >
                  <p
                    className="
                      text-2xl
                      font-bold
                      tracking-tight
                      text-primary
                    "
                  >
                    {formatNumber(adjustingBatch.currentQuantity)}
                  </p>

                  <span
                    className="
                      text-xs
                      text-text-secondary
                    "
                  >
                    {adjustingBatch.medicine.baseUnit}
                  </span>
                </div>
              </div>

              {/* Quantity */}

              <Input
                id="adjustment-quantity"
                label={t("inventory.adjustment.quantity")}
                helperText={t("inventory.adjustment.quantityHelp")}
                type="number"
                value={adjustmentQuantity}
                onChange={(event) => setAdjustmentQuantity(event.target.value)}
                placeholder={t("inventory.adjustment.quantityPlaceholder")}
                disabled={adjusting}
              />

              {/* Reason */}

              <div>
                <label
                  htmlFor="adjustment-reason"
                  className="
                    mb-2
                    block
                    text-xs
                    font-bold
                    text-text-secondary
                  "
                >
                  {t("inventory.adjustment.reason")}
                </label>

                <textarea
                  id="adjustment-reason"
                  value={adjustmentReason}
                  onChange={(event) => setAdjustmentReason(event.target.value)}
                  placeholder={t("inventory.adjustment.reasonPlaceholder")}
                  rows={4}
                  disabled={adjusting}
                  className="
                    w-full
                    resize-none
                    rounded-xl
                    border
                    border-border
                    bg-surface
                    px-3.5
                    py-3
                    text-sm
                    text-text-primary
                    outline-none
                    transition-all
                    duration-200
                    placeholder:text-text-muted
                    hover:border-primary/20
                    focus:border-primary
                    focus:ring-2
                    focus:ring-primary/10
                    disabled:cursor-not-allowed
                    disabled:bg-surface-muted
                    disabled:opacity-60
                  "
                />
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AppLayout>
  );
}

/* ============================================================
   TABLE HEADER
   ============================================================ */

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

/* ============================================================
   INVENTORY STAT CARD
   ============================================================ */

function InventoryStatCard({
  label,
  value,
  description,
  danger = false,
}: {
  label: string;
  value: string;
  description: string;
  danger?: boolean;
}) {
  return (
    <Card
      padding="md"
      className={danger ? "border-red-200 bg-danger-soft" : undefined}
    >
      <p
        className={`
          text-xs
          font-medium
          ${danger ? "text-red-700" : "text-text-muted"}
        `}
      >
        {label}
      </p>

      <p
        className={`
          mt-2
          text-3xl
          font-bold
          tracking-tight
          ${danger ? "text-danger" : "text-text-primary"}
        `}
      >
        {value}
      </p>

      <p
        className={`
          mt-1
          text-xs
          ${danger ? "text-red-500" : "text-text-muted"}
        `}
      >
        {description}
      </p>
    </Card>
  );
}
