import { useCallback, useSyncExternalStore } from "react";
import {
  LANGUAGE_DEFAULT,
  LANGUAGE_OPTIONS,
  LANGUAGE_STORAGE_KEY,
  applyLanguageToDocument,
  normalizeLanguage,
  type LanguageCode,
} from "@/lib/commerce";
import { translate, type TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Single source of truth for the interface language: kept in localStorage
 * ("oranix_lang"), mirrored onto <html lang/dir/font>, and shared by every
 * component so switching in one place updates the whole screen.
 */
const CHANGE_EVENT = "oranix-language-change";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const readLanguage = () => normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
const serverLanguage = () => LANGUAGE_DEFAULT;

export function setStoredLanguage(lang: LanguageCode) {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  applyLanguageToDocument(lang);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useLanguagePreference() {
  const language = useSyncExternalStore(subscribe, readLanguage, serverLanguage);
  return { language, setLanguage: setStoredLanguage };
}

/** Translator bound to the current interface language. */
export function useT() {
  const { language } = useLanguagePreference();
  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => translate(language, key, vars),
    [language],
  );
  return { t, language };
}

export function LanguageSwitcher({
  value,
  onChange,
  className,
  compact = false,
}: {
  value: LanguageCode;
  onChange: (lang: LanguageCode) => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      dir="ltr"
      role="group"
      aria-label={translate(value, "lang.group")}
      className={cn(
        "flex rounded-full border border-border bg-background",
        compact ? "p-0.5" : "p-1",
        className,
      )}
    >
      {LANGUAGE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full transition-colors",
            compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
            option.value === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
