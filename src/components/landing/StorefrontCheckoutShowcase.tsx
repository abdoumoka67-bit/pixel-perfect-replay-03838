import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import { useInView } from "@/hooks/use-in-view";
import { useUiLanguage } from "@/lib/ui-i18n";
import { cn } from "@/lib/utils";

// Simulation steps:
// 0: Initial View → 1: Size → 2: Color → 3: Wilaya → 4: Details → 5: Submit → 6: Success
type SimStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type Tr = { ar: string; fr: string; en: string };

const SIZES = ["M", "L", "XL", "2XL"] as const;
const COLORS: { id: string; name: Tr; class: string }[] = [
  {
    id: "white",
    name: { ar: "أبيض", fr: "Blanc", en: "White" },
    class: "bg-white border-zinc-300 ring-zinc-800",
  },
  {
    id: "black",
    name: { ar: "أسود", fr: "Noir", en: "Black" },
    class: "bg-zinc-900 border-zinc-800 ring-zinc-800",
  },
  {
    id: "gray",
    name: { ar: "رمادي", fr: "Gris", en: "Gray" },
    class: "bg-zinc-300 border-zinc-400 ring-zinc-500",
  },
];

// French leads the example because the public landing page opens in French.
const COPY = {
  badge: {
    ar: "تجربة زبائنك في المتجر",
    fr: "Expérience d'achat en boutique",
    en: "Customer checkout experience",
  },
  title: {
    ar: "طلب مكتمل في أقل من 20 ثانية",
    fr: "Commandé en moins de 20 s",
    en: "Ordered in under 20s",
  },
  subtitle: {
    ar: "نموذج طلب الدفع عند الاستلام الأسرع والأكثر تحويلاً لزيادة مبيعاتك",
    fr: "Un parcours de commande COD rapide et conçu pour convertir davantage",
    en: "A fast, conversion-focused cash-on-delivery checkout",
  },
  steps: [
    { ar: "معاينة المنتج", fr: "Vue du produit", en: "Viewing product" },
    { ar: "اختيار القياس", fr: "Choix de la taille", en: "Selecting size" },
    { ar: "اختيار اللون", fr: "Choix de la couleur", en: "Selecting color" },
    { ar: "تحديد ولاية التوصيل", fr: "Wilaya de livraison", en: "Selecting wilaya" },
    { ar: "ملء بيانات الزبون", fr: "Coordonnées du client", en: "Entering details" },
    { ar: "تأكيد الطلب", fr: "Confirmation de la commande", en: "Submitting order" },
    { ar: "تم استلام الطلب بنجاح", fr: "Commande confirmée", en: "Order confirmed" },
  ] as Tr[],
  replay: { ar: "إعادة العرض", fr: "Rejouer", en: "Replay" },
  product: {
    ar: "تيشيرت أوفرسايز California 23",
    fr: "T-shirt oversize California 23",
    en: "California 23 Oversize T-Shirt",
  },
  bestSeller: { ar: "الأكثر طلباً", fr: "Meilleure vente", en: "Best Seller" },
  size: { ar: "القياس:", fr: "Taille :", en: "Size:" },
  color: { ar: "اللون:", fr: "Couleur :", en: "Color:" },
  wilaya: { ar: "الولاية والتوصيل:", fr: "Wilaya :", en: "Wilaya:" },
  selectWilaya: {
    ar: "اختر الولاية لتحديد سعر التوصيل...",
    fr: "Choisir la wilaya pour le tarif de livraison...",
    en: "Select wilaya for delivery rate...",
  },
  wilayaValue: { ar: "16 - الجزائر العاصمة", fr: "16 - Alger", en: "16 - Algiers" },
  name: { ar: "الاسم الكامل", fr: "Nom complet", en: "Full name" },
  fakeName: { ar: "أمين بلقاسم", fr: "Amine Belkacem", en: "John Doe" },
  confirm: {
    ar: "اضغط هنا لتأكيد الطلب الآن",
    fr: "Confirmer la commande",
    en: "Confirm order now",
  },
  confirming: { ar: "جارٍ تأكيد الطلب...", fr: "Confirmation...", en: "Confirming..." },
  successTitle: { ar: "تم تسجيل طلبك بنجاح!", fr: "Commande confirmée !", en: "Order confirmed!" },
  successSub: {
    ar: "شكراً لتسوقك! سيتصل بك فريق العمل هاتفياً لتأكيد الشحن.",
    fr: "Merci ! Le vendeur vous appellera pour confirmer l'expédition.",
    en: "Thank you! The merchant will call to confirm dispatch.",
  },
  orderNo: { ar: "رقم الطلبية:", fr: "N° de commande :", en: "Order #:" },
  productLabel: { ar: "المنتج:", fr: "Produit :", en: "Product:" },
  specsLabel: { ar: "المواصفات:", fr: "Détails :", en: "Specs:" },
  specsValue: { ar: "قياس (L) - أبيض", fr: "Taille L - Blanc", en: "Size L - White" },
  destLabel: { ar: "الوجهة:", fr: "Destination :", en: "Destination:" },
  destValue: {
    ar: "الجزائر العاصمة (توصيل سريع)",
    fr: "Alger (16) - livraison rapide",
    en: "Algiers (16) - express delivery",
  },
  totalLabel: { ar: "المبلغ الإجمالي:", fr: "Total :", en: "Total amount:" },
  cod: {
    ar: "الدفع بأمان عند استلام الطرد",
    fr: "Paiement à la livraison",
    en: "Cash on delivery",
  },
} as const;

