import { useEffect, useState } from "react";
import { Check, CheckCircle2, ChevronDown, MousePointerClick, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";
import { useUiLanguage } from "@/lib/ui-i18n";
import { cn } from "@/lib/utils";

// Simulation steps:
// 0: Initial View → 1: Size → 2: Color → 3: Wilaya → 4: Details → 5: Submit → 6: Success
type SimStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type Tr = { ar: string; fr: string; en: string };

const SIZES = ["M", "L", "XL", "2XL"] as const;
const COLORS: { id: string; name: Tr; class: string }[] = [
  { id: "white", name: { ar: "أبيض", fr: "Blanc", en: "White" }, class: "bg-white border-zinc-300 ring-zinc-800" },
  { id: "black", name: { ar: "أسود", fr: "Noir", en: "Black" }, class: "bg-zinc-900 border-zinc-900 ring-zinc-900" },
  { id: "gray", name: { ar: "رمادي", fr: "Gris", en: "Gray" }, class: "bg-zinc-300 border-zinc-400 ring-zinc-500" },
];

// French leads the example because the public landing page opens in French.
const COPY = {
  title: { ar: "طلب مكتمل في أقل من 20 ثانية", fr: "Commandé en moins de 20 s", en: "Ordered in under 20s" },
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
  product: { ar: "تيشيرت أوفرسايز California 23", fr: "T-shirt oversize California 23", en: "California 23 Oversize T-Shirt" },
  bestSeller: { ar: "الأكثر طلباً", fr: "Meilleure vente", en: "Best Seller" },
  size: { ar: "القياس:", fr: "Taille :", en: "Size:" },
  color: { ar: "اللون:", fr: "Couleur :", en: "Color:" },
  wilaya: { ar: "الولاية والتوصيل:", fr: "Wilaya :", en: "Wilaya:" },
  selectWilaya: { ar: "اختر الولاية...", fr: "Choisir la wilaya...", en: "Select wilaya..." },
  wilayaValue: { ar: "16 - الجزائر العاصمة", fr: "16 - Alger", en: "16 - Algiers" },
  name: { ar: "الاسم الكامل", fr: "Votre nom", en: "Full name" },
  fakeName: { ar: "أمين بلقاسم", fr: "Amine Belkacem", en: "John Doe" },
  confirm: { ar: "تأكيد الطلب الآن", fr: "Confirmer la commande", en: "Confirm order now" },
  confirming: { ar: "جارٍ تأكيد الطلب...", fr: "Confirmation...", en: "Confirming..." },
  successTitle: { ar: "تم تسجيل طلبك بنجاح!", fr: "Commande confirmée !", en: "Order confirmed!" },
  successSub: {
    ar: "شكراً لتسوقك! سيتصل بك فريق العمل لتأكيد الشحن.",
    fr: "Merci ! Le vendeur vous appellera pour confirmer l'expédition.",
    en: "Thank you! The merchant will call to confirm dispatch.",
  },
  orderNo: { ar: "رقم الطلبية:", fr: "N° de commande :", en: "Order #:" },
  productLabel: { ar: "المنتج:", fr: "Produit :", en: "Product:" },
  specsLabel: { ar: "المواصفات:", fr: "Détails :", en: "Specs:" },
  specsValue: { ar: "قياس (L) - أبيض", fr: "Taille L - Blanc", en: "Size L - White" },
  destLabel: { ar: "الوجهة:", fr: "Destination :", en: "Destination:" },
  destValue: { ar: "الجزائر العاصمة (توصيل سريع)", fr: "Alger (16) - livraison rapide", en: "Algiers (16) - express delivery" },
  totalLabel: { ar: "المبلغ الإجمالي:", fr: "Total :", en: "Total amount:" },
  cod: { ar: "الدفع عند استلام الطرد", fr: "Paiement à la livraison", en: "Cash on delivery" },
} as const;

const money = (n: number) => `${n.toLocaleString("fr-DZ")} دج`;

function SummaryRow({ label, value, num = false }: { label: string; value: string; num?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="shrink-0">{label}</span>
      <span className={cn("min-w-0 truncate text-end text-foreground", num && "num")}>{value}</span>
    </div>
  );
}

export function StorefrontCheckoutShowcase() {
  const language = useUiLanguage();
  const L = (v?: Tr) => (v ? v[language] ?? v.fr : "");
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
    <section ref={ref} className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8">
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
        {/* Compact header */}
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-[#EA580C]">
              <Sparkles className="size-3" />
            </span>
            <span className="truncate text-xs font-bold text-foreground">{L(COPY.title)}</span>
            <span className="hidden shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
              {step < 6 ? step + 1 : 6}/6
            </span>
            <span className="hidden truncate text-[11px] text-muted-foreground md:inline">{L(COPY.steps[step])}</span>
          </div>
          <button
            type="button"
            onClick={() => setStep(0)}
            className="shrink-0 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {L(COPY.replay)} ↺
          </button>
        </div>

        {step === 6 ? (
          /* Compact success card */
          <div className="flex flex-col items-center py-4 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50/50">
              <CheckCircle2 className="size-6 stroke-[2.2]" />
            </div>
            <p className="text-sm font-bold text-foreground">{L(COPY.successTitle)}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{L(COPY.successSub)}</p>

            <div className="mt-3 w-full max-w-xs space-y-1 rounded-lg border border-border bg-secondary/20 p-2.5 text-left text-[11px] text-muted-foreground">
              <SummaryRow label={L(COPY.orderNo)} value="#ORX-001048" num />
              <SummaryRow label={L(COPY.productLabel)} value={L(COPY.product)} />
              <SummaryRow label={L(COPY.specsLabel)} value={L(COPY.specsValue)} />
              <SummaryRow label={L(COPY.destLabel)} value={L(COPY.destValue)} />
              <div className="flex justify-between border-t pt-1.5 text-xs font-bold text-foreground">
                <span>{L(COPY.totalLabel)}</span>
                <span className="num text-[#EA580C]">{money(3600)}</span>
              </div>
            </div>

            <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
              <ShieldCheck className="size-3 text-emerald-600" />
              {L(COPY.cod)}
            </p>
          </div>
        ) : (
          /* Compact product + mini checkout form */
          <div className="grid grid-cols-[76px_1fr] gap-3 sm:grid-cols-[104px_1fr]">
            <div className="relative overflow-hidden rounded-lg border border-border bg-zinc-50">
              <img
                src="/demo/california-tshirt.jpg"
                alt="California 23"
                className="aspect-square w-full object-cover object-center"
              />
              <span className="absolute bottom-1 start-1 rounded bg-[#111111] px-1.5 py-0.5 text-[9px] text-white">
                {L(COPY.bestSeller)}
              </span>
            </div>

            <div className="min-w-0 space-y-2">
              <div>
                <p className="truncate text-sm font-bold text-foreground">{L(COPY.product)}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-bold text-foreground num">{money(3200)}</span>
                  <span className="text-[11px] text-muted-foreground line-through num">{money(3900)}</span>
                </div>
              </div>

              {/* Size */}
              <div className="flex items-center gap-1.5">
                <span className="w-12 shrink-0 text-[11px] text-muted-foreground">{L(COPY.size)}</span>
                <div className="flex flex-wrap gap-1">
                  {SIZES.map((size) => {
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setStep(1)}
                        className={cn(
                          "relative flex h-6 min-w-7 items-center justify-center rounded-md border px-1 text-[10px] transition-all duration-300",
                          isSelected
                            ? "scale-105 border-[#111111] bg-[#111111] text-white"
                            : "border-border bg-white text-foreground hover:border-zinc-400",
                        )}
                      >
                        {size}
                        {isSelected && step === 1 && (
                          <span className="absolute -end-0.5 -top-0.5 flex size-1.5">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-orange-400 opacity-75" />
                            <span className="relative inline-flex size-1.5 rounded-full bg-[#EA580C]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color */}
              <div className="flex items-center gap-1.5">
                <span className="w-12 shrink-0 text-[11px] text-muted-foreground">{L(COPY.color)}</span>
                <div className="flex items-center gap-1.5">
                  {COLORS.map((col) => {
                    const isSelected = selectedColor === col.id;
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setStep(2)}
                        aria-label={L(col.name)}
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full border transition-all duration-300",
                          col.class,
                          isSelected && "scale-110 ring-2 ring-offset-1",
                        )}
                      >
                        {isSelected && (
                          <Check className={cn("size-2.5", col.id === "white" ? "text-zinc-900" : "text-white")} />
                        )}
                      </button>
                    );
                  })}
                  {selectedColor && (
                    <span className="text-[11px] text-foreground">
                      {L(COLORS.find((c) => c.id === selectedColor)?.name)}
                    </span>
                  )}
                </div>
              </div>

              {/* Wilaya */}
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-secondary/15 px-2.5 py-1.5 text-[11px]">
                <button type="button" onClick={() => setStep(3)} className="flex min-w-0 items-center gap-1.5 text-start">
                  <Truck className="size-3 shrink-0 text-[#EA580C]" />
                  <span className={cn("truncate", step >= 3 ? "font-bold text-foreground" : "text-muted-foreground")}>
                    {selectedWilaya || L(COPY.selectWilaya)}
                  </span>
                </button>
                <span className="flex shrink-0 items-center gap-1">
                  {step >= 3 && <span className="font-bold text-foreground num">+ {money(400)}</span>}
                  <ChevronDown className="size-3 text-muted-foreground" />
                </span>
              </div>

              {/* Customer details */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex h-7 items-center truncate rounded-md border border-border bg-secondary/10 px-2 text-[11px] text-foreground">
                  {step >= 4 ? L(COPY.fakeName) : <span className="text-muted-foreground/50">{L(COPY.name)}</span>}
                </div>
                <div className="flex h-7 items-center truncate rounded-md border border-border bg-secondary/10 px-2 text-[11px] text-foreground num">
                  {step >= 4 ? "0550 12 34 56" : <span className="text-muted-foreground/50">05XX XX XX XX</span>}
                </div>
              </div>

              {/* CTA */}
              <button
                type="button"
                onClick={() => setStep(5)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs text-white transition-all",
                  step === 5 ? "scale-[0.99] bg-zinc-800" : "bg-[#111111] hover:bg-black",
                )}
              >
                <span className="flex items-center gap-1.5">
                  {step === 5 ? (
                    <>
                      <span className="size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {L(COPY.confirming)}
                    </>
                  ) : (
                    <>
                      <MousePointerClick className="size-3.5" />
                      {L(COPY.confirm)}
                    </>
                  )}
                </span>
                <span className="num rounded bg-white/10 px-1.5 py-0.5 font-bold">{money(totalPrice)}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
