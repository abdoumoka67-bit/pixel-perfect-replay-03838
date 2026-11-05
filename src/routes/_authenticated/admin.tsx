import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Check, Loader2, ShieldAlert, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isAdminQuery, useMyStore } from "@/hooks/use-my-store";
import { useSignedUrls } from "@/hooks/use-signed-urls";
import { RECEIPT_BUCKET } from "@/lib/images";
import { formatDZD, subscriptionState, type LanguageCode } from "@/lib/commerce";
import { parseStorefrontConfig } from "@/lib/storefront-theme";
import { LanguageMenu, useDashboardLanguage, useDocumentLanguage } from "@/components/LanguageSwitcher";
import { tr, UiLanguageProvider, useTr, useUiLanguage } from "@/lib/ui-i18n";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — oranix" },
      { name: "description", content: "Review payment receipts and manage merchant subscriptions." },
      { property: "og:title", content: "Admin — oranix" },
      { property: "og:description", content: "Review payment receipts and manage merchant subscriptions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const isAdmin = useQuery(isAdminQuery);
  const { store } = useMyStore();
  // The admin area has its own language choice; the admin's store language is only the default.
  const storeLanguage = parseStorefrontConfig(store?.storefront_config, store?.name ?? "").language;
  const { language, setLanguage } = useDashboardLanguage(storeLanguage);
  useDocumentLanguage(language);
  if (isAdmin.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
    );
  }
  if (!isAdmin.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <ShieldAlert className="size-10 text-danger" />
        <h1 className="text-xl font-medium">{tr(language, "هذه الصفحة مخصصة لمدير المنصة")}</h1>
        <Button asChild variant="outline">
          <Link to="/dashboard">{tr(language, "العودة للوحة التحكم")}</Link>
        </Button>
      </div>
    );
  }
  return (
    <UiLanguageProvider language={language}>
      <AdminContent setLanguage={setLanguage} />
    </UiLanguageProvider>
  );
}

