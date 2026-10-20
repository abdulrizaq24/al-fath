"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { useI18n } from "@/lib/i18n/I18nProvider";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";

type UserRole = "ADMIN" | "PHARMACIST";

type AppUser = {
  name?: string;
  username?: string;
  role: UserRole;
  pharmacyName?: string;
};

type Category = {
  id: string;
  name: string;
};

type Medicine = {
  id: string;
  name: string;
  genericName?: string | null;
  brandName?: string | null;
  manufacturer?: string | null;
  dosageForm: string;
  strength?: string | null;
  baseUnit: string;
  prescriptionStatus: "OTC" | "PRESCRIPTION" | "CONTROLLED";
  sellingPrice: string | number;
  reorderLevel: string | number;
  barcode?: string | null;
  notes?: string | null;
  category: Category;
};

type MedicinesResponse = {
  medicines: Medicine[];
};

type MedicineResponse = {
  medicine: Medicine;
};

type CategoriesResponse = {
  categories: Category[];
};

type MedicineForm = {
  categoryId: string;
  name: string;
  genericName: string;
  brandName: string;
  manufacturer: string;
  dosageForm: string;
  strength: string;
  baseUnit: string;
  prescriptionStatus: "OTC" | "PRESCRIPTION" | "CONTROLLED";
  sellingPrice: string;
  reorderLevel: string;
  barcode: string;
  notes: string;
};

type TranslationFunction = ReturnType<typeof useI18n>["t"];

const emptyForm: MedicineForm = {
  categoryId: "",
  name: "",
  genericName: "",
  brandName: "",
  manufacturer: "",
  dosageForm: "",
  strength: "",
  baseUnit: "",
  prescriptionStatus: "OTC",
  sellingPrice: "",
  reorderLevel: "0",
  barcode: "",
  notes: "",
};

