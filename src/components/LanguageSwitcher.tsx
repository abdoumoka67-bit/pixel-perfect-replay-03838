import { useCallback, useEffect, useSyncExternalStore } from "react";
import { Check, Languages } from "lucide-react";
import {
  LANGUAGE_DEFAULT,
  LANGUAGE_OPTIONS,
  LANGUAGE_STORAGE_KEY,
  STOREFRONT_LANGUAGE_STORAGE_KEY,
  applyLanguageToDocument,
  normalizeLanguage,
  type LanguageCode,
} from "@/lib/commerce";
import { translate, type TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

const serverStoredLanguage = () => null;

export function setStoredLanguage(lang: LanguageCode, storageKey: string = LANGUAGE_STORAGE_KEY) {
  window.localStorage.setItem(storageKey, lang);
  applyLanguageToDocument(lang);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * The chosen language for one surface, or `fallback` when nothing was chosen yet.
 * The dashboard and the storefront use separate storage keys, so they stay independent.
 */
export function useLanguagePreference(
  fallback: LanguageCode = LANGUAGE_DEFAULT,
  storageKey: string = LANGUAGE_STORAGE_KEY,
) {
  const readStored = useCallback(() => window.localStorage.getItem(storageKey), [storageKey]);
  const stored = useSyncExternalStore(subscribe, readStored, serverStoredLanguage);
  const language = stored ? normalizeLanguage(stored) : fallback;
  const setLanguage = useCallback((lang: LanguageCode) => setStoredLanguage(lang, storageKey), [storageKey]);
  return { language, setLanguage };
}

/** Dashboard interface language: its own preference, defaulting to the store language. */
export function useDashboardLanguage(fallback: LanguageCode = LANGUAGE_DEFAULT) {
  return useLanguagePreference(fallback, LANGUAGE_STORAGE_KEY);
}

/** Public storefront language: its own preference, defaulting to the store language. */
export function useStorefrontLanguage(fallback: LanguageCode = LANGUAGE_DEFAULT) {
  return useLanguagePreference(fallback, STOREFRONT_LANGUAGE_STORAGE_KEY);
}

/** Translator bound to the current interface language, or to `language` when given. */
export function useT(languageOverride?: LanguageCode) {
  const { language: stored } = useLanguagePreference();
  const language = languageOverride ?? stored;
  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => translate(language, key, vars),
    [language],
  );
  return { t, language };
}

/**
 * Applies `language` to <html lang/dir/font> without persisting it.
 * Public pages pass "en" so they always open in English; the dashboard and
 * storefronts pass the store's saved language.
 */
export function useDocumentLanguage(language: LanguageCode) {
  useEffect(() => {
    applyLanguageToDocument(language);
  }, [language]);
}

export function LanguageSwitcher({
  value,
  onChange,
  className,
  compact = false,
  disabled = false,
}: {
  value: LanguageCode;
  onChange: (lang: LanguageCode) => void;
  className?: string | undefined;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      dir="ltr"
      role="group"
      aria-label={translate(value, "lang.group")}
      className={cn(
        "flex rounded-full border border-border bg-background",
        compact ? "p-0.5" : "p-1",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
    >
      {LANGUAGE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
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

/**
 * Compact language button that opens a menu of the three interface languages.
 * Used by the dashboard chrome (mobile + desktop) and the storefront header.
 */
export function LanguageMenu({
  value,
  onChange,
  className,
}: {
  value: LanguageCode;
  onChange: (lang: LanguageCode) => void;
  className?: string | undefined;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={translate(value, "lang.group")}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary",
            className,
          )}
        >
          <Languages className="size-4" strokeWidth={1.8} />
          <span className="uppercase">{value}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {LANGUAGE_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => onChange(option.value)}
            className="justify-between gap-2"
          >
            <span>{option.label}</span>
            {option.value === value && <Check className="size-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
