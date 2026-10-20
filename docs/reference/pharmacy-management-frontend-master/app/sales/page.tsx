"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AppLayout from "@/components/AppLayout";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n/I18nProvider";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import SearchableSelect from "@/components/ui/SearchableSelect";

type Medicine = {
  id: string;
  name: string;
  genericName?: string | null;
  strength?: string | null;
  unit?: string | null;
  sellingPrice?: string | number | null;
  isActive?: boolean;
};

type SaleItemForm = {
  medicineId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
};

type SaleItem = {
  id: string;
  quantity: string | number;
  unitPrice: string | number;
  discount: string | number;
  total: string | number;
  medicine?: {
    name: string;
  } | null;
};

type Sale = {
  id: string;
  invoiceNumber: string;
  subtotal: string | number;
  discount: string | number;
  tax: string | number;
  total: string | number;
  status: string;
  saleDate: string;
  patient?: {
    name?: string | null;
  } | null;
  soldBy?: {
    name?: string | null;
    username?: string | null;
  } | null;
  items?: SaleItem[];
  payments?: {
    paymentMethod: string;
    amount: string | number;
    status: string;
  }[];
};

type MedicinesResponse = {
  medicines: Medicine[];
};

type SalesResponse = {
  sales: Sale[];
};

type PaymentMethod =
  | "CASH"
  | "CARD"
  | "BANK_TRANSFER"
  | "MOBILE_PAYMENT"
  | "OTHER";

const paymentMethods: {
  value: PaymentMethod;
  en: string;
  ar: string;
}[] = [
  {
    value: "CASH",
    en: "Cash",
    ar: "نقداً",
  },
  {
    value: "CARD",
    en: "Card",
    ar: "بطاقة",
  },
  {
    value: "BANK_TRANSFER",
    en: "Bank Transfer",
    ar: "تحويل بنكي",
  },
  {
    value: "MOBILE_PAYMENT",
    en: "Mobile Payment",
    ar: "دفع إلكتروني",
  },
  {
    value: "OTHER",
    en: "Other",
    ar: "أخرى",
  },
];

function createInvoiceNumber() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const random = Math.floor(1000 + Math.random() * 9000);

  return `INV-${year}${month}${day}-${random}`;
}

function createEmptyItem(): SaleItemForm {
  return {
    medicineId: "",
    quantity: 1,
    unitPrice: 0,
    discount: 0,
  };
}

