import React, { useRef, useState, useEffect } from "react";
import { 
  ShoppingBag, 
  CheckCircle2, 
  Package, 
  ArrowRight, 
  Sparkles, 
  Truck, 
  Boxes, 
  TrendingUp,
  ShieldCheck,
  Check
} from "lucide-react";

export function ScrollStorySection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate scroll progress from 0 to 1 within the container
      const totalScrollableDistance = rect.height - windowHeight;
      if (totalScrollableDistance <= 0) return;

      const currentScroll = -rect.top;
      const rawProgress = currentScroll / totalScrollableDistance;
      const clampedProgress = Math.min(Math.max(rawProgress, 0), 1);
      
      setProgress(clampedProgress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Animation segments:
  // Step 1: Order / Purchase -> Receipt (0.0 to 0.35)
  // Step 2: Shipping / Packing Box (0.35 to 0.70)
  // Step 3: Stock / Inventory Hub (0.70 to 1.0)

  // Step 1: Payment & Receipt
  const step1Active = progress < 0.35;
  const isReceipt = progress > 0.16;

  // Step 2: Box opening & closing
  const step2Active = progress >= 0.35 && progress < 0.70;
  const boxProgress = step2Active ? (progress - 0.35) / 0.35 : (progress >= 0.70 ? 1 : 0);
  // Box opens then closes: open peak at boxProgress = 0.5
  const boxOpenAmount = boxProgress > 0.15 && boxProgress < 0.85 ? 1 : 0;

  // Step 3: Inventory window floating
  const step3Active = progress >= 0.70;
  const stockProgress = step3Active ? (progress - 0.70) / 0.30 : 0;

  return (
    <section 
      ref={containerRef} 
      className="relative w-full overflow-x-hidden bg-[#0D1117] text-white"
      style={{ height: "350vh" }}
      dir="rtl"
    >
      {/* Sticky viewport frame */}
      <div className="sticky top-0 flex h-screen w-full flex-col justify-between overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
        
        {/* Background Ambient Glow & Concentric Rings */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          {/* Subtle concentric rings with emerald/green hue matching oranix brand */}
          <div className="absolute size-[320px] rounded-full border border-emerald-500/10 sm:size-[450px]" />
          <div className="absolute size-[500px] rounded-full border border-emerald-500/10 sm:size-[680px]" />
          <div className="absolute size-[700px] rounded-full border border-emerald-500/5 sm:size-[920px]" />
          <div className="absolute size-[900px] rounded-full border border-emerald-500/[0.03] sm:size-[1180px]" />
          
          {/* Subtle green ambient blur spot */}
          <div 
            className="absolute size-[350px] rounded-full bg-emerald-500/10 blur-[120px] transition-transform duration-700 sm:size-[500px]"
            style={{
              transform: `scale(${0.9 + progress * 0.4}) rotate(${progress * 180}deg)`,
            }}
          />
        </div>

        {/* 1. Fixed Header Section */}
        <div className="relative z-10 mx-auto w-full max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-950/40 px-3.5 py-1 text-xs font-medium text-emerald-400 backdrop-blur-sm sm:px-4 sm:py-1.5 sm:text-sm">
            <Sparkles className="size-3.5" />
            رحلة الطلب المتكاملة
          </span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-4xl sm:leading-tight">
            من النقرة الأولى حتى تسليم الطلب وتحصيل أموالك
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            شاهد كيف تتحول نقرة الزبون بسلاسة إلى طرد مشحون ومخزون محدث في ثوانٍ معدودة.
          </p>
        </div>

        {/* 2. Interactive Center Stage */}
        <div className="relative z-10 flex flex-1 items-center justify-center">
          
          {/* Stage Container */}
          <div className="relative flex h-[360px] w-full max-w-md items-center justify-center">
            
            {/* ======================================================== */}
            {/* STEP 1: الدفع (Product Card -> Verified COD Receipt)    */}
            {/* ======================================================== */}
            <div 
              className="absolute flex flex-col items-center transition-all duration-500 ease-out"
              style={{
                opacity: step1Active ? 1 : 0,
                transform: step1Active ? `translateY(${(0.175 - progress) * 40}px) scale(${1 - Math.abs(progress - 0.175) * 0.4})` : "translateY(-60px) scale(0.85)",
                pointerEvents: step1Active ? "auto" : "none",
              }}
            >
              {/* Capsule Badge */}
              <div className="mb-3.5">
                <span className="inline-flex rounded-full border border-zinc-700/80 bg-zinc-900/90 px-3.5 py-1 text-xs font-medium text-zinc-300 shadow-sm backdrop-blur-md">
                  الدفع
                </span>
              </div>

              {/* Product Card / Receipt Transition */}
              <div className="relative w-[300px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/95 p-5 shadow-2xl backdrop-blur-xl sm:w-[330px]">
                {!isReceipt ? (
                  // State A: Product Card with Purchase Button
                  <div className="flex flex-col gap-3.5 transition-opacity duration-300">
                    <div className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/70">
                      <div className="absolute inset-0 bg-radial from-emerald-500/10 to-transparent" />
                      <ShoppingBag className="size-14 text-emerald-400/80 transition-transform duration-300 hover:scale-110" />
                      <span className="absolute bottom-2.5 start-2.5 rounded-md bg-zinc-900/90 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                        الدفع عند الاستلام
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-100">سماعات لاسلكية برو</h4>
                        <p className="text-xs text-zinc-400">ضمان سنة كاملة + توصيل سريع</p>
                      </div>
                      <div className="text-end">
                        <span className="text-base font-bold text-white">4,800</span>
                        <span className="text-xs text-zinc-400 me-1">دج</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-medium text-white shadow-lg shadow-emerald-900/40">
                      <span>تأكيد الطلب الآن</span>
                      <ArrowRight className="size-3.5 rotate-180" />
                    </div>
                  </div>
                ) : (
                  // State B: Order Receipt with Price in DZD
                  <div className="flex flex-col gap-3 transition-opacity duration-300 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                          <CheckCircle2 className="size-4" />
                        </div>
                        <span className="text-xs font-bold text-zinc-200">تم تسجيل الطلب بنجاح</span>
                      </div>
                      <span className="text-[11px] text-zinc-500 num">#ORX-9481</span>
                    </div>

                    <div className="space-y-1.5 rounded-lg bg-zinc-950/60 p-3 text-xs border border-zinc-800/50">
                      <div className="flex justify-between text-zinc-400">
                        <span>الزبون:</span>
                        <span className="text-zinc-200 font-medium">محمد الجزائري (الجزائر العاصمة)</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>طريقة الدفع:</span>
                        <span className="text-emerald-400 font-medium">الدفع عند الاستلام (COD)</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>رسوم التوصيل:</span>
                        <span className="text-zinc-200">500 دج</span>
                      </div>
                      <div className="mt-2 border-t border-zinc-800 pt-1.5 flex justify-between font-bold text-sm">
                        <span className="text-zinc-300">المجموع الصافي:</span>
                        <span className="text-emerald-400 text-base">5,300 دج</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-400/90 bg-emerald-950/30 py-1.5 rounded-lg border border-emerald-500/20">
                      <Check className="size-3.5" />
                      <span>جاهز للتجهيز والشحن المباشر</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ======================================================== */}
            {/* STEP 2: الشحن (Order Box Opens then Closes)             */}
            {/* ======================================================== */}
            <div 
              className="absolute flex flex-col items-center transition-all duration-500 ease-out"
              style={{
                opacity: step2Active ? 1 : 0,
                transform: step2Active ? `translateY(${(0.525 - progress) * 40}px) scale(${1 - Math.abs(progress - 0.525) * 0.4})` : "translateY(50px) scale(0.85)",
                pointerEvents: step2Active ? "auto" : "none",
              }}
            >
              {/* Capsule Badge */}
              <div className="mb-3.5">
                <span className="inline-flex rounded-full border border-zinc-700/80 bg-zinc-900/90 px-3.5 py-1 text-xs font-medium text-zinc-300 shadow-sm backdrop-blur-md">
                  الشحن
                </span>
              </div>

              {/* Box Component */}
              <div className="relative flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-xl w-[280px] sm:w-[320px]">
                
                {/* 3D-Style Parcel Visual */}
                <div className="relative my-2 flex size-32 items-center justify-center">
                  {/* Flap top (Opens & Closes) */}
                  <div 
                    className="absolute -top-3 z-20 flex w-24 items-center justify-center rounded-t-lg bg-amber-600/90 py-1 text-[10px] font-bold text-amber-100 shadow-md transition-all duration-500 ease-in-out border border-amber-500/40"
                    style={{
                      transformOrigin: "bottom center",
                      transform: boxOpenAmount ? "rotateX(-120deg) translateY(-10px)" : "rotateX(0deg)",
                      opacity: boxOpenAmount ? 0.9 : 1,
                    }}
                  >
                    <span>{boxOpenAmount ? "تجهيز الشحنة" : "مغلق ومحكم"}</span>
                  </div>

                  {/* Parcel Container Body */}
                  <div className="relative flex size-28 flex-col items-center justify-center rounded-xl border border-amber-700/40 bg-gradient-to-b from-amber-700/30 to-amber-900/40 p-3 shadow-inner">
                    <Package className="size-12 text-amber-400 drop-shadow-md" />
                    
                    {/* A6 Label Preview on Box */}
                    <div className="mt-2 flex w-20 items-center justify-between rounded bg-zinc-950/80 px-1.5 py-0.5 text-[8px] text-zinc-300 border border-zinc-800">
                      <span>YAL-8421</span>
                      <Truck className="size-2.5 text-emerald-400" />
                    </div>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="mt-3 text-center">
                  <h4 className="text-sm font-semibold text-zinc-100">
                    {boxOpenAmount ? "وضع المنتج داخل طرد الشحن" : "طرد جاهز للتسليم لشركة التوصيل"}
                  </h4>
                  <p className="mt-1 text-xs text-zinc-400">
                    {boxOpenAmount ? "طباعة بوليصة A6 التلقائية..." : "تم ربط رقم التتبع مع شركة الشحن مباشرة"}
                  </p>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* STEP 3: المخزون (Inventory floating window)            */}
            {/* ======================================================== */}
            <div 
              className="absolute flex flex-col items-center transition-all duration-500 ease-out"
              style={{
                opacity: step3Active ? 1 : 0,
                transform: step3Active 
                  ? `translateY(${(0.85 - progress) * 40 + Math.sin(stockProgress * 6) * 5}px) scale(${1 - Math.abs(progress - 0.85) * 0.4})` 
                  : "translateY(60px) scale(0.85)",
                pointerEvents: step3Active ? "auto" : "none",
              }}
            >
              {/* Capsule Badge */}
              <div className="mb-3.5">
                <span className="inline-flex rounded-full border border-zinc-700/80 bg-zinc-900/90 px-3.5 py-1 text-xs font-medium text-zinc-300 shadow-sm backdrop-blur-md">
                  المخزون
                </span>
              </div>

              {/* Inventory Widget Card */}
              <div className="relative w-[300px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/95 p-5 shadow-2xl backdrop-blur-xl sm:w-[330px]">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Boxes className="size-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-100">إدارة المخزون التلقائية</span>
                      <p className="text-[10px] text-zinc-400">محدث لحظياً في لوحة التحكم</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <TrendingUp className="size-3" />
                    مباشر
                  </span>
                </div>

                <div className="mt-3.5 space-y-2.5">
                  {/* Stock item 1 */}
                  <div className="flex items-center justify-between rounded-xl bg-zinc-950/60 p-2.5 border border-zinc-800/60">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                      <div>
                        <p className="text-xs font-medium text-zinc-200">سماعات لاسلكية برو</p>
                        <p className="text-[10px] text-zinc-500">تم خصم (1) قطعة للطلب #9481</p>
                      </div>
                    </div>
                    <div className="text-end">
                      <span className="text-xs font-bold text-emerald-400">14 قطعة</span>
                      <span className="block text-[9px] text-zinc-500">متوفرة</span>
                    </div>
                  </div>

                  {/* Stock item 2 */}
                  <div className="flex items-center justify-between rounded-xl bg-zinc-950/40 p-2.5 border border-zinc-800/40">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-zinc-500" />
                      <div>
                        <p className="text-xs font-medium text-zinc-300">حقيبة ظهر جلدية</p>
                        <p className="text-[10px] text-zinc-500">جاهزة للشحن</p>
                      </div>
                    </div>
                    <div className="text-end">
                      <span className="text-xs font-bold text-zinc-300">28 قطعة</span>
                      <span className="block text-[9px] text-zinc-500">متوفرة</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-950/20 px-3 py-2 border border-emerald-500/10 text-[11px] text-emerald-300">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-emerald-400" />
                    <span>حماية من نفاذ الكميات الوهمية</span>
                  </div>
                  <span className="font-bold">100% دقيق</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 3. Progress timeline indicator at bottom */}
        <div className="relative z-10 mx-auto flex w-full max-w-xs items-center justify-center gap-3 py-2">
          {/* Segment 1 */}
          <div className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full transition-colors duration-300 ${step1Active ? "bg-emerald-400 ring-4 ring-emerald-500/20" : "bg-zinc-700"}`} />
            <span className={`text-[11px] font-medium transition-colors ${step1Active ? "text-emerald-400" : "text-zinc-500"}`}>الدفع</span>
          </div>

          <div className="h-0.5 w-6 bg-zinc-800" />

          {/* Segment 2 */}
          <div className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full transition-colors duration-300 ${step2Active ? "bg-emerald-400 ring-4 ring-emerald-500/20" : "bg-zinc-700"}`} />
            <span className={`text-[11px] font-medium transition-colors ${step2Active ? "text-emerald-400" : "text-zinc-500"}`}>الشحن</span>
          </div>

          <div className="h-0.5 w-6 bg-zinc-800" />

          {/* Segment 3 */}
          <div className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full transition-colors duration-300 ${step3Active ? "bg-emerald-400 ring-4 ring-emerald-500/20" : "bg-zinc-700"}`} />
            <span className={`text-[11px] font-medium transition-colors ${step3Active ? "text-emerald-400" : "text-zinc-500"}`}>المخزون</span>
          </div>
        </div>

      </div>
    </section>
  );
}
