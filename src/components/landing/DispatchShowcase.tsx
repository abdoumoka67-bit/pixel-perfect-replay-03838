import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, PackageCheck, Truck } from "lucide-react";
import type { LanguageCode } from "@/lib/commerce";
import zrExpressLogo from "@/assets/carriers/zr-express.png";
import maystroLogo from "@/assets/carriers/maystro.svg";
import tslLogo from "@/assets/carriers/tsl.png";
import { translate, type TranslationKey } from "@/lib/i18n";
import { useUiLanguage } from "@/lib/ui-i18n";

const ORDERS: {
  id: string;
  city: Record<LanguageCode, string>;
  wilaya: string;
}[] = [
  { id: "#00001042", city: { ar: "الجزائر العاصمة", fr: "Alger", en: "Algiers" }, wilaya: "16" },
  { id: "#00001043", city: { ar: "وهران", fr: "Oran", en: "Oran" }, wilaya: "31" },
  { id: "#00001044", city: { ar: "قسنطينة", fr: "Constantine", en: "Constantine" }, wilaya: "25" },
];

export function DispatchShowcase() {
  const language = useUiLanguage();
  const isRtl = language === "ar";
  const [step, setStep] = useState(0);
  const t = (key: TranslationKey) => translate(language, key);

  useEffect(() => {
    const delays = [1100, 1100, 1100, 1200, 2600];
    const timer = window.setTimeout(() => {
      setStep((current) => (current >= 4 ? 0 : current + 1));
    }, delays[step]);

    return () => window.clearTimeout(timer);
  }, [step]);

  const visibleOrders = step === 0 ? 1 : step === 1 ? 2 : 3;
  const isPressed = step === 3;
  const isDispatched = step === 4;

  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-12 sm:py-16">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-neutral-200/40 via-neutral-100/30 to-neutral-200/40 blur-xl dark:from-neutral-800/20" />

          <div className="relative rounded-3xl border border-border/80 bg-card p-5 shadow-sm backdrop-blur-xs sm:p-6">
            <div className="mb-6 flex items-center justify-between gap-2 border-b border-border/60 pb-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs text-muted-foreground shadow-2xs">
                <span className="font-medium text-foreground">+18</span>
                <span>
                  {isRtl ? "شركة توصيل" : language === "fr" ? "transporteurs" : "couriers"}
                </span>
                <div className="flex -space-x-1.5 opacity-75 rtl:space-x-reverse">
                  <span className="flex size-[18px] items-center justify-center rounded-full border border-background bg-muted p-0.5">
                    <img src={maystroLogo} alt="" className="size-full object-contain" />
                  </span>
                  <span className="flex size-[18px] items-center justify-center rounded-full border border-background bg-muted p-0.5">
                    <img src={tslLogo} alt="" className="size-full object-contain" />
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-2.5 py-1 shadow-2xs dark:bg-zinc-900">
                <img src={zrExpressLogo} alt="ZR Express" className="h-5 w-auto object-contain" />
              </div>
            </div>

            <div className="mb-6 min-h-[170px] space-y-2.5">
              {ORDERS.map((order, index) => {
                const isVisible = index < visibleOrders;

                return (
                  <div
                    key={order.id}
                    className={`flex items-center justify-between rounded-xl border border-border/60 bg-background/60 p-3 transition-all duration-500 ${
                      isVisible
                        ? "translate-y-0 scale-100 opacity-100"
                        : "pointer-events-none translate-y-3 scale-95 opacity-0"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#1D1D20] text-white">
                        <Check className="size-3.5 stroke-[2.5]" aria-hidden />
                      </span>
                      <div>
                        <div className="font-mono text-xs font-medium text-foreground sm:text-sm">
                          {order.id}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {order.city[language]} ({order.wilaya})
                        </div>
                      </div>
                    </div>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {isRtl ? "مؤكدة" : language === "fr" ? "Confirmée" : "Confirmed"}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              aria-live="polite"
              className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-xs font-medium text-white shadow-sm transition-all duration-300 sm:text-sm ${
                isDispatched
                  ? "bg-emerald-600"
                  : isPressed
                    ? "scale-[0.98] bg-[#1D1D20]"
                    : "bg-[#1D1D20] hover:bg-[#2A2A2E]"
              }`}
            >
              {isDispatched ? (
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

        <div className="flex flex-col justify-center text-start" dir={isRtl ? "rtl" : "ltr"}>
          <span className="inline-flex w-fit rounded-full border border-border/80 bg-card px-3.5 py-1 text-xs font-normal text-muted-foreground shadow-2xs">
            {t("landing.dispatch.badge")}
          </span>
          <h2 className="mt-4 text-balance text-2xl font-medium tracking-tight text-[#1D1D20] sm:text-3xl xl:text-4xl">
            {t("landing.dispatch.title")}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t("landing.dispatch.desc")}
          </p>
          <div className="mt-6 flex items-center gap-2 text-sm font-medium text-[#1D1D20]">
            <span>{t("landing.dispatch.link")}</span>
            {isRtl ? (
              <ArrowLeft className="size-4" aria-hidden />
            ) : (
              <ArrowRight className="size-4" aria-hidden />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