export default function MedicinesPage() {
  const { t, language } = useI18n();

  const [user, setUser] = useState<AppUser | null>(null);

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const [search, setSearch] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [showViewForm, setShowViewForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(
    null,
  );

  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);

  const [saving, setSaving] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);

  const [form, setForm] = useState<MedicineForm>(emptyForm);

  /*
  ===============================================================
  LOAD LOGGED-IN USER
  ===============================================================
  */

  useEffect(() => {
    const storedUser = localStorage.getItem("pharmacy_user");

    if (!storedUser) {
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);

      if (parsedUser?.role === "ADMIN" || parsedUser?.role === "PHARMACIST") {
        setUser({
          name: parsedUser.name,
          username: parsedUser.username,
          role: parsedUser.role,
          pharmacyName: parsedUser.pharmacyName,
        });
      }
    } catch {
      localStorage.removeItem("pharmacy_user");
    }
  }, []);

  const isAdmin = user?.role === "ADMIN";

  /*
  ===============================================================
  LOAD MEDICINES
  ===============================================================
  */

  async function loadMedicines() {
    try {
      setLoading(true);
      setError("");

      const result = await apiFetch<MedicinesResponse>("/medicines");

      setMedicines(result.medicines);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("medicines.errors.retrieveMedicines"),
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  ===============================================================
  LOAD CATEGORIES
  ===============================================================
  */

  async function loadCategories() {
    try {
      setCategoriesLoading(true);

      const result = await apiFetch<CategoriesResponse>("/categories");

      setCategories(result.categories);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : t("medicines.errors.retrieveCategories"),
      );
    } finally {
      setCategoriesLoading(false);
    }
  }

  /*
  ===============================================================
  INITIAL LOAD
  ===============================================================
  */

  useEffect(() => {
    loadMedicines();
    loadCategories();
  }, []);

  /*
  ===============================================================
  SEARCH
  ===============================================================
  */

  const filteredMedicines = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return medicines;
    }

    return medicines.filter((medicine) => {
      return (
        medicine.name.toLowerCase().includes(query) ||
        medicine.genericName?.toLowerCase().includes(query) ||
        medicine.brandName?.toLowerCase().includes(query) ||
        medicine.category.name.toLowerCase().includes(query) ||
        medicine.barcode?.toLowerCase().includes(query)
      );
    });
  }, [medicines, search]);

  /*
  ===============================================================
  FORM
  ===============================================================
  */

  function updateForm(field: keyof MedicineForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /*
  ===============================================================
  ADD MEDICINE
  ===============================================================
  */

  function openAddForm() {
    if (!isAdmin) {
      return;
    }

    setForm(emptyForm);
    setFormError("");
    setShowAddForm(true);
  }

  function closeAddForm() {
    if (saving) {
      return;
    }

    setShowAddForm(false);
    setFormError("");
  }

  /*
  ===============================================================
  VIEW MEDICINE
  ===============================================================
  */

  async function handleViewMedicine(medicineId: string) {
    try {
      setViewLoading(true);
      setFormError("");
      setSelectedMedicine(null);
      setShowViewForm(true);

      const result = await apiFetch<MedicineResponse>(
        `/medicines/${medicineId}`,
      );

      setSelectedMedicine(result.medicine);
    } catch (err) {
      setShowViewForm(false);

      setFormError(
        err instanceof Error
          ? err.message
          : t("medicines.errors.retrieveMedicine"),
      );
    } finally {
      setViewLoading(false);
    }
  }

  /*
  ===============================================================
  EDIT MEDICINE
  ===============================================================
  */

  function openEditMedicine() {
    /*
    Pharmacists are not allowed to edit medicines.
    This guard protects the UI even if this function is
    accidentally triggered somewhere else.
    */

    if (!isAdmin) {
      return;
    }

    if (!selectedMedicine) {
      return;
    }

    setEditingMedicine(selectedMedicine);

    setForm({
      categoryId: selectedMedicine.category.id,
      name: selectedMedicine.name,
      genericName: selectedMedicine.genericName ?? "",
      brandName: selectedMedicine.brandName ?? "",
      manufacturer: selectedMedicine.manufacturer ?? "",
      dosageForm: selectedMedicine.dosageForm,
      strength: selectedMedicine.strength ?? "",
      baseUnit: selectedMedicine.baseUnit,
      prescriptionStatus: selectedMedicine.prescriptionStatus,
      sellingPrice: String(selectedMedicine.sellingPrice),
      reorderLevel: String(selectedMedicine.reorderLevel),
      barcode: selectedMedicine.barcode ?? "",
      notes: selectedMedicine.notes ?? "",
    });

    setFormError("");
    setShowViewForm(false);
    setShowEditForm(true);
  }

  /*
  ===============================================================
  VALIDATION
  ===============================================================
  */

  function validateForm() {
    if (
      !form.categoryId ||
      !form.name.trim() ||
      !form.dosageForm.trim() ||
      !form.baseUnit.trim() ||
      !form.sellingPrice
    ) {
      setFormError(t("medicines.validation.required"));

      return false;
    }

    const sellingPrice = Number(form.sellingPrice);

    const reorderLevel = Number(form.reorderLevel);

    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      setFormError(t("medicines.validation.price"));

      return false;
    }

    if (!Number.isFinite(reorderLevel) || reorderLevel < 0) {
      setFormError(t("medicines.validation.reorder"));

      return false;
    }

    return true;
  }

  /*
  ===============================================================
  CREATE MEDICINE
  ===============================================================
  */

  async function handleCreateMedicine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    /*
    Extra frontend authorization guard.
    Backend authorization is still the real security layer.
    */

    if (!isAdmin) {
      setFormError("You do not have permission to create medicines.");

      return;
    }

    setFormError("");

    if (!validateForm()) {
      return;
    }

    const sellingPrice = Number(form.sellingPrice);

    const reorderLevel = Number(form.reorderLevel);

    try {
      setSaving(true);

      await apiFetch("/medicines", {
        method: "POST",

        body: JSON.stringify({
          categoryId: form.categoryId,
          name: form.name.trim(),
          genericName: form.genericName.trim(),
          brandName: form.brandName.trim(),
          manufacturer: form.manufacturer.trim(),
          dosageForm: form.dosageForm.trim(),
          strength: form.strength.trim(),
          baseUnit: form.baseUnit.trim(),
          prescriptionStatus: form.prescriptionStatus,
          sellingPrice,
          reorderLevel,
          barcode: form.barcode.trim(),
          notes: form.notes.trim(),
        }),
      });

      await loadMedicines();

      setShowAddForm(false);
      setForm(emptyForm);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : t("medicines.errors.createMedicine"),
      );
    } finally {
      setSaving(false);
    }
  }

  /*
  ===============================================================
  UPDATE MEDICINE
  ===============================================================
  */

  async function handleUpdateMedicine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    /*
    Extra frontend authorization guard.
    */

    if (!isAdmin) {
      setFormError("You do not have permission to update medicines.");

      return;
    }

    setFormError("");

    if (!editingMedicine) {
      setFormError(t("medicines.validation.noMedicineSelected"));

      return;
    }

    if (!validateForm()) {
      return;
    }

    const sellingPrice = Number(form.sellingPrice);

    const reorderLevel = Number(form.reorderLevel);

    try {
      setSaving(true);

      const result = await apiFetch<MedicineResponse>(
        `/medicines/${editingMedicine.id}`,
        {
          method: "PATCH",

          body: JSON.stringify({
            categoryId: form.categoryId,
            name: form.name.trim(),
            genericName: form.genericName.trim(),
            brandName: form.brandName.trim(),
            manufacturer: form.manufacturer.trim(),
            dosageForm: form.dosageForm.trim(),
            strength: form.strength.trim(),
            baseUnit: form.baseUnit.trim(),
            prescriptionStatus: form.prescriptionStatus,
            sellingPrice,
            reorderLevel,
            barcode: form.barcode.trim(),
            notes: form.notes.trim(),
          }),
        },
      );

      await loadMedicines();

      setSelectedMedicine(result.medicine);

      setEditingMedicine(null);
      setShowEditForm(false);
      setShowViewForm(true);
      setForm(emptyForm);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : t("medicines.errors.updateMedicine"),
      );
    } finally {
      setSaving(false);
    }
  }

  /*
  ===============================================================
  FORMATTERS
  ===============================================================
  */

  function formatPrice(price: string | number) {
    return new Intl.NumberFormat(language === "ar" ? "ar" : "id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(price));
  }

  function getPrescriptionLabel(status: Medicine["prescriptionStatus"]) {
    if (status === "PRESCRIPTION") {
      return t("medicines.prescription.prescription");
    }

    if (status === "CONTROLLED") {
      return t("medicines.prescription.controlled");
    }

    return t("medicines.prescription.otc");
  }

  const medicineCount =
    filteredMedicines.length === 1
      ? t("medicines.medicineCount")
      : t("medicines.medicineCountPlural");

  return (
    <AppLayout>
      <div className="pb-8">
        {/* =====================================================
            PAGE ACTIONS
            ===================================================== */}

        {/*
          Only ADMIN sees the Add Medicine button.
        */}

        {isAdmin && (
          <div className="mb-5 flex justify-end">
            <Button type="button" onClick={openAddForm} size="md">
              <span aria-hidden="true" className="text-base leading-none">
                +
              </span>

              {t("medicines.addMedicine")}
            </Button>
          </div>
        )}

        {/* =====================================================
            SEARCH
            ===================================================== */}

        <Card padding="sm" className="mb-4">
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
            <div className="min-w-0 flex-1">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("medicines.searchPlaceholder")}
                startContent={<span className="text-sm">⌕</span>}
              />
            </div>

            <Badge variant="success">
              {filteredMedicines.length} {medicineCount}
            </Badge>
          </div>
        </Card>

        {/* =====================================================
            PAGE ERROR
            ===================================================== */}

        {error && (
          <div
            className="
              mb-4
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
            MEDICINE LIST
            ===================================================== */}

        <Card padding="none" className="overflow-hidden">
          <div
            className="
              flex
              flex-col
              gap-1
              border-b
              border-border-light
              px-5
              py-5
              sm:flex-row
              sm:items-center
              sm:justify-between
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
                {t("medicines.list.title")}
              </h2>

              <p
                className="
                  mt-1
                  text-xs
                  text-text-muted
                "
              >
                {t("medicines.list.description")}
              </p>
            </div>

            <span
              className="
                text-xs
                font-medium
                text-text-muted
              "
            >
              {filteredMedicines.length} {medicineCount}
            </span>
          </div>

          {loading ? (
            <div
              className="
                flex
                min-h-[300px]
                items-center
                justify-center
                px-5
                py-12
              "
            >
              <div className="text-center">
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
                  {t("medicines.list.loading")}
                </p>
              </div>
            </div>
          ) : filteredMedicines.length === 0 ? (
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
                  h-14
                  w-14
                  items-center
                  justify-center
                  rounded-2xl
                  bg-primary-soft
                  text-xl
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
                  font-bold
                  text-text-primary
                "
              >
                {t("medicines.list.noMedicines")}
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  text-text-muted
                "
              >
                {search
                  ? t("medicines.list.tryDifferentSearch")
                  : t("medicines.list.noRegisteredMedicines")}
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
                <thead>
                  <tr
                    className="
                      border-b
                      border-border-light
                      bg-surface-muted
                    "
                  >
                    <TableHeader>{t("medicines.fields.medicine")}</TableHeader>

                    <TableHeader>{t("medicines.fields.category")}</TableHeader>

                    <TableHeader>{t("medicines.fields.dosage")}</TableHeader>

                    <TableHeader>{t("medicines.fields.unit")}</TableHeader>

                    <TableHeader>{t("medicines.fields.price")}</TableHeader>

                    <TableHeader>{t("medicines.fields.reorder")}</TableHeader>

                    <TableHeader>{t("medicines.fields.type")}</TableHeader>

                    <TableHeader>{t("medicines.fields.actions")}</TableHeader>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border-light">
                  {filteredMedicines.map((medicine) => (
                    <tr
                      key={medicine.id}
                      className="
                          group
                          transition-colors
                          duration-150
                          hover:bg-surface-subtle
                        "
                    >
                      <td className="px-6 py-5">
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
                            {medicine.name.charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <p
                              className="
                                  truncate
                                  text-sm
                                  font-bold
                                  text-text-primary
                                "
                            >
                              {medicine.name}
                            </p>

                            <p
                              className="
                                  mt-1
                                  truncate
                                  text-[11px]
                                  text-text-muted
                                "
                            >
                              {medicine.genericName ||
                                medicine.brandName ||
                                "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <Badge variant="neutral">
                          {medicine.category.name}
                        </Badge>
                      </td>

                      <td className="px-5 py-5">
                        <p
                          className="
                              text-sm
                              font-medium
                              text-text-secondary
                            "
                        >
                          {medicine.dosageForm}
                        </p>

                        {medicine.strength && (
                          <p
                            className="
                                mt-1
                                text-[11px]
                                text-text-muted
                              "
                          >
                            {medicine.strength}
                          </p>
                        )}
                      </td>

                      <td
                        className="
                            px-5
                            py-5
                            text-sm
                            font-medium
                            text-text-secondary
                          "
                      >
                        {medicine.baseUnit}
                      </td>

                      <td className="px-5 py-5">
                        <p
                          className="
                              text-sm
                              font-bold
                              text-text-primary
                            "
                        >
                          {formatPrice(medicine.sellingPrice)}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <Badge
                          variant={
                            Number(medicine.reorderLevel) > 0
                              ? "warning"
                              : "neutral"
                          }
                        >
                          {Number(medicine.reorderLevel)}
                        </Badge>
                      </td>

                      <td className="px-5 py-5">
                        <PrescriptionBadge
                          status={medicine.prescriptionStatus}
                          label={getPrescriptionLabel(
                            medicine.prescriptionStatus,
                          )}
                        />
                      </td>

                      <td className="px-5 py-5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewMedicine(medicine.id)}
                        >
                          {t("medicines.actions.view")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* =========================================================
          ADD MEDICINE MODAL
          ADMIN ONLY
          ========================================================= */}

      {isAdmin && (
        <Modal
          open={showAddForm}
          onClose={closeAddForm}
          title={t("medicines.actions.addMedicine")}
          description={t("medicines.forms.registerDescription")}
          size="xl"
          showCloseButton={!saving}
        >
          <form onSubmit={handleCreateMedicine} className="space-y-7 p-6">
            {formError && <FormError message={formError} />}

            <MedicineFormFields
              form={form}
              categories={categories}
              categoriesLoading={categoriesLoading}
              saving={saving}
              updateForm={updateForm}
              t={t}
            />

            <div
              className="
                flex
                justify-end
                gap-3
                border-t
                border-border-light
                pt-5
              "
            >
              <Button
                type="button"
                variant="secondary"
                onClick={closeAddForm}
                disabled={saving}
              >
                {t("medicines.actions.cancel")}
              </Button>

              <Button type="submit" disabled={saving || categoriesLoading}>
                {saving
                  ? t("common.loading")
                  : t("medicines.actions.createMedicine")}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* =========================================================
          VIEW MEDICINE MODAL
          ========================================================= */}

      <Modal
        open={showViewForm}
        onClose={() => {
          setShowViewForm(false);
          setSelectedMedicine(null);
        }}
        title={t("medicines.details.title")}
        description={t("medicines.details.description")}
        size="lg"
        footer={
          /*
          IMPORTANT:
          Only Admin receives the Edit button.
          Pharmacists can only view medicine details.
          */
          selectedMedicine && isAdmin ? (
            <div className="flex justify-end">
              <Button type="button" onClick={openEditMedicine}>
                {t("medicines.actions.edit")}
              </Button>
            </div>
          ) : undefined
        }
      >
        {viewLoading ? (
          <div
            className="
              flex
              min-h-[300px]
              items-center
              justify-center
            "
          >
            <div className="text-center">
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
                {t("medicines.list.loading")}
              </p>
            </div>
          </div>
        ) : selectedMedicine ? (
          <div className="space-y-6 p-6">
            <div
              className="
                flex
                items-center
                gap-4
                rounded-2xl
                bg-primary-soft
                p-5
              "
            >
              <div
                className="
                  flex
                  h-14
                  w-14
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  bg-primary
                  text-lg
                  font-bold
                  text-white
                "
              >
                {selectedMedicine.name.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <h3
                  className="
                    text-xl
                    font-bold
                    tracking-tight
                    text-text-primary
                  "
                >
                  {selectedMedicine.name}
                </h3>

                <p
                  className="
                    mt-1
                    text-sm
                    text-text-secondary
                  "
                >
                  {selectedMedicine.genericName ||
                    selectedMedicine.brandName ||
                    "—"}
                </p>
              </div>
            </div>

            <div
              className="
                grid
                gap-3
                sm:grid-cols-2
              "
            >
              <DetailBox
                label={t("medicines.fields.category")}
                value={selectedMedicine.category.name}
              />

              <DetailBox
                label={t("medicines.fields.manufacturer")}
                value={selectedMedicine.manufacturer || "—"}
              />

              <DetailBox
                label={t("medicines.fields.dosageForm")}
                value={selectedMedicine.dosageForm}
              />

              <DetailBox
                label={t("medicines.fields.strength")}
                value={selectedMedicine.strength || "—"}
              />

              <DetailBox
                label={t("medicines.fields.baseUnit")}
                value={selectedMedicine.baseUnit}
              />

              <DetailBox
                label={t("medicines.fields.prescriptionType")}
                value={getPrescriptionLabel(
                  selectedMedicine.prescriptionStatus,
                )}
              />

              <DetailBox
                label={t("medicines.fields.sellingPrice")}
                value={formatPrice(selectedMedicine.sellingPrice)}
              />

              <DetailBox
                label={t("medicines.fields.reorderLevel")}
                value={String(Number(selectedMedicine.reorderLevel))}
              />
            </div>

            <div
              className="
                rounded-xl
                bg-surface-muted
                p-4
              "
            >
              <p
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.1em]
                  text-text-muted
                "
              >
                {t("medicines.fields.barcode")}
              </p>

              <p
                className="
                  mt-2
                  text-sm
                  font-semibold
                  text-text-primary
                "
              >
                {selectedMedicine.barcode || "—"}
              </p>
            </div>

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
                {t("medicines.fields.notes")}
              </p>

              <div
                className="
                  mt-2
                  rounded-xl
                  bg-surface-muted
                  p-4
                "
              >
                <p
                  className="
                    text-sm
                    leading-6
                    text-text-secondary
                  "
                >
                  {selectedMedicine.notes || "—"}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* =========================================================
          EDIT MEDICINE MODAL
          ADMIN ONLY
          ========================================================= */}

      {isAdmin && (
        <Modal
          open={showEditForm}
          onClose={() => {
            if (saving) {
              return;
            }

            setShowEditForm(false);
            setEditingMedicine(null);
            setFormError("");
          }}
          title={t("medicines.actions.editMedicine")}
          description={t("medicines.forms.updateDescription")}
          size="xl"
          showCloseButton={!saving}
        >
          <form onSubmit={handleUpdateMedicine} className="space-y-7 p-6">
            {formError && <FormError message={formError} />}

            <MedicineEditFields
              form={form}
              categories={categories}
              categoriesLoading={categoriesLoading}
              saving={saving}
              updateForm={updateForm}
              t={t}
            />

            <div
              className="
                flex
                justify-end
                gap-3
                border-t
                border-border-light
                pt-5
              "
            >
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (saving) {
                    return;
                  }

                  setShowEditForm(false);
                  setEditingMedicine(null);
                  setFormError("");
                }}
                disabled={saving}
              >
                {t("medicines.actions.cancel")}
              </Button>

              <Button type="submit" disabled={saving || categoriesLoading}>
                {saving
                  ? t("common.loading")
                  : t("medicines.actions.saveChanges")}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </AppLayout>
  );
}

/* ===============================================================
   MEDICINE FORM
   =============================================================== */

function MedicineFormFields({
  form,
  categories,
  categoriesLoading,
  saving,
  updateForm,
  t,
}: {
  form: MedicineForm;
  categories: Category[];
  categoriesLoading: boolean;
  saving: boolean;
  updateForm: (field: keyof MedicineForm, value: string) => void;
  t: TranslationFunction;
}) {
  return (
    <>
      <FormSection title={t("medicines.forms.basicInformation")}>
        <div
          className="
            grid
            gap-4
            sm:grid-cols-2
          "
        >
          <Select
            label={t("medicines.fields.category")}
            value={form.categoryId}
            onChange={(event) => updateForm("categoryId", event.target.value)}
            disabled={categoriesLoading || saving}
            required
          >
            <option value="">
              {categoriesLoading
                ? t("medicines.forms.loadingCategories")
                : t("medicines.forms.selectCategory")}
            </option>

            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>

          <Input
            label={t("medicines.fields.medicineName")}
            value={form.name}
            onChange={(event) => updateForm("name", event.target.value)}
            placeholder={t("medicines.forms.placeholders.medicineName")}
            disabled={saving}
            required
          />

          <Input
            label={t("medicines.fields.genericName")}
            value={form.genericName}
            onChange={(event) => updateForm("genericName", event.target.value)}
            placeholder={t("medicines.forms.placeholders.genericName")}
            disabled={saving}
          />

          <Input
            label={t("medicines.fields.brandName")}
            value={form.brandName}
            onChange={(event) => updateForm("brandName", event.target.value)}
            placeholder={t("medicines.forms.optional")}
            disabled={saving}
          />

          <div className="sm:col-span-2">
            <Input
              label={t("medicines.fields.manufacturer")}
              value={form.manufacturer}
              onChange={(event) =>
                updateForm("manufacturer", event.target.value)
              }
              placeholder={t("medicines.forms.optional")}
              disabled={saving}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title={t("medicines.forms.medicineDetails")}>
        <div
          className="
            grid
            gap-4
            sm:grid-cols-2
            lg:grid-cols-4
          "
        >
          <Input
            label={t("medicines.fields.dosageForm")}
            value={form.dosageForm}
            onChange={(event) => updateForm("dosageForm", event.target.value)}
            placeholder={t("medicines.forms.placeholders.dosageForm")}
            disabled={saving}
            required
          />

          <Input
            label={t("medicines.fields.strength")}
            value={form.strength}
            onChange={(event) => updateForm("strength", event.target.value)}
            placeholder={t("medicines.forms.placeholders.strength")}
            disabled={saving}
          />

          <Input
            label={t("medicines.fields.baseUnit")}
            value={form.baseUnit}
            onChange={(event) => updateForm("baseUnit", event.target.value)}
            placeholder={t("medicines.forms.placeholders.baseUnit")}
            disabled={saving}
            required
          />

          <PrescriptionSelect
            value={form.prescriptionStatus}
            onChange={(value) => updateForm("prescriptionStatus", value)}
            disabled={saving}
            t={t}
          />
        </div>
      </FormSection>

      <FormSection title={t("medicines.forms.pricingInventory")}>
        <div
          className="
            grid
            gap-4
            sm:grid-cols-3
          "
        >
          <Input
            label={t("medicines.fields.sellingPrice")}
            value={form.sellingPrice}
            onChange={(event) => updateForm("sellingPrice", event.target.value)}
            placeholder={t("medicines.forms.placeholders.sellingPrice")}
            disabled={saving}
            type="number"
            min="0"
            required
          />

          <Input
            label={t("medicines.fields.reorderLevel")}
            value={form.reorderLevel}
            onChange={(event) => updateForm("reorderLevel", event.target.value)}
            placeholder={t("medicines.forms.placeholders.reorderLevel")}
            disabled={saving}
            type="number"
            min="0"
          />

          <Input
            label={t("medicines.fields.barcode")}
            value={form.barcode}
            onChange={(event) => updateForm("barcode", event.target.value)}
            placeholder={t("medicines.forms.optional")}
            disabled={saving}
          />
        </div>
      </FormSection>

      <FormSection title={t("medicines.fields.notes")}>
        <textarea
          value={form.notes}
          onChange={(event) => updateForm("notes", event.target.value)}
          placeholder={t("medicines.forms.placeholders.notes")}
          rows={4}
          disabled={saving}
          className="
            w-full
            resize-none
            rounded-xl
            border
            border-border
            bg-surface-muted
            px-3.5
            py-3
            text-sm
            text-text-primary
            outline-none
            transition
            placeholder:text-text-muted
            focus:border-primary
            focus:bg-surface
            focus:ring-2
            focus:ring-primary/10
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        />
      </FormSection>
    </>
  );
}

/* ===============================================================
   EDIT FORM
   =============================================================== */

function MedicineEditFields({
  form,
  categories,
  categoriesLoading,
  saving,
  updateForm,
  t,
}: {
  form: MedicineForm;
  categories: Category[];
  categoriesLoading: boolean;
  saving: boolean;
  updateForm: (field: keyof MedicineForm, value: string) => void;
  t: TranslationFunction;
}) {
  return (
    <>
      <FormSection title={t("medicines.forms.basicInformation")}>
        <div
          className="
            grid
            gap-4
            sm:grid-cols-2
          "
        >
          <Select
            label={t("medicines.fields.category")}
            value={form.categoryId}
            onChange={(event) => updateForm("categoryId", event.target.value)}
            disabled={categoriesLoading || saving}
            required
          >
            <option value="">
              {categoriesLoading
                ? t("medicines.forms.loadingCategories")
                : t("medicines.forms.selectCategory")}
            </option>

            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>

          <Input
            label={t("medicines.fields.medicineName")}
            value={form.name}
            onChange={(event) => updateForm("name", event.target.value)}
            disabled={saving}
            required
          />

          <Input
            label={t("medicines.fields.genericName")}
            value={form.genericName}
            onChange={(event) => updateForm("genericName", event.target.value)}
            disabled={saving}
          />

          <Input
            label={t("medicines.fields.brandName")}
            value={form.brandName}
            onChange={(event) => updateForm("brandName", event.target.value)}
            disabled={saving}
          />

          <div className="sm:col-span-2">
            <Input
              label={t("medicines.fields.manufacturer")}
              value={form.manufacturer}
              onChange={(event) =>
                updateForm("manufacturer", event.target.value)
              }
              disabled={saving}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title={t("medicines.forms.medicineDetails")}>
        <div
          className="
            grid
            gap-4
            sm:grid-cols-2
            lg:grid-cols-4
          "
        >
          <Input
            label={t("medicines.fields.dosageForm")}
            value={form.dosageForm}
            onChange={(event) => updateForm("dosageForm", event.target.value)}
            disabled={saving}
            required
          />

          <Input
            label={t("medicines.fields.strength")}
            value={form.strength}
            onChange={(event) => updateForm("strength", event.target.value)}
            disabled={saving}
          />

          <Input
            label={t("medicines.fields.baseUnit")}
            value={form.baseUnit}
            onChange={(event) => updateForm("baseUnit", event.target.value)}
            disabled={saving}
            required
          />

          <PrescriptionSelect
            value={form.prescriptionStatus}
            onChange={(value) => updateForm("prescriptionStatus", value)}
            disabled={saving}
            t={t}
          />
        </div>
      </FormSection>

      <FormSection title={t("medicines.forms.pricingInventory")}>
        <div
          className="
            grid
            gap-4
            sm:grid-cols-3
          "
        >
          <Input
            label={t("medicines.fields.sellingPrice")}
            value={form.sellingPrice}
            onChange={(event) => updateForm("sellingPrice", event.target.value)}
            disabled={saving}
            type="number"
            min="0"
            required
          />

          <Input
            label={t("medicines.fields.reorderLevel")}
            value={form.reorderLevel}
            onChange={(event) => updateForm("reorderLevel", event.target.value)}
            disabled={saving}
            type="number"
            min="0"
          />

          <Input
            label={t("medicines.fields.barcode")}
            value={form.barcode}
            onChange={(event) => updateForm("barcode", event.target.value)}
            disabled={saving}
          />
        </div>
      </FormSection>

      <FormSection title={t("medicines.fields.notes")}>
        <textarea
          value={form.notes}
          onChange={(event) => updateForm("notes", event.target.value)}
          rows={4}
          disabled={saving}
          className="
            w-full
            resize-none
            rounded-xl
            border
            border-border
            bg-surface-muted
            px-3.5
            py-3
            text-sm
            text-text-primary
            outline-none
            transition
            placeholder:text-text-muted
            focus:border-primary
            focus:bg-surface
            focus:ring-2
            focus:ring-primary/10
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        />
      </FormSection>
    </>
  );
}

/* ===============================================================
   FORM SECTION
   =============================================================== */

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div
        className="
          mb-4
          flex
          items-center
          gap-3
        "
      >
        <div
          className="
            h-5
            w-1
            rounded-full
            bg-primary
          "
        />

        <h3
          className="
            text-sm
            font-bold
            text-text-primary
          "
        >
          {title}
        </h3>
      </div>

      {children}
    </section>
  );
}

/* ===============================================================
   PRESCRIPTION SELECT
   =============================================================== */

function PrescriptionSelect({
  value,
  onChange,
  disabled,
  t,
}: {
  value: "OTC" | "PRESCRIPTION" | "CONTROLLED";
  onChange: (value: string) => void;
  disabled?: boolean;
  t: TranslationFunction;
}) {
  return (
    <Select
      label={t("medicines.fields.prescriptionType")}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    >
      <option value="OTC">{t("medicines.prescription.otc")}</option>

      <option value="PRESCRIPTION">
        {t("medicines.prescription.prescription")}
      </option>

      <option value="CONTROLLED">
        {t("medicines.prescription.controlled")}
      </option>
    </Select>
  );
}

/* ===============================================================
   PRESCRIPTION BADGE
   =============================================================== */

function PrescriptionBadge({
  status,
  label,
}: {
  status: "OTC" | "PRESCRIPTION" | "CONTROLLED";
  label: string;
}) {
  const variant =
    status === "CONTROLLED"
      ? "danger"
      : status === "PRESCRIPTION"
        ? "warning"
        : "success";

  return <Badge variant={variant}>{label}</Badge>;
}

/* ===============================================================
   DETAIL BOX
   =============================================================== */

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="
        rounded-xl
        border
        border-border-light
        bg-surface-muted
        p-4
      "
    >
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
          mt-2
          text-sm
          font-bold
          text-text-primary
        "
      >
        {value}
      </p>
    </div>
  );
}

/* ===============================================================
   TABLE HEADER
   =============================================================== */

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
        first:px-6
        last:px-6
      "
    >
      {children}
    </th>
  );
}

/* ===============================================================
   FORM ERROR
   =============================================================== */

function FormError({ message }: { message: string }) {
  return (
    <div
      className="
        rounded-xl
        border
        border-danger/20
        bg-danger-soft
        px-4
        py-3
        text-sm
        font-medium
        text-danger
      "
    >
      {message}
    </div>
  );
}
