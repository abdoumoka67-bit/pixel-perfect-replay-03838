import { useEffect, useState } from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { cn } from "@/lib/utils";

export const THEME_STORAGE_KEY = "oranix-theme";

export function applyStoredTheme() {
  if (typeof window === "undefined") return;
  const isDark = window.localStorage.getItem(THEME_STORAGE_KEY) === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

/** Inline light/dark switch. Lives inside page toolbars so it never floats over other buttons. */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light");
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    applyStoredTheme();
    setTheme(next);
  };

  return (
    <button
      type="button"
      aria-label={theme === "dark" ? "تبديل إلى الوضع الفاتح" : "تبديل إلى الوضع الداكن"}
      onClick={toggle}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-secondary",
        className,
      )}
    >
      {theme === "dark" ? <SunMedium className="size-4" /> : <MoonStar className="size-4" />}
    </button>
  );
}
