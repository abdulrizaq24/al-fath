"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch, setToken } from "@/lib/api";
import { useI18n } from "@/lib/i18n/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";

type LoginResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    username: string;
    role: string;
    pharmacyId: string;
    pharmacyName: string;
  };
};

export default function LoginPage() {
  const router = useRouter();
  const { language } = useI18n();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isArabic = language === "ar";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!username.trim() || !password) {
      setError(
        isArabic
          ? "يرجى إدخال اسم المستخدم وكلمة المرور."
          : "Please enter your username and password.",
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        auth: false,
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      // Save JWT using the same key expected by lib/api.ts
      setToken(response.token);

      // Save user information for AppLayout
      localStorage.setItem("pharmacy_user", JSON.stringify(response.user));

      // Go to dashboard after successful login
      router.replace("/dashboard");
    } catch (err) {
      console.error("Login error:", err);

      setError(
        err instanceof Error
          ? err.message
          : isArabic
            ? "فشل تسجيل الدخول."
            : "Unable to sign in.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className={`flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12 ${
        isArabic ? "rtl" : "ltr"
      }`}
    >
      <div className="absolute right-6 top-6">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-lg font-bold text-white">
            P
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
            {isArabic ? "نظام إدارة الصيدلية" : "Pharmacy Management"}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {isArabic
              ? "تسجيل الدخول إلى نظام إدارة الصيدلية"
              : "Sign in to your pharmacy management system"}
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              {isArabic ? "تسجيل الدخول" : "Sign in"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {isArabic
                ? "أدخل بيانات حسابك للمتابعة."
                : "Enter your account credentials to continue."}
            </p>
          </div>

          {error && (
            <div
              className={`mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 ${
                isArabic ? "text-right" : "text-left"
              }`}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                {isArabic ? "اسم المستخدم" : "Username"}
              </label>

              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                disabled={loading}
                placeholder={isArabic ? "أدخل اسم المستخدم" : "Enter username"}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                {isArabic ? "كلمة المرور" : "Password"}
              </label>

              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                disabled={loading}
                placeholder={isArabic ? "أدخل كلمة المرور" : "Enter password"}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? isArabic
                  ? "جارٍ تسجيل الدخول..."
                  : "Signing in..."
                : isArabic
                  ? "تسجيل الدخول"
                  : "Sign in"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-400">
          {isArabic ? "نظام إدارة الصيدلية" : "Pharmacy Management System"}
        </p>
      </div>
    </main>
  );
}
