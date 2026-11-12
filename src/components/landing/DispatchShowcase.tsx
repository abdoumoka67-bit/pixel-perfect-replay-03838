import { useEffect, useState } from "react";
import { Check, PackageCheck, Sparkles, Truck } from "lucide-react";
import type { LanguageCode } from "@/lib/commerce";
import zrExpressLogo from "@/assets/carriers/zr-express.png";
import maystroLogo from "@/assets/carriers/maystro.svg";
import tslLogo from "@/assets/carriers/tsl.png";
import { translate, type TranslationKey } from "@/lib/i18n";
import { useUiLanguage } from "@/lib/ui-i18n";
import { revealClasses, useInView } from "@/hooks/use-in-view";

const ORDERS: {
  id: string;
  city: Record<LanguageCode, string>;
  wilaya: string;
}[] = [
  { id: "#00001042", city: { ar: "الجزائر العاصمة", fr: "Alger", en: "Algiers" }, wilaya: "16" },
  { id: "#00001043", city: { ar: "وهران", fr: "Oran", en: "Oran" }, wilaya: "31" },
  { id: "#00001044", city: { ar: "قسنطينة", fr: "Constantine", en: "Constantine" }, wilaya: "25" },
];

type DispatchOrderStatus = "new" | "confirmed" | "shipping" | "delivered";

const ORDER_STATUS_LABELS: Record<LanguageCode, Record<DispatchOrderStatus, string>> = {
  ar: { new: "جديدة", confirmed: "مؤكدة", shipping: "قيد التوصيل", delivered: "تم التوصيل" },
  fr: { new: "Nouvelle", confirmed: "Confirmée", shipping: "En livraison", delivered: "Livrée" },
  en: { new: "New", confirmed: "Confirmed", shipping: "Shipping", delivered: "Delivered" },
};

const ORDER_STATUS_STYLES: Record<DispatchOrderStatus, string> = {
  new: "bg-info-soft text-info",
  confirmed: "bg-warning-soft text-warning",
  shipping: "bg-brand-soft text-brand",
  delivered: "bg-success-soft text-success",
};