const money = (n: number) => `${n.toLocaleString("fr-DZ")} دج`;

function SummaryRow({
  label,
  value,
  num = false,
}: {
  label: string;
  value: string;
  num?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="shrink-0">{label}</span>
      <span className={cn("min-w-0 truncate text-end text-foreground", num && "num")}>{value}</span>
    </div>
  );
}

export function StorefrontCheckoutShowcase() {
  const language = useUiLanguage();
  const L = (v?: Tr) => (v ? (v[language] ?? v.fr) : "");
  const [step, setStep] = useState<SimStep>(0);
  const { ref, inView } = useInView<HTMLElement>({ settleMs: 150 });

  // Auto-play while on screen, pause and reset once off screen.
  useEffect(() => {
    if (!inView) {
      setStep(0);
      return;
    }

    const stepTimings: Record<SimStep, number> = {
      0: 1200,
      1: 1400,
      2: 1400,
      3: 1600,
      4: 1600,
      5: 1200,
      6: 3800,
    };

    const timer = window.setTimeout(() => {
      setStep((current) => (current >= 6 ? 0 : ((current + 1) as SimStep)));
    }, stepTimings[step]);

    return () => window.clearTimeout(timer);
  }, [step, inView]);

  const selectedSize = step >= 1 ? "L" : null;
  const selectedColor = step >= 2 ? "white" : null;
  const selectedWilaya = step >= 3 ? L(COPY.wilayaValue) : null;
  const totalPrice = 3200 + (step >= 3 ? 400 : 0);

  return (
    <section ref={ref} className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      {/* Section header */}
      <div className="mb-5 text-center sm:mb-6">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[11px] font-medium text-[#EA580C]">
          <Sparkles className="size-3" />
          {L(COPY.badge)}
        </span>
        <h2 className="mt-2.5 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {L(COPY.title)}
        </h2>
        <p className="mx-auto mt-1.5 max-w-lg text-sm text-muted-foreground sm:text-base">
          {L(COPY.subtitle)}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        {/* Step progress */}
        <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground sm:text-xs">
            <span className="flex size-5 items-center justify-center rounded-full bg-[#111111] text-xs text-white">
              {step < 6 ? step + 1 : 6}
            </span>
            <span>{L(COPY.steps[step])}</span>
          </div>
          <button
            type="button"
            onClick={() => setStep(0)}
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {L(COPY.replay)} ↺
          </button>
        </div>

        {step === 6 ? (
          /* Success screen */
          <div className="flex flex-col items-center py-8 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
              <CheckCircle2 className="size-8 stroke-[2.2]" />
            </div>
            <p className="text-base font-bold text-foreground sm:text-lg">{L(COPY.successTitle)}</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{L(COPY.successSub)}</p>

            <div className="mt-4 w-full max-w-sm space-y-2 rounded-xl border border-border bg-secondary/20 p-3 text-left text-sm text-muted-foreground">
              <SummaryRow label={L(COPY.orderNo)} value="#ORX-001048" num />
              <SummaryRow label={L(COPY.productLabel)} value={L(COPY.product)} />
              <SummaryRow label={L(COPY.specsLabel)} value={L(COPY.specsValue)} />
              <SummaryRow label={L(COPY.destLabel)} value={L(COPY.destValue)} />
              <div className="flex justify-between border-t pt-2 text-sm font-bold text-foreground">
                <span>{L(COPY.totalLabel)}</span>
                <span className="num text-[#EA580C]">{money(3600)}</span>
              </div>
            </div>

            <p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              {L(COPY.cod)}
            </p>
          </div>
        ) : (
          /* Product + checkout form */
          <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-12 sm:gap-6">
            <div className="relative overflow-hidden rounded-xl border border-border bg-zinc-50">
              <div className="aspect-[4/3] w-full overflow-hidden sm:aspect-[4/5]">
                <img
                  src="/demo/california-tshirt.jpg"
                  alt="California 23"
                  className="size-full object-cover object-center transition-transform duration-700 hover:scale-105"
                />
              </div>
              <span className="absolute end-2 top-2 rounded-full bg-[#111111] px-2 py-0.5 text-xs font-medium text-white shadow-xs sm:end-2.5 sm:top-2.5 sm:px-2 sm:py-1 sm:text-[10px]">
                {L(COPY.bestSeller)}
              </span>
            </div>

            <div className="flex flex-col space-y-3 sm:col-span-7">
              <div>
                <h3 className="truncate text-base font-bold text-foreground sm:text-lg">
                  {L(COPY.product)}
                </h3>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-foreground num">{money(3200)}</span>
                  <span className="text-sm text-muted-foreground line-through num">
                    {money(3900)}
                  </span>
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-[#EA580C] sm:text-sm">
                    -18%
                  </span>
                </div>
              </div>

              {/* Size */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground">{L(COPY.size)}</span>
                  {selectedSize && (
                    <span className="font-bold text-[#EA580C]">({selectedSize})</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {SIZES.map((size) => {
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setStep(1)}
                        className={cn(
                          "relative flex h-10 min-w-10 items-center justify-center rounded-lg border px-1.5 text-sm font-medium transition-all duration-300",
                          isSelected
                            ? "scale-105 border-2 border-[#EA580C] bg-orange-50 text-[#EA580C] shadow-xs"
                            : "border-border bg-white text-foreground hover:border-zinc-400",
                        )}
                      >
                        {size}
                        {isSelected && step === 1 && (
                          <span className="absolute -end-1 -top-1 flex size-2">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-orange-400 opacity-75" />
                            <span className="relative inline-flex size-2 rounded-full bg-[#EA580C]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground">{L(COPY.color)}</span>
                  {selectedColor && (
                    <span className="text-muted-foreground">
                      {L(COLORS.find((c) => c.id === selectedColor)?.name)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {COLORS.map((col) => {
                    const isSelected = selectedColor === col.id;
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setStep(2)}
                        aria-label={L(col.name)}
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full border shadow-2xs transition-all duration-300",
                          col.class,
                          isSelected && "scale-110 ring-2 ring-offset-2",
                        )}
                      >
                        {isSelected && (
                          <Check
                            className={cn(
                              "size-3",
                              col.id === "white" ? "text-zinc-900" : "text-white",
                            )}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Wilaya */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-secondary/15 px-3 py-2.5 text-sm">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex min-w-0 items-center gap-1.5 text-start"
                  >
                    <Truck className="size-3.5 shrink-0 text-[#EA580C]" />
                    <span
                      className={cn(
                        "truncate",
                        step >= 3 ? "font-bold text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {selectedWilaya || L(COPY.selectWilaya)}
                    </span>
                  </button>
                  <span className="flex shrink-0 items-center gap-1">
                    {step >= 3 && (
                      <span className="font-bold text-foreground num">+ {money(400)}</span>
                    )}
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  </span>
                </div>
              </div>

              {/* Customer details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex h-10 items-center truncate rounded-lg border border-border bg-secondary/10 px-3 text-sm text-foreground">
                  {step >= 4 ? (
                    L(COPY.fakeName)
                  ) : (
                    <span className="text-muted-foreground/50">{L(COPY.name)}</span>
                  )}
                </div>
                <div className="flex h-10 items-center truncate rounded-lg border border-border bg-secondary/10 px-3 text-sm text-foreground num">
                  {step >= 4 ? (
                    "0550 12 34 56"
                  ) : (
                    <span className="text-muted-foreground/50">05XX XX XX XX</span>
                  )}
                </div>
              </div>

              {/* CTA */}
              <button
                type="button"
                onClick={() => setStep(5)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm text-white transition-all",
                  step === 5 ? "scale-[0.99] bg-zinc-800" : "bg-[#111111] hover:bg-black",
                )}
              >
                <span className="flex items-center gap-2">
                  {step === 5 ? (
                    <>
                      <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {L(COPY.confirming)}
                    </>
                  ) : (
                    <>
                      <MousePointerClick className="size-4" />
                      {L(COPY.confirm)}
                    </>
                  )}
                </span>
                <span className="num rounded-md bg-white/10 px-2 py-0.5 font-bold">
                  {money(totalPrice)}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
