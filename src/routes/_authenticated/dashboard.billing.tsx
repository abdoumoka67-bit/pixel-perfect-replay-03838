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
import { formatDZD } from "@/lib/commerce";
import { PlanCards } from "@/components/PlanCards";

export const Route = createFileRoute("/_authenticated/dashboard/billing")({
  component: Billing,
});

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-sidebar-accent px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs text-sidebar-muted">{label}</p>
        <p className="truncate font-display font-medium tracking-wide num">{value}</p>
      </div>
      <button
        onClick={() => {
          navigator.clipboard.writeText(value);
          toast.success("تم النسخ");
        }}
        className="rounded-lg p-2 text-sidebar-muted hover:bg-sidebar hover:text-sidebar-foreground"
        aria-label={`نسخ ${label}`}
      >
        <Copy className="size-4" />
      </button>
    </div>
  );
}

function Billing() {
  const { store, sub, tier } = useMyStore();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<string | null>(null);
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
      const { data, error } = await supabase.from("platform_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
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
    if (plans.error) toast.error("تعذر تحميل الخطط والأسعار.");
    if (settings.error) toast.error("تعذر تحميل معلومات الدفع.");
    if (receipts.error) toast.error("تعذر تحميل إيصالات الدفع.");
  }, [plans.error, settings.error, receipts.error]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!planId) throw new Error("اختر الخطة");
      if (!file) throw new Error("ارفع صورة الوصل");
      if (ref.trim().length < 3) throw new Error("اكتب رقم المعاملة");
      if (file.size > 5 * 1024 * 1024) throw new Error("الحجم الأقصى 5MB");
      const path = `${user.id}/${crypto.randomUUID()}.${fileExt(file)}`;
      const up = await supabase.storage.from(RECEIPT_BUCKET).upload(path, file, { contentType: file.type });
      if (up.error) throw new Error("تعذر رفع الصورة");
      const { error } = await supabase
        .from("payment_receipts")
        .insert({ store_id: store!.id, plan_id: planId, transaction_ref: ref.trim(), receipt_path: path });
      if (error) throw new Error("تعذر إرسال الإيصال");
    },
    onSuccess: () => {
      toast.success("تم إرسال الإيصال. سيتم تفعيل اشتراكك بعد المراجعة.");
      setRef("");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["receipts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = receipts.data?.some((r) => r.status === "pending");
  const defaultPlan = plans.data?.find((p) => p.tier === (store?.paid_until && !sub?.isTrial ? store.plan_tier : "pro"))?.id ?? null;
  const planId = picked ?? defaultPlan ?? "";
  const setPlanId = setPicked;

  return (
    <>
      <PageHeader title="الدفع والاشتراك" description="ادفع عبر CCP أو BaridiMob وارفع الوصل لتفعيل اشتراكك." />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card p-5 shadow-card">
        <div>
          <p className="text-sm text-muted-foreground">حالة الحساب</p>
          <p className="mt-1 text-lg font-medium">
            {sub?.isActive ? (sub.isTrial ? "تجربة مجانية (كل ميزات Pro)" : `اشتراك ${tier === "pro" ? "Pro" : "Start"} فعّال`) : "وضع القراءة فقط"}
          </p>
          {sub && (
            <p className="text-sm text-muted-foreground">
              {sub.isActive ? `ينتهي في ${sub.endsAt.toLocaleDateString("ar-DZ")} · ${sub.daysLeft} أيام متبقية` : `انتهى في ${sub.endsAt.toLocaleDateString("ar-DZ")}`}
            </p>
          )}
        </div>
        {sub?.isActive ? <Badge variant="success">فعّال</Badge> : <Badge variant="danger">منتهي</Badge>}
      </div>

      <h2 className="mb-3 font-medium">اختر الخطة</h2>
      <PlanCards plans={plans.data ?? []} selectedId={planId} onSelect={setPlanId} />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-sidebar p-6 text-sidebar-foreground shadow-card">
          <h2 className="font-medium">معلومات الدفع</h2>
          <p className="mt-1 text-sm text-sidebar-muted">
            حوّل مبلغ الخطة المختارة ({formatDZD(plans.data?.find((p) => p.id === planId)?.price ?? 0)}) إلى أحد الحسابين:
          </p>
          <div className="mt-5 space-y-3">
            <p className="text-xs font-medium text-sidebar-primary">بريد الجزائر — CCP</p>
            <CopyRow label="رقم الحساب" value={settings.data?.ccp_number ?? "…"} />
            <div className="grid grid-cols-2 gap-3">
              <CopyRow label="المفتاح (Clé)" value={settings.data?.ccp_key ?? "…"} />
              <CopyRow label="الاسم" value={settings.data?.ccp_holder ?? "…"} />
            </div>
            <p className="pt-2 text-xs font-medium text-sidebar-primary">BaridiMob — RIP</p>
            <CopyRow label="رقم RIP" value={settings.data?.rip ?? "…"} />
          </div>
        </div>

        <form
          className="space-y-4 rounded-2xl bg-card p-6 shadow-card"
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate();
          }}
        >
          <h2 className="font-medium">ارفع وصل الدفع</h2>
          {pending && (
            <p className="rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning">لديك إيصال قيد المراجعة. سنفعّل اشتراكك فور التحقق.</p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="ref">رقم المعاملة</Label>
            <Input id="ref" dir="ltr" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="مثال: 123456789" />
          </div>
          <div className="space-y-1.5">
            <Label>صورة الوصل</Label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed p-4 text-start text-sm text-muted-foreground hover:border-brand hover:text-brand"
            >
              {file ? <FileImage className="size-5 text-brand" /> : <Upload className="size-5" />}
              <span className="truncate">{file ? file.name : "اضغط لاختيار صورة (حتى 5MB)"}</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <Button type="submit" variant="brand" className="w-full" size="lg" disabled={submit.isPending}>
            {submit.isPending && <Loader2 className="animate-spin" />} إرسال للمراجعة
          </Button>
        </form>
      </div>

      <div className="mt-6 rounded-2xl bg-card p-5 shadow-card">
        <h2 className="mb-3 font-medium">سجل الدفع</h2>
        {receipts.data?.length ? (
          <ul className="divide-y">
            {receipts.data.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium">
                    {(r.plans as { name: string } | null)?.name} · <span className="num">{formatDZD(r.amount)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("ar-DZ")} · رقم المعاملة <span className="num">{r.transaction_ref}</span>
                  </p>
                  {r.status === "rejected" && r.reject_reason && <p className="mt-1 text-xs text-danger">سبب الرفض: {r.reject_reason}</p>}
                </div>
                {r.status === "approved" ? (
                  <Badge variant="success">مقبول</Badge>
                ) : r.status === "rejected" ? (
                  <Badge variant="danger">مرفوض</Badge>
                ) : (
                  <Badge variant="warning">قيد المراجعة</Badge>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">لا توجد عمليات دفع بعد.</p>
        )}
      </div>
    </>
  );
}
