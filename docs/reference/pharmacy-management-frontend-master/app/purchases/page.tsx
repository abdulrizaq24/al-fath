"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { apiFetch } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { useI18n } from "@/lib/i18n/I18nProvider";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import SearchableSelect from "@/components/ui/SearchableSelect";

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
  totalAmount: string;
  createdAt: string;
  supplier?: Supplier;
  items: PurchaseItem[];
};

type PurchasesResponse = {
  purchases: Purchase[];
};

type SuppliersResponse = {
  suppliers: Supplier[];
};

type MedicinesResponse = {
  medicines: Medicine[];
};

type PurchaseFormItem = {
  medicineId: string;
  orderedQuantity: string;
  unitCost: string;
};

type ReceiveFormItem = {
  purchaseItemId: string;
  medicineName: string;
  orderedQuantity: string;
  quantityReceived: string;
  batchNumber: string;
  expiryDate: string;
};

const emptyPurchaseItem: PurchaseFormItem = {
  medicineId: "",
  orderedQuantity: "1",
  unitCost: "",
};

export default function PurchasesPage() {
  const { t, language } = useI18n();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [purchaseNumber, setPurchaseNumber] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<PurchaseFormItem[]>([
    { ...emptyPurchaseItem },
  ]);

  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(
    null,
  );

  const [receiptNumber, setReceiptNumber] = useState("");
  const [receiveNotes, setReceiveNotes] = useState("");
  const [receiveItems, setReceiveItems] = useState<ReceiveFormItem[]>([]);

  async function loadPurchases() {
    const response = await apiFetch<PurchasesResponse>("/purchases");

    setPurchases(response.purchases);
  }

  async function loadFormData() {
    const [suppliersResponse, medicinesResponse] = await Promise.all([
      apiFetch<SuppliersResponse>("/suppliers"),
      apiFetch<MedicinesResponse>("/medicines"),
    ]);

    setSuppliers(suppliersResponse.suppliers);
    setMedicines(medicinesResponse.medicines);
  }

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        await Promise.all([loadPurchases(), loadFormData()]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("purchases.errors.load"),
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [t]);

  function formatDate(date: string) {
    return new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  }

  function formatMoney(value: string | number) {
    return new Intl.NumberFormat(language === "ar" ? "ar-SA" : "id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value));
  }

  function formatStatus(status: string) {
    switch (status) {
      case "RECEIVED":
        return t("purchases.status.received");

      case "PARTIALLY_RECEIVED":
        return t("purchases.status.partiallyReceived");

      case "CANCELLED":
        return t("purchases.status.cancelled");

      case "DRAFT":
        return t("purchases.status.draft");

      default:
        return status
          .replace(/_/g, " ")
          .toLowerCase()
          .replace(/\b\w/g, (letter) => letter.toUpperCase());
    }
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
      default:
        return "neutral";
    }
  }

  function updateItem(
    index: number,
    field: keyof PurchaseFormItem,
    value: string,
  ) {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }

  function addItem() {
    setItems((currentItems) => [...currentItems, { ...emptyPurchaseItem }]);
  }

  function removeItem(index: number) {
    setItems((currentItems) =>
      currentItems.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  function resetCreateForm() {
    setPurchaseNumber("");
    setSupplierId("");
    setExpectedDate("");
    setNotes("");
    setItems([{ ...emptyPurchaseItem }]);
  }

  function closeCreateModal() {
    if (creating) {
      return;
    }

    setShowCreateModal(false);
    resetCreateForm();
  }

  const formTotal = useMemo(() => {
    return items.reduce((total, item) => {
      const quantity = Number(item.orderedQuantity);
      const unitCost = Number(item.unitCost);

      if (!Number.isFinite(quantity) || !Number.isFinite(unitCost)) {
        return total;
      }

      return total + quantity * unitCost;
    }, 0);
  }, [items]);

  async function handleCreatePurchase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!supplierId) {
      setError(t("purchases.validation.supplier"));
      return;
    }

    if (!purchaseNumber.trim()) {
      setError(t("purchases.validation.purchaseNumber"));
      return;
    }

    if (items.length === 0) {
      setError(t("purchases.validation.items"));
      return;
    }

    for (const item of items) {
      if (!item.medicineId) {
        setError(t("purchases.validation.medicine"));
        return;
      }

      const quantity = Number(item.orderedQuantity);
      const unitCost = Number(item.unitCost);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        setError(t("purchases.validation.quantity"));
        return;
      }

      if (!Number.isFinite(unitCost) || unitCost < 0) {
        setError(t("purchases.validation.unitCost"));
        return;
      }
    }

    try {
      setCreating(true);

      await apiFetch("/purchases", {
        method: "POST",

        body: JSON.stringify({
          supplierId,
          purchaseNumber: purchaseNumber.trim(),

          ...(expectedDate && {
            expectedDate,
          }),

          ...(notes.trim() && {
            notes: notes.trim(),
          }),

          items: items.map((item) => ({
            medicineId: item.medicineId,
            orderedQuantity: Number(item.orderedQuantity),
            unitCost: Number(item.unitCost),
          })),
        }),
      });

      await loadPurchases();

      setShowCreateModal(false);
      resetCreateForm();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("purchases.errors.create"),
      );
    } finally {
      setCreating(false);
    }
  }

  function openReceiveModal(purchase: Purchase) {
    setError("");
    setSelectedPurchase(purchase);

    setReceiptNumber(`GR-${purchase.purchaseNumber}`);

    setReceiveNotes("");

    setReceiveItems(
      purchase.items.map((item) => ({
        purchaseItemId: item.id,

        medicineName: item.medicine?.name ?? t("purchases.unknownMedicine"),

        orderedQuantity: item.orderedQuantity,

        quantityReceived: item.orderedQuantity,

        batchNumber: "",
        expiryDate: "",
      })),
    );

    setShowReceiveModal(true);
  }

  function closeReceiveModal() {
    if (receiving) {
      return;
    }

    setShowReceiveModal(false);
    setSelectedPurchase(null);
    setReceiptNumber("");
    setReceiveNotes("");
    setReceiveItems([]);
  }

  function updateReceiveItem(
    index: number,
    field: keyof ReceiveFormItem,
    value: string,
  ) {
    setReceiveItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }

  async function handleReceivePurchase(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    if (!selectedPurchase) {
      setError(t("purchases.validation.noPurchase"));
      return;
    }

    if (!receiptNumber.trim()) {
      setError(t("purchases.validation.receiptNumber"));
      return;
    }

    if (receiveItems.length === 0) {
      setError(t("purchases.validation.receiptItems"));
      return;
    }

    for (const item of receiveItems) {
      const quantity = Number(item.quantityReceived);

      if (!item.purchaseItemId) {
        setError(t("purchases.validation.invalidItem"));
        return;
      }

      if (!item.batchNumber.trim()) {
        setError(
          t("purchases.validation.batchRequired").replace(
            "{medicine}",
            item.medicineName,
          ),
        );
        return;
      }

      if (!item.expiryDate) {
        setError(
          t("purchases.validation.expiryRequired").replace(
            "{medicine}",
            item.medicineName,
          ),
        );
        return;
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        setError(
          t("purchases.validation.receivedQuantity").replace(
            "{medicine}",
            item.medicineName,
          ),
        );
        return;
      }

      if (quantity > Number(item.orderedQuantity)) {
        setError(
          t("purchases.validation.quantityExceeded").replace(
            "{medicine}",
            item.medicineName,
          ),
        );
        return;
      }
    }

    try {
      setReceiving(true);

      await apiFetch(`/purchases/${selectedPurchase.id}/receive`, {
        method: "POST",

        body: JSON.stringify({
          receiptNumber: receiptNumber.trim(),

          items: receiveItems.map((item) => ({
            purchaseItemId: item.purchaseItemId,

            batchNumber: item.batchNumber.trim(),

            expiryDate: item.expiryDate,

            quantityReceived: Number(item.quantityReceived),
          })),

          ...(receiveNotes.trim() && {
            notes: receiveNotes.trim(),
          }),
        }),
      });

      await loadPurchases();

      closeReceiveModal();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("purchases.errors.receive"),
      );
    } finally {
      setReceiving(false);
    }
  }

  return (
    <AppLayout>
      <div className="pb-8">
        {/* =====================================================
            PAGE ACTION
            ===================================================== */}

        <div
          className="
            mb-5
            flex
            items-center
            justify-end
          "
        >
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => {
              setError("");
              setShowCreateModal(true);
            }}
          >
            <span aria-hidden="true">+</span>

            {t("purchases.actions.createPurchase")}
          </Button>
        </div>

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
            PURCHASE LIST
            ===================================================== */}

        <Card padding="none" className="overflow-hidden">
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
                {t("purchases.list.title")}
              </h2>

              <p
                className="
                  mt-1
                  text-xs
                  text-text-muted
                "
              >
                {t("purchases.list.description")}
              </p>
            </div>

            {purchases.length > 0 && (
              <Badge variant="neutral">{purchases.length}</Badge>
            )}
          </div>

          {loading ? (
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
                  {t("purchases.loading")}
                </p>
              </div>
            </div>
          ) : purchases.length === 0 ? (
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
                +
              </div>

              <p
                className="
                  mt-4
                  text-sm
                  font-semibold
                  text-text-primary
                "
              >
                {t("purchases.empty.title")}
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  text-text-muted
                "
              >
                {t("purchases.empty.description")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                className="
                  w-full
                  min-w-[1150px]
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
                    <TableHeader>{t("purchases.fields.date")}</TableHeader>

                    <TableHeader>
                      {t("purchases.fields.purchaseNumber")}
                    </TableHeader>

                    <TableHeader>{t("purchases.fields.supplier")}</TableHeader>

                    <TableHeader>{t("purchases.fields.items")}</TableHeader>

                    <TableHeader>{t("purchases.fields.total")}</TableHeader>

                    <TableHeader>{t("purchases.fields.status")}</TableHeader>

                    <TableHeader>{t("purchases.fields.actions")}</TableHeader>
                  </tr>
                </thead>

                <tbody
                  className="
                    divide-y
                    divide-border-light
                  "
                >
                  {purchases.map((purchase) => (
                    <tr
                      key={purchase.id}
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
                          py-5
                          text-sm
                          text-text-secondary
                        "
                      >
                        {formatDate(purchase.createdAt)}
                      </td>

                      <td className="px-5 py-5">
                        <Link
                          href={`/purchases/${purchase.id}`}
                          className="
                            text-sm
                            font-semibold
                            text-primary
                            transition
                            hover:text-primary-light
                            hover:underline
                          "
                        >
                          {purchase.purchaseNumber}
                        </Link>
                      </td>

                      <td className="px-5 py-5">
                        <p
                          className="
                            text-sm
                            text-text-secondary
                          "
                        >
                          {purchase.supplier?.name ??
                            t("purchases.unknownSupplier")}
                        </p>
                      </td>

                      <td
                        className="
                          px-5
                          py-5
                          text-sm
                          text-text-secondary
                        "
                      >
                        {purchase.items.length}
                      </td>

                      <td
                        className="
                          whitespace-nowrap
                          px-5
                          py-5
                          text-sm
                          font-semibold
                          text-text-primary
                        "
                      >
                        {formatMoney(purchase.totalAmount)}
                      </td>

                      <td className="px-5 py-5">
                        <Badge variant={getStatusVariant(purchase.status)}>
                          {formatStatus(purchase.status)}
                        </Badge>
                      </td>

                      <td className="px-5 py-5">
                        {purchase.status === "DRAFT" ||
                        purchase.status === "PARTIALLY_RECEIVED" ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => openReceiveModal(purchase)}
                          >
                            {t("purchases.actions.receive")}
                          </Button>
                        ) : (
                          <span
                            className="
                              text-xs
                              text-text-muted
                            "
                          >
                            {t("purchases.actions.noAction")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* =====================================================
            CREATE PURCHASE MODAL
            ===================================================== */}

        <Modal
          open={showCreateModal}
          onClose={closeCreateModal}
          title={t("purchases.create.title")}
          description={t("purchases.create.description")}
          size="xl"
          closeOnOverlayClick={!creating}
          showCloseButton={!creating}
          footer={
            <div
              className="
                flex
                justify-end
                gap-3
              "
            >
              <Button
                type="button"
                variant="secondary"
                disabled={creating}
                onClick={closeCreateModal}
              >
                {t("common.cancel")}
              </Button>

              <Button
                type="submit"
                form="create-purchase-form"
                variant="primary"
                disabled={creating}
              >
                {creating
                  ? t("purchases.actions.creating")
                  : t("purchases.actions.createPurchase")}
              </Button>
            </div>
          }
        >
          <form id="create-purchase-form" onSubmit={handleCreatePurchase}>
            <div className="space-y-6 p-6">
              {/* Purchase information */}

              <section>
                <h4
                  className="
                    text-sm
                    font-bold
                    text-text-primary
                  "
                >
                  {t("purchases.create.purchaseInformation")}
                </h4>

                <div
                  className="
                    mt-4
                    grid
                    grid-cols-1
                    gap-4
                    md:grid-cols-2
                  "
                >
                  <Input
                    label={t("purchases.fields.purchaseNumberRequired")}
                    value={purchaseNumber}
                    onChange={(event) => setPurchaseNumber(event.target.value)}
                    placeholder={t("purchases.placeholders.purchaseNumber")}
                    autoComplete="off"
                    disabled={creating}
                  />

                  <SearchableSelect
                    label={t("purchases.fields.supplierRequired")}
                    value={supplierId}
                    onChange={setSupplierId}
                    options={suppliers.map((supplier) => ({
                      value: supplier.id,
                      label: supplier.name,
                    }))}
                    placeholder={t("purchases.placeholders.selectSupplier")}
                    searchPlaceholder="Search supplier..."
                    disabled={creating}
                  />

                  <Input
                    label={t("purchases.fields.expectedDate")}
                    type="date"
                    value={expectedDate}
                    onChange={(event) => setExpectedDate(event.target.value)}
                    disabled={creating}
                  />

                  <Input
                    label={t("purchases.fields.notes")}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder={t("purchases.placeholders.optionalNotes")}
                    disabled={creating}
                  />
                </div>
              </section>

              {/* Purchase items */}

              <section>
                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                  "
                >
                  <div>
                    <h4
                      className="
                        text-sm
                        font-bold
                        text-text-primary
                      "
                    >
                      {t("purchases.create.purchaseItems")}
                    </h4>

                    <p
                      className="
                        mt-1
                        text-xs
                        text-text-muted
                      "
                    >
                      {t("purchases.create.purchaseItemsDescription")}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addItem}
                    disabled={creating}
                  >
                    + {t("purchases.actions.addItem")}
                  </Button>
                </div>

                <div className="mt-4 space-y-3">
                  {items.map((item, index) => {
                    const lineTotal =
                      Number(item.orderedQuantity || 0) *
                      Number(item.unitCost || 0);

                    return (
                      <div
                        key={index}
                        className="
                          rounded-xl
                          border
                          border-border-light
                          bg-surface-muted
                          p-4
                        "
                      >
                        <div
                          className="
                            grid
                            grid-cols-1
                            gap-4
                            md:grid-cols-[2fr_1fr_1fr_auto]
                          "
                        >
                          <SearchableSelect
                            label={t("purchases.fields.medicine")}
                            value={item.medicineId}
                            onChange={(value) =>
                              updateItem(index, "medicineId", value)
                            }
                            options={medicines.map((medicine) => ({
                              value: medicine.id,
                              label: medicine.name,
                            }))}
                            placeholder={t(
                              "purchases.placeholders.selectMedicine",
                            )}
                            searchPlaceholder="Search medicine..."
                            disabled={creating}
                          />

                          <Input
                            label={t("purchases.fields.quantity")}
                            type="number"
                            min="1"
                            step="1"
                            value={item.orderedQuantity}
                            onChange={(event) =>
                              updateItem(
                                index,
                                "orderedQuantity",
                                event.target.value,
                              )
                            }
                            disabled={creating}
                          />

                          <Input
                            label={t("purchases.fields.unitCost")}
                            type="number"
                            min="0"
                            step="1"
                            value={item.unitCost}
                            onChange={(event) =>
                              updateItem(index, "unitCost", event.target.value)
                            }
                            placeholder="0"
                            disabled={creating}
                          />

                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => removeItem(index)}
                              disabled={creating || items.length === 1}
                            >
                              {t("purchases.actions.remove")}
                            </Button>
                          </div>
                        </div>

                        <div
                          className="
                            mt-3
                            flex
                            justify-end
                            border-t
                            border-border-light
                            pt-3
                          "
                        >
                          <p
                            className="
                              text-sm
                              text-text-secondary
                            "
                          >
                            {t("purchases.fields.lineTotal")}:{" "}
                            <span
                              className="
                                font-bold
                                text-text-primary
                              "
                            >
                              {formatMoney(lineTotal)}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Total */}

              <div
                className="
                  flex
                  items-center
                  justify-between
                  rounded-xl
                  border
                  border-border-green
                  bg-surface-green
                  px-5
                  py-4
                "
              >
                <span
                  className="
                    text-sm
                    font-medium
                    text-text-secondary
                  "
                >
                  {t("purchases.fields.purchaseTotal")}
                </span>

                <span
                  className="
                    text-lg
                    font-bold
                    text-primary
                  "
                >
                  {formatMoney(formTotal)}
                </span>
              </div>
            </div>
          </form>
        </Modal>

        {/* =====================================================
            RECEIVE PURCHASE MODAL
            ===================================================== */}

        <Modal
          open={showReceiveModal && Boolean(selectedPurchase)}
          onClose={closeReceiveModal}
          title={t("purchases.receive.title")}
          description={
            selectedPurchase
              ? `${t("purchases.receive.description")} ${
                  selectedPurchase.purchaseNumber
                }`
              : undefined
          }
          size="xl"
          closeOnOverlayClick={!receiving}
          showCloseButton={!receiving}
          footer={
            <div
              className="
                flex
                justify-end
                gap-3
              "
            >
              <Button
                type="button"
                variant="secondary"
                disabled={receiving}
                onClick={closeReceiveModal}
              >
                {t("common.cancel")}
              </Button>

              <Button
                type="submit"
                form="receive-purchase-form"
                variant="primary"
                disabled={receiving}
              >
                {receiving
                  ? t("purchases.actions.receiving")
                  : t("purchases.actions.receivePurchase")}
              </Button>
            </div>
          }
        >
          {selectedPurchase && (
            <form id="receive-purchase-form" onSubmit={handleReceivePurchase}>
              <div className="space-y-6 p-6">
                {/* Receipt information */}

                <section>
                  <h4
                    className="
                      text-sm
                      font-bold
                      text-text-primary
                    "
                  >
                    {t("purchases.receive.receiptInformation")}
                  </h4>

                  <div
                    className="
                      mt-4
                      grid
                      grid-cols-1
                      gap-4
                      md:grid-cols-2
                    "
                  >
                    <Input
                      label={t("purchases.fields.receiptNumberRequired")}
                      value={receiptNumber}
                      onChange={(event) => setReceiptNumber(event.target.value)}
                      disabled={receiving}
                      placeholder={t("purchases.placeholders.receiptNumber")}
                    />

                    <Input
                      label={t("purchases.fields.notes")}
                      value={receiveNotes}
                      onChange={(event) => setReceiveNotes(event.target.value)}
                      disabled={receiving}
                      placeholder={t("purchases.placeholders.optionalNotes")}
                    />
                  </div>
                </section>

                {/* Received items */}

                <section>
                  <h4
                    className="
                      text-sm
                      font-bold
                      text-text-primary
                    "
                  >
                    {t("purchases.receive.itemsReceived")}
                  </h4>

                  <p
                    className="
                      mt-1
                      text-xs
                      text-text-muted
                    "
                  >
                    {t("purchases.receive.itemsReceivedDescription")}
                  </p>

                  <div className="mt-4 space-y-4">
                    {receiveItems.map((item, index) => {
                      const purchaseItem = selectedPurchase.items.find(
                        (purchaseItem) =>
                          purchaseItem.id === item.purchaseItemId,
                      );

                      return (
                        <div
                          key={item.purchaseItemId}
                          className="
                              rounded-xl
                              border
                              border-border-light
                              bg-surface-muted
                              p-4
                            "
                        >
                          <div
                            className="
                                mb-4
                                flex
                                items-center
                                justify-between
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
                                {item.medicineName}
                              </p>

                              <p
                                className="
                                    mt-1
                                    text-xs
                                    text-text-muted
                                  "
                              >
                                {t("purchases.receive.orderedQuantity")}:{" "}
                                {item.orderedQuantity}
                              </p>
                            </div>

                            <Badge variant="neutral">
                              {formatMoney(purchaseItem?.unitCost ?? 0)}
                            </Badge>
                          </div>

                          <div
                            className="
                                grid
                                grid-cols-1
                                gap-4
                                md:grid-cols-2
                                lg:grid-cols-3
                              "
                          >
                            <Input
                              label={t(
                                "purchases.fields.quantityReceivedRequired",
                              )}
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantityReceived}
                              onChange={(event) =>
                                updateReceiveItem(
                                  index,
                                  "quantityReceived",
                                  event.target.value,
                                )
                              }
                              disabled={receiving}
                            />

                            <Input
                              label={t("purchases.fields.batchNumberRequired")}
                              type="text"
                              value={item.batchNumber}
                              onChange={(event) =>
                                updateReceiveItem(
                                  index,
                                  "batchNumber",
                                  event.target.value,
                                )
                              }
                              disabled={receiving}
                              placeholder={t(
                                "purchases.placeholders.batchNumber",
                              )}
                            />

                            <Input
                              label={t("purchases.fields.expiryDateRequired")}
                              type="date"
                              value={item.expiryDate}
                              onChange={(event) =>
                                updateReceiveItem(
                                  index,
                                  "expiryDate",
                                  event.target.value,
                                )
                              }
                              disabled={receiving}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            </form>
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
