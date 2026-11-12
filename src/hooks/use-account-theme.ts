import { useEffect } from "react";

/**
 * Applies the account palette (forest green) to the whole document while an
 * account screen is mounted. Putting the class on <html> instead of a wrapper
 * keeps portals (dialogs, sheets, toasts) inside the same palette.
 */
export function useAccountTheme() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("theme-forest");
    return () => root.classList.remove("theme-forest");
  }, []);
}
