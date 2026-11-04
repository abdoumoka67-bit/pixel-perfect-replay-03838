import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, Sparkles, X } from "lucide-react";
import { useMyStore } from "@/hooks/use-my-store";

const steps = [
  { id: "tour-products", title: "المنتجات", body: "من هنا تضيف منتجاتك، صورها، وأسعارها وتحصل على روابط مخصصة لنشرها في إعلاناتك." },
  { id: "tour-orders", title: "الطلبات وسجل المكالمات", body: "كل زبون يطلب يظهر هنا فوراً. يمكنك الاتصال به بنقرة واحدة وتسجيل نتائج التأكيد." },
  { id: "tour-delivery", title: "شركات التوصيل وYalidine", body: "اربط شركة التوصيل الخاصة بك لإرسال الطلبات المؤكدة والحصول على أرقام التتبع تلقائياً." },
  { id: "tour-analytics", title: "الميزات المتقدمة", body: "مظهر متجرك المخصص، أكواد البيكسل (Meta & TikTok)، والإحصائيات المتقدمة كلها مفعلة مجاناً في تجربتك." },
  { id: "tour-preview", title: "معاينة متجرك", body: "اضغط هنا في أي وقت لترى متجرك كما يراه زبائنك تماماً وتجربة الطلب بنفسك." },
] as const;

export function RestartTourButton({ className }: { className?: string }) {
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
      <span>بدء الجولة الإرشادية</span>
    </button>
  );
}

export function GuidedTour() {
  const { store } = useMyStore();
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
    const currentTarget = document.getElementById(steps[stepIndex]?.id ?? "");
    const updateHighlight = () => {
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
    const x = Math.max(24, Math.min(window.innerWidth - 340, highlight.left + highlight.width / 2 - 170));
    const y = Math.max(32, highlight.top - 180);
    return { left: `${x}px`, top: `${y}px` };
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
            <Sparkles className="size-3.5" /> {stepIndex + 1} من 5
          </span>
          <button type="button" onClick={closeTour} className="rounded-full p-1.5 text-muted-foreground hover:bg-background" aria-label="إغلاق">
            <X className="size-4" />
          </button>
        </div>
        <h3 className="text-xl font-medium text-primary">{step.title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
        <div className="mt-5 flex items-center justify-between gap-2">
          <button type="button" onClick={goPrev} disabled={stepIndex === 0} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-2 text-sm text-muted-foreground disabled:opacity-40">
            <ChevronLeft className="size-4" /> السابق
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={closeTour} className="rounded-full px-3 py-2 text-sm text-muted-foreground">تخطي</button>
            <button type="button" onClick={goNext} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm text-white">
              {isLast ? "تم" : "التالي"} <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
