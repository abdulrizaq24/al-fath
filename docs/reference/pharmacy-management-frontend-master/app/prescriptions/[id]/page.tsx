"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import AppLayout from "@/components/AppLayout";
import { useI18n } from "@/lib/i18n/I18nProvider";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

type PrescriptionItem = {
  id: string;
  quantityPrescribed: number;
  quantityDispensed: number;
  directions: string | null;
  notes: string | null;
  medicine?: {
    id: string;
    name: string;
    genericName: string | null;
    strength: string | null;
  };
};

type Prescription = {
  id: string;
  prescriptionNumber: string;
  prescriberName: string;
  prescriptionDate: string;
  notes: string | null;
  status: string;

  patient?: {
    id: string;
    patientNumber: string;
    firstName: string;
    lastName: string | null;
  };

  items: PrescriptionItem[];

  createdAt: string;
  updatedAt: string;
};

type PrescriptionResponse = {
  prescription: Prescription;
};

export default function PrescriptionDetailsPage() {
  const { t } = useI18n();
  const params = useParams();

  const prescriptionId = typeof params.id === "string" ? params.id : "";

  const [prescription, setPrescription] = useState<Prescription | null>(null);

  const [loading, setLoading] = useState(true);

  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [dispensing, setDispensing] = useState(false);

  const [error, setError] = useState("");

  const [statusMessage, setStatusMessage] = useState("");

  /* ============================================================
     LOAD PRESCRIPTION
     ============================================================ */

  useEffect(() => {
    if (!prescriptionId) {
      setError(t("prescriptions.invalidId"));

      setLoading(false);

      return;
    }

    async function loadPrescription() {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("pharmacy_token");

        const response = await fetch(
          `http://localhost:4000/api/prescriptions/${prescriptionId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          },
        );

        const data = (await response.json()) as
          | PrescriptionResponse
          | { message?: string };

        if (!response.ok) {
          throw new Error(
            "message" in data && typeof data.message === "string"
              ? data.message
              : t("prescriptions.unableToLoad"),
          );
        }

        if (!("prescription" in data)) {
          throw new Error(t("prescriptions.invalidResponse"));
        }

        setPrescription(data.prescription);
      } catch (err) {
        console.error("Load prescription error:", err);

        setError(
          err instanceof Error ? err.message : t("prescriptions.unableToLoad"),
        );
      } finally {
        setLoading(false);
      }
    }

    loadPrescription();
  }, [prescriptionId, t]);

  /* ============================================================
     HELPERS
     ============================================================ */

  function formatDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function patientName() {
    if (!prescription?.patient) {
      return t("prescriptions.unknownPatient");
    }

    return `${prescription.patient.firstName} ${
      prescription.patient.lastName ?? ""
    }`.trim();
  }

  function getStatusVariant(
    status: string,
  ): "success" | "warning" | "danger" | "info" | "neutral" {
    switch (status) {
      case "PENDING":
        return "warning";

      case "PARTIALLY_DISPENSED":
        return "info";

      case "DISPENSED":
        return "success";

      case "CANCELLED":
        return "danger";

      default:
        return "neutral";
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case "PENDING":
        return t("prescriptions.pending");

      case "PARTIALLY_DISPENSED":
        return t("prescriptions.partiallyDispensed");

      case "DISPENSED":
        return t("prescriptions.dispensedStatus");

      case "CANCELLED":
        return t("prescriptions.cancelled");

      default:
        return status;
    }
  }

  /* ============================================================
     DISPENSE PRESCRIPTION
     ============================================================ */

  async function dispensePrescription() {
    if (!prescription) {
      return;
    }

    const confirmed = window.confirm(t("prescriptions.dispenseConfirm"));

    if (!confirmed) {
      return;
    }

    try {
      setDispensing(true);
      setError("");
      setStatusMessage("");

      const token = localStorage.getItem("pharmacy_token");

      const response = await fetch(
        `http://localhost:4000/api/prescriptions/${prescription.id}/dispense`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = (await response.json()) as
        | (PrescriptionResponse & {
            message?: string;
          })
        | { message?: string };

      if (!response.ok) {
        throw new Error(
          "message" in data && typeof data.message === "string"
            ? data.message
            : t("prescriptions.unableToLoad"),
        );
      }

      if (!("prescription" in data) || !data.prescription) {
        throw new Error(t("prescriptions.invalidDispenseResponse"));
      }

      setPrescription(data.prescription);

      setStatusMessage(data.message ?? t("prescriptions.dispenseSuccess"));
    } catch (err) {
      console.error("Dispense prescription error:", err);

      setError(
        err instanceof Error ? err.message : t("prescriptions.unableToLoad"),
      );
    } finally {
      setDispensing(false);
    }
  }

  /* ============================================================
     CANCEL PRESCRIPTION
     ============================================================ */

  async function cancelPrescription() {
    if (!prescription) {
      return;
    }

    const confirmed = window.confirm(t("prescriptions.cancelConfirm"));

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingStatus(true);
      setError("");
      setStatusMessage("");

      const token = localStorage.getItem("pharmacy_token");

      const response = await fetch(
        `http://localhost:4000/api/prescriptions/${prescription.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: "CANCELLED",
          }),
        },
      );

      const data = (await response.json()) as
        | (PrescriptionResponse & {
            message?: string;
          })
        | { message?: string };

      if (!response.ok) {
        throw new Error(
          "message" in data && typeof data.message === "string"
            ? data.message
            : t("prescriptions.unableToLoad"),
        );
      }

      if (!("prescription" in data) || !data.prescription) {
        throw new Error(t("prescriptions.invalidStatusResponse"));
      }

      setPrescription(data.prescription);

      setStatusMessage(data.message ?? t("prescriptions.cancelSuccess"));
    } catch (err) {
      console.error("Cancel prescription error:", err);

      setError(
        err instanceof Error ? err.message : t("prescriptions.unableToLoad"),
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  /* ============================================================
     LOADING STATE
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
              {t("prescriptions.loading")}
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  /* ============================================================
     ERROR / NOT FOUND
     ============================================================ */

  if (error || !prescription) {
    return (
      <AppLayout>
        <div className="pb-8">
          <div className="mb-5">
            <Link href="/prescriptions">
              <Button type="button" variant="ghost" size="sm">
                <span aria-hidden="true">←</span>

                {t("prescriptions.backToPrescriptions")}
              </Button>
            </Link>
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
            {error || t("prescriptions.notFound")}
          </div>
        </div>
      </AppLayout>
    );
  }

  const canDispense =
    prescription.status === "PENDING" ||
    prescription.status === "PARTIALLY_DISPENSED";

  const canCancel = prescription.status === "PENDING";

  return (
    <AppLayout>
      <div className="pb-8">
        {/* ======================================================
            HEADER
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
            <Link href="/prescriptions">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-ms-2 mb-2"
              >
                <span aria-hidden="true">←</span>

                {t("prescriptions.backToPrescriptions")}
              </Button>
            </Link>

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
                {prescription.prescriptionNumber}
              </h1>

              <Badge variant={getStatusVariant(prescription.status)}>
                {getStatusLabel(prescription.status)}
              </Badge>
            </div>
          </div>

          {/* ====================================================
              ACTIONS
              ==================================================== */}

          <div
            className="
              flex
              flex-wrap
              items-center
              gap-2
            "
          >
            {canDispense && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={dispensePrescription}
                disabled={dispensing || updatingStatus}
              >
                {dispensing
                  ? t("prescriptions.dispensing")
                  : prescription.status === "PARTIALLY_DISPENSED"
                    ? t("prescriptions.dispenseRemaining")
                    : t("prescriptions.dispense")}
              </Button>
            )}

            {canCancel && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={cancelPrescription}
                disabled={updatingStatus || dispensing}
              >
                {updatingStatus
                  ? t("prescriptions.cancelling")
                  : t("prescriptions.cancelPrescription")}
              </Button>
            )}
          </div>
        </div>

        {/* ======================================================
            STATUS MESSAGE
            ====================================================== */}

        {statusMessage && (
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
            {statusMessage}
          </div>
        )}

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
            INFORMATION
            ====================================================== */}

        <Card padding="none" className="overflow-hidden">
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
              {t("prescriptions.information")}
            </h2>
          </div>

          <div
            className="
              grid
              grid-cols-1
              gap-x-8
              gap-y-5
              p-5
              sm:grid-cols-2
              lg:grid-cols-4
            "
          >
            <InfoItem
              label={t("prescriptions.prescriptionNumber")}
              value={prescription.prescriptionNumber}
            />

            <InfoItem
              label={t("prescriptions.prescriptionDate")}
              value={formatDate(prescription.prescriptionDate)}
            />

            <InfoItem
              label={t("prescriptions.patient")}
              value={patientName()}
              secondary={prescription.patient?.patientNumber}
            />

            <InfoItem
              label={t("prescriptions.prescriber")}
              value={prescription.prescriberName}
            />

            {prescription.notes && (
              <div className="sm:col-span-2 lg:col-span-4">
                <p
                  className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.1em]
                    text-text-muted
                  "
                >
                  {t("prescriptions.notes")}
                </p>

                <p
                  className="
                    mt-1.5
                    whitespace-pre-wrap
                    text-sm
                    leading-6
                    text-text-secondary
                  "
                >
                  {prescription.notes}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* ======================================================
            MEDICINES
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
                  <TableHeader>{t("prescriptions.medicine")}</TableHeader>

                  <TableHeader>{t("prescriptions.prescribed")}</TableHeader>

                  <TableHeader>{t("prescriptions.dispensed")}</TableHeader>

                  <TableHeader>{t("prescriptions.directions")}</TableHeader>

                  <TableHeader>{t("prescriptions.notes")}</TableHeader>
                </tr>
              </thead>

              <tbody
                className="
                  divide-y
                  divide-border-light
                "
              >
                {prescription.items.map((item) => {
                  const fullyDispensed =
                    item.quantityDispensed >= item.quantityPrescribed;

                  const partiallyDispensed =
                    item.quantityDispensed > 0 && !fullyDispensed;

                  return (
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
                            {item.medicine?.name?.charAt(0).toUpperCase() ||
                              "M"}
                          </div>

                          <div className="min-w-0">
                            <p
                              className="
                                  text-sm
                                  font-semibold
                                  text-text-primary
                                "
                            >
                              {item.medicine?.name ||
                                t("prescriptions.unknownMedicine")}
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

                            {item.medicine?.strength && (
                              <p
                                className="
                                    mt-0.5
                                    text-xs
                                    text-text-muted
                                  "
                              >
                                {item.medicine.strength}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Prescribed */}

                      <td
                        className="
                            px-5
                            py-4
                          "
                      >
                        <span
                          className="
                              text-sm
                              font-semibold
                              text-text-primary
                            "
                        >
                          {item.quantityPrescribed}
                        </span>
                      </td>

                      {/* Dispensed */}

                      <td
                        className="
                            px-5
                            py-4
                          "
                      >
                        <div
                          className="
                              flex
                              items-center
                              gap-2
                            "
                        >
                          <span
                            className={`
                                text-sm
                                font-bold
                                ${
                                  fullyDispensed
                                    ? "text-success"
                                    : partiallyDispensed
                                      ? "text-info"
                                      : "text-text-secondary"
                                }
                              `}
                          >
                            {item.quantityDispensed}
                          </span>

                          {fullyDispensed && (
                            <Badge variant="success">
                              {t("prescriptions.dispensedStatus")}
                            </Badge>
                          )}

                          {partiallyDispensed && (
                            <Badge variant="info">
                              {t("prescriptions.partiallyDispensed")}
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Directions */}

                      <td
                        className="
                            max-w-sm
                            px-5
                            py-4
                            text-sm
                            leading-6
                            text-text-secondary
                          "
                      >
                        {item.directions || "—"}
                      </td>

                      {/* Notes */}

                      <td
                        className="
                            max-w-sm
                            px-5
                            py-4
                            text-sm
                            leading-6
                            text-text-secondary
                          "
                      >
                        {item.notes || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ======================================================
            FOOTER NAVIGATION
            ====================================================== */}

        <div className="mt-5">
          <Link href="/prescriptions">
            <Button type="button" variant="secondary" size="sm">
              <span aria-hidden="true">←</span>

              {t("prescriptions.backToPrescriptions")}
            </Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

/* ================================================================
   INFORMATION ITEM
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
          font-semibold
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
