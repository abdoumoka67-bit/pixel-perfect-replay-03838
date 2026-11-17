import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, FileImage, Loader2, MessageCircle, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useMyStore } from "@/hooks/use-my-store";
import { RECEIPT_BUCKET, fileExt } from "@/lib/images";
import { calculateSubscriptionPrice, formatDZD, whatsappLink } from "@/lib/commerce";
import { PlanCards } from "@/components/PlanCards";
import { cn } from "@/lib/utils";
import { useTr, useUiLanguage } from "@/lib/ui-i18n";

export const Route = createFileRoute("/_authenticated/dashboard/billing")({
  component: Billing,
});

function CopyRow({ label, value }: { label: string; value: string }) {
  const t = useTr();
  return (
    <div className="flex items-center justify-between gap-2.5 rounded-xl border border-border/70 bg-muted/40 px-3.5 py-2.5 transition-colors hover:border-brand/40">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-xs font-bold text-foreground num">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value);
          toast.success(t("تم النسخ"));
        }}
        className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={t("نسخ {label}", { label })}
      >
        <Copy className="size-3.5" />
      </button>
    </div>
  );
}

{/* Official Algérie Poste Emblem */}
function AlgeriePosteLogo({ className = "size-7" }: { className?: string }) {
  return (
    <div className={cn("flex shrink-0 items-center justify-center rounded-xl bg-[#005BAA]/10 p-1.5", className)}>
      <svg viewBox="0 0 48 48" className="size-full" fill="none">
        <rect width="48" height="48" rx="10" fill="#005BAA" />
        <path
          d="M10 16C10 14.8954 10.8954 14 12 14H36C37.1046 14 38 14.8954 38 16V32C38 33.1046 37.1046 34 36 34H12C10.8954 34 10 33.1046 10 32V16Z"
          fill="#FFCC00"
        />
        <path
          d="M11 15L24 25L37 15"
          stroke="#005BAA"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="24" cy="28" r="3" fill="#005BAA" />
      </svg>
    </div>
  );
}

