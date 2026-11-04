import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, ArrowRight, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher, useLanguagePreference } from "@/components/LanguageSwitcher";
import {
  DEFAULT_ONBOARDING_INDUSTRIES,
  DEFAULT_PRODUCT_TYPES,
  isValidDzPhone,
  isValidStoreSlug,
  normalizeDzPhone,
  suggestedStoreSlug,
} from "@/lib/commerce";
import { isAdminQuery, myStoreQuery } from "@/hooks/use-my-store";

export const Route = createFileRoute("/_authenticated/onboarding")({
  beforeLoad: async ({ context }) => {
    const store = await context.queryClient.ensureQueryData(myStoreQuery);
    if (!store) return { reviewMode: false };
    // Platform admins may revisit onboarding to review the design; nothing is saved.
    const isAdmin = await context.queryClient.ensureQueryData(isAdminQuery);
    if (!isAdmin) throw redirect({ to: "/dashboard" });
    return { reviewMode: true };
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

const stepCount = 4;

function storeCreationErrorMessage(error: { code?: string; message: string; details?: string | null }) {
  const diagnostic = `${error.message} ${error.details ?? ""}`.toLowerCase();

  if (diagnostic.includes("invalid_name")) return "اسم المتجر يجب أن يتكون من حرفين على الأقل.";
  if (diagnostic.includes("invalid_slug")) {
    return "الرابط يجب أن يحتوي على حروف لاتينية صغيرة وأرقام وشرطات فقط.";
  }
  if (error.code === "23505" && diagnostic.includes("slug")) {
    return "رابط المتجر مستخدم بالفعل. اختر رابطاً آخر.";
  }
  if (error.code === "23505" && diagnostic.includes("owner_id")) {
    return "يوجد متجر مرتبط بهذا الحساب بالفعل. حدّث الصفحة لفتحه.";
  }
  if (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    (diagnostic.includes("column") && diagnostic.includes("does not exist"))
  ) {
    return "قاعدة البيانات تحتاج تحديثاً: العمود storefront_config غير موجود بعد. على مسؤول المشروع تنفيذ migration 20261102000000_storefront_config.sql من Supabase SQL Editor.";
  }
  if (error.code === "42P01") {
    return "جدول المتاجر غير موجود في قاعدة البيانات. تحقق من ربط مشروع Supabase الصحيح.";
  }
  if (error.code === "23502") {
    return `حقل مطلوب في المتجر غير موجود. تفاصيل: ${error.message}`;
  }
  if (error.code === "23503") {
    return "تعذر ربط المتجر بحسابك: الجلسة غير صالحة. سجّل الخروج ثم الدخول من جديد.";
  }
  if (error.code === "42501" || diagnostic.includes("row-level security") || diagnostic.includes("permission denied")) {
    return "رفضت قاعدة البيانات إنشاء المتجر لهذا الحساب. حدّث الصفحة وسجّل الدخول مجدداً؛ وإذا استمرت المشكلة فتحقق من سياسة RLS في Supabase.";
  }

  return `تعذر إنشاء المتجر${error.code ? ` (${error.code})` : ""}. سبب الخطأ: ${error.message}`;
}

function Onboarding() {
  const { user, reviewMode } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const { language, setLanguage } = useLanguagePreference();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [productType, setProductType] = useState<(typeof DEFAULT_PRODUCT_TYPES)[number]["value"]>("physical");
  const [industry, setIndustry] = useState<string>(DEFAULT_ONBOARDING_INDUSTRIES[0] ?? "");
  const [busy, setBusy] = useState(false);

  const generatedSlug = suggestedStoreSlug(name, user.email ?? null, user.id);
  const effectiveSlug = slugTouched ? slug : generatedSlug;
  const normalizedPhone = normalizeDzPhone(phone);
  const phoneError =
    phone.trim() && !isValidDzPhone(phone)
      ? "رقم غير صحيح: يبدأ بـ 05 أو 06 أو 07 ويتكون من 10 أرقام (مثال: 0550 12 34 56)."
      : null;
  const phoneOk = isValidDzPhone(phone);

  const canContinueFromStep = () => {
    if (step === 0) return Boolean(user?.email || user?.phone);
    if (step === 1) return Boolean(fullName.trim() && name.trim() && isValidStoreSlug(effectiveSlug));
    if (step === 2) return isValidDzPhone(phone);
    return Boolean(productType && industry);
  };

  const nextStep = () => {
    if (step < stepCount - 1) setStep((s) => s + 1);
  };

  const prevStep = () => setStep((s) => Math.max(0, s - 1));

  async function submit() {
    if (name.trim().length < 2) {
      toast.error("اسم المتجر يجب أن يتكون من حرفين على الأقل.");
      return;
    }
    const safeSlug = effectiveSlug.trim().toLowerCase();
    if (!isValidStoreSlug(safeSlug)) {
      toast.error("الرابط يجب أن يكون 3 أحرف على الأقل: حروف لاتينية صغيرة وأرقام وشرطات.");
      return;
    }
    if (!isValidDzPhone(phone)) {
      toast.error("رقم الهاتف غير صحيح: يبدأ بـ 05 أو 06 أو 07 ويتكون من 10 أرقام.");
      return;
    }
    if (reviewMode) {
      toast.success("وضع مراجعة المدير: انتهت المراحل بدون إنشاء متجر جديد.");
      await navigate({ to: "/dashboard" });
      return;
    }
    setBusy(true);
    const payload = {
      owner_id: user.id,
      name: name.trim(),
      slug: safeSlug,
      phone: normalizedPhone || null,
      whatsapp: normalizedPhone || null,
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
        toast.error(storeCreationErrorMessage(error));
        return;
      }

      storeCreated = true;
      const { error: profileError } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });
      if (profileError) {
        console.error("Saving onboarding profile failed", profileError);
        toast.error("تم إنشاء المتجر، لكن تعذر حفظ الاسم الكامل في الملف الشخصي.");
      }

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
          <div className="rounded-2xl border border-success/20 bg-success-soft p-4 text-sm text-muted-foreground">
            {user.email
              ? "تم تأكيد حسابك عبر البريد الإلكتروني. لا حاجة لإدخال كلمة المرور مرة أخرى."
              : "تم تسجيل الدخول إلى حسابك. لا حاجة لإدخال كلمة المرور مرة أخرى."}
          </div>
          <div className="flex gap-3 rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm leading-6 text-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" strokeWidth={1.8} />
            <p>تنبيه أمني: لا تشارك كلمة السر الخاصة بك مع أي شخص، فريق oranix لن يطلبها منك أبداً.</p>
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
            <div className="rounded-2xl border border-dashed border-border bg-white p-4 text-sm text-muted-foreground">
              🌐 يمكنك شراء وربط دومين خاص بمتجرك لاحقاً من الإعدادات (خاص بمشتركي باقة Pro) مثل: storename.com مباشرة بدون الرابط الفرعي.
            </div>
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="phone">رقم الواتساب الجزائري</Label>
            <Input id="phone" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0550 00 00 00" className="h-11" aria-invalid={Boolean(phoneError)} />
            {phoneError ? (
              <p className="text-xs text-destructive">{phoneError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">نقبل أرقام 05 و06 و07 فقط، ويمكنك الكتابة بمسافات: 0550 12 34 56.</p>
            )}
          </div>
          {phoneOk && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-success/20 bg-success-soft p-4 text-sm leading-6 text-success">
              <ShieldCheck className="size-5 shrink-0" strokeWidth={1.8} />
              <span>تم تأكيد الرقم وجاهز لاستقبال إشعارات الطلبات ورسائل الزبائن</span>
            </div>
          )}
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
                  productType === option.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-foreground",
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
                  industry === item ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-foreground",
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
    "الحساب والأمان",
    "هوية المتجر",
    "رقم الواتساب والتأكيد",
    "الملف التجاري ونوع النشاط",
  ][step];

  const currentSubtitle = [
    "تأكيد الحساب يتم عبر البريد الإلكتروني.",
    "أدخل الاسم الكامل واسم متجرك ورابطه.",
    "أدخل رقم الواتساب لاستقبال إشعارات الطلبات.",
    "اختر نوع منتجاتك ومجال نشاطك وافتح لوحة التحكم.",
  ][step];

  const isLast = step === stepCount - 1;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-8">
      <div className="w-full max-w-2xl rounded-[32px] border border-border bg-white p-6 shadow-[0_0_0_1px_rgba(17,17,17,0.02),0_18px_50px_-20px_rgba(0,0,0,0.25)] sm:p-9">
        <div className="flex justify-center">
          <Logo />
        </div>

        <div className="mt-6 space-y-2.5">
          <div className="flex items-center gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={stepCount} aria-valuenow={step + 1}>
            {Array.from({ length: stepCount }).map((_, idx) => (
              <span
                key={idx}
                className={[
                  "h-1.5 flex-1 rounded-full",
                  idx <= step
                    ? "bg-primary"
                    : "bg-[repeating-linear-gradient(90deg,#EEEEEE_0_6px,transparent_6px_10px)]",
                ].join(" ")}
                aria-hidden="true"
              />
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground num">المرحلة {step + 1} من {stepCount}</p>
        </div>

        <div className="mt-6 flex justify-end">
          <LanguageSwitcher value={language} onChange={setLanguage} />
        </div>

        <div className="mt-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1.5 text-xs text-brand">
            <Sparkles className="size-3.5" /> تجربة Pro مجانية · 10 أيام
          </span>
          <h1 className="mt-4 text-3xl font-medium text-primary">{currentTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{currentSubtitle}</p>
        </div>

        <div className="mt-8">{renderStep()}</div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 0}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="size-4" /> السابق
          </button>

          {isLast ? (
            <Button onClick={submit} disabled={busy || !canContinueFromStep()} variant="brand" size="lg" className="rounded-full">
              {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck className="size-4" />} فتح لوحة التحكم وبدء التجربة المجانية 🚀
            </Button>
          ) : (
            <Button onClick={nextStep} disabled={!canContinueFromStep()} variant="brand" size="lg" className="rounded-full">
              {[ 
                "المتابعة إلى هوية المتجر",
                "المتابعة إلى رقم الواتساب",
                "المتابعة إلى الملف التجاري",
              ][step]}
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
