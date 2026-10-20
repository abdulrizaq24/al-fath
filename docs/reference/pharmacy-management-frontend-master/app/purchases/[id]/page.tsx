"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { useI18n } from "@/lib/i18n/I18nProvider";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

type Supplier = {
  id: string;
  name: string;
};

type Medicine = {
  id: string;
  name: string;
  genericName?: string | null;
};

type PurchaseItem = {
  id: string;
  medicineId: string;
  orderedQuantity: string;
  unitCost: string;
  totalCost: string;
  medicine?: Medicine;
};

type Purchase = {
  id: string;
  purchaseNumber: string;
  status: string;
  expectedDate?: string | null;
  notes?: string | null;
  totalAmount: string;
  createdAt: string;
  supplier?: Supplier;
  items: PurchaseItem[];
};

type PurchasesResponse = {
  purchases: Purchase[];
};

export default function PurchaseDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const { language } = useI18n();

  const purchaseId = typeof params.id === "string" ? params.id : "";

  const [purchase, setPurchase] = useState<Purchase | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const isArabic = language === "ar";

  useEffect(() => {
    async function loadPurchase() {
      if (!purchaseId) {
        setError(
          isArabic ? "معرّف عملية الشراء غير صالح." : "Invalid purchase ID.",
        );

        setLoading(false);

        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await apiFetch<PurchasesResponse>("/purchases");

        const foundPurchase = response.purchases.find(
          (item) => item.id === purchaseId,
        );

        if (!foundPurchase) {
          setError(
            isArabic ? "عملية الشراء غير موجودة." : "Purchase not found.",
          );

          return;
        }

        setPurchase(foundPurchase);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : isArabic
              ? "تعذر تحميل عملية الشراء."
              : "Unable to load purchase.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadPurchase();
  }, [purchaseId, isArabic]);

  function formatDate(date: string) {
    return new Intl.DateTimeFormat(isArabic ? "ar-SA" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  }

  function formatDateOnly(date: string) {
    return new Intl.DateTimeFormat(isArabic ? "ar-SA" : "en-GB", {
      dateStyle: "medium",
    }).format(new Date(date));
  }

  function formatMoney(value: string | number) {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value));
  }

  function formatStatus(status: string) {
    if (isArabic) {
      switch (status) {
        case "RECEIVED":
          return "تم الاستلام";

        case "PARTIALLY_RECEIVED":
          return "تم الاستلام جزئياً";

        case "CANCELLED":
          return "ملغاة";

        case "DRAFT":
          return "مسودة";

        case "ORDERED":
          return "تم الطلب";

        default:
          return status.replace(/_/g, " ").toLowerCase();
      }
    }

    return status
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function getStatusVariant(
    status: string,
  ): "success" | "warning" | "danger" | "neutral" {
    switch (status) {
      case "RECEIVED":
        return "success";

      case "PARTIALLY_RECEIVED":
        return "warning";

      case "CANCELLED":
        return "danger";

      case "DRAFT":
        return "neutral";

      default:
        return "neutral";
    }
  }

  const text = {
    loading: isArabic ? "جارٍ تحميل عملية الشراء..." : "Loading purchase...",

    backToPurchases: isArabic ? "العودة إلى المشتريات" : "Back to Purchases",

    purchaseInformation: isArabic ? "معلومات الشراء" : "Purchase Information",

    purchaseNumber: isArabic ? "رقم الشراء" : "Purchase Number",

    supplier: isArabic ? "المورد" : "Supplier",

    created: isArabic ? "تاريخ الإنشاء" : "Created",

    expectedDate: isArabic ? "التاريخ المتوقع" : "Expected Date",

    notes: isArabic ? "ملاحظات" : "Notes",

    notSpecified: isArabic ? "غير محدد" : "Not specified",

    noNotes: isArabic ? "لا توجد ملاحظات" : "No notes",

    unknownSupplier: isArabic ? "مورد غير معروف" : "Unknown supplier",

    purchaseSummary: isArabic ? "ملخص الشراء" : "Purchase Summary",

    totalItems: isArabic ? "إجمالي الأصناف" : "Total Items",

    totalQuantity: isArabic ? "إجمالي الكمية" : "Total Quantity",

    purchaseTotal: isArabic ? "إجمالي الشراء" : "Purchase Total",

    orderedMedicines: isArabic ? "الأدوية المطلوبة" : "Ordered Medicines",

    medicinesIncluded: isArabic
      ? "الأدوية المدرجة في أمر الشراء هذا."
      : "Medicines included in this purchase order.",

    medicine: isArabic ? "الدواء" : "Medicine",

    quantity: isArabic ? "الكمية" : "Quantity",

    unitCost: isArabic ? "تكلفة الوحدة" : "Unit Cost",

    totalCost: isArabic ? "التكلفة الإجمالية" : "Total Cost",

    unknownMedicine: isArabic ? "دواء غير معروف" : "Unknown medicine",

    purchaseNotFound: isArabic
      ? "عملية الشراء غير موجودة."
      : "Purchase not found.",
  };

  /* ============================================================
     LOADING
     ============================================================ */

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
              {text.loading}
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  /* ============================================================
     ERROR / NOT FOUND
     ============================================================ */

  if (error || !purchase) {
    return (
      <AppLayout>
        <div className="pb-8">
          <div className="mb-5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push("/purchases")}
            >
              <span aria-hidden="true">←</span>

              {text.backToPurchases}
            </Button>
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
            {error || text.purchaseNotFound}
          </div>
        </div>
      </AppLayout>
    );
  }

  /* ============================================================
     PURCHASE DETAILS
     ============================================================ */

  return (
    <AppLayout>
      <div className="pb-8">
        {/* ======================================================
            PAGE-SPECIFIC HEADER
            ====================================================== */}

        <div
          className="
            mb-5
            flex
            flex-wrap
            items-center
            justify-between
            gap-4
          "
        >
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push("/purchases")}
              className="mb-2 -ms-2"
            >
              <span aria-hidden="true">←</span>

              {text.backToPurchases}
            </Button>

            <div
              className="
                flex
                flex-wrap
                items-center
                gap-3
              "
            >
              <h1
                className="
                  text-xl
                  font-bold
                  tracking-tight
                  text-text-primary
                "
              >
                {purchase.purchaseNumber}
              </h1>

              <Badge variant={getStatusVariant(purchase.status)}>
                {formatStatus(purchase.status)}
              </Badge>
            </div>
          </div>
        </div>

        {/* ======================================================
            INFORMATION + SUMMARY
            ====================================================== */}

        <div
          className="
            grid
            grid-cols-1
            gap-4
            lg:grid-cols-2
          "
        >
          {/* ====================================================
              PURCHASE INFORMATION
              ==================================================== */}

          <Card padding="none">
            <div
              className="
                border-b
                border-border-light
                px-5
                py-4
              "
            >
              <h2
                className="
                  text-sm
                  font-bold
                  text-text-primary
                "
              >
                {text.purchaseInformation}
              </h2>
            </div>

            <div
              className="
                grid
                grid-cols-1
                gap-x-6
                gap-y-5
                p-5
                sm:grid-cols-2
              "
            >
              <InfoItem
                label={text.purchaseNumber}
                value={purchase.purchaseNumber}
              />

              <InfoItem
                label={text.supplier}
                value={purchase.supplier?.name ?? text.unknownSupplier}
              />

              <InfoItem
                label={text.created}
                value={formatDate(purchase.createdAt)}
              />

              <InfoItem
                label={text.expectedDate}
                value={
                  purchase.expectedDate
                    ? formatDateOnly(purchase.expectedDate)
                    : text.notSpecified
                }
              />

              <div className="sm:col-span-2">
                <InfoItem
                  label={text.notes}
                  value={purchase.notes || text.noNotes}
                />
              </div>
            </div>
          </Card>

          {/* ====================================================
              PURCHASE SUMMARY
              ==================================================== */}

          <Card padding="none">
            <div
              className="
                border-b
                border-border-light
                px-5
                py-4
              "
            >
              <h2
                className="
                  text-sm
                  font-bold
                  text-text-primary
                "
              >
                {text.purchaseSummary}
              </h2>
            </div>

            <div className="space-y-4 p-5">
              <SummaryRow
                label={text.totalItems}
                value={String(purchase.items.length)}
              />

              <SummaryRow
                label={text.totalQuantity}
                value={String(
                  purchase.items.reduce(
                    (total, item) => total + Number(item.orderedQuantity),
                    0,
                  ),
                )}
              />

              <div
                className="
                  rounded-xl
                  border
                  border-border-green
                  bg-surface-green
                  px-4
                  py-4
                "
              >
                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                  "
                >
                  <span
                    className="
                      text-sm
                      font-medium
                      text-text-secondary
                    "
                  >
                    {text.purchaseTotal}
                  </span>

                  <span
                    className="
                      text-lg
                      font-bold
                      text-primary
                    "
                  >
                    {formatMoney(purchase.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ======================================================
            ORDERED MEDICINES
            ====================================================== */}

        <Card padding="none" className="mt-4 overflow-hidden">
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
              {text.orderedMedicines}
            </h2>

            <p
              className="
                mt-1
                text-xs
                text-text-muted
              "
            >
              {text.medicinesIncluded}
            </p>
          </div>

          {purchase.items.length === 0 ? (
            <div
              className="
                px-5
                py-12
                text-center
              "
            >
              <p
                className="
                  text-sm
                  text-text-muted
                "
              >
                {text.orderedMedicines}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                className="
                  w-full
                  min-w-[800px]
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
                    <TableHeader>{text.medicine}</TableHeader>

                    <TableHeader>{text.quantity}</TableHeader>

                    <TableHeader>{text.unitCost}</TableHeader>

                    <TableHeader>{text.totalCost}</TableHeader>
                  </tr>
                </thead>

                <tbody
                  className="
                    divide-y
                    divide-border-light
                  "
                >
                  {purchase.items.map((item) => (
                    <tr
                      key={item.id}
                      className="
                          transition-colors
                          duration-150
                          hover:bg-surface-subtle
                        "
                    >
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
                            {(item.medicine?.name ?? text.unknownMedicine)
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <p
                              className="
                                  text-sm
                                  font-semibold
                                  text-text-primary
                                "
                            >
                              {item.medicine?.name ?? text.unknownMedicine}
                            </p>

                            {item.medicine?.genericName && (
                              <p
                                className="
                                    mt-0.5
                                    text-xs
                                    text-text-muted
                                  "
                              >
                                {item.medicine.genericName}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Quantity */}

                      <td
                        className="
                            px-5
                            py-4
                            text-sm
                            font-medium
                            text-text-secondary
                          "
                      >
                        {item.orderedQuantity}
                      </td>

                      {/* Unit Cost */}

                      <td
                        className="
                            whitespace-nowrap
                            px-5
                            py-4
                            text-sm
                            text-text-secondary
                          "
                      >
                        {formatMoney(item.unitCost)}
                      </td>

                      {/* Total */}

                      <td
                        className="
                            whitespace-nowrap
                            px-5
                            py-4
                            text-sm
                            font-bold
                            text-text-primary
                          "
                      >
                        {formatMoney(item.totalCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ======================================================
            BACK BUTTON
            ====================================================== */}

        <div className="mt-5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => router.push("/purchases")}
          >
            <span aria-hidden="true">←</span>

            {text.backToPurchases}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

/* ================================================================
   INFO ITEM
   ================================================================ */

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
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
        className="
          mt-1.5
          text-sm
          font-medium
          text-text-primary
        "
      >
        {value}
      </p>
    </div>
  );
}

/* ================================================================
   SUMMARY ROW
   ================================================================ */

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="
        flex
        items-center
        justify-between
        gap-4
        rounded-xl
        bg-surface-muted
        px-4
        py-3
      "
    >
      <span
        className="
          text-sm
          text-text-secondary
        "
      >
        {label}
      </span>

      <span
        className="
          text-sm
          font-bold
          text-text-primary
        "
      >
        {value}
      </span>
    </div>
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
