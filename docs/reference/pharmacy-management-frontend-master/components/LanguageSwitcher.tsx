"use client";

import { useI18n } from "../lib/i18n/I18nProvider";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">🌐</span>

      <select
        value={language}
        onChange={(event) =>
          setLanguage(event.target.value as "en" | "ar")
        }
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm"
        aria-label="Language"
      >
        <option value="en">English</option>
        <option value="ar">العربية</option>
      </select>
    </div>
  );
}