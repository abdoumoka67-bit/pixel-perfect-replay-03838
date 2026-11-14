import { useEffect, useState } from "react";
import { Download, PlusSquare, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearInstallPrompt, onInstallPrompt, type BeforeInstallPromptEvent } from "@/lib/pwa-install";
import { useTr } from "@/lib/ui-i18n";

const DISMISS_KEY = "oranix:pwa-dismissed";

function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * "Add to home screen" nudge for the dashboard: Chromium hands us a native
 * prompt on Android, while iOS has no API so we show the Safari steps instead.
 */
export function InstallPwaPrompt() {
  const t = useTr();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Already installed and running full screen: nothing to suggest.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    setDismissed(readDismissed());

    // iPhone, iPad and iPadOS 13+ (which reports itself as a Mac).
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice =
      (/iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    setIsIos(isIosDevice);

    const stopPrompt = onInstallPrompt((event) => setDeferredPrompt(event));
    const onInstalled = () => setIsStandalone(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      stopPrompt();
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Private mode: the bar simply returns on the next visit.
    }
  };

  if (isStandalone || dismissed) return null;
  if (!deferredPrompt && !isIos) return null;

  async function handleInstallClick() {
    if (!deferredPrompt) {
      setShowIosGuide(true);
      return;
    }
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    // The event can only be used once, so drop it either way.
    setDeferredPrompt(null);
    clearInstallPrompt();
    if (choice.outcome === "accepted") dismiss();
  }

  return (
    <>
      <div
        role="region"
        aria-label={t("تثبيت التطبيق")}
        className="fixed inset-x-3 bottom-16 z-50 mx-auto max-w-md rounded-2xl border border-border bg-card/95 p-3.5 shadow-xl backdrop-blur-md lg:bottom-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground">
              Ox
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">{t("تطبيق oranix")}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {t("ثبّت التطبيق على شاشتك للوصول السريع")}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              onClick={() => void handleInstallClick()}
              className="h-8 gap-1.5 rounded-full px-3 text-xs font-medium shadow-xs"
            >
              <Download className="size-3.5" />
              {t("تثبيت")}
            </Button>
            <button
              type="button"
              onClick={dismiss}
              className="p-1.5 text-muted-foreground hover:text-foreground"
              aria-label={t("إغلاق")}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {showIosGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-xs sm:items-center"
          onClick={() => setShowIosGuide(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("التثبيت على شاشة iPhone")}
            className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <p className="text-sm font-bold text-foreground">{t("التثبيت على شاشة iPhone")}</p>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="text-muted-foreground"
                aria-label={t("إغلاق")}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
                  <Share className="size-4" />
                </div>
                <p>{t("1. اضغط على زر المشاركة في شريط Safari السفلي.")}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
                  <PlusSquare className="size-4" />
                </div>
                <p>{t("2. اختر «إضافة إلى الشاشة الرئيسية».")}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-[11px] font-bold text-primary-foreground">
                  ✓
                </div>
                <p>{t("3. اضغط «إضافة» في الزاوية العلوية.")}</p>
              </div>
            </div>

            <Button
              type="button"
              className="mt-5 w-full rounded-full"
              size="sm"
              onClick={() => setShowIosGuide(false)}
            >
              {t("فهمت ذلك")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
