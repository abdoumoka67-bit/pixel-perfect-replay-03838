import { useEffect, useState } from "react";
import {
  LANGUAGE_OPTIONS,
  LANGUAGE_STORAGE_KEY,
  applyLanguageToDocument,
  normalizeLanguage,
  type LanguageCode,
} from "@/lib/commerce";
import { cn } from "@/lib/utils";

/**
 * Single source of truth for the interface language: keeps the choice in
 * localStorage ("oranix_lang") and mirrors it onto <html lang/dir/font>.
 */
export function useLanguagePreference() {
  const [language, setLanguage] = useState<LanguageCode>(() => {
    if (typeof window === "undefined") return "ar";
    return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  });

  useEffect(() => {
    applyLanguageToDocument(language);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  return { language, setLanguage };
}

export function LanguageSwitcher({
  value,
  onChange,
  className,
}: {
  value: LanguageCode;
  onChange: (lang: LanguageCode) => void;
  className?: string;
}) {
  return (
    <div
      dir="ltr"
      role="group"
      aria-label="اختيار اللغة"
      className={cn("flex rounded-full border border-border bg-background p-1", className)}
    >
      {LANGUAGE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm transition-colors",
            option.value === value ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
