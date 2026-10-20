"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { useI18n } from "@/lib/i18n/I18nProvider";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

type SaleItem = {
  id: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  total: string;

  medicine: {
    name: string;
    genericName?: string | null;
  };

  batchAllocations: Array<{
    id: string;
    quantity: string;

    batch: {
      batchNumber: string;
      expiryDate: string;
    };
  }>;
};

type Sale = {
  id: string;
  invoiceNumber: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  status: string;
  saleDate: string;

  patient?: {
    id: string;
    name: string;
  } | null;

  soldBy?: {
    name: string;
    username: string;
  } | null;

  items: SaleItem[];

  payments: Array<{
    id: string;
    paymentMethod: string;
    amount: string;
    status: string;
    transactionReference?: string | null;
    paidAt?: string | null;
  }>;
};

type SaleResponse = {
  sale: Sale;
};

export default function SaleDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const { language } = useI18n();

  const saleId = typeof params.id === "string" ? params.id : "";

  const isArabic = language === "ar";

  const [sale, setSale] = useState<Sale | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSale() {
      try {
        setLoading(true);
        setError("");

        const response = await apiFetch<SaleResponse>(`/sales/${saleId}`);

        setSale(response.sale);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : isArabic
              ? "تعذر تحميل تفاصيل عملية البيع."
              : "Unable to load sale details.",
        );
      } finally {
        setLoading(false);
      }
    }

    if (saleId) {
      loadSale();
    }
  }, [saleId, isArabic]);

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

  function formatCurrency(value: string | number) {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value));
  }

  function formatPaymentMethod(method: string) {
    if (isArabic) {
      switch (method) {
        case "CASH":
          return "نقداً";

        case "CARD":
          return "بطاقة";

        case "BANK_TRANSFER":
          return "تحويل بنكي";

        case "MOBILE_PAYMENT":
          return "دفع إلكتروني";

        case "OTHER":
          return "أخرى";

        default:
          return method.replace(/_/g, " ").toLowerCase();
      }
    }

    return method
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatStatus(status: string) {
    if (isArabic) {
      switch (status) {
        case "COMPLETED":
          return "مكتملة";

        case "CANCELLED":
          return "ملغاة";

        case "PENDING":
          return "قيد الانتظار";

        case "PARTIALLY_PAID":
          return "مدفوعة جزئياً";

        case "PAID":
          return "مدفوعة";

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
      case "COMPLETED":
      case "PAID":
        return "success";

      case "CANCELLED":
        return "danger";

      case "PENDING":
      case "PARTIALLY_PAID":
        return "warning";

      default:
        return "neutral";
    }
  }

  const text = {
    loading: isArabic
      ? "جارٍ تحميل تفاصيل البيع..."
      : "Loading sale details...",

    backToSales: isArabic ? "العودة إلى المبيعات" : "Back to Sales",

    saleInformation: isArabic ? "معلومات البيع" : "Sale Information",

    invoiceNumber: isArabic ? "رقم الفاتورة" : "Invoice Number",

    saleDate: isArabic ? "تاريخ البيع" : "Sale Date",

    soldBy: isArabic ? "تم البيع بواسطة" : "Sold By",

    patient: isArabic ? "المريض" : "Patient",

    walkInCustomer: isArabic ? "عميل بدون وصفة" : "Walk-in customer",

    saleSummary: isArabic ? "ملخص البيع" : "Sale Summary",

    subtotal: isArabic ? "المجموع الفرعي" : "Subtotal",

    discount: isArabic ? "الخصم" : "Discount",

    tax: isArabic ? "الضريبة" : "Tax",

    total: isArabic ? "الإجمالي" : "Total",

    soldMedicines: isArabic ? "الأدوية المباعة" : "Sold Medicines",

    soldMedicinesDescription: isArabic
      ? "الأدوية المدرجة في عملية البيع هذه."
      : "Medicines included in this sale.",

    medicine: isArabic ? "الدواء" : "Medicine",

    quantity: isArabic ? "الكمية" : "Quantity",

    unitPrice: isArabic ? "سعر الوحدة" : "Unit Price",

    batch: isArabic ? "الدفعة" : "Batch",

    expiryDate: isArabic ? "تاريخ الانتهاء" : "Expiry Date",

    payment: isArabic ? "الدفع" : "Payment",

    paymentDescription: isArabic
      ? "معلومات الدفع الخاصة بعملية البيع."
      : "Payment information for this sale.",

    method: isArabic ? "طريقة الدفع" : "Method",

    amount: isArabic ? "المبلغ" : "Amount",

    reference: isArabic ? "المرجع" : "Reference",

    paidAt: isArabic ? "وقت الدفع" : "Paid At",

    status: isArabic ? "الحالة" : "Status",

    saleNotFound: isArabic ? "عملية البيع غير موجودة." : "Sale not found.",

    noPayments: isArabic ? "لا توجد معلومات دفع." : "No payment information.",

    noBatches: isArabic ? "لا توجد دفعات." : "No batch information.",
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
     ERROR
     ============================================================ */

  if (error || !sale) {
    return (
      <AppLayout>
        <div className="pb-8">
          <div className="mb-5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push("/sales")}
            >
              <span aria-hidden="true">←</span>

              {text.backToSales}
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
            {error || text.saleNotFound}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="pb-8">
        {/* ======================================================
            PAGE HEADER
            ====================================================== */}

        <div
          className="
            mb-5
            flex
            flex-wrap
            items-end
            justify-between
            gap-4
          "
        >
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push("/sales")}
              className="mb-2 -ms-2"
            >
              <span aria-hidden="true">←</span>

              {text.backToSales}
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
                {sale.invoiceNumber}
              </h1>

              <Badge variant={getStatusVariant(sale.status)}>
                {formatStatus(sale.status)}
              </Badge>
            </div>
          </div>
        </div>

        {/* ======================================================
            SALE INFORMATION + SUMMARY
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
              SALE INFORMATION
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
                {text.saleInformation}
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
              <InfoItem label={text.invoiceNumber} value={sale.invoiceNumber} />

              <InfoItem
                label={text.saleDate}
                value={formatDate(sale.saleDate)}
              />

              <InfoItem
                label={text.soldBy}
                value={sale.soldBy?.name || "-"}
                secondary={
                  sale.soldBy?.username ? `@${sale.soldBy.username}` : undefined
                }
              />

              <InfoItem
                label={text.patient}
                value={sale.patient?.name || text.walkInCustomer}
              />
            </div>
          </Card>

          {/* ====================================================
              SALE SUMMARY
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
                {text.saleSummary}
              </h2>
            </div>

            <div className="space-y-3 p-5">
              <SummaryRow
                label={text.subtotal}
                value={formatCurrency(sale.subtotal)}
              />

              <SummaryRow
                label={text.discount}
                value={`-${formatCurrency(sale.discount)}`}
                negative
              />

              <SummaryRow
                label={text.tax}
                value={`+${formatCurrency(sale.tax)}`}
              />

              <div
                className="
                  mt-4
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
                    {text.total}
                  </span>

                  <span
                    className="
                      text-lg
                      font-bold
                      text-primary
                    "
                  >
                    {formatCurrency(sale.total)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ======================================================
            SOLD MEDICINES
            ====================================================== */}

        <Card
          padding="none"
          className="
            mt-4
            overflow-hidden
          "
        >
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
              {text.soldMedicines}
            </h2>

            <p
              className="
                mt-1
                text-xs
                text-text-muted
              "
            >
              {text.soldMedicinesDescription}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table
              className="
                w-full
                min-w-[1000px]
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

                  <TableHeader>{text.unitPrice}</TableHeader>

                  <TableHeader>{text.discount}</TableHeader>

                  <TableHeader>{text.total}</TableHeader>

                  <TableHeader>{text.batch}</TableHeader>
                </tr>
              </thead>

              <tbody
                className="
                  divide-y
                  divide-border-light
                "
              >
                {sale.items.map((item) => (
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
                          {item.medicine.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p
                            className="
                                text-sm
                                font-semibold
                                text-text-primary
                              "
                          >
                            {item.medicine.name}
                          </p>

                          {item.medicine.genericName && (
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
                      {item.quantity}
                    </td>

                    {/* Unit Price */}

                    <td
                      className="
                          whitespace-nowrap
                          px-5
                          py-4
                          text-sm
                          text-text-secondary
                        "
                    >
                      {formatCurrency(item.unitPrice)}
                    </td>

                    {/* Discount */}

                    <td
                      className="
                          whitespace-nowrap
                          px-5
                          py-4
                          text-sm
                          font-medium
                          text-danger
                        "
                    >
                      -{formatCurrency(item.discount)}
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
                      {formatCurrency(item.total)}
                    </td>

                    {/* Batches */}

                    <td className="px-5 py-4">
                      {item.batchAllocations.length === 0 ? (
                        <span
                          className="
                              text-xs
                              text-text-muted
                            "
                        >
                          {text.noBatches}
                        </span>
                      ) : (
                        <div className="space-y-2">
                          {item.batchAllocations.map((allocation) => (
                            <div
                              key={allocation.id}
                              className="
                                    rounded-lg
                                    border
                                    border-border-light
                                    bg-surface-subtle
                                    px-3
                                    py-2
                                  "
                            >
                              <div
                                className="
                                      flex
                                      items-center
                                      justify-between
                                      gap-3
                                    "
                              >
                                <span
                                  className="
                                        text-xs
                                        font-semibold
                                        text-text-primary
                                      "
                                >
                                  {allocation.batch.batchNumber}
                                </span>

                                <Badge variant="neutral">
                                  × {allocation.quantity}
                                </Badge>
                              </div>

                              <p
                                className="
                                      mt-1
                                      text-[10px]
                                      text-text-muted
                                    "
                              >
                                {text.expiryDate}:{" "}
                                {formatDateOnly(allocation.batch.expiryDate)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ======================================================
            PAYMENT
            ====================================================== */}

        <Card
          padding="none"
          className="
            mt-4
            overflow-hidden
          "
        >
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
              {text.payment}
            </h2>

            <p
              className="
                mt-1
                text-xs
                text-text-muted
              "
            >
              {text.paymentDescription}
            </p>
          </div>

          {sale.payments.length === 0 ? (
            <div
              className="
                px-5
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
                {text.noPayments}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                className="
                  w-full
                  min-w-[850px]
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
                    <TableHeader>{text.method}</TableHeader>

                    <TableHeader>{text.amount}</TableHeader>

                    <TableHeader>{text.reference}</TableHeader>

                    <TableHeader>{text.paidAt}</TableHeader>

                    <TableHeader>{text.status}</TableHeader>
                  </tr>
                </thead>

                <tbody
                  className="
                    divide-y
                    divide-border-light
                  "
                >
                  {sale.payments.map((payment) => (
                    <tr
                      key={payment.id}
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
                            font-medium
                            text-text-primary
                          "
                      >
                        {formatPaymentMethod(payment.paymentMethod)}
                      </td>

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
                        {formatCurrency(payment.amount)}
                      </td>

                      <td
                        className="
                            px-5
                            py-4
                            text-sm
                            text-text-secondary
                          "
                      >
                        {payment.transactionReference || "-"}
                      </td>

                      <td
                        className="
                            whitespace-nowrap
                            px-5
                            py-4
                            text-sm
                            text-text-secondary
                          "
                      >
                        {payment.paidAt ? formatDate(payment.paidAt) : "-"}
                      </td>

                      <td className="px-5 py-4">
                        <Badge variant={getStatusVariant(payment.status)}>
                          {formatStatus(payment.status)}
                        </Badge>
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
            onClick={() => router.push("/sales")}
          >
            <span aria-hidden="true">←</span>

            {text.backToSales}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

/* ================================================================
   INFO ITEM
   ================================================================ */

function InfoItem({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string;
}) {
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

      {secondary && (
        <p
          className="
            mt-0.5
            text-xs
            text-text-muted
          "
        >
          {secondary}
        </p>
      )}
    </div>
  );
}

/* ================================================================
   SUMMARY ROW
   ================================================================ */

function SummaryRow({
  label,
  value,
  negative = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
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
          text-text-secondary
        "
      >
        {label}
      </span>

      <span
        className={`
          text-sm
          font-semibold
          ${negative ? "text-danger" : "text-text-primary"}
        `}
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