function AdminContent({ setLanguage }: { setLanguage: (lang: LanguageCode) => void }) {
  const t = useTr();
  const language = useUiLanguage();
  const dir = language === "ar" ? "rtl" : "ltr";
  return (
    <div className="min-h-screen" dir={dir}>
      <header className="bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <Logo tone="light" />
            <Badge variant="brand">{t("الإدارة")}</Badge>
          </div>
          <div className="flex items-center gap-3">
            <LanguageMenu
              value={language}
              onChange={setLanguage}
              className="border-sidebar-border bg-sidebar-accent/70 text-sidebar-foreground hover:bg-sidebar-accent"
            />
            <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-sidebar-muted hover:text-sidebar-foreground">
              <ArrowRight className="size-4 rtl:rotate-180" /> {t("لوحة التاجر")}
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">
        <Tabs defaultValue="receipts" dir={dir}>
          <TabsList>
            <TabsTrigger value="receipts">{t("إيصالات الدفع")}</TabsTrigger>
            <TabsTrigger value="merchants">{t("التجار")}</TabsTrigger>
            <TabsTrigger value="settings">{t("الخطط ومعلومات الدفع")}</TabsTrigger>
          </TabsList>
          <TabsContent value="receipts" className="mt-6">
            <Receipts />
          </TabsContent>
          <TabsContent value="merchants" className="mt-6">
            <Merchants />
          </TabsContent>
          <TabsContent value="settings" className="mt-6">
            <PlatformSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Receipts() {
  const t = useTr();
  const language = useUiLanguage();
  const locale = language === "ar" ? "ar-DZ" : language === "fr" ? "fr-DZ" : "en-GB";
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const receipts = useQuery({
    queryKey: ["admin-receipts", filter],
    queryFn: async () => {
      let q = supabase
        .from("payment_receipts")
        .select("*, stores(name, slug, owner_email, phone, trial_ends_at, paid_until), plans(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter === "pending") q = q.eq("status", "pending");
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
  const urls = useSignedUrls((receipts.data ?? []).map((r) => r.receipt_path), RECEIPT_BUCKET);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-receipts"] });
    qc.invalidateQueries({ queryKey: ["admin-stores"] });
  };

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("approve_receipt", { _receipt_id: id });
      if (error) throw error;
      return data;
    },
    onSuccess: (until) => {
      toast.success(t("تم التفعيل حتى {date}", { date: new Date(until as string).toLocaleDateString(locale) }));
      refresh();
    },
    onError: () => toast.error(t("تعذر قبول الإيصال")),
  });
  const reject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("reject_receipt", { _receipt_id: rejecting!, _reason: reason });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("تم رفض الإيصال"));
      setRejecting(null);
      setReason("");
      refresh();
    },
    onError: () => toast.error(t("اكتب سبب الرفض (3 أحرف على الأقل)")),
  });

  type StoreInfo = { name: string; slug: string; owner_email: string | null; phone: string | null };

  return (
    <>
      <div className="mb-4 flex gap-2">
        <Button size="sm" variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>
          {t("قيد المراجعة")}
        </Button>
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
          {t("الكل")}
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {receipts.data?.map((r) => {
          const s = r.stores as StoreInfo | null;
          const url = urls[r.receipt_path];
          return (
            <div key={r.id} className="flex gap-4 rounded-2xl bg-card p-4 shadow-card">
              <button
                className="size-28 shrink-0 overflow-hidden rounded-xl bg-muted"
                onClick={() => url && setPreview(url)}
                aria-label={t("معاينة الوصل")}
              >
                {url && !r.receipt_path.endsWith(".pdf") ? (
                  <img src={url} alt={t("وصل الدفع")} className="size-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground">PDF</span>
                )}
              </button>
              <div className="min-w-0 flex-1 space-y-1 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-medium">{s?.name}</p>
                  {r.status === "pending" ? (
                    <Badge variant="warning">{t("معلّق")}</Badge>
                  ) : r.status === "approved" ? (
                    <Badge variant="success">{t("مقبول")}</Badge>
                  ) : (
                    <Badge variant="danger">{t("مرفوض")}</Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground" dir="ltr">{s?.owner_email}</p>
                <p>
                  {(r.plans as { name: string } | null)?.name} · <b className="num">{formatDZD(r.amount, language)}</b>
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("رقم المعاملة:")} <span className="num">{r.transaction_ref}</span> · {new Date(r.created_at).toLocaleDateString(locale)}
                </p>
                {r.status === "pending" && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="success" disabled={approve.isPending} onClick={() => approve.mutate(r.id)}>
                      <Check /> {t("قبول وتفعيل")}
                    </Button>
                    <Button size="sm" variant="outline" className="text-danger" onClick={() => setRejecting(r.id)}>
                      <X /> {t("رفض")}
                    </Button>
                  </div>
                )}
                {r.reject_reason && <p className="text-xs text-danger">{t("السبب: {reason}", { reason: r.reject_reason })}</p>}
              </div>
            </div>
          );
        })}
      </div>
      {receipts.data?.length === 0 && <p className="text-sm text-muted-foreground">{t("لا توجد إيصالات.")}</p>}

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent dir={locale === "ar-DZ" ? "rtl" : "ltr"}>
          <DialogHeader className="text-start">
            <DialogTitle>{t("سبب رفض الإيصال")}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder={t("مثال: المبلغ غير مطابق للخطة")}
          />
          <Button variant="destructive" disabled={reject.isPending} onClick={() => reject.mutate()}>
            {t("تأكيد الرفض")}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("وصل الدفع")}</DialogTitle>
          </DialogHeader>
          {preview && <img src={preview} alt={t("وصل الدفع")} className="max-h-[75vh] w-full rounded-xl object-contain" />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Merchants() {
  const t = useTr();
  const language = useUiLanguage();
  const locale = language === "ar" ? "ar-DZ" : language === "fr" ? "fr-DZ" : "en-GB";
  const stores = useQuery({
    queryKey: ["admin-stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-card">
      <ul className="divide-y">
        {stores.data?.map((s) => {
          const st = subscriptionState(s);
          return (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  /m/{s.slug} · {s.owner_email}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {t("حتى {date}", { date: st.endsAt.toLocaleDateString(locale) })}
                </span>
                {!st.isActive ? (
                  <Badge variant="danger">{t("قراءة فقط")}</Badge>
                ) : st.isTrial ? (
                  <Badge variant="info">{t("تجربة")}</Badge>
                ) : (
                  <Badge variant="success">{t("مشترك")}</Badge>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PlatformSettings() {
  const t = useTr();
  const qc = useQueryClient();
  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: async () => (await supabase.from("plans").select("*").order("sort")).data ?? [],
  });
  const settings = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => (await supabase.from("platform_settings").select("*").eq("id", 1).maybeSingle()).data,
  });
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ ccp_number: "", ccp_key: "", ccp_holder: "", rip: "", support_phone: "" });

  useEffect(() => {
    if (plans.data) setPrices(Object.fromEntries(plans.data.map((p) => [p.id, String(p.price)])));
  }, [plans.data]);
  useEffect(() => {
    if (settings.data) {
      const { ccp_number, ccp_key, ccp_holder, rip, support_phone } = settings.data;
      setForm({ ccp_number, ccp_key, ccp_holder, rip, support_phone });
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async () => {
      for (const p of plans.data ?? []) {
        const v = Number(prices[p.id]);
        if (Number.isFinite(v) && v > 0 && v !== p.price) {
          const { error } = await supabase.from("plans").update({ price: v }).eq("id", p.id);
          if (error) throw error;
        }
      }
      const { error } = await supabase.from("platform_settings").update(form).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("تم الحفظ"));
      qc.invalidateQueries({ queryKey: ["plans"] });
      qc.invalidateQueries({ queryKey: ["platform-settings"] });
    },
    onError: () => toast.error(t("تعذر الحفظ")),
  });

  const fields: { key: keyof typeof form; label: string }[] = [
    { key: "ccp_number", label: t("رقم حساب CCP") },
    { key: "ccp_key", label: t("مفتاح CCP") },
    { key: "ccp_holder", label: t("اسم صاحب الحساب") },
    { key: "rip", label: t("رقم RIP (BaridiMob)") },
    { key: "support_phone", label: t("هاتف الدعم") },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-2xl bg-card p-6 shadow-card">
        <h2 className="font-medium">{t("أسعار الخطط (د.ج)")}</h2>
        {plans.data?.map((p) => (
          <div key={p.id} className="flex items-center gap-3">
            <Label className="w-28 shrink-0">{p.name}</Label>
            <Input type="number" dir="ltr" value={prices[p.id] ?? ""} onChange={(e) => setPrices({ ...prices, [p.id]: e.target.value })} />
          </div>
        ))}
      </div>
      <div className="space-y-4 rounded-2xl bg-card p-6 shadow-card">
        <h2 className="font-medium">{t("معلومات الدفع المعروضة للتجار")}</h2>
        {fields.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label>{f.label}</Label>
            <Input dir="ltr" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
          </div>
        ))}
      </div>
      <Button variant="brand" className="lg:col-span-2 lg:w-fit" disabled={save.isPending} onClick={() => save.mutate()}>
        {save.isPending && <Loader2 className="animate-spin" />} {t("حفظ التغييرات")}
      </Button>
    </div>
  );
}
