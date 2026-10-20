"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { getToken, removeToken } from "@/lib/api";
import { useI18n } from "@/lib/i18n/I18nProvider";
import LanguageSwitcher from "./LanguageSwitcher";

type UserRole = "ADMIN" | "PHARMACIST";

type AppUser = {
  name: string;
  username: string;
  role: UserRole;
  pharmacyName: string;
};

const navigation = [
  {
    key: "dashboard",
    href: "/dashboard",
    adminOnly: false,
  },
  {
    key: "medicines",
    href: "/medicines",
    adminOnly: false,
  },
  {
    key: "inventory",
    href: "/inventory",
    adminOnly: false,
  },
  {
    key: "purchases",
    href: "/purchases",
    adminOnly: false,
  },
  {
    key: "sales",
    href: "/sales",
    adminOnly: false,
  },
  {
    key: "suppliers",
    href: "/suppliers",
    adminOnly: true,
  },
  {
    key: "prescriptions",
    href: "/prescriptions",
    adminOnly: false,
  },
  {
    key: "transactions",
    href: "/transactions",
    adminOnly: false,
  },
  {
    key: "reports",
    href: "/reports",
    adminOnly: true,
  },
] as const;

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const { t, language } = useI18n();

  const [user, setUser] = useState<AppUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const isArabic = language === "ar";

  useEffect(() => {
    const token = getToken();

    if (!token) {
      setCheckingAuth(false);
      router.replace("/");
      return;
    }

    const storedUser = localStorage.getItem("pharmacy_user");

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);

        const role =
          parsedUser?.role === "ADMIN" || parsedUser?.role === "PHARMACIST"
            ? parsedUser.role
            : null;

        if (role) {
          setUser({
            name: parsedUser.name ?? "",
            username: parsedUser.username ?? "",
            role,
            pharmacyName: parsedUser.pharmacyName ?? "",
          });
        } else {
          localStorage.removeItem("pharmacy_user");
        }
      } catch {
        localStorage.removeItem("pharmacy_user");
      }
    }

    setCheckingAuth(false);
  }, [router]);

  function handleLogout() {
    removeToken();
    localStorage.removeItem("pharmacy_user");
    router.replace("/");
  }

  const visibleNavigation = useMemo(() => {
    return navigation.filter((item) => {
      if (!item.adminOnly) {
        return true;
      }

      return user?.role === "ADMIN";
    });
  }, [user?.role]);

  const activeItem = navigation.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  const pageTitle = activeItem
    ? t(`navigation.${activeItem.key}`)
    : isArabic
      ? "نظام إدارة الصيدلية"
      : "Pharmacy Management";

  const pharmacyManagementFirstLine = isArabic ? "إدارة" : "Pharmacy";

  const pharmacyManagementSecondLine = isArabic ? "الصيدلية" : "Management";

  const pharmacyAdministrationText = isArabic
    ? "إدارة الصيدلية"
    : "Pharmacy administration";

  const defaultAdministratorName = isArabic
    ? "مسؤول الصيدلية"
    : "Pharmacy Administrator";

  const defaultPharmacyName = isArabic
    ? "نظام إدارة الصيدلية"
    : "Pharmacy Management System";

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
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

          <p className="mt-4 text-sm text-text-muted">{t("common.loading")}</p>
        </div>
      </main>
    );
  }

  return (
    <div
      className="
        h-screen
        overflow-hidden
        bg-background
        text-text-primary
      "
    >
      <div className="flex h-screen gap-4 p-4">
        {/* =====================================================
            SIDEBAR
            ===================================================== */}

        <aside
          className="
            hidden
            h-[calc(100vh-2rem)]
            w-64
            shrink-0
            overflow-hidden
            rounded-2xl
            border
            border-border-light
            bg-surface
            shadow-card
            lg:flex
            lg:flex-col
          "
        >
          {/* Pharmacy identity */}

          <div
            className="
              shrink-0
              border-b
              border-border-light
              px-5
              py-5
            "
          >
            <div className="flex items-center gap-3">
              {/* Pharmacy logo */}

              <div
                className="
                  flex
                  h-11
                  w-11
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-primary
                  text-base
                  font-bold
                  text-white
                  shadow-primary
                "
              >
                P
              </div>

              <div className="min-w-0">
                <h1
                  className="
                    text-sm
                    font-bold
                    leading-5
                    tracking-tight
                    text-text-primary
                  "
                >
                  {pharmacyManagementFirstLine}
                  <br />
                  {pharmacyManagementSecondLine}
                </h1>

                <p
                  className="
                    mt-0.5
                    truncate
                    text-[10px]
                    text-text-muted
                  "
                >
                  {pharmacyAdministrationText}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}

          <nav
            className="
              min-h-0
              flex-1
              overflow-y-auto
              px-3
              py-5
            "
          >
            <p
              className="
                mb-3
                px-3
                text-[10px]
                font-bold
                uppercase
                tracking-[0.14em]
                text-text-muted
              "
            >
              {isArabic ? "القائمة" : "Menu"}
            </p>

            <div className="space-y-1">
              {visibleNavigation.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`
                      group
                      flex
                      items-center
                      gap-3
                      rounded-xl
                      px-3
                      py-2.5
                      text-sm
                      transition-all
                      duration-200
                      ${
                        active
                          ? `
                            bg-primary
                            font-semibold
                            text-white
                            shadow-primary
                          `
                          : `
                            text-text-secondary
                            hover:bg-primary-soft
                            hover:text-primary
                          `
                      }
                    `}
                  >
                    {/* Active indicator */}

                    <span
                      className={`
                        h-1.5
                        w-1.5
                        shrink-0
                        rounded-full
                        transition
                        ${
                          active
                            ? "bg-white"
                            : "bg-transparent group-hover:bg-primary"
                        }
                      `}
                    />

                    <span className="truncate">
                      {t(`navigation.${item.key}`)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User section */}

          <div
            className="
              shrink-0
              border-t
              border-border-light
              p-3
            "
          >
            <div
              className="
                rounded-xl
                bg-surface-muted
                p-3
              "
            >
              <p
                className="
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-[0.14em]
                  text-text-muted
                "
              >
                {t("common.loggedInAs")}
              </p>

              <div className="mt-3 flex items-center gap-2.5">
                {/* Avatar */}

                <div
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-primary
                    text-xs
                    font-bold
                    text-white
                  "
                >
                  {(user?.name ?? "A").charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p
                    className="
                      truncate
                      text-xs
                      font-semibold
                      text-text-primary
                    "
                  >
                    {user?.name ?? defaultAdministratorName}
                  </p>

                  <p
                    className="
                      mt-0.5
                      truncate
                      text-[10px]
                      text-text-muted
                    "
                  >
                    @{user?.username ?? "admin"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="
                  mt-3
                  w-full
                  rounded-xl
                  border
                  border-border
                  bg-surface
                  px-3
                  py-2
                  text-xs
                  font-semibold
                  text-text-secondary
                  transition-all
                  duration-200
                  hover:border-danger/20
                  hover:bg-danger-soft
                  hover:text-danger
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-primary
                "
              >
                {t("common.signOut")}
              </button>
            </div>
          </div>
        </aside>

        {/* =====================================================
            MAIN AREA
            ===================================================== */}

        <main className="min-w-0 flex-1 overflow-hidden">
          <div className="flex h-full min-h-0 flex-col">
            {/* =================================================
                TOP BAR
                ================================================= */}

            <header
              className="
                shrink-0
                rounded-2xl
                border
                border-border-light
                bg-surface
                shadow-card
              "
            >
              <div
                className="
                  flex
                  min-h-16
                  items-center
                  justify-between
                  gap-4
                  px-5
                  py-2.5
                  lg:px-6
                "
              >
                {/* Page information */}

                <div className="min-w-0">
                  <p
                    className="
                      truncate
                      text-sm
                      font-bold
                      tracking-tight
                      text-text-primary
                    "
                  >
                    {pageTitle}
                  </p>

                  <p
                    className="
                      mt-0.5
                      truncate
                      text-[11px]
                      text-text-muted
                    "
                  >
                    {user?.pharmacyName ?? defaultPharmacyName}
                  </p>
                </div>

                {/* Header actions */}

                <div className="flex shrink-0 items-center gap-3">
                  <LanguageSwitcher />

                  {/* User */}

                  <div
                    className="
                      hidden
                      text-end
                      sm:block
                    "
                  >
                    <p
                      className="
                        max-w-36
                        truncate
                        text-xs
                        font-semibold
                        text-text-primary
                      "
                    >
                      {user?.name ?? defaultAdministratorName}
                    </p>

                    <p
                      className="
                        mt-0.5
                        text-[10px]
                        text-text-muted
                      "
                    >
                      @{user?.username ?? "admin"}
                    </p>
                  </div>

                  {/* Avatar */}

                  <div
                    className="
                      flex
                      h-9
                      w-9
                      items-center
                      justify-center
                      rounded-full
                      bg-primary
                      text-xs
                      font-bold
                      text-white
                    "
                  >
                    {(user?.name ?? "A").charAt(0).toUpperCase()}
                  </div>
                </div>
              </div>
            </header>

            {/* =================================================
                PAGE CONTENT
                ================================================= */}

            <div
              className="
                min-h-0
                flex-1
                overflow-y-auto
                px-1
                py-5
                lg:px-1
                lg:py-6
              "
            >
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
