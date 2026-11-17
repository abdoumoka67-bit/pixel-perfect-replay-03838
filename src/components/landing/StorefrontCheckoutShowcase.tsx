import { useEffect, useState } from "react";
import { Check, CheckCircle2, ChevronDown, MousePointerClick, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";
import { useUiLanguage } from "@/lib/ui-i18n";
import { cn } from "@/lib/utils";

// Simulation steps:
// 0: Initial View
// 1: Select Size (L)
// 2: Select Color (White)
// 3: Select Wilaya (16 - Alger)
// 4: Fill Customer Info (Name + Phone)
// 5: Click Order Button (Press + Loader)
// 6: Success Confirmation Card
type SimStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const SIZES = ["M", "L", "XL", "2XL"] as const;
const COLORS = [
  { id: "white", name: "أبيض", class: "bg-white border-zinc-300 ring-zinc-800" },
  { id: "black", name: "أسود", class: "bg-zinc-900 border-zinc-900 ring-zinc-900" },
  { id: "gray", name: "رمادي", class: "bg-zinc-300 border-zinc-400 ring-zinc-500" },
] as const;

export function StorefrontCheckoutShowcase() {
  const language = useUiLanguage();
  const isRtl = language === "ar";
  const [step, setStep] = useState<SimStep>(0);
  const { ref, inView } = useInView<HTMLElement>({ settleMs: 150 });

  // Auto-play loop sequence
  useEffect(() => {
    if (!inView) {
      setStep(0);
      return;
    }

    const stepTimings: Record<SimStep, number> = {
      0: 1200, // Look at product
      1: 1400, // Size selected
      2: 1400, // Color selected
      3: 1600, // Wilaya selected
      4: 1600, // Form filled
      5: 1200, // Order button pressed
      6: 3800, // Success screen display before looping
    };

    const timer = window.setTimeout(() => {
      setStep((current) => (current >= 6 ? 0 : ((current + 1) as SimStep)));
    }, stepTimings[step]);

    return () => window.clearTimeout(timer);
  }, [step, inView]);

  const selectedSize = step >= 1 ? "L" : null;
  const selectedColor = step >= 2 ? "white" : null;
  const selectedWilaya = step >= 3 ? "16 - الجزائر العاصمة" : null;
  const deliveryFee = step >= 3 ? 400 : 0;
  const productPrice = 3200;
  const totalPrice = productPrice + deliveryFee;

  return (
    <section ref={ref} className="mx-auto w-full max-w-4xl px-4 py-12 sm:py-16">
      {/* Section Header */}
      <div className="mb-8 text-center sm:mb-12">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-3.5 py-1 text-xs font-medium text-[#EA580C]">
          <Sparkles className="h-3.5 w-3.5" />
          {isRtl ? "تجربة زبائنك في المتجر" : "Customer Checkout Experience"}
        </span>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {isRtl ? "طلب مكتمل في أقل من 20 ثانية" : "Complete Order in under 20s"}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
          {isRtl
            ? "نموذج طلب الدفع عند الاستلام الأسرع والأكثر تحويلاً لزيادة مبيعاتك"
            : "Ultra-fast Cash on Delivery checkout designed to maximize conversions"}
        </p>
      </div>

      {/* Main Showcase Container */}
      <div className="relative mx-auto overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-8">
        {/* Subtle Step Progress Indicator */}
        <div className="mb-6 flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#111111] text-[10px] text-white">
              {step < 6 ? step + 1 : 6}
            </span>
            <span>
              {step === 0 && (isRtl ? "معاينة المنتج" : "Viewing Product")}
              {step === 1 && (isRtl ? "اختيار القياس" : "Selecting Size")}
              {step === 2 && (isRtl ? "اختيار اللون" : "Selecting Color")}
              {step === 3 && (isRtl ? "تحديد ولاية التوصيل" : "Selecting Wilaya")}
              {step === 4 && (isRtl ? "ملء بيانات الزبون" : "Entering Details")}
              {step === 5 && (isRtl ? "تأكيد الطلب" : "Submitting Order")}
              {step === 6 && (isRtl ? "تم استلام الطلب بنجاح" : "Order Confirmed")}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setStep(0)}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {isRtl ? "إعادة العرض ↺" : "Replay ↺"}
          </button>
        </div>

        {/* Content Box */}
        {step === 6 ? (
          /* SUCCESS SCREEN */
          <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
              <CheckCircle2 className="h-9 w-9 stroke-[2.2]" />
            </div>
            <h3 className="text-xl font-bold text-foreground sm:text-2xl">
              {isRtl ? "تم تسجيل طلبك بنجاح!" : "Order Confirmed!"}
            </h3>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              {isRtl
                ? "شكراً لتسوقك! سيتصل بك فريق العمل هاتفياً لتأكيد الشحن."
                : "Thank you! Our merchant team will call to confirm dispatch."}
            </p>

            <div className="mt-6 w-full max-w-sm space-y-2 rounded-xl border border-border bg-secondary/20 p-4 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>{isRtl ? "رقم الطلبية:" : "Order #:"}</span>
                <span className="font-bold text-foreground num">#ORX-001048</span>
              </div>
              <div className="flex justify-between">
                <span>{isRtl ? "المنتج:" : "Product:"}</span>
                <span className="font-medium text-foreground">تيشيرت أوفرسايز California 23</span>
              </div>
              <div className="flex justify-between">
                <span>{isRtl ? "المواصفات:" : "Specs:"}</span>
                <span className="text-foreground">قياس (L) - أبيض</span>
              </div>
              <div className="flex justify-between">
                <span>{isRtl ? "الوجهة:" : "Destination:"}</span>
                <span className="text-foreground">الجزائر العاصمة (توصيل سريع)</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-sm font-bold text-foreground">
                <span>{isRtl ? "المبلغ الإجمالي:" : "Total Amount:"}</span>
                <span className="num text-[#EA580C]">3,600 دج</span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>{isRtl ? "الدفع بأمان عند استلام الطرد" : "Cash on Delivery"}</span>
            </div>
          </div>
        ) : (
          /* PRODUCT & CHECKOUT FORM */
          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-12 lg:gap-8">
            {/* Left: Product Image Card */}
            <div className="group relative overflow-hidden rounded-xl border border-border bg-zinc-50 md:col-span-5">
              <div className="aspect-[4/5] w-full overflow-hidden">
                <img
                  src="/demo/california-tshirt.jpg"
                  alt="California 23 Oversize T-Shirt"
                  className="h-full w-full object-cover object-center transition-transform duration-700 hover:scale-105"
                />
              </div>
              <span className="absolute end-3 top-3 rounded-full bg-[#111111] px-2.5 py-1 text-[11px] font-medium text-white shadow-xs">
                {isRtl ? "الأكثر طلباً" : "Best Seller"}
              </span>
            </div>

            {/* Right: Interactive Ordering Form */}
            <div className="flex flex-col space-y-4 md:col-span-7">
              <div>
                <h3 className="text-lg font-bold text-foreground sm:text-xl">
                  تيشيرت أوفرسايز California 23
                </h3>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-bold text-foreground num">3,200 دج</span>
                  <span className="text-xs text-muted-foreground line-through num">3,900 دج</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    {isRtl ? "وفر 700 دج" : "-18%"}
                  </span>
                </div>
              </div>

              {/* 1. Size Selection */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-foreground">{isRtl ? "القياس:" : "Size:"}</span>
                  {selectedSize && <span className="font-bold text-muted-foreground">({selectedSize})</span>}
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
                          "relative flex h-9 min-w-10 items-center justify-center rounded-lg border text-xs font-medium transition-all duration-300",
                          isSelected
                            ? "scale-105 border-[#111111] bg-[#111111] text-white shadow-xs"
                            : "border-border bg-white text-foreground hover:border-zinc-400",
                        )}
                      >
                        {size}
                        {isSelected && step === 1 && (
                          <span className="absolute -end-1 -top-1 flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#EA580C]"></span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Color Selection */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-foreground">{isRtl ? "اللون:" : "Color:"}</span>
                  {selectedColor && (
                    <span className="text-muted-foreground">{selectedColor === "white" ? (isRtl ? "أبيض" : "White") : ""}</span>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  {COLORS.map((col) => {
                    const isSelected = selectedColor === col.id;
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setStep(2)}
                        aria-label={col.name}
                        className={cn(
                          "relative flex h-8 w-8 items-center justify-center rounded-full border shadow-2xs transition-all duration-300",
                          col.class,
                          isSelected && "scale-110 ring-2 ring-offset-2",
                        )}
                      >
                        {isSelected && (
                          <Check className={cn("h-3.5 w-3.5", col.id === "white" ? "text-zinc-900" : "text-white")} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Wilaya Selection */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-medium text-foreground">{isRtl ? "الولاية والتوصيل:" : "Wilaya:"}</label>
                <div
                  onClick={() => setStep(3)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-lg border bg-secondary/15 px-3 py-2 text-xs transition-all",
                    step >= 3 ? "border-[#111111] bg-white ring-1 ring-[#111111]/10" : "border-border",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Truck className="h-3.5 w-3.5 text-[#EA580C]" />
                    <span className={step >= 3 ? "font-bold text-foreground" : "text-muted-foreground"}>
                      {selectedWilaya || (isRtl ? "اختر الولاية لتحديد سعر التوصيل..." : "Select Wilaya...")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {step >= 3 && <span className="font-bold text-foreground num">+ 400 دج</span>}
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* 4. Customer Info Fields */}
              <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground">{isRtl ? "الاسم الكامل" : "Full Name"}</span>
                  <div className="flex h-8 items-center rounded-lg border border-border bg-secondary/10 px-2.5 text-xs font-medium text-foreground">
                    {step >= 4 ? "أمين بلقاسم" : <span className="text-muted-foreground/50">{isRtl ? "مثال: أمين بلقاسم" : "John Doe"}</span>}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground">{isRtl ? "رقم الهاتف" : "Phone"}</span>
                  <div className="flex h-8 items-center rounded-lg border border-border bg-secondary/10 px-2.5 text-xs font-medium text-foreground num">
                    {step >= 4 ? "0550 12 34 56" : <span className="text-muted-foreground/50">05XX XX XX XX</span>}
                  </div>
                </div>
              </div>

              {/* Order Total & Submit CTA */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className={cn(
                    "relative flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium shadow-xs transition-all",
                    step === 5
                      ? "scale-[0.98] bg-zinc-800 text-white"
                      : "bg-[#111111] text-white hover:bg-black active:scale-[0.99]",
                  )}
                >
                  <span className="flex items-center gap-2">
                    {step === 5 ? (
                      <>
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>{isRtl ? "جارٍ تأكيد الطلب..." : "Confirming..."}</span>
                      </>
                    ) : (
                      <>
                        <MousePointerClick className="h-4 w-4" />
                        <span>{isRtl ? "اضغط هنا لتأكيد الطلب الآن" : "Confirm Order Now"}</span>
                      </>
                    )}
                  </span>
                  <span className="num rounded-md bg-white/10 px-2.5 py-0.5 text-sm font-bold">
                    {totalPrice.toLocaleString("fr-DZ")} دج
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
