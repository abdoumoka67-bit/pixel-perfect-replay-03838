import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/Logo";
import { friendlyError, isValidStoreSlug, slugify, DEFAULT_ONBOARDING_INDUSTRIES, DEFAULT_PRODUCT_TYPES } from "@/lib/commerce";
import { myStoreQuery } from "@/hooks/use-my-store";

export const Route = createFileRoute("/_authenticated/onboarding")({
  beforeLoad: async ({ context }) => {
    const store = await context.queryClient.ensureQueryData(myStoreQuery);
    if (store) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "أنشئ متجرك — oranix" },
      { name: "description", content: "اختر اسم ورابط متجرك وابدأ تجربتك المجانية لمدة 10 أيام." },
      { property: "og:title", content: "أنشئ متجرك — oranix" },
      { property: "og:description", content: "اختر اسم ورابط متجرك وابدأ تجربتك المجانية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Onboarding,
});

const stepCount = 3;

function Onboarding() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState<"ar" | "fr" | "en">("ar");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [productType, setProductType] = useState<(typeof DEFAULT_PRODUCT_TYPES)[number]["value"]>("physical");
  const [industry, setIndustry] = useState(DEFAULT_ONBOARDING_INDUSTRIES[0]);
  const [busy, setBusy] = useState(false);

  const generatedSlug =
    [slugify(name), slugify(user.email?.split("@")[0] ?? "")].find(isValidStoreSlug) ??
    `store-${user.id.replace(/-/g, "").slice(0, 8)}`;
  const effectiveSlug = slugTouched ? slug : generatedSlug;

  const canContinueFromStep = () => {
    if (step === 0) return Boolean(user?.email || user?.phone);
    if (step === 1) return Boolean(fullName.trim() && name.trim() && isValidStoreSlug(effectiveSlug) && phone.trim());
    return Boolean(productType && industry);
  };

  const nextStep = () => {
    if (step < stepCount - 1) setStep((s) => s + 1);
  };

  const prevStep = () => setStep((s) => Math.max(0, s - 1));

  async function submit() {
    const safeSlug = effectiveSlug.trim().toLowerCase();
    if (!isValidStoreSlug(safeSlug)) {
      toast.error("الرابط يجب أن يكون 3 أحرف على الأقل: حروف لاتينية صغيرة وأرقام وشرطات.");
      return;
    }
    setBusy(true);
    const payload = {
      owner_id: user.id,
      name: name.trim(),
      slug: safeSlug,
      phone: phone || null,
      whatsapp: phone || null,
      storefront_config: {
        product_type: productType,
        industry,
      },
    };

    let storeCreated = false;
    try {
      const { error } = await supabase.from("stores").insert(payload);
      if (error) {
        console.error("Store creation failed", error);
        toast.error(friendlyError(error.message, "تعذر إنشاء المتجر. تحقق من معلومات المتجر وحاول مرة أخرى."));
        return;
      }

      storeCreated = true;
      await qc.invalidateQueries({ queryKey: ["my-store"] });
      toast.success("تم إنشاء متجرك! بدأت تجربتك المجانية لمدة 10 أيام.");
      await navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      console.error("Store creation flow failed", error);
      toast.error(
        storeCreated
          ? "تم إنشاء المتجر، لكن تعذر فتح لوحة التحكم. أعد تحميل الصفحة للمتابعة."
          : "تعذر الاتصال لإنشاء المتجر. تحقق من اتصالك وحاول مرة أخرى.",
      );
    } finally {
      setBusy(false);
    }
  }

  const renderStep = () => {
    if (step === 0) {
      return (
        <div className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="account-contact">{user.email ? "البريد الإلكتروني" : "رقم الهاتف"}</Label>
            <Input id="account-contact" value={user.email ?? user.phone ?? ""} readOnly className="h-11 bg-muted" />
          </div>
          <div className="rounded-2xl border border-[#22C55E]/20 bg-[#22C55E]/10 p-4 text-sm text-muted-foreground">
            {user.email
              ? "تم تأكيد حسابك عبر البريد الإلكتروني. لا حاجة لإدخال كلمة المرور مرة أخرى."
              : "تم تسجيل الدخول إلى حسابك. لا حاجة لإدخال كلمة المرور مرة أخرى."}
          </div>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="full-name">الاسم الكامل</Label>
            <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="مثال: أحمد بن علي" className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">رقم الهاتف الجزائري</Label>
            <Input id="phone" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0550 00 00 00" className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="store-name">اسم المتجر</Label>
            <Input id="store-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: Lina Store" className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">اسم المتجر الفرعي</Label>
            <div className="flex h-11 items-center overflow-hidden rounded-xl border border-input bg-card focus-within:ring-2 focus-within:ring-ring/50" dir="ltr">
              <span className="border-e bg-muted px-3 py-2.5 text-sm text-muted-foreground">oranix.app/m/</span>
              <input
                id="slug"
                className="h-full flex-1 bg-transparent px-3 text-sm outline-none"
                value={effectiveSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                }}
                placeholder="lina-store"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              رابط المتجر يجب أن يكون بحروف إنجليزية وأرقام وشرطات. إذا كان اسم المتجر بالعربية، سنقترح الرابط من بريدك ويمكنك تغييره.
            </p>
            <div className="rounded-2xl border border-dashed border-[#EEEEEE] bg-white p-4 text-sm text-muted-foreground">
              🌐 يمكنك شراء وربط دومين خاص بمتجرك لاحقاً من الإعدادات (خاص بمشتركي باقة Pro) مثل: storename.com مباشرة بدون الرابط الفرعي.
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base">نوع المنتج</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {DEFAULT_PRODUCT_TYPES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setProductType(option.value)}
                className={[
                  "rounded-2xl border p-4 text-right transition-all",
                  productType === option.value ? "border-[#111111] bg-[#111111] text-white" : "border-[#EEEEEE] bg-white text-foreground",
                ].join(" ")}
              >
                <div className="font-medium">{option.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>مجال النشاط</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {DEFAULT_ONBOARDING_INDUSTRIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setIndustry(item)}
                className={[
                  "rounded-2xl border px-3 py-2.5 text-right transition-all",
                  industry === item ? "border-[#111111] bg-[#111111] text-white" : "border-[#EEEEEE] bg-white text-foreground",
                ].join(" ")}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const currentTitle = [
    "حسابك وآمنته",
    "هوية المتجر",
    "ملف المتجر والإنطلاق",
  ][step];

  const currentSubtitle = [
    "تأكيد الحساب يتم عبر البريد الإلكتروني.",
    "أدخل رقم هاتفك وبيانات متجرك.",
    "اختر مجال نشاطك وافتح لوحة التحكم الآن.",
  ][step];

  const isLast = step === stepCount - 1;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-5 py-8">
      <div className="w-full max-w-2xl rounded-[32px] border border-[#EEEEEE] bg-white p-6 shadow-[0_0_0_1px_rgba(17,17,17,0.02),0_18px_50px_-20px_rgba(0,0,0,0.25)] sm:p-9">
        <div className="flex justify-center">
          <Logo />
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          {Array.from({ length: stepCount }).map((_, idx) => (
            <span
              key={idx}
              className={[
                "h-1.5 w-10 rounded-full",
                idx < step ? "bg-[#111111]" : idx === step ? "bg-[#111111]" : "bg-[#EEEEEE]",
              ].join(" ")}
            />
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <div className="flex rounded-full border border-[#EEEEEE] bg-[#F5F5F5] p-1">
            {(["ar", "fr", "en"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLanguage(option)}
                className={[
                  "rounded-full px-3 py-1.5 text-sm",
                  language === option ? "bg-white text-[#111111] shadow-sm" : "text-muted-foreground",
                ].join(" ")}
              >
                {option === "ar" ? "العربية" : option === "fr" ? "Français" : "English"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#EA580C]/10 px-3 py-1.5 text-xs text-[#EA580C]">
            <Sparkles className="size-3.5" /> تجربة Pro مجانية · 10 أيام
          </span>
          <h1 className="mt-4 text-3xl font-medium text-[#111111]">{currentTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{currentSubtitle}</p>
        </div>

        <div className="mt-8">{renderStep()}</div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 0}
            className="inline-flex items-center gap-2 rounded-full border border-[#EEEEEE] px-4 py-2 text-sm text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="size-4" /> السابق
          </button>

          {isLast ? (
            <Button onClick={submit} disabled={busy || !canContinueFromStep()} variant="brand" size="lg" className="rounded-full">
              {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck className="size-4" />} فتح لوحة التحكم وبدء التجربة المجانية 🚀
            </Button>
          ) : (
            <Button onClick={nextStep} disabled={!canContinueFromStep()} variant="brand" size="lg" className="rounded-full">
              {step === 0 ? "المتابعة إلى معلومات المتجر" : "المتابعة إلى نوع النشاط"}
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
