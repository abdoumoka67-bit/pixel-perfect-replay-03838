import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Laptop,
  Phone,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  TrendingUp,
  Truck,
} from "lucide-react";
import type { LanguageCode } from "@/lib/commerce";
import { translate, type TranslationKey } from "@/lib/i18n";
import { useUiLanguage } from "@/lib/ui-i18n";

type OrderStep = 0 | 1 | 2;

const ORDER_DETAILS: Record<
  LanguageCode,
  {
    customer: string;
    city: string;
    previousCustomer: string;
    previousProduct: string;
    previousStatus: string;
    olderCustomer: string;
    olderProduct: string;
    olderStatus: string;
    amount: string;
  }
> = {
  ar: {
    customer: "محمد أمين",
    city: "وهران",
    previousCustomer: "ياسين بلحاج · سطيف",
    previousProduct: "حقيبة جلدية فاخرة",
    previousStatus: "تم التوصيل",
    olderCustomer: "سارة بن علي · الجزائر العاصمة",
    olderProduct: "ساعة ذكية Ultra",
    olderStatus: "قيد التوزيع",
    amount: "4,800 د.ج",
  },
  fr: {
    customer: "Mohamed Amine",
    city: "Oran",
    previousCustomer: "Yacine Belhadj · Sétif",
    previousProduct: "Sac en cuir élégant",
    previousStatus: "Livrée",
    olderCustomer: "Sara Benali · Alger",
    olderProduct: "Montre connectée Ultra",
    olderStatus: "En livraison",
    amount: "4 800 DA",
  },
  en: {
    customer: "Mohamed Amine",
    city: "Oran",
    previousCustomer: "Yacine Belhadj · Setif",
    previousProduct: "Premium leather bag",
    previousStatus: "Delivered",
    olderCustomer: "Sara Benali · Algiers",
    olderProduct: "Ultra smart watch",
    olderStatus: "Out for delivery",
    amount: "4,800 DZD",
  },
};

