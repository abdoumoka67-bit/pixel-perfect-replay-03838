import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, Sparkles, X } from "lucide-react";
import { useMyStore } from "@/hooks/use-my-store";
import { useTr } from "@/lib/ui-i18n";

const steps = [
  { id: "tour-products", title: "المنتجات", body: "من هنا تضيف منتجاتك، صورها، وأسعارها وتحصل على روابط مخصصة لنشرها في إعلاناتك." },
  { id: "tour-orders", title: "الطلبات وسجل المكالمات", body: "كل زبون يطلب يظهر هنا فوراً. يمكنك الاتصال به بنقرة واحدة وتسجيل نتائج التأكيد." },
  { id: "tour-delivery", title: "شركات التوصيل وYalidine", body: "اربط شركة التوصيل الخاصة بك لإرسال الطلبات المؤكدة والحصول على أرقام التتبع تلقائياً." },
  { id: "tour-analytics", title: "الميزات المتقدمة", body: "مظهر متجرك المخصص، أكواد البيكسل (Meta & TikTok)، والإحصائيات المتقدمة كلها مفعلة مجاناً في تجربتك." },
  { id: "tour-preview", title: "معاينة متجرك", body: "اضغط هنا في أي وقت لترى متجرك كما يراه زبائنك تماماً وتجربة الطلب بنفسك." },
] as const;

export function RestartTourButton({ className }: { className?: string }) {
  const t = useTr();
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("oranix-tour-restart"));
        }
      }}
      className={
        className ||
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-medium text-primary hover:bg-background transition-colors"
      }
    >
      <Sparkles className="size-3.5 text-brand" />
      <span>{t("بدء الجولة الإرشادية")}</span>
    </button>
  );
}

export function GuidedTour() {
  const { store } = useMyStore();
  const t = useTr();
  const [stepIndex, setStepIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!store) return;
    const key = `oranix_tour_completed_${store.id}`;
    const shouldOpen = typeof window !== "undefined" && !window.localStorage.getItem(key);
    setOpen(shouldOpen);
  }, [store]);

  useEffect(() => {
    const onRestart = () => {
      if (!store) return;
      const key = `oranix_tour_completed_${store.id}`;
      window.localStorage.removeItem(key);
      setStepIndex(0);
      setOpen(true);
    };
    window.addEventListener("oranix-tour-restart", onRestart);
    return () => window.removeEventListener("oranix-tour-restart", onRestart);
  }, [store]);

  useEffect(() => {
    if (!open) return;
    const id = steps[stepIndex]?.id ?? "";
    // The same target can exist in the desktop sidebar and the phone bottom bar; use the one actually on screen.
    const findVisible = () =>
      Array.from(document.querySelectorAll<HTMLElement>(`#${id}, [data-tour="${id}"]`)).find((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
      });
    const updateHighlight = () => {
      const currentTarget = findVisible();
      if (!currentTarget) {
        setHighlight(null);
        return;
      }
      const rect = currentTarget.getBoundingClientRect();
      setHighlight({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    };
    updateHighlight();
    window.addEventListener("resize", updateHighlight);
    window.addEventListener("scroll", updateHighlight, { passive: true });
    return () => {
      window.removeEventListener("resize", updateHighlight);
      window.removeEventListener("scroll", updateHighlight);
    };
  }, [open, stepIndex]);

  const step = steps[stepIndex];
  const tooltipStyle = useMemo(() => {
    if (!highlight) {
      return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
    }
    const width = Math.min(360, window.innerWidth - 32);
    const x = Math.max(16, Math.min(window.innerWidth - width - 16, highlight.left + highlight.width / 2 - width / 2));
    // Lower half of the screen: open above the target; upper half: open below it.
    if (highlight.top > window.innerHeight / 2) {
      return { left: `${x}px`, bottom: `${window.innerHeight - highlight.top + 16}px` };
    }
    return { left: `${x}px`, top: `${highlight.top + highlight.height + 16}px` };
  }, [highlight]);

  if (!open || !step) return null;

  const isLast = stepIndex === steps.length - 1;

  const closeTour = () => {
    if (!store) return;
    window.localStorage.setItem(`oranix_tour_completed_${store.id}`, "1");
    setOpen(false);
  };

  const goNext = () => {
    if (isLast) {
      closeTour();
      return;
    }
    setStepIndex((s) => s + 1);
  };

  const goPrev = () => setStepIndex((s) => Math.max(0, s - 1));

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60" />
      {highlight && (
        <div
          className="absolute z-10 rounded-[26px] border-[3px] border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
          style={{
            left: highlight.left - 8,
            top: highlight.top - 8,
            width: highlight.width + 16,
            height: highlight.height + 16,
          }}
        />
      )}
      <div className="absolute z-20 w-[min(360px,calc(100vw-32px))] rounded-2xl border border-border bg-white p-4 shadow-float" style={tooltipStyle}>
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-2 py-1 text-[11px] font-medium text-brand">
            <Sparkles className="size-3.5" /> {t("{n} من 5", { n: stepIndex + 1 })}
          </span>
          <button type="button" onClick={closeTour} className="rounded-full p-1.5 text-muted-foreground hover:bg-background" aria-label={t("إغلاق")}>
            <X className="size-4" />
          </button>
        </div>
        <h3 className="text-xl font-medium text-primary">{t(step.title)}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(step.body)}</p>
        <div className="mt-5 flex items-center justify-between gap-2">
          <button type="button" onClick={goPrev} disabled={stepIndex === 0} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-2 text-sm text-muted-foreground disabled:opacity-40">
            <ChevronLeft className="size-4" /> {t("السابق")}
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={closeTour} className="rounded-full px-3 py-2 text-sm text-muted-foreground">{t("تخطي")}</button>
            <button type="button" onClick={goNext} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm text-white">
              {isLast ? t("تم") : t("التالي")} <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