{/* Official BaridiMob Emblem */}
function BaridiMobLogo({ className = "size-7" }: { className?: string }) {
  return (
    <div className={cn("flex shrink-0 items-center justify-center rounded-xl bg-[#00A3E0]/10 p-1.5", className)}>
      <svg viewBox="0 0 48 48" className="size-full" fill="none">
        <rect width="48" height="48" rx="10" fill="#0082C8" />
        <path
          d="M14 12H34C35.1046 12 36 12.8954 36 14V34C36 35.1046 35.1046 36 34 36H14C12.8954 36 12 35.1046 12 34V14C12 12.8954 12.8954 12 14 12Z"
          stroke="#FFFFFF"
          strokeWidth="2"
        />
        <path d="M12 18H36" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="24" cy="27" r="4" fill="#FFCC00" />
        <path d="M21 27L24 24L27 27" stroke="#0082C8" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function Billing() {
  const t = useTr();
  const language = useUiLanguage();
  const locale = language === "ar" ? "ar-DZ" : language === "fr" ? "fr-DZ" : "en-GB";
  const { store, sub, tier, isAdmin } = useMyStore();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [months, setMonths] = useState(1);
  const [ref, setRef] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").eq("is_active", true).order("sort");
      if (error) throw error;
      return data;
    },
  });
  const settings = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      // 1. Try RPC first
      const rpcRes = await supabase.rpc("get_platform_payment_info");
      if (!rpcRes.error && rpcRes.data?.[0]) return rpcRes.data[0];

      // 2. Fallback to direct table query on platform_settings
      const tableRes = await supabase
        .from("platform_settings")
        .select("ccp_number, ccp_key, ccp_holder, rip, support_phone")
        .limit(1)
        .maybeSingle();

      if (tableRes.data) return tableRes.data;
      if (rpcRes.error && tableRes.error) throw rpcRes.error;
      return null;
    },
  });
  const receipts = useQuery({
    queryKey: ["receipts", store?.id],
    enabled: !!store,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_receipts")
        .select("*, plans(name)")
        .eq("store_id", store!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (plans.error) toast.error(t("تعذر تحميل الخطط والأسعار."));
    if (settings.error) toast.error(t("تعذر تحميل معلومات الدفع."));
    if (receipts.error) toast.error(t("تعذر تحميل إيصالات الدفع."));
  }, [plans.error, settings.error, receipts.error, t]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!planId) throw new Error(t("اختر الخطة"));
      if (!file) throw new Error(t("ارفع صورة الوصل"));
      if (file.size > 5 * 1024 * 1024) throw new Error(t("الحجم الأقصى 5MB"));
      const path = `${user.id}/${crypto.randomUUID()}.${fileExt(file)}`;
      const up = await supabase.storage.from(RECEIPT_BUCKET).upload(path, file, { contentType: file.type });
      if (up.error) throw new Error(t("تعذر رفع الصورة"));
      const { error } = await supabase
        .from("payment_receipts")
        .insert({
          store_id: store!.id,
          plan_id: planId,
          amount: amountDue,
          months,
          transaction_ref: ref.trim() || "غير محدد",
          receipt_path: path,
        });
      if (error) throw new Error(t("تعذر إرسال الإيصال"));
    },
    onSuccess: () => {
      toast.success(t("تم إرسال الإيصال. سيتم تفعيل اشتراكك بعد المراجعة."));
      setRef("");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["receipts"] });
    },
    onError: (e: Error) => toast.error(t(e.message)),
  });

  const pending = receipts.data?.some((r) => r.status === "pending");
  const defaultPlan = plans.data?.find((p) => p.tier === (store?.paid_until && !sub?.isTrial ? store.plan_tier : "pro"))?.id ?? null;
  const planId = picked ?? defaultPlan ?? "";
  const setPlanId = setPicked;
  const selectedPlan = plans.data?.find((p) => p.id === planId) ?? null;
  const selectedTier: "start" | "pro" = selectedPlan?.tier === "pro" ? "pro" : "start";
  const amountDue = calculateSubscriptionPrice(selectedTier, months);

  return (
    <>
      <PageHeader
        title={t("الدفع والاشتراك")}
        description={t("ادفع عبر CCP أو BaridiMob وارفع الوصل لتفعيل اشتراكك.")}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card p-5 shadow-card">
        <div>
          <p className="text-sm text-muted-foreground">{t("حالة الحساب")}</p>
          <p className="mt-1 text-lg font-medium">
            {isAdmin
              ? t("وصول مدير المنصة: كل الميزات مفتوحة بلا حدود")
              : sub?.isActive
                ? sub.isTrial
                  ? t("تجربة مجانية (كل ميزات Pro)")
                  : t("اشتراك {tier} فعّال", { tier: tier === "pro" ? "Pro" : "Start" })
                : t("وضع القراءة فقط")}
          </p>
          {isAdmin ? (
            <p className="text-sm text-muted-foreground">
              {t("حساب مدير المنصة لا ينتهي ولا يحتاج إلى تجديد.")}
            </p>
          ) : (
            sub && (
              <p className="text-sm text-muted-foreground">
                {sub.isActive
                  ? t("ينتهي في {date} · {days} أيام متبقية", { date: sub.endsAt.toLocaleDateString(locale), days: sub.daysLeft })
                  : t("انتهى في {date}", { date: sub.endsAt.toLocaleDateString(locale) })}
              </p>
            )
          )}
        </div>
        {isAdmin ? (
          <Badge variant="success">{t("مدى الحياة")}</Badge>
        ) : sub?.isActive ? (
          <Badge variant="success">{t("فعّال")}</Badge>
        ) : (
          <Badge variant="danger">{t("منتهي")}</Badge>
        )}
      </div>

      <h2 className="mb-3 font-medium">{t("اختر الخطة")}</h2>
      <PlanCards
        plans={plans.data ?? []}
        selectedId={planId}
        onSelect={setPlanId}
        language={language}
        months={months}
        onMonthsChange={(m, id) => {
          setMonths(m);
          if (id) setPlanId(id);
        }}
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card p-4 shadow-card">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{selectedPlan?.name ?? "Start"}</span>
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground num">
            {months === 1 ? t("شهر") : `${months} ${t("أشهر")}`}
          </span>
        </div>
        <p className="flex items-baseline gap-2">
          <span className="text-sm text-muted-foreground">{t("المبلغ المطلوب تحويله:")}</span>
          <span className="text-xl font-medium text-foreground num">{formatDZD(amountDue, language)}</span>
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Payment Methods: 2 Separate White Cards */}
        <div className="space-y-4">
          <div>
            <h2 className="font-medium text-foreground">{t("معلومات الدفع")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("حوّل مبلغ الخطة المختارة ({amount}) إلى أحد الحسابين التاليين:", {
                amount: formatDZD(amountDue, language),
              })}
            </p>
          </div>

          {/* Card 1: Algérie Poste (CCP) */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:border-foreground/20">
            <div className="flex items-center gap-3 border-b border-border/60 pb-3">
              <AlgeriePosteLogo className="size-9" />
              <div>
                <p className="font-bold text-foreground text-sm">{t("بريد الجزائر — CCP")}</p>
                <p className="text-[11px] text-muted-foreground">{t("الدفع عبر مكاتب البريد أو الصك البريدي")}</p>
              </div>
            </div>

            <div className="mt-3.5 space-y-2.5">
              <CopyRow label={t("رقم الحساب البريدي (CCP)")} value={settings.data?.ccp_number ?? "…"} />
              <div className="grid grid-cols-2 gap-2.5">
                <CopyRow label={t("المفتاح (Clé)")} value={settings.data?.ccp_key ?? "…"} />
                <CopyRow label={t("اسم صاحب الحساب")} value={settings.data?.ccp_holder ?? "…"} />
              </div>
            </div>
          </div>

          {/* Card 2: BaridiMob (RIP) */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:border-foreground/20">
            <div className="flex items-center gap-3 border-b border-border/60 pb-3">
              <BaridiMobLogo className="size-9" />
              <div>
                <p className="font-bold text-foreground text-sm">BaridiMob — بريدي موب</p>
                <p className="text-[11px] text-muted-foreground">{t("التحويل الفوري عبر تطبيق بريدي موب (RIP)")}</p>
              </div>
            </div>

            <div className="mt-3.5 space-y-2.5">
              <CopyRow label={t("رقم الحساب البريدي الجاري (RIP)")} value={settings.data?.rip ?? "…"} />
              <CopyRow label={t("اسم صاحب الحساب")} value={settings.data?.ccp_holder ?? "…"} />
            </div>
          </div>
        </div>

        <form
          className="space-y-4 rounded-2xl bg-card p-6 shadow-card"
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate();
          }}
        >
          <h2 className="font-medium">{t("ارفع وصل الدفع")}</h2>
          {pending && (
            <p className="rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning">
              {t("لديك إيصال قيد المراجعة. سنفعّل اشتراكك فور التحقق.")}
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="ref">{t("رقم المعاملة أو الحوالة (اختياري)")}</Label>
            <Input id="ref" dir="ltr" value={ref} onChange={(e) => setRef(e.target.value)} placeholder={t("مثال: 123456789 — اتركه فارغاً إن لم يتوفر")} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("صورة الوصل")}</Label>
            {previewUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-3">
                  {file?.type.startsWith("image/") ? (
                    <img
                      src={previewUrl}
                      alt={t("معاينة الوصل")}
                      className="size-16 rounded-lg border border-border object-cover shadow-sm sm:size-20"
                    />
                  ) : (
                    <div className="flex size-16 items-center justify-center rounded-lg border border-border bg-background shadow-sm sm:size-20">
                      <FileImage className="size-6 text-brand" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file?.name}</p>
                    <p className="text-xs text-muted-foreground num">
                      {file ? `${(file.size / 1024).toFixed(0)} KB` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                      {t("تغيير")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-danger hover:bg-danger-soft hover:text-danger"
                      onClick={() => {
                        setFile(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      aria-label={t("حذف")}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  setFile(e.dataTransfer.files?.[0] ?? null);
                }}
                className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed p-4 text-start text-sm text-muted-foreground transition-colors hover:border-brand hover:text-brand"
              >
                <Upload className="size-5" />
                <span className="truncate">{t("اضغط لاختيار صورة (حتى 5MB)")}</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <Button type="submit" variant="brand" className="w-full" size="lg" disabled={submit.isPending}>
            {submit.isPending && <Loader2 className="animate-spin" />} {t("إرسال للمراجعة")}
          </Button>
        </form>
      </div>

      {/* WhatsApp Support Assistance Card */}
      <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-emerald-500/25 bg-emerald-50/40 p-4 sm:flex-row dark:bg-emerald-950/20">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <MessageCircle className="size-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">{t("تحتاج مساعدة في الدفع أو تفعيل الحساب؟")}</p>
            <p className="text-xs text-muted-foreground">{t("فريق الدعم متاح عبر واتساب للمساعدة وتأكيد وصول الإيصالات فورياً.")}</p>
          </div>
        </div>
        <Button
          asChild
          variant="outline"
          className="h-10 shrink-0 rounded-full border-emerald-500/40 bg-white text-emerald-600 hover:bg-emerald-50 dark:bg-card dark:text-emerald-400 dark:hover:bg-emerald-950/40"
        >
          <a
            href={whatsappLink(
              (settings.data as { support_phone?: string } | null)?.support_phone || "0562552582",
              t("السلام عليكم، عندي استفسار بخصوص تجديد اشتراك متجري على منصة oranix"),
            )}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2"
          >
            <MessageCircle className="size-4" />
            <span>{t("تواصل مع الدعم عبر واتساب")}</span>
          </a>
        </Button>
      </div>

      <div className="mt-6 rounded-2xl bg-card p-5 shadow-card">
        <h2 className="mb-3 font-medium">{t("سجل الدفع")}</h2>
        {receipts.data?.length ? (
          <ul className="divide-y">
            {receipts.data.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium">
                    {(r.plans as { name: string } | null)?.name} · <span className="num">{formatDZD(r.amount, language)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString(locale)} · {t("رقم المعاملة")} <span className="num">{r.transaction_ref}</span>
                  </p>
                  {r.status === "rejected" && r.reject_reason && (
                    <p className="mt-1 text-xs text-danger">{t("سبب الرفض: {reason}", { reason: r.reject_reason })}</p>
                  )}
                </div>
                {r.status === "approved" ? (
                  <Badge variant="success">{t("مقبول")}</Badge>
                ) : r.status === "rejected" ? (
                  <Badge variant="danger">{t("مرفوض")}</Badge>
                ) : (
                  <Badge variant="warning">{t("قيد المراجعة")}</Badge>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("لا توجد عمليات دفع بعد.")}</p>
        )}
      </div>
    </>
  );
}
