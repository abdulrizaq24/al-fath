"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import AppLayout from "@/components/AppLayout";
import {
  createPrescription,
  type CreatePrescriptionItemInput,
} from "@/lib/prescriptions";
import { useI18n } from "@/lib/i18n/I18nProvider";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

type Patient = {
  id: string;
  name: string;
};

type Medicine = {
  id: string;
  name: string;
  genericName: string | null;
  strength: string | null;
};

type PatientsResponse = {
  patients: Patient[];
};

type MedicinesResponse = {
  medicines: Medicine[];
};

type FormItem = CreatePrescriptionItemInput & {
  key: number;
};

export default function NewPrescriptionPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [patients, setPatients] = useState<Patient[]>([]);

  const [medicines, setMedicines] = useState<Medicine[]>([]);

  const [patientId, setPatientId] = useState("");

  const [prescriptionNumber, setPrescriptionNumber] = useState(
    `RX-${new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "")}-${Date.now().toString().slice(-6)}`,
  );

  const [prescriberName, setPrescriberName] = useState("");

  const [prescriptionDate, setPrescriptionDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<FormItem[]>([
    {
      key: Date.now(),
      medicineId: "",
      quantity: 1,
      directions: "",
      notes: "",
    },
  ]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  /* ============================================================
     LOAD PATIENTS + MEDICINES
     ============================================================ */

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("pharmacy_token");

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [patientsResponse, medicinesResponse] = await Promise.all([
          fetch("http://localhost:4000/api/patients", {
            headers,
            cache: "no-store",
          }),

          fetch("http://localhost:4000/api/medicines", {
            headers,
            cache: "no-store",
          }),
        ]);

        const patientsData = (await patientsResponse.json()) as
          | PatientsResponse
          | { message?: string };

        const medicinesData = (await medicinesResponse.json()) as
          | MedicinesResponse
          | { message?: string };

        if (!patientsResponse.ok) {
          throw new Error(
            "message" in patientsData &&
              typeof patientsData.message === "string"
              ? patientsData.message
              : "Unable to load patients",
          );
        }

        if (!medicinesResponse.ok) {
          throw new Error(
            "message" in medicinesData &&
              typeof medicinesData.message === "string"
              ? medicinesData.message
              : "Unable to load medicines",
          );
        }

        setPatients("patients" in patientsData ? patientsData.patients : []);

        setMedicines(
          "medicines" in medicinesData ? medicinesData.medicines : [],
        );
      } catch (err) {
        console.error("Load prescription form data error:", err);

        setError(
          err instanceof Error ? err.message : t("prescriptions.unableToLoad"),
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [t]);

  /* ============================================================
     ITEM MANAGEMENT
     ============================================================ */

  function addItem() {
    setItems((current) => [
      ...current,
      {
        key: Date.now() + current.length,
        medicineId: "",
        quantity: 1,
        directions: "",
        notes: "",
      },
    ]);
  }

  function removeItem(key: number) {
    setItems((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((item) => item.key !== key);
    });
  }

  function updateItem(
    key: number,
    field: keyof CreatePrescriptionItemInput,
    value: string | number,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.key === key
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }

  /* ============================================================
     SUBMIT
     ============================================================ */

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (!patientId) {
        throw new Error("Please select a patient");
      }

      if (!prescriptionNumber.trim()) {
        throw new Error("Prescription number is required");
      }

      if (!prescriberName.trim()) {
        throw new Error("Prescriber name is required");
      }

      if (items.length === 0) {
        throw new Error("Add at least one medicine");
      }

      for (const item of items) {
        if (!item.medicineId) {
          throw new Error("Please select a medicine for every item");
        }

        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
          throw new Error("Medicine quantities must be positive whole numbers");
        }
      }

      const prescription = await createPrescription({
        patientId,
        prescriptionNumber: prescriptionNumber.trim(),
        prescriberName: prescriberName.trim(),
        prescriptionDate,

        ...(notes.trim() && {
          notes: notes.trim(),
        }),

        items: items.map((item) => ({
          medicineId: item.medicineId,
          quantity: item.quantity,

          ...(item.directions?.trim() && {
            directions: item.directions.trim(),
          }),

          ...(item.notes?.trim() && {
            notes: item.notes.trim(),
          }),
        })),
      });

      router.push(`/prescriptions/${prescription.id}`);
    } catch (err) {
      console.error("Create prescription error:", err);

      setError(
        err instanceof Error ? err.message : "Unable to create prescription",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="pb-8">
        {/* ======================================================
            BACK
            ====================================================== */}

        <div className="mb-5">
          <Link href="/prescriptions">
            <Button type="button" variant="ghost" size="sm">
              <span aria-hidden="true">←</span>

              {t("prescriptions.backToPrescriptions")}
            </Button>
          </Link>
        </div>

        {/* ======================================================
            ERROR
            ====================================================== */}

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

        {/* ======================================================
            LOADING
            ====================================================== */}

        {loading ? (
          <Card>
            <div
              className="
                flex
                min-h-[320px]
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
                  {t("prescriptions.loading")}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ==================================================
                PRESCRIPTION INFORMATION
                ================================================== */}

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
                  {t("prescriptions.information")}
                </h2>

                <p
                  className="
                    mt-1
                    text-xs
                    text-text-muted
                  "
                >
                  {t("prescriptions.detailsDescription")}
                </p>
              </div>

              <div
                className="
                  grid
                  grid-cols-1
                  gap-5
                  p-5
                  lg:grid-cols-2
                  lg:p-6
                "
              >
                {/* Patient */}

                <Select
                  label={t("prescriptions.patient") + " *"}
                  value={patientId}
                  onChange={(event) => setPatientId(event.target.value)}
                  required
                  disabled={saving}
                >
                  <option value="">{t("prescriptions.patient")}</option>

                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name}
                    </option>
                  ))}
                </Select>

                {/* Prescription Number */}

                <Input
                  label={t("prescriptions.prescriptionNumber") + " *"}
                  value={prescriptionNumber}
                  onChange={(event) =>
                    setPrescriptionNumber(event.target.value)
                  }
                  required
                  disabled={saving}
                />

                {/* Prescriber */}

                <Input
                  label={t("prescriptions.prescriber") + " *"}
                  value={prescriberName}
                  onChange={(event) => setPrescriberName(event.target.value)}
                  placeholder="Doctor / prescriber name"
                  required
                  disabled={saving}
                />

                {/* Date */}

                <Input
                  label={t("prescriptions.prescriptionDate") + " *"}
                  type="date"
                  value={prescriptionDate}
                  onChange={(event) => setPrescriptionDate(event.target.value)}
                  required
                  disabled={saving}
                />

                {/* Notes */}

                <div className="lg:col-span-2">
                  <label
                    htmlFor="prescription-notes"
                    className="
                      mb-2
                      block
                      text-xs
                      font-bold
                      text-text-secondary
                    "
                  >
                    {t("prescriptions.notes")}
                  </label>

                  <textarea
                    id="prescription-notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    placeholder="Optional prescription notes"
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
            </Card>

            {/* ==================================================
                PRESCRIBED MEDICINES
                ================================================== */}

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
                    {t("prescriptions.prescribedMedicines")}
                  </h2>

                  <p
                    className="
                      mt-1
                      text-xs
                      text-text-muted
                    "
                  >
                    {t("prescriptions.prescribedMedicinesDescription")}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addItem}
                  disabled={saving}
                >
                  + {t("medicines.addMedicine")}
                </Button>
              </div>

              <div className="space-y-4 p-5 lg:p-6">
                {items.map((item, index) => (
                  <div
                    key={item.key}
                    className="
                        rounded-xl
                        border
                        border-border-light
                        bg-surface-subtle
                        p-4
                        lg:p-5
                      "
                  >
                    {/* Item header */}

                    <div
                      className="
                          mb-4
                          flex
                          items-center
                          justify-between
                          gap-4
                        "
                    >
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
                              h-8
                              w-8
                              items-center
                              justify-center
                              rounded-lg
                              bg-primary-soft
                              text-xs
                              font-bold
                              text-primary
                            "
                        >
                          {index + 1}
                        </div>

                        <p
                          className="
                              text-xs
                              font-bold
                              uppercase
                              tracking-[0.08em]
                              text-text-muted
                            "
                        >
                          {t("prescriptions.medicine")} {index + 1}
                        </p>
                      </div>

                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.key)}
                          disabled={saving}
                          className="
                              text-danger
                              hover:text-danger
                            "
                        >
                          {t("common.delete")}
                        </Button>
                      )}
                    </div>

                    <div
                      className="
                          grid
                          grid-cols-1
                          gap-4
                          lg:grid-cols-2
                        "
                    >
                      {/* Medicine */}

                      <Select
                        label={t("prescriptions.medicine") + " *"}
                        value={item.medicineId}
                        onChange={(event) =>
                          updateItem(item.key, "medicineId", event.target.value)
                        }
                        required
                        disabled={saving}
                      >
                        <option value="">{t("prescriptions.medicine")}</option>

                        {medicines.map((medicine) => (
                          <option key={medicine.id} value={medicine.id}>
                            {medicine.name}
                            {medicine.strength ? ` - ${medicine.strength}` : ""}
                          </option>
                        ))}
                      </Select>

                      {/* Quantity */}

                      <Input
                        label={t("prescriptions.prescribed") + " *"}
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(
                            item.key,
                            "quantity",
                            Number(event.target.value),
                          )
                        }
                        required
                        disabled={saving}
                      />

                      {/* Directions */}

                      <div className="lg:col-span-2">
                        <Input
                          label={t("prescriptions.directions")}
                          value={item.directions ?? ""}
                          onChange={(event) =>
                            updateItem(
                              item.key,
                              "directions",
                              event.target.value,
                            )
                          }
                          placeholder="e.g. Take 1 capsule twice daily after meals"
                          disabled={saving}
                        />
                      </div>

                      {/* Item Notes */}

                      <div className="lg:col-span-2">
                        <Input
                          label={t("prescriptions.notes")}
                          value={item.notes ?? ""}
                          onChange={(event) =>
                            updateItem(item.key, "notes", event.target.value)
                          }
                          placeholder="Optional notes for this medicine"
                          disabled={saving}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* ==================================================
                ACTIONS
                ================================================== */}

            <div
              className="
                flex
                flex-wrap
                items-center
                justify-end
                gap-3
              "
            >
              <Link href="/prescriptions">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  disabled={saving}
                >
                  {t("common.cancel")}
                </Button>
              </Link>

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={saving || loading}
              >
                {saving
                  ? t("prescriptions.dispensing")
                  : t("prescriptions.create")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