function formatCurrency(value: string | number) {
  const amount = Number(value);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string, isArabic: boolean) {
  return new Intl.DateTimeFormat(isArabic ? "ar-SA" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function formatPaymentMethod(method: string, isArabic: boolean) {
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

function formatStatus(status: string, isArabic: boolean) {
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
      return "success";

    case "CANCELLED":
      return "danger";

    case "PARTIALLY_PAID":
    case "PENDING":
      return "warning";

    default:
      return "neutral";
  }
}

export default function SalesPage() {
  const { language } = useI18n();

  const isArabic = language === "ar";

  const [medicines, setMedicines] = useState<Medicine[]>([]);

  const [sales, setSales] = useState<Sale[]>([]);

  const [loading, setLoading] = useState(true);

  const [loadingSales, setLoadingSales] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [invoiceNumber, setInvoiceNumber] = useState(createInvoiceNumber);

  const [items, setItems] = useState<SaleItemForm[]>([createEmptyItem()]);

  const [saleDiscount, setSaleDiscount] = useState(0);

  const [tax, setTax] = useState(0);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");

  const [transactionReference, setTransactionReference] = useState("");

  const text = {
    createSale: isArabic ? "إنشاء عملية بيع" : "Create Sale",

    createSaleDescription: isArabic
      ? "أدخل الأدوية والكميات ومعلومات الدفع."
      : "Enter the medicines, quantities, and payment information.",

    invoiceNumber: isArabic ? "رقم الفاتورة" : "Invoice Number",

    saleItems: isArabic ? "أصناف البيع" : "Sale Items",

    saleItemsDescription: isArabic
      ? "اختر الأدوية والكمية وسعر البيع."
      : "Select medicines, quantity, and selling price.",

    addItem: isArabic ? "إضافة صنف" : "Add Item",

    medicine: isArabic ? "الدواء" : "Medicine",

    loadingMedicines: isArabic
      ? "جارٍ تحميل الأدوية..."
      : "Loading medicines...",

    selectMedicine: isArabic ? "اختر الدواء" : "Select medicine",

    quantity: isArabic ? "الكمية" : "Quantity",

    unitPrice: isArabic ? "سعر الوحدة" : "Unit Price",

    discount: isArabic ? "الخصم" : "Discount",

    remove: isArabic ? "إزالة" : "Remove",

    lineTotal: isArabic ? "إجمالي الصنف" : "Line Total",

    payment: isArabic ? "الدفع" : "Payment",

    paymentDescription: isArabic
      ? "راجع الإجماليات واختر طريقة الدفع."
      : "Review totals and choose the payment method.",

    paymentMethod: isArabic ? "طريقة الدفع" : "Payment Method",

    transactionReference: isArabic ? "مرجع المعاملة" : "Transaction Reference",

    optional: isArabic ? "اختياري" : "Optional",

    saleDiscount: isArabic ? "خصم البيع" : "Sale Discount",

    tax: isArabic ? "الضريبة" : "Tax",

    subtotal: isArabic ? "المجموع الفرعي" : "Subtotal",

    itemDiscounts: isArabic ? "خصومات الأصناف" : "Item Discounts",

    total: isArabic ? "الإجمالي" : "Total",

    completeSale: isArabic ? "إتمام البيع" : "Complete Sale",

    creatingSale: isArabic ? "جارٍ إنشاء البيع..." : "Creating Sale...",

    salesHistory: isArabic ? "سجل المبيعات" : "Sales History",

    salesHistoryDescription: isArabic
      ? "عرض المبيعات المكتملة ومعلومات الدفع."
      : "View completed sales and payment information.",

    loadingSales: isArabic ? "جارٍ تحميل المبيعات..." : "Loading sales...",

    noSales: isArabic ? "لا توجد مبيعات." : "No sales found.",

    date: isArabic ? "التاريخ" : "Date",

    invoice: isArabic ? "الفاتورة" : "Invoice",

    items: isArabic ? "الأصناف" : "Items",

    paymentColumn: isArabic ? "الدفع" : "Payment",

    soldBy: isArabic ? "تم البيع بواسطة" : "Sold By",

    status: isArabic ? "الحالة" : "Status",

    patient: isArabic ? "المريض" : "Patient",

    unknownMedicine: isArabic ? "دواء غير معروف" : "Unknown Medicine",

    unableLoadMedicines: isArabic
      ? "تعذر تحميل الأدوية."
      : "Unable to load medicines.",

    unableLoadSales: isArabic
      ? "تعذر تحميل المبيعات."
      : "Unable to load sales.",

    invoiceRequired: isArabic
      ? "رقم الفاتورة مطلوب."
      : "Invoice number is required.",

    saleMustHaveItem: isArabic
      ? "يجب أن تحتوي عملية البيع على صنف واحد على الأقل."
      : "Sale must contain at least one item.",

    selectMedicineEveryItem: isArabic
      ? "يرجى اختيار دواء لكل صنف."
      : "Please select a medicine for every item.",

    quantityGreaterZero: isArabic
      ? "يجب أن تكون الكمية أكبر من صفر."
      : "Quantity must be greater than zero.",

    unitPriceNegative: isArabic
      ? "لا يمكن أن يكون سعر الوحدة سالباً."
      : "Unit price cannot be negative.",

    itemDiscountNegative: isArabic
      ? "لا يمكن أن يكون خصم الصنف سالباً."
      : "Item discount cannot be negative.",

    itemDiscountExceeded: isArabic
      ? "لا يمكن أن يتجاوز خصم الصنف إجمالي الصنف."
      : "Item discount cannot exceed the item subtotal.",

    saleDiscountNegative: isArabic
      ? "لا يمكن أن يكون خصم البيع سالباً."
      : "Sale discount cannot be negative.",

    taxNegative: isArabic
      ? "لا يمكن أن تكون الضريبة سالبة."
      : "Tax cannot be negative.",

    saleCreated: isArabic
      ? "تم إنشاء عملية البيع بنجاح."
      : "Sale created successfully.",

    unableCreateSale: isArabic
      ? "تعذر إنشاء عملية البيع."
      : "Unable to create sale.",
  };

  async function loadMedicines() {
    try {
      setLoading(true);

      const response = await apiFetch<MedicinesResponse>("/medicines");

      setMedicines(
        response.medicines.filter((medicine) => medicine.isActive !== false),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : text.unableLoadMedicines);
    } finally {
      setLoading(false);
    }
  }

  async function loadSales() {
    try {
      setLoadingSales(true);

      const response = await apiFetch<SalesResponse>("/sales");

      setSales(Array.isArray(response.sales) ? response.sales : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : text.unableLoadSales);
    } finally {
      setLoadingSales(false);
    }
  }

  useEffect(() => {
    loadMedicines();
    loadSales();
  }, []);

  function updateItem(
    index: number,
    field: keyof SaleItemForm,
    value: string | number,
  ) {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        return {
          ...item,
          [field]: value,
        };
      }),
    );
  }

  function handleMedicineChange(index: number, medicineId: string) {
    const medicine = medicines.find((item) => item.id === medicineId);

    setItems((currentItems) =>
      currentItems.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        return {
          ...item,
          medicineId,
          unitPrice:
            medicine?.sellingPrice !== undefined &&
            medicine?.sellingPrice !== null
              ? Number(medicine.sellingPrice)
              : item.unitPrice,
        };
      }),
    );
  }

  function addItem() {
    setItems((currentItems) => [...currentItems, createEmptyItem()]);
  }

  function removeItem(index: number) {
    if (items.length === 1) {
      return;
    }

    setItems((currentItems) =>
      currentItems.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const itemSubtotal = item.quantity * item.unitPrice;

      const itemTotal = itemSubtotal - item.discount;

      return {
        ...item,
        subtotal: itemSubtotal,
        total: Math.max(itemTotal, 0),
      };
    });
  }, [items]);

  const subtotal = useMemo(
    () => calculatedItems.reduce((total, item) => total + item.subtotal, 0),
    [calculatedItems],
  );

  const itemDiscounts = useMemo(
    () => calculatedItems.reduce((total, item) => total + item.discount, 0),
    [calculatedItems],
  );

  const total = Math.max(subtotal - itemDiscounts - saleDiscount + tax, 0);

  async function handleCreateSale() {
    setError("");
    setSuccess("");

    if (!invoiceNumber.trim()) {
      setError(text.invoiceRequired);
      return;
    }

    if (items.length === 0) {
      setError(text.saleMustHaveItem);
      return;
    }

    for (const item of items) {
      if (!item.medicineId) {
        setError(text.selectMedicineEveryItem);
        return;
      }

      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        setError(text.quantityGreaterZero);
        return;
      }

      if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
        setError(text.unitPriceNegative);
        return;
      }

      if (!Number.isFinite(item.discount) || item.discount < 0) {
        setError(text.itemDiscountNegative);
        return;
      }

      if (item.discount > item.quantity * item.unitPrice) {
        setError(text.itemDiscountExceeded);
        return;
      }
    }

    if (!Number.isFinite(saleDiscount) || saleDiscount < 0) {
      setError(text.saleDiscountNegative);
      return;
    }

    if (!Number.isFinite(tax) || tax < 0) {
      setError(text.taxNegative);
      return;
    }

    try {
      setSubmitting(true);

      await apiFetch("/sales", {
        method: "POST",

        body: JSON.stringify({
          invoiceNumber: invoiceNumber.trim(),

          discount: saleDiscount,

          tax,

          paymentMethod,

          ...(transactionReference.trim() && {
            transactionReference: transactionReference.trim(),
          }),

          items: items.map((item) => ({
            medicineId: item.medicineId,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            discount: Number(item.discount),
          })),
        }),
      });

      setSuccess(text.saleCreated);

      setInvoiceNumber(createInvoiceNumber());

      setItems([createEmptyItem()]);

      setSaleDiscount(0);

      setTax(0);

      setPaymentMethod("CASH");

      setTransactionReference("");

      await Promise.all([loadMedicines(), loadSales()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : text.unableCreateSale);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppLayout>
      <div className="pb-8">
        {/* =====================================================
            FEEDBACK
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

        {success && (
          <div
            className="
              mb-5
              rounded-xl
              border
              border-success/20
              bg-success-soft
              px-5
              py-4
              text-sm
              font-medium
              text-success
            "
          >
            {success}
          </div>
        )}

        {/* =====================================================
            CREATE SALE
            ===================================================== */}

        <Card padding="none" className="overflow-hidden">
          <div
            className="
              border-b
              border-border-light
              px-5
              py-5
              lg:px-6
            "
          >
            <h2
              className="
                text-base
                font-bold
                text-text-primary
              "
            >
              {text.createSale}
            </h2>

            <p
              className="
                mt-1
                text-xs
                text-text-muted
              "
            >
              {text.createSaleDescription}
            </p>
          </div>

          <div className="p-5 lg:p-6">
            {/* Invoice */}

            <div className="mb-6 max-w-md">
              <Input
                label={`${text.invoiceNumber} *`}
                value={invoiceNumber}
                onChange={(event) => setInvoiceNumber(event.target.value)}
                disabled={submitting}
              />
            </div>

            <div
              className="
                grid
                grid-cols-1
                gap-6
                xl:grid-cols-[minmax(0,1fr)_320px]
              "
            >
              {/* =================================================
                  SALE ITEMS
                  ================================================= */}

              <div className="min-w-0">
                <div
                  className="
                    mb-4
                    flex
                    items-center
                    justify-between
                    gap-4
                  "
                >
                  <div>
                    <h3
                      className="
                        text-sm
                        font-bold
                        text-text-primary
                      "
                    >
                      {text.saleItems}
                    </h3>

                    <p
                      className="
                        mt-1
                        text-xs
                        text-text-muted
                      "
                    >
                      {text.saleItemsDescription}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addItem}
                    disabled={submitting}
                  >
                    + {text.addItem}
                  </Button>
                </div>

                <div className="space-y-3">
                  {calculatedItems.map((item, index) => (
                    <div
                      key={index}
                      className="
                          rounded-xl
                          border
                          border-border-light
                          bg-surface-subtle
                          p-4
                        "
                    >
                      <div
                        className="
                            grid
                            grid-cols-1
                            gap-4
                            lg:grid-cols-[minmax(0,1fr)_110px_140px_120px_auto]
                            lg:items-end
                          "
                      >
                        {/* Medicine */}

                        <SearchableSelect
                          label={text.medicine}
                          value={item.medicineId}
                          onChange={(value) =>
                            handleMedicineChange(index, value)
                          }
                          options={medicines.map((medicine) => ({
                            value: medicine.id,
                            label: `${medicine.name}${
                              medicine.strength ? ` - ${medicine.strength}` : ""
                            }`,
                          }))}
                          placeholder={
                            loading
                              ? text.loadingMedicines
                              : text.selectMedicine
                          }
                          searchPlaceholder="Search medicine..."
                          disabled={loading || submitting}
                        />

                        {/* Quantity */}

                        <Input
                          label={text.quantity}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(
                              index,
                              "quantity",
                              Number(event.target.value),
                            )
                          }
                          disabled={submitting}
                        />

                        {/* Unit Price */}

                        <Input
                          label={text.unitPrice}
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={(event) =>
                            updateItem(
                              index,
                              "unitPrice",
                              Number(event.target.value),
                            )
                          }
                          disabled={submitting}
                        />

                        {/* Discount */}

                        <Input
                          label={text.discount}
                          type="number"
                          min="0"
                          value={item.discount}
                          onChange={(event) =>
                            updateItem(
                              index,
                              "discount",
                              Number(event.target.value),
                            )
                          }
                          disabled={submitting}
                        />

                        {/* Remove */}

                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={submitting || items.length === 1}
                        >
                          {text.remove}
                        </Button>
                      </div>

                      <div
                        className="
                            mt-3
                            flex
                            items-center
                            justify-between
                            border-t
                            border-border-light
                            pt-3
                          "
                      >
                        <span
                          className="
                              text-xs
                              text-text-muted
                            "
                        >
                          {text.lineTotal}
                        </span>

                        <span
                          className="
                              text-sm
                              font-bold
                              text-text-primary
                            "
                        >
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* =================================================
                  PAYMENT
                  ================================================= */}

              <div>
                <Card padding="none" className="overflow-hidden">
                  <div
                    className="
                      border-b
                      border-border-light
                      px-5
                      py-4
                    "
                  >
                    <h3
                      className="
                        text-sm
                        font-bold
                        text-text-primary
                      "
                    >
                      {text.payment}
                    </h3>

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

                  <div className="space-y-4 p-5">
                    {/* Payment method */}

                    <Select
                      label={text.paymentMethod}
                      value={paymentMethod}
                      onChange={(event) =>
                        setPaymentMethod(event.target.value as PaymentMethod)
                      }
                      disabled={submitting}
                    >
                      {paymentMethods.map((method) => (
                        <option key={method.value} value={method.value}>
                          {isArabic ? method.ar : method.en}
                        </option>
                      ))}
                    </Select>

                    {/* Transaction reference */}

                    <Input
                      label={text.transactionReference}
                      helperText={text.optional}
                      value={transactionReference}
                      onChange={(event) =>
                        setTransactionReference(event.target.value)
                      }
                      disabled={submitting}
                    />

                    {/* Sale discount */}

                    <Input
                      label={text.saleDiscount}
                      type="number"
                      min="0"
                      value={saleDiscount}
                      onChange={(event) =>
                        setSaleDiscount(Number(event.target.value))
                      }
                      disabled={submitting}
                    />

                    {/* Tax */}

                    <Input
                      label={text.tax}
                      type="number"
                      min="0"
                      value={tax}
                      onChange={(event) => setTax(Number(event.target.value))}
                      disabled={submitting}
                    />

                    {/* Totals */}

                    <div
                      className="
                        rounded-xl
                        border
                        border-border-light
                        bg-surface-muted
                        p-4
                      "
                    >
                      <SummaryRow
                        label={text.subtotal}
                        value={formatCurrency(subtotal)}
                      />

                      <SummaryRow
                        label={text.itemDiscounts}
                        value={`-${formatCurrency(itemDiscounts)}`}
                        negative
                      />

                      <SummaryRow
                        label={text.saleDiscount}
                        value={`-${formatCurrency(saleDiscount)}`}
                        negative
                      />

                      <SummaryRow
                        label={text.tax}
                        value={`+${formatCurrency(tax)}`}
                      />

                      <div
                        className="
                          mt-4
                          border-t
                          border-border
                          pt-4
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
                              font-bold
                              text-text-primary
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
                            {formatCurrency(total)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      fullWidth
                      onClick={handleCreateSale}
                      disabled={submitting || loading}
                    >
                      {submitting ? text.creatingSale : text.completeSale}
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </Card>

        {/* =====================================================
            SALES HISTORY
            ===================================================== */}

        <Card
          padding="none"
          className="
            mt-5
            overflow-hidden
          "
        >
          <div
            className="
              flex
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
                {text.salesHistory}
              </h2>

              <p
                className="
                  mt-1
                  text-xs
                  text-text-muted
                "
              >
                {text.salesHistoryDescription}
              </p>
            </div>

            {sales.length > 0 && (
              <Badge variant="neutral">{sales.length}</Badge>
            )}
          </div>

          {loadingSales ? (
            <div
              className="
                flex
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
                  {text.loadingSales}
                </p>
              </div>
            </div>
          ) : sales.length === 0 ? (
            <div
              className="
                px-6
                py-16
                text-center
              "
            >
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
                $
              </div>

              <p
                className="
                  mt-4
                  text-sm
                  font-semibold
                  text-text-primary
                "
              >
                {text.noSales}
              </p>
            </div>
          ) : (
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
                    <TableHeader>{text.date}</TableHeader>

                    <TableHeader>{text.invoice}</TableHeader>

                    <TableHeader>{text.items}</TableHeader>

                    <TableHeader>{text.paymentColumn}</TableHeader>

                    <TableHeader>{text.soldBy}</TableHeader>

                    <TableHeader>{text.total}</TableHeader>

                    <TableHeader>{text.status}</TableHeader>
                  </tr>
                </thead>

                <tbody
                  className="
                    divide-y
                    divide-border-light
                  "
                >
                  {sales.map((sale) => {
                    const payment = sale.payments?.[0];

                    const quantity =
                      sale.items?.reduce(
                        (count, item) => count + Number(item.quantity),
                        0,
                      ) ?? 0;

                    const medicineNames =
                      sale.items
                        ?.map(
                          (item) => item.medicine?.name ?? text.unknownMedicine,
                        )
                        .join(", ") ?? "-";

                    return (
                      <tr
                        key={sale.id}
                        className="
                          transition-colors
                          duration-150
                          hover:bg-surface-subtle
                        "
                      >
                        <td
                          className="
                            whitespace-nowrap
                            px-5
                            py-4
                            text-sm
                            text-text-secondary
                          "
                        >
                          {formatDate(sale.saleDate, isArabic)}
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            href={`/sales/${sale.id}`}
                            className="
                              text-sm
                              font-semibold
                              text-primary
                              transition
                              hover:text-primary-light
                              hover:underline
                            "
                          >
                            {sale.invoiceNumber}
                          </Link>

                          {sale.patient?.name && (
                            <p
                              className="
                                mt-1
                                text-xs
                                text-text-muted
                              "
                            >
                              {text.patient}: {sale.patient.name}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p
                            className="
                              text-sm
                              font-semibold
                              text-text-primary
                            "
                          >
                            {quantity}
                          </p>

                          <p
                            className="
                              mt-1
                              max-w-xs
                              truncate
                              text-xs
                              text-text-muted
                            "
                            title={medicineNames}
                          >
                            {medicineNames}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p
                            className="
                              text-sm
                              font-medium
                              text-text-secondary
                            "
                          >
                            {payment
                              ? formatPaymentMethod(
                                  payment.paymentMethod,
                                  isArabic,
                                )
                              : "-"}
                          </p>

                          {payment && (
                            <p
                              className="
                                mt-1
                                text-xs
                                text-text-muted
                              "
                            >
                              {formatCurrency(payment.amount)}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p
                            className="
                              text-sm
                              font-medium
                              text-text-secondary
                            "
                          >
                            {sale.soldBy?.name ?? "-"}
                          </p>

                          {sale.soldBy?.username && (
                            <p
                              className="
                                mt-1
                                text-xs
                                text-text-muted
                              "
                            >
                              @{sale.soldBy.username}
                            </p>
                          )}
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
                          {formatCurrency(sale.total)}
                        </td>

                        <td className="px-5 py-4">
                          <Badge variant={getStatusVariant(sale.status)}>
                            {formatStatus(sale.status, isArabic)}
                          </Badge>
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
          text-xs
          text-text-muted
        "
      >
        {label}
      </span>

      <span
        className={`
          text-xs
          font-semibold
          ${negative ? "text-danger" : "text-text-secondary"}
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