export function DispatchShowcase() {
  const language = useUiLanguage();
  const isRtl = language === "ar";
  const [step, setStep] = useState(0);
  const t = (key: TranslationKey) => translate(language, key);
  // Stop the timed story off screen; replay it from the start when it returns.
  const { ref, inView } = useInView<HTMLElement>({ settleMs: 150 });

  useEffect(() => {
    if (!inView) {
      setStep(0);
      return;
    }

    const delays = [1100, 1100, 1100, 1200, 2600, 1800];
    const timer = window.setTimeout(() => {
      setStep((current) => (current >= 5 ? 0 : current + 1));
    }, delays[step] ?? 2600);

    return () => window.clearTimeout(timer);
  }, [step, inView]);

  const visibleOrders = step === 0 ? 1 : step === 1 ? 2 : 3;
  const isPressed = step === 3;
  const isDispatched = step === 4;
  const isDelivered = step === 5;
  const orderStatuses: DispatchOrderStatus[] =
    step === 0
      ? ["new", "new", "new"]
      : step === 1
        ? ["confirmed", "new", "new"]
        : step === 2
          ? ["confirmed", "confirmed", "new"]
          : step === 3
            ? ["confirmed", "confirmed", "confirmed"]
            : step === 4
              ? ["shipping", "shipping", "shipping"]
              : ["delivered", "delivered", "delivered"];

  return (
    <section ref={ref} className="border-t bg-background">
      <div className="mx-auto w-full max-w-4xl px-5 py-14 sm:py-16">
        <div
          className={revealClasses(
            inView,
            "relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-xs sm:p-10",
          )}
        >
          <div className="relative mx-auto max-w-2xl text-center" dir={isRtl ? "rtl" : "ltr"}>
            <span className="inline-flex rounded-full border border-border/70 bg-card px-3.5 py-1 text-xs text-muted-foreground shadow-2xs">
              {t("landing.dispatch.badge")}
            </span>
            <h2 className="mt-4 text-balance text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
              {t("landing.dispatch.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t("landing.dispatch.desc")}
            </p>
          </div>

          <div className="relative mx-auto mt-8 w-full max-w-md sm:mt-10">
            <div className="relative rounded-2xl border border-border/80 bg-background/60 p-4 shadow-xs sm:p-5">
              <div className="mb-[18px] flex items-center justify-between gap-2 border-b border-border/60 pb-3.5">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1 text-xs text-muted-foreground shadow-2xs">
                  <span className="font-medium text-foreground">+18</span>
                  <span>
                    {isRtl ? "شركة توصيل" : language === "fr" ? "transporteurs" : "couriers"}
                  </span>
                  <div className="flex -space-x-1.5 opacity-80 rtl:space-x-reverse">
                    <span className="flex size-[18px] items-center justify-center rounded-full border border-background bg-muted p-0.5">
                      <img src={maystroLogo} alt="" className="size-full object-contain" />
                    </span>
                    <span className="flex size-[18px] items-center justify-center rounded-full border border-background bg-muted p-0.5">
                      <img src={tslLogo} alt="" className="size-full object-contain" />
                    </span>
                  </div>
                </div>

                <div className="flex items-center rounded-xl border border-border bg-white px-2.5 py-1 shadow-2xs dark:bg-zinc-900">
                  <img
                    src={zrExpressLogo}
                    alt="ZR Express"
                    className="h-[18px] w-auto object-contain"
                  />
                </div>
              </div>

              <div className="mb-[18px] min-h-[162px] space-y-2">
                {ORDERS.map((order, index) => {
                  const isVisible = index < visibleOrders;
                  const status = orderStatuses[index] ?? "new";
                  const StatusIcon =
                    status === "new"
                      ? Sparkles
                      : status === "confirmed"
                        ? Check
                        : status === "shipping"
                          ? Truck
                          : PackageCheck;

                  return (
                    <div
                      key={order.id}
                      className={`flex items-center justify-between rounded-xl border border-border/60 bg-card p-3 transition-all duration-500 ${
                        isVisible
                          ? "translate-y-0 scale-100 opacity-100"
                          : "pointer-events-none translate-y-3 scale-95 opacity-0"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex size-[22px] shrink-0 items-center justify-center rounded-full ${ORDER_STATUS_STYLES[status]}`}
                        >
                          <StatusIcon className="size-3.5 stroke-[2.5]" aria-hidden />
                        </span>
                        <div>
                          <div className="font-mono text-xs font-medium text-foreground sm:text-sm">
                            {order.id}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {order.city[language] || order.city.ar} ({order.wilaya})
                          </div>
                        </div>
                      </div>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${ORDER_STATUS_STYLES[status]}`}
                      >
                        {ORDER_STATUS_LABELS[language][status]}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                aria-live="polite"
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-medium text-white shadow-xs transition-all duration-300 sm:text-sm ${
                  isDispatched || isDelivered
                    ? "bg-emerald-600"
                    : isPressed
                      ? "scale-[0.98] bg-primary-hover"
                      : "bg-primary shadow-[0_2px_8px_-2px_rgba(0,128,96,0.35)] hover:bg-primary-hover"
                }`}
              >
                {isDelivered ? (
                  <>
                    <PackageCheck className="size-4" aria-hidden />
                    <span>
                      {isRtl
                        ? "تم تحديث حالات التوصيل ✓"
                        : language === "fr"
                          ? "Suivi de livraison mis à jour ✓"
                          : "Delivery statuses updated ✓"}
                    </span>
                  </>
                ) : isDispatched ? (
                  <>
                    <PackageCheck className="size-4 animate-bounce" aria-hidden />
                    <span>
                      {isRtl
                        ? "تم تجهيز 3 بوليصات وأرقام التتبع بنجاح ✓"
                        : language === "fr"
                          ? "3 colis prêts avec numéros de suivi ✓"
                          : "3 parcels ready with tracking ✓"}
                    </span>
                  </>
                ) : (
                  <>
                    <Truck className="size-4" aria-hidden />
                    <span>
                      {isRtl
                        ? "أرسل 3 طلبيات للشحن"
                        : language === "fr"
                          ? "Expédier 3 commandes"
                          : "Dispatch 3 orders"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
