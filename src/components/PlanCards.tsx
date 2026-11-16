import type { ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { START_MONTHLY_ORDER_LIMIT, MAX_TEAM_USERS, type LanguageCode } from "@/lib/commerce";
import { cn } from "@/lib/utils";

const DZD_NUMBER = new Intl.NumberFormat("fr-DZ");
/** Prices are always printed as "1 700 دج" regardless of the UI language. */
const formatPrice = (value: number) => `${DZD_NUMBER.format(value)} دج`;

export type PlanCardData = { id: string; name: string; price: number; months: number; tier: string };

const START_FEATURES: Record<LanguageCode, string[]> = {
  ar: [
    `حتى ${START_MONTHLY_ORDER_LIMIT} طلب شهرياً`,
    "صفحة هبوط لكل منتج بفورم 58 ولاية",
    "سجل الاتصال وتأكيد الطلبات",
    "أسعار توصيل لكل ولاية + Yalidine",
    "تصدير الطلبات Excel",
  ],
  en: [
    `Up to ${START_MONTHLY_ORDER_LIMIT} orders per month`,
    "A landing page per product with all 58 wilayas",
    "Call log and order confirmation",
    "Delivery rates per wilaya + Yalidine",
    "Export orders to Excel",
  ],
  fr: [
    `Jusqu'à ${START_MONTHLY_ORDER_LIMIT} commandes par mois`,
    "Une page par produit avec les 58 wilayas",
    "Journal d'appels et confirmation des commandes",
    "Frais de livraison par wilaya + Yalidine",
    "Exporter les commandes vers Excel",
  ],
};

const PRO_FEATURES: Record<LanguageCode, string[]> = {
  ar: [
    "طلبات غير محدودة",
    "Meta Pixel (فيسبوك وإنستغرام)",
    "إحصائيات متقدمة للمبيعات",
    `فريق عمل حتى ${MAX_TEAM_USERS} مستخدمين`,
    "سجل الأنشطة: من فعل ماذا ومتى",
    "مخزون وتصنيفات المنتجات",
  ],
  en: [
    "Unlimited orders",
    "Meta Pixel (Facebook and Instagram)",
    "Advanced sales analytics",
    `A team of up to ${MAX_TEAM_USERS} users`,
    "Activity log: who did what and when",
    "Inventory and product categories",
  ],
  fr: [
    "Commandes illimitées",
    "Meta Pixel (Facebook et Instagram)",
    "Statistiques de ventes avancées",
    `Une équipe jusqu'à ${MAX_TEAM_USERS} utilisateurs`,
    "Journal d'activité : qui a fait quoi et quand",
    "Stock et catégories de produits",
  ],
};

const LABELS: Record<
  LanguageCode,
  {
    bestForTeams: string;
    perMonth: string;
    months: string;
    startPlus: string;
    selected: string;
    choose: (name: string) => string;
    durationLabel: string;
    oneMonth: string;
    monthsCount: (n: number) => string;
    freeMonthBadge: string;
    saveMonthOffer: string;
  }
> = {
  ar: {
    bestForTeams: "الأفضل للفرق",
    perMonth: "شهر",
    months: "أشهر",
    startPlus: "كل ميزات Start، وزيادة:",
    selected: "الخطة المختارة ✓",
    choose: (name) => `اختر ${name}`,
    durationLabel: "مدة الاشتراك",
    oneMonth: "شهر واحد",
    monthsCount: (n) => `${n} أشهر`,
    freeMonthBadge: "شهر مجاني 🎁",
    saveMonthOffer: "ادفع 5 أشهر واحصل على الـ 6 مجاناً",
  },
  en: {
    bestForTeams: "Best for teams",
    perMonth: "month",
    months: "months",
    startPlus: "Everything in Start, plus:",
    selected: "Selected plan ✓",
    choose: (name) => `Choose ${name}`,
    durationLabel: "Subscription duration",
    oneMonth: "1 month",
    monthsCount: (n) => `${n} months`,
    freeMonthBadge: "1 month free 🎁",
    saveMonthOffer: "Pay 5 months, get 6th free",
  },
  fr: {
    bestForTeams: "Idéal pour les équipes",
    perMonth: "mois",
    months: "mois",
    startPlus: "Tout Start, plus :",
    selected: "Offre sélectionnée ✓",
    choose: (name) => `Choisir ${name}`,
    durationLabel: "Durée de l'abonnement",
    oneMonth: "1 mois",
    monthsCount: (n) => `${n} mois`,
    freeMonthBadge: "1 mois gratuit 🎁",
    saveMonthOffer: "Payez 5 mois, 6ème offert",
  },
};

/**
 * Start (white) and Pro (charcoal) cards. With `onSelect` the cards become
 * selectable (billing); otherwise each card renders the given `action`.
 * `language` defaults to Arabic to keep the dashboard unchanged.
 */
export function PlanCards({
  plans,
  selectedId,
  onSelect,
  action,
  language = "ar",
  months = 1,
  onMonthsChange,
}: {
  plans: PlanCardData[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  action?: (plan: PlanCardData) => ReactNode;
  language?: LanguageCode;
  months?: number;
  onMonthsChange?: (months: number, planId?: string) => void;
}) {
  const labels = LABELS[language];
  const sorted = [...plans].sort((a, b) => (a.tier === b.tier ? 0 : a.tier === "start" ? -1 : 1));
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sorted.map((p) => {
        const pro = p.tier === "pro";
        const features = pro ? PRO_FEATURES[language] : START_FEATURES[language];
        const selected = selectedId === p.id;

        // Dynamic price calculation
        const cardMonths = months || 1;
        const monthlyRate = p.price;
        const totalPrice = cardMonths === 6 ? monthlyRate * 5 : monthlyRate * cardMonths;
        const regularTotal = monthlyRate * cardMonths;

        const body = (
          <div className="flex flex-1 flex-col">
            <div className="flex items-center justify-between gap-2">
              <p className="text-lg font-medium text-foreground">{p.name}</p>
              {pro && (
                <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
                  {labels.bestForTeams}
                </span>
              )}
            </div>

            {/* Price section with dynamic duration calculations */}
            <div className="mt-4">
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className="text-4xl font-medium text-foreground num">{formatPrice(totalPrice)}</span>
                {cardMonths > 1 && (
                  <span className="text-xs text-muted-foreground num">
                    ({formatPrice(Math.round(totalPrice / cardMonths))} / {labels.perMonth})
                  </span>
                )}
                {cardMonths === 6 && (
                  <span className="text-xs text-muted-foreground line-through num">
                    {formatPrice(regularTotal)}
                  </span>
                )}
              </div>
              {cardMonths === 1 && <span className="text-xs text-muted-foreground">/ {labels.perMonth}</span>}
            </div>

            {/* Duration Selector Dropdown with Arrow */}
            {onMonthsChange && (
              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {labels.durationLabel}
                </label>
                <div className="relative">
                  <select
                    value={cardMonths}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      onMonthsChange(val, p.id);
                    }}
                    className="w-full appearance-none rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground shadow-xs transition-all hover:border-foreground/30 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand pe-9"
                    dir={language === "ar" ? "rtl" : "ltr"}
                  >
                    <option value={1}>{labels.oneMonth} ({formatPrice(monthlyRate)})</option>
                    <option value={2}>{labels.monthsCount(2)} ({formatPrice(monthlyRate * 2)})</option>
                    <option value={3}>{labels.monthsCount(3)} ({formatPrice(monthlyRate * 3)})</option>
                    <option value={4}>{labels.monthsCount(4)} ({formatPrice(monthlyRate * 4)})</option>
                    <option value={5}>{labels.monthsCount(5)} ({formatPrice(monthlyRate * 5)})</option>
                    <option value={6}>{labels.monthsCount(6)} — {labels.freeMonthBadge} ({formatPrice(monthlyRate * 5)})</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground">
                    <ChevronDown className="size-4" />
                  </div>
                </div>
                {cardMonths === 6 && (
                  <p className="mt-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {labels.saveMonthOffer}
                  </p>
                )}
              </div>
            )}
            {pro && <p className="mt-1 text-sm text-muted-foreground">{labels.startPlus}</p>}
            <ul className="mt-5 flex-1 space-y-3 text-sm">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <Check className="size-3" />
                  </span>
                  <span className="text-foreground">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        );
        const cardClass = cn(
          "relative flex h-full flex-col rounded-[16px] border border-border bg-card p-8 text-start shadow-card transition-all",
          selected ? "border-brand/50 ring-2 ring-brand ring-offset-2 ring-offset-background" : "hover:border-foreground/20",
        );
        if (onSelect) {
          return (
            <div key={p.id} className={cardClass}>
              {body}
              <div className="mt-auto w-full pt-8">
                <button
                  type="button"
                  onClick={() => onSelect(p.id)}
                  aria-pressed={selected}
                  className={cn(
                    "flex h-12 w-full items-center justify-center rounded-[12px] text-base font-medium outline-none transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "border border-border bg-secondary/60 text-foreground hover:bg-secondary",
                  )}
                >
                  {selected ? labels.selected : labels.choose(p.name)}
                </button>
              </div>
            </div>
          );
        }
        return (
          <div key={p.id} className={cardClass}>
            {body}
            {action && <div className="mt-auto w-full pt-8">{action(p)}</div>}
          </div>
        );
      })}
    </div>
  );
}
