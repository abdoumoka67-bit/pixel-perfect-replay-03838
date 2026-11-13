import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, FileImage, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useMyStore } from "@/hooks/use-my-store";
import { RECEIPT_BUCKET, fileExt } from "@/lib/images";
import { calculateSubscriptionPrice, formatDZD, SUBSCRIPTION_MAX_MONTHS } from "@/lib/commerce";
import { PlanCards } from "@/components/PlanCards";
import { useTr, useUiLanguage } from "@/lib/ui-i18n";

export const Route = createFileRoute("/_authenticated/dashboard/billing")({
  component: Billing,
});

function CopyRow({ label, value }: { label: string; value: string }) {
  const t = useTr();
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-sidebar-accent px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs text-sidebar-muted">{label}</p>
        <p className="truncate font-display font-medium tracking-wide num">{value}</p>
      </div>
      <button
        onClick={() => {
          navigator.clipboard.writeText(value);
          toast.success(t("تم النسخ"));
        }}
        className="rounded-lg p-2 text-sidebar-muted hover:bg-sidebar hover:text-sidebar-foreground"
        aria-label={t("نسخ {label}", { label })}
      >
        <Copy className="size-4" />
      </button>
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
      // Try direct read from platform_settings first
      const direct = await supabase
        .from("platform_settings")
        .select("ccp_number, ccp_key, ccp_holder, rip")
        .eq("id", 1)
        .maybeSingle();

      if (direct.data && !direct.error) {
        return direct.data;
      }

      // Fallback to RPC if available
      const rpcRes = await supabase.rpc("get_platform_payment_info");
      if (rpcRes.error) throw rpcRes.error;
      return rpcRes.data?.[0] ?? null;
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
      <PlanCards plans={plans.data ?? []} selectedId={planId} onSelect={setPlanId} language={language} />

      <div className="mt-4 rounded-2xl bg-card p-5 shadow-card">
        <h2 className="font-medium">{t("مدة الاشتراك")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("اختر عدد الأشهر التي تريد تفعيلها.")}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {Array.from({ length: SUBSCRIPTION_MAX_MONTHS }, (_, i) => i + 1).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMonths(m)}
              className={[
                "relative flex flex-col items-center rounded-2xl border px-2 py-3 transition-all",
                months === m
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white text-foreground hover:border-primary/30",
              ].join(" ")}
            >
              <span className="font-medium num">{m}</span>
              <span className="text-[11px]">{m === 1 ? t("شهر") : t("أشهر")}</span>
              {m === 6 && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-2 py-0.5 text-[9px] text-white">
                  {t("شهر مجاني")}
                </span>
              )}
            </button>
          ))}
        </div>
        {months === 6 && (
          <p className="mt-3 rounded-xl bg-warning-soft px-3 py-2 text-sm leading-6 text-warning">
            {t("🎁 عرض خاص: ادفع 5 أشهر واحصل على شهر مجاناً — توفير {amount}.", {
              amount: formatDZD(selectedTier === "pro" ? 3400 : 1700, language),
            })}
          </p>
        )}
        <p className="mt-4 flex items-baseline gap-2">
          <span className="text-sm text-muted-foreground">{t("المبلغ المطلوب تحويله:")}</span>
          <span className="text-xl font-medium num">{formatDZD(amountDue, language)}</span>
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-sidebar p-6 text-sidebar-foreground shadow-card">
          <h2 className="font-medium">{t("معلومات الدفع")}</h2>
          <p className="mt-1 text-sm text-sidebar-muted">
            {t("حوّل مبلغ الخطة المختارة ({amount}) إلى أحد الحسابين:", { amount: formatDZD(amountDue, language) })}
          </p>
          <div className="mt-5 space-y-3">
            <p className="text-xs font-medium text-sidebar-primary">{t("بريد الجزائر — CCP")}</p>
            <CopyRow label={t("رقم الحساب")} value={settings.data?.ccp_number ?? "…"} />
            <div className="grid grid-cols-2 gap-3">
              <CopyRow label={t("المفتاح (Clé)")} value={settings.data?.ccp_key ?? "…"} />
              <CopyRow label={t("الاسم")} value={settings.data?.ccp_holder ?? "…"} />
            </div>
            <p className="pt-2 text-xs font-medium text-sidebar-primary">BaridiMob — RIP</p>
            <CopyRow label={t("رقم RIP")} value={settings.data?.rip ?? "…"} />
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
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed p-4 text-start text-sm text-muted-foreground hover:border-brand hover:text-brand"
            >
              {file ? <FileImage className="size-5 text-brand" /> : <Upload className="size-5" />}
              <span className="truncate">{file ? file.name : t("اضغط لاختيار صورة (حتى 5MB)")}</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <Button type="submit" variant="brand" className="w-full" size="lg" disabled={submit.isPending}>
            {submit.isPending && <Loader2 className="animate-spin" />} {t("إرسال للمراجعة")}
          </Button>
        </form>
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
