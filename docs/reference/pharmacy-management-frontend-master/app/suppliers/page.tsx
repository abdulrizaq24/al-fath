"use client";

import { useEffect, useState } from "react";

import AppLayout from "@/components/AppLayout";
import {
  createSupplier,
  getSuppliers,
  updateSupplier,
  updateSupplierStatus,
  type Supplier,
} from "@/lib/suppliers";
import { useI18n } from "@/lib/i18n/I18nProvider";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";

type SupplierForm = {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

const emptyForm: SupplierForm = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

export default function SuppliersPage() {
  const { t } = useI18n();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [form, setForm] = useState<SupplierForm>(emptyForm);

  async function loadSuppliers() {
    try {
      setLoading(true);
      setError("");

      const data = await getSuppliers();

      setSuppliers(data);
    } catch (err) {
      console.error("Load suppliers error:", err);

      setError(err instanceof Error ? err.message : t("suppliers.errors.load"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  function openCreateForm() {
    setEditingSupplier(null);
    setForm(emptyForm);
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function openEditForm(supplier: Supplier) {
    setEditingSupplier(supplier);

    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
      notes: supplier.notes ?? "",
    });

    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingSupplier(null);
    setForm(emptyForm);
  }

  function updateField(field: keyof SupplierForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError(t("suppliers.errors.nameRequired"));

      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };

      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, payload);

        setSuccess(t("suppliers.messages.updated"));
      } else {
        await createSupplier(payload);

        setSuccess(t("suppliers.messages.created"));
      }

      setShowForm(false);
      setEditingSupplier(null);
      setForm(emptyForm);

      await loadSuppliers();
    } catch (err) {
      console.error("Save supplier error:", err);

      setError(err instanceof Error ? err.message : t("suppliers.errors.save"));
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(supplier: Supplier) {
    const action = supplier.isActive
      ? t("suppliers.actions.deactivate").toLowerCase()
      : t("suppliers.actions.activate").toLowerCase();

    const confirmed = window.confirm(
      `${t("suppliers.confirm.status")} ${action} ${supplier.name}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingStatus(supplier.id);

      setError("");
      setSuccess("");

      await updateSupplierStatus(supplier.id, !supplier.isActive);

      setSuccess(
        supplier.isActive
          ? t("suppliers.messages.deactivated")
          : t("suppliers.messages.activated"),
      );

      await loadSuppliers();
    } catch (err) {
      console.error("Update supplier status error:", err);

      setError(
        err instanceof Error ? err.message : t("suppliers.errors.status"),
      );
    } finally {
      setUpdatingStatus(null);
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
            SUPPLIER DIRECTORY
            ===================================================== */}

        <Card padding="none" className="overflow-hidden">
          {/* Header */}

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
                {t("suppliers.directory.title")}
              </h2>

              <p
                className="
                  mt-1
                  text-xs
                  text-text-muted
                "
              >
                {t("suppliers.directory.description")}
              </p>
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={openCreateForm}
            >
              + {t("suppliers.actions.add")}
            </Button>
          </div>

          {/* Table */}

          {loading ? (
            <div
              className="
                flex
                items-center
                justify-center
                px-5
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
                  {t("suppliers.loading")}
                </p>
              </div>
            </div>
          ) : suppliers.length === 0 ? (
            <div
              className="
                px-5
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
                {t("suppliers.empty.title")}
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  text-text-muted
                "
              >
                {t("suppliers.empty.description")}
              </p>

              <div className="mt-5">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={openCreateForm}
                >
                  + {t("suppliers.actions.add")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                className="
                  w-full
                  min-w-[900px]
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
                    <TableHeader>{t("suppliers.table.supplier")}</TableHeader>

                    <TableHeader>{t("suppliers.table.contact")}</TableHeader>

                    <TableHeader>{t("suppliers.table.phone")}</TableHeader>

                    <TableHeader>{t("suppliers.table.email")}</TableHeader>

                    <TableHeader>{t("suppliers.table.status")}</TableHeader>

                    <TableHeader align="right">
                      {t("suppliers.table.actions")}
                    </TableHeader>
                  </tr>
                </thead>

                <tbody
                  className="
                    divide-y
                    divide-border-light
                  "
                >
                  {suppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className="
                          transition-colors
                          duration-150
                          hover:bg-surface-subtle
                        "
                    >
                      {/* Supplier */}

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
                            {supplier.name.charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <p
                              className="
                                  text-sm
                                  font-semibold
                                  text-text-primary
                                "
                            >
                              {supplier.name}
                            </p>

                            {supplier.address && (
                              <p
                                className="
                                    mt-0.5
                                    max-w-xs
                                    truncate
                                    text-xs
                                    text-text-muted
                                  "
                              >
                                {supplier.address}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact */}

                      <td
                        className="
                            px-5
                            py-4
                            text-sm
                            text-text-secondary
                          "
                      >
                        {supplier.contactPerson || "—"}
                      </td>

                      {/* Phone */}

                      <td
                        className="
                            px-5
                            py-4
                            text-sm
                            text-text-secondary
                          "
                      >
                        {supplier.phone || "—"}
                      </td>

                      {/* Email */}

                      <td
                        className="
                            px-5
                            py-4
                            text-sm
                            text-text-secondary
                          "
                      >
                        {supplier.email || "—"}
                      </td>

                      {/* Status */}

                      <td className="px-5 py-4">
                        <Badge
                          variant={supplier.isActive ? "success" : "neutral"}
                        >
                          {supplier.isActive
                            ? t("suppliers.status.active")
                            : t("suppliers.status.inactive")}
                        </Badge>
                      </td>

                      {/* Actions */}

                      <td className="px-5 py-4">
                        <div
                          className="
                              flex
                              items-center
                              justify-end
                              gap-2
                            "
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditForm(supplier)}
                          >
                            {t("common.edit")}
                          </Button>

                          <Button
                            type="button"
                            variant={supplier.isActive ? "danger" : "secondary"}
                            size="sm"
                            disabled={updatingStatus === supplier.id}
                            onClick={() => handleStatusChange(supplier)}
                          >
                            {updatingStatus === supplier.id
                              ? t("suppliers.actions.updating")
                              : supplier.isActive
                                ? t("suppliers.actions.deactivate")
                                : t("suppliers.actions.activate")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* =====================================================
            ADD / EDIT SUPPLIER MODAL
            ===================================================== */}

        <Modal
          open={showForm}
          onClose={closeForm}
          title={
            editingSupplier
              ? t("suppliers.form.editTitle")
              : t("suppliers.form.addTitle")
          }
          description={
            editingSupplier
              ? t("suppliers.form.editDescription")
              : t("suppliers.form.addDescription")
          }
          size="lg"
          closeOnOverlayClick={!saving}
          showCloseButton={!saving}
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
                size="sm"
                onClick={closeForm}
                disabled={saving}
              >
                {t("common.cancel")}
              </Button>

              <Button
                type="submit"
                form="supplier-form"
                variant="primary"
                size="sm"
                disabled={saving}
              >
                {saving
                  ? t("suppliers.actions.saving")
                  : editingSupplier
                    ? t("suppliers.actions.saveChanges")
                    : t("suppliers.actions.create")}
              </Button>
            </div>
          }
        >
          <form
            id="supplier-form"
            onSubmit={handleSubmit}
            className="space-y-5 p-6"
          >
            <div
              className="
                grid
                grid-cols-1
                gap-5
                md:grid-cols-2
              "
            >
              <Input
                label={t("suppliers.fields.name") + " *"}
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder={t("suppliers.placeholders.name")}
                required
                disabled={saving}
              />

              <Input
                label={t("suppliers.fields.contactPerson")}
                value={form.contactPerson}
                onChange={(event) =>
                  updateField("contactPerson", event.target.value)
                }
                placeholder={t("suppliers.placeholders.contactPerson")}
                disabled={saving}
              />

              <Input
                label={t("suppliers.fields.phone")}
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                placeholder={t("suppliers.placeholders.phone")}
                disabled={saving}
              />

              <Input
                label={t("suppliers.fields.email")}
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder={t("suppliers.placeholders.email")}
                disabled={saving}
              />

              <div className="md:col-span-2">
                <Input
                  label={t("suppliers.fields.address")}
                  value={form.address}
                  onChange={(event) =>
                    updateField("address", event.target.value)
                  }
                  placeholder={t("suppliers.placeholders.address")}
                  disabled={saving}
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="supplier-notes"
                  className="
                    mb-2
                    block
                    text-xs
                    font-bold
                    text-text-secondary
                  "
                >
                  {t("suppliers.fields.notes")}
                </label>

                <textarea
                  id="supplier-notes"
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  rows={4}
                  placeholder={t("suppliers.placeholders.notes")}
                  disabled={saving}
                  className="
                    w-full
                    resize-y
                    rounded-md
                    border
                    border-border
                    bg-surface-subtle
                    px-3.5
                    py-2.5
                    text-sm
                    text-text-primary
                    outline-none
                    transition
                    placeholder:text-text-placeholder
                    focus:border-primary
                    focus:bg-surface
                    focus:ring-2
                    focus:ring-primary/10
                    disabled:cursor-not-allowed
                    disabled:bg-surface-muted
                    disabled:opacity-70
                  "
                />
              </div>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
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