export function DashboardShowcase() {
  const language = useUiLanguage();
  const isRtl = language === "ar";
  const [step, setStep] = useState<OrderStep>(0);
  const t = (key: TranslationKey) => translate(language, key);
  const order = ORDER_DETAILS[language];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStep((current) => ((current + 1) % 3) as OrderStep);
    }, 2800);

    return () => window.clearInterval(timer);
  }, []);

  const statusKey: Record<OrderStep, TranslationKey> = {
    0: "landing.dashboard.statusNew",
    1: "landing.dashboard.statusConfirmed",
    2: "landing.dashboard.statusDispatched",
  };
  const mobileNoticeKey: Record<OrderStep, TranslationKey> = {
    0: "landing.dashboard.noticeNew",
    1: "landing.dashboard.noticeConfirmed",
    2: "landing.dashboard.noticeDispatched",
  };

  return (
    <section className="overflow-hidden border-t bg-background py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-5">
        <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16" dir={isRtl ? "rtl" : "ltr"}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3.5 py-1 text-xs text-muted-foreground shadow-2xs">
            <Sparkles className="size-3 text-primary" aria-hidden />
            <span>{t("landing.dashboard.badge")}</span>
          </span>
          <h2 className="mt-4 text-balance text-2xl font-medium tracking-tight text-foreground sm:text-4xl">
            {t("landing.dashboard.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t("landing.dashboard.desc")}
          </p>
        </div>

        <div className="relative mx-auto max-w-5xl pb-44 sm:pb-16">
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-red-400/80" />
                <span className="size-2.5 rounded-full bg-amber-400/80" />
                <span className="size-2.5 rounded-full bg-emerald-400/80" />
                <span
                  className="ms-3 hidden font-mono text-[11px] text-muted-foreground sm:inline-block"
                  dir="ltr"
                >
                  oranix.store/dashboard/orders
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                <Laptop className="size-3" aria-hidden />
                <span>{t("landing.dashboard.desktop")}</span>
              </div>
            </div>

            <div
              className="grid min-h-[360px] grid-cols-12 sm:min-h-[420px]"
              dir={isRtl ? "rtl" : "ltr"}
            >
              <aside className="col-span-3 hidden flex-col justify-between border-e border-border/60 bg-[#111111] p-4 text-white sm:flex">
                <div className="space-y-4">
                  <div className="h-8" aria-hidden />
                  <nav className="space-y-1 text-xs">
                    <div className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2 font-medium text-white">
                      <div className="flex items-center gap-2.5">
                        <ShoppingBag className="size-3.5" aria-hidden />
                        <span>{t("landing.dashboard.orders")}</span>
                      </div>
                      <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-400">
                        {step === 0 ? "24" : "25"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 px-3 py-2 text-zinc-400">
                      <TrendingUp className="size-3.5" aria-hidden />
                      <span>{t("landing.dashboard.analytics")}</span>
                    </div>
                    <div className="flex items-center gap-2.5 px-3 py-2 text-zinc-400">
                      <Truck className="size-3.5" aria-hidden />
                      <span>{t("landing.dashboard.delivery")}</span>
                    </div>
                  </nav>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-[11px]">
                  <div className="text-[10px] text-zinc-400">
                    {t("landing.dashboard.salesToday")}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-white">84,500 د.ج</div>
                </div>
              </aside>

              <div className="col-span-12 bg-background p-4 sm:col-span-9 sm:p-6">
                <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-lg font-medium text-foreground">
                      {t("landing.dashboard.ordersTitle")}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t("landing.dashboard.liveSync")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
                      <Search className="size-3.5" aria-hidden />
                      <span className="hidden md:inline">{t("landing.dashboard.search")}</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
                      <SlidersHorizontal className="size-3.5" aria-hidden />
                      <span>{t("landing.dashboard.wilayas")}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5" aria-live="polite">
                  <div className="rounded-xl border border-primary/20 bg-card p-3 shadow-2xs ring-1 ring-primary/10 transition-all duration-500 sm:p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs font-semibold text-primary">
                          #1045
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 text-xs font-medium text-foreground sm:text-sm">
                            <span>{order.customer}</span>
                            <span className="text-[11px] text-muted-foreground" dir="ltr">
                              0554 •• •• 89
                            </span>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span>{order.city} (31)</span>
                            <span aria-hidden>·</span>
                            <span className="font-medium text-foreground">{order.amount}</span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium transition-all duration-300 sm:px-2.5 sm:text-[11px] ${
                          step === 0
                            ? "animate-pulse border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : step === 1
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "border-primary/20 bg-primary/10 text-primary"
                        }`}
                      >
                        {step === 0 ? (
                          <Clock className="size-3" aria-hidden />
                        ) : step === 1 ? (
                          <CheckCircle2 className="size-3" aria-hidden />
                        ) : (
                          <Truck className="size-3" aria-hidden />
                        )}
                        <span>{t(statusKey[step])}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/60 p-3 text-xs opacity-85">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted font-mono text-xs text-muted-foreground">
                        #1044
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">
                          {order.previousCustomer}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {order.previousProduct} · 6,200
                        </div>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground sm:text-[11px]">
                      {order.previousStatus}
                    </span>
                  </div>

                  <div className="hidden items-center justify-between rounded-xl border border-border/60 bg-card/60 p-3 text-xs opacity-70 sm:flex">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted font-mono text-xs text-muted-foreground">
                        #1043
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">
                          {order.olderCustomer}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {order.olderProduct} · 9,500
                        </div>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground sm:text-[11px]">
                      {order.olderStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className="absolute inset-x-0 bottom-0 z-20 mx-auto w-[230px] rounded-3xl border-4 border-[#1D1D20] bg-background p-3 shadow-2xl sm:inset-x-auto sm:end-4 sm:bottom-4 sm:mx-0 sm:w-[270px]"
            dir={isRtl ? "rtl" : "ltr"}
          >
            <div className="mb-2 flex items-center justify-between border-b border-border/60 px-2 pb-2.5 font-mono text-[10px] text-muted-foreground">
              <span>09:41</span>
              <div className="mx-auto h-3 w-14 rounded-full bg-muted/80" />
              <span>5G</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
                  <Smartphone className="size-3 text-primary" aria-hidden />
                  <span>{t("landing.dashboard.mobileApp")}</span>
                </span>
                <span className="text-[10px] font-medium text-emerald-500">
                  ● {t("landing.dashboard.connected")}
                </span>
              </div>

              <div className="rounded-xl border border-border bg-card p-2.5 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-medium">
                  <span className="font-mono text-primary">#1045</span>
                  <span className="font-bold text-foreground">{order.amount}</span>
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {order.customer} · {order.city} (31)
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-1.5 border-t border-border/60 pt-2">
                  <button
                    type="button"
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-500/10 py-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400"
                  >
                    <Phone className="size-2.5" aria-hidden />
                    <span>{t("landing.dashboard.call")}</span>
                  </button>
                  <button
                    type="button"
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#111111] py-1 text-[10px] font-medium text-white"
                  >
                    <Truck className="size-2.5" aria-hidden />
                    <span>{t("landing.dashboard.ship")}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5 rounded-lg bg-muted/60 px-2 py-1.5 text-[9px] text-muted-foreground">
                <CheckCircle2 className="size-3 shrink-0 text-emerald-500" aria-hidden />
                <span>{t(mobileNoticeKey[step])}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
