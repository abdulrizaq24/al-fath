"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import AppLayout from "@/components/AppLayout";
import { getPrescriptions, type Prescription } from "@/lib/prescriptions";
import { useI18n } from "@/lib/i18n/I18nProvider";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

export default function PrescriptionsPage() {
  const { t } = useI18n();

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  async function loadPrescriptions() {
    try {
      setLoading(true);
      setError("");

      const data = await getPrescriptions();

      setPrescriptions(data);
    } catch (err) {
      console.error("Load prescriptions error:", err);

      setError(
        err instanceof Error ? err.message : t("prescriptions.unableToLoad"),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPrescriptions();
  }, []);

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
            PRESCRIPTION HISTORY
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
                {t("prescriptions.history")}
              </h2>

              <p
                className="
                  mt-1
                  text-xs
                  text-text-muted
              "
              >
                {t("prescriptions.historyDescription")}
              </p>
            </div>

            <Link href="/prescriptions/new">
              <Button type="button" variant="primary" size="sm">
                + {t("prescriptions.create")}
              </Button>
            </Link>
          </div>

          {/* ===================================================
              LOADING
              =================================================== */}

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
                  {t("prescriptions.loading")}
                </p>
              </div>
            </div>
          ) : prescriptions.length === 0 ? (
            /* =================================================
               EMPTY STATE
               ================================================= */

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
                Rx
              </div>

              <p
                className="
                  mt-4
                  text-sm
                  font-semibold
                  text-text-primary
                "
              >
                {t("prescriptions.noPrescriptions")}
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  text-text-muted
                "
              >
                {t("prescriptions.noPrescriptionsDescription")}
              </p>

              <div className="mt-5">
                <Link href="/prescriptions/new">
                  <Button type="button" variant="primary" size="sm">
                    + {t("prescriptions.create")}
                  </Button>
                </Link>
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
                    <TableHeader>{t("prescriptions.date")}</TableHeader>

                    <TableHeader>{t("prescriptions.prescription")}</TableHeader>

                    <TableHeader>{t("prescriptions.patient")}</TableHeader>

                    <TableHeader>{t("prescriptions.prescriber")}</TableHeader>

                    <TableHeader>{t("prescriptions.items")}</TableHeader>

                    <TableHeader>{t("prescriptions.status")}</TableHeader>

                    <TableHeader align="right">
                      {t("prescriptions.action")}
                    </TableHeader>
                  </tr>
                </thead>

                <tbody
                  className="
                    divide-y
                    divide-border-light
                  "
                >
                  {prescriptions.map((prescription) => (
                    <tr
                      key={prescription.id}
                      className="
                          transition-colors
                          duration-150
                          hover:bg-surface-subtle
                        "
                    >
                      {/* =================================================
                            DATE
                            ================================================= */}

                      <td
                        className="
                            whitespace-nowrap
                            px-5
                            py-4
                            text-sm
                            text-text-secondary
                          "
                      >
                        {new Date(
                          prescription.prescriptionDate,
                        ).toLocaleDateString()}
                      </td>

                      {/* =================================================
                            PRESCRIPTION
                            ================================================= */}

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
                            Rx
                          </div>

                          <div className="min-w-0">
                            <p
                              className="
                                  text-sm
                                  font-semibold
                                  text-text-primary
                                "
                            >
                              {prescription.prescriptionNumber}
                            </p>

                            <p
                              className="
                                  mt-0.5
                                  text-xs
                                  text-text-muted
                                "
                            >
                              {t("prescriptions.created")}{" "}
                              {new Date(
                                prescription.createdAt,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* =================================================
                            PATIENT
                            ================================================= */}

                      <td
                        className="
                            px-5
                            py-4
                            text-sm
                            font-medium
                            text-text-primary
                          "
                      >
                        {prescription.patient.name}
                      </td>

                      {/* =================================================
                            PRESCRIBER
                            ================================================= */}

                      <td
                        className="
                            px-5
                            py-4
                            text-sm
                            text-text-secondary
                          "
                      >
                        {prescription.prescriberName}
                      </td>

                      {/* =================================================
                            ITEMS
                            ================================================= */}

                      <td
                        className="
                            px-5
                            py-4
                            text-sm
                            font-medium
                            text-text-secondary
                          "
                      >
                        {prescription.items.length}
                      </td>

                      {/* =================================================
                            STATUS
                            ================================================= */}

                      <td className="px-5 py-4">
                        <Badge variant={getStatusVariant(prescription.status)}>
                          {prescription.status}
                        </Badge>
                      </td>

                      {/* =================================================
                            ACTION
                            ================================================= */}

                      <td className="px-5 py-4">
                        <div
                          className="
                              flex
                              justify-end
                            "
                        >
                          <Link href={`/prescriptions/${prescription.id}`}>
                            <Button type="button" variant="ghost" size="sm">
                              {t("prescriptions.view")}
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
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
   STATUS
   ================================================================ */

function getStatusVariant(
  status: string,
): "success" | "warning" | "danger" | "info" | "neutral" {
  const normalized = status.toUpperCase();

  if (
    normalized === "COMPLETED" ||
    normalized === "DISPENSED" ||
    normalized === "APPROVED" ||
    normalized === "ACTIVE"
  ) {
    return "success";
  }

  if (
    normalized === "PENDING" ||
    normalized === "PROCESSING" ||
    normalized === "PARTIALLY_FILLED"
  ) {
    return "warning";
  }

  if (
    normalized === "CANCELLED" ||
    normalized === "REJECTED" ||
    normalized === "EXPIRED"
  ) {
    return "danger";
  }

  if (normalized === "READY" || normalized === "IN_PROGRESS") {
    return "info";
  }

  return "neutral";
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
