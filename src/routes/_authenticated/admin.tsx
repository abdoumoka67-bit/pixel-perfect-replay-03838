import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  Loader2,
  MessageCircle,
  Phone,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
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
import { formatDZD, subscriptionState, whatsappLink, type LanguageCode } from "@/lib/commerce";
import { parseStorefrontConfig } from "@/lib/storefront-theme";
import {
  LanguageMenu,
  useDashboardLanguage,
  useDocumentLanguage,
} from "@/components/LanguageSwitcher";
import { tr, UiLanguageProvider, useTr, useUiLanguage } from "@/lib/ui-i18n";
import { useAccountTheme } from "@/hooks/use-account-theme";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — oranix" },
      {
        name: "description",
        content: "Review payment receipts and manage merchant subscriptions.",
      },
      { property: "og:title", content: "Admin — oranix" },
      {
        property: "og:description",
        content: "Review payment receipts and manage merchant subscriptions.",
      },
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
  useAccountTheme();
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
    <div className="theme-forest min-h-screen bg-background" dir={dir}>
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
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1 text-sm text-sidebar-muted hover:text-sidebar-foreground"
            >
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

const HIDDEN_RECEIPTS_KEY = "oranix_hidden_payment_receipts";

function readHiddenReceipts(): string[] {
  try {
    const raw = localStorage.getItem(HIDDEN_RECEIPTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function Receipts() {
  const t = useTr();
  const language = useUiLanguage();
  const locale = language === "ar" ? "ar-DZ" : language === "fr" ? "fr-DZ" : "en-GB";
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [hiding, setHiding] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<string[]>(readHiddenReceipts);
  const [showHidden, setShowHidden] = useState(false);
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const receipts = useQuery({
    queryKey: ["admin-receipts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_receipts")
        .select(
          "*, stores(name, slug, owner_email, phone, whatsapp, trial_ends_at, paid_until), plans(name)",
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
  const urls = useSignedUrls(
    (receipts.data ?? []).map((r) => r.receipt_path),
    RECEIPT_BUCKET,
  );

  const nonHiddenReceipts = (receipts.data ?? []).filter((r) => !hiddenIds.includes(r.id));
  const hiddenOnlyReceipts = (receipts.data ?? []).filter((r) => hiddenIds.includes(r.id));
  const statusCounts = {
    pending: nonHiddenReceipts.filter((r) => r.status === "pending").length,
    approved: nonHiddenReceipts.filter((r) => r.status === "approved").length,
    rejected: nonHiddenReceipts.filter((r) => r.status === "rejected").length,
    all: nonHiddenReceipts.length,
  };
  const searchText = search.trim().toLowerCase();
  const visibleReceipts = (showHidden ? hiddenOnlyReceipts : nonHiddenReceipts).filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (!searchText) return true;
    const s = r.stores as StoreInfo | null;
    const planName = (r.plans as { name: string } | null)?.name ?? "";
    return [
      s?.name,
      s?.owner_email,
      s?.phone,
      s?.whatsapp,
      r.transaction_ref,
      planName,
    ].some((value) => value?.toLowerCase().includes(searchText));
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-receipts"] });
    qc.invalidateQueries({ queryKey: ["admin-stores"] });
  };

  const persistHidden = (next: string[]) => {
    try {
      localStorage.setItem(HIDDEN_RECEIPTS_KEY, JSON.stringify(next));
    } catch {
      // Storage disabled — the receipt is still hidden for this session.
    }
  };

  // True deletion is not available: authenticated users only have SELECT/INSERT on
  // payment_receipts and there is no delete RPC. This is an explicit local hide.
  const hideReceipt = (id: string) => {
    setHiddenIds((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      persistHidden(next);
      return next;
    });
    setHiding(null);
    if (showHidden) setShowHidden(false);
    toast.success(t("تم إخفاء الوصل من العرض فقط"), {
      description: t("يمكن استعادته من زر عرض المخفية"),
    });
  };

  const restoreReceipt = (id: string) => {
    setHiddenIds((prev) => {
      const next = prev.filter((hiddenId) => hiddenId !== id);
      persistHidden(next);
      return next;
    });
    toast.success(t("تمت استعادة الوصل"));
  };

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("approve_receipt", { _receipt_id: id });
      if (error) throw error;
      return data;
    },
    onSuccess: (until) => {
      toast.success(
        t("تم التفعيل حتى {date}", { date: new Date(until as string).toLocaleDateString(locale) }),
      );
      refresh();
    },
    onError: () => toast.error(t("تعذر قبول الإيصال")),
  });
  const reject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("reject_receipt", {
        _receipt_id: rejecting!,
        _reason: reason,
      });
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

  type StoreInfo = {
    name: string;
    slug: string;
    owner_email: string | null;
    phone: string | null;
    whatsapp: string | null;
  };

  return (
    <>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("ابحث في الإيصالات...")}
          className="ps-9"
          aria-label={t("ابحث في الإيصالات...")}
        />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={filter === "pending" ? "default" : "outline"}
          onClick={() => setFilter("pending")}
        >
          {t("قيد المراجعة")}
          <Badge variant="outline" className="num ms-1">
            {statusCounts.pending}
          </Badge>
        </Button>
        <Button
          size="sm"
          variant={filter === "approved" ? "default" : "outline"}
          onClick={() => setFilter("approved")}
        >
          {t("مقبولة")}
          <Badge variant="outline" className="num ms-1">
            {statusCounts.approved}
          </Badge>
        </Button>
        <Button
          size="sm"
          variant={filter === "rejected" ? "default" : "outline"}
          onClick={() => setFilter("rejected")}
        >
          {t("مرفوضة")}
          <Badge variant="outline" className="num ms-1">
            {statusCounts.rejected}
          </Badge>
        </Button>
        <Button
          size="sm"
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          {t("الكل")}
          <Badge variant="outline" className="num ms-1">
            {statusCounts.all}
          </Badge>
        </Button>
        <Button
          size="sm"
          variant={showHidden ? "secondary" : "ghost"}
          onClick={() => setShowHidden((prev) => !prev)}
        >
          {showHidden ? t("العودة للقائمة") : t("عرض المخفية")}
          {hiddenIds.length > 0 && !showHidden && (
            <Badge variant="outline" className="num me-1">
              {hiddenIds.length}
            </Badge>
          )}
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {visibleReceipts.map((r) => {
          const s = r.stores as StoreInfo | null;
          const url = urls[r.receipt_path];
          const isHidden = hiddenIds.includes(r.id);
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
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                    {r.status === "pending" ? (
                      <Badge variant="warning">{t("معلّق")}</Badge>
                    ) : r.status === "approved" ? (
                      <Badge variant="success">{t("مقبول")}</Badge>
                    ) : (
                      <Badge variant="danger">{t("مرفوض")}</Badge>
                    )}
                    {isHidden && <Badge variant="outline">{t("مخفي محلياً")}</Badge>}
                  </div>
                </div>
                <MerchantContacts
                  email={s?.owner_email ?? null}
                  phone={s?.phone ?? null}
                  whatsapp={s?.whatsapp ?? null}
                />
                <p>
                  {(r.plans as { name: string } | null)?.name} ·{" "}
                  <b className="num">{formatDZD(r.amount, language)}</b>
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("رقم المعاملة:")} <span className="num">{r.transaction_ref}</span> ·{" "}
                  {new Date(r.created_at).toLocaleDateString(locale)}
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {isHidden ? (
                    <Button size="sm" variant="outline" onClick={() => restoreReceipt(r.id)}>
                      <RotateCcw /> {t("استعادة الوصل")}
                    </Button>
                  ) : (
                    <>
                      {r.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="success"
                            disabled={approve.isPending}
                            onClick={() => approve.mutate(r.id)}
                          >
                            <Check /> {t("قبول وتفعيل")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-danger"
                            onClick={() => setRejecting(r.id)}
                          >
                            <X /> {t("رفض")}
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        onClick={() => setHiding(r.id)}
                      >
                        <Trash2 /> {t("إخفاء الوصل")}
                      </Button>
                    </>
                  )}
                </div>
                {r.reject_reason && (
                  <p className="text-xs text-danger">
                    {t("السبب: {reason}", { reason: r.reject_reason })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {visibleReceipts.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {searchText ? t("لا توجد إيصالات مطابقة للبحث.") : t("لا توجد إيصالات.")}
        </p>
      )}

      <Dialog open={!!hiding} onOpenChange={(o) => !o && setHiding(null)}>
        <DialogContent dir={locale === "ar-DZ" ? "rtl" : "ltr"}>
          <DialogHeader className="text-start">
            <DialogTitle>{t("إخفاء الوصل من القائمة؟")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("سيختفي الوصل من هذه القائمة على هذا الجهاز فقط، وسيبقى محفوظاً في قاعدة البيانات. يمكنك استعادته من زر عرض المخفية.")}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setHiding(null)}>
              {t("إلغاء")}
            </Button>
            <Button variant="destructive" onClick={() => hiding && hideReceipt(hiding)}>
              {t("إخفاء")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
          {preview && (
            <img
              src={preview}
              alt={t("وصل الدفع")}
              className="max-h-[75vh] w-full rounded-xl object-contain"
            />
          )}
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
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
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
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  /m/{s.slug} · {s.owner_email}
                </p>
                <MerchantContacts email={null} phone={s.phone} whatsapp={s.whatsapp} />
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

/** Merchant contact details for platform admins: email + direct call/WhatsApp. */
function MerchantContacts({
  email,
  phone,
  whatsapp,
}: {
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
}) {
  if (!email && !phone && !whatsapp) return null;
  return (
    <div className="space-y-0.5 text-xs">
      {email ? (
        <p className="truncate text-muted-foreground" dir="ltr">
          {email}
        </p>
      ) : null}
      {phone || whatsapp ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1" dir="ltr">
          {phone ? (
            <a href={`tel:${phone}`} className="num inline-flex items-center gap-1 hover:underline">
              <Phone className="size-3.5 shrink-0" />
              {phone}
            </a>
          ) : null}
          {whatsapp ? (
            <a
              href={whatsappLink(whatsapp, "")}
              target="_blank"
              rel="noreferrer"
              className="num inline-flex items-center gap-1 text-[#25D366] hover:underline"
            >
              <MessageCircle className="size-3.5 shrink-0" />
              {whatsapp}
            </a>
          ) : null}
        </div>
      ) : null}
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
    queryFn: async () =>
      (await supabase.from("platform_settings").select("*").eq("id", 1).maybeSingle()).data,
  });
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    ccp_number: "",
    ccp_key: "",
    ccp_holder: "",
    rip: "",
    support_phone: "",
  });

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
            <Input
              type="number"
              dir="ltr"
              value={prices[p.id] ?? ""}
              onChange={(e) => setPrices({ ...prices, [p.id]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <div className="space-y-4 rounded-2xl bg-card p-6 shadow-card">
        <h2 className="font-medium">{t("معلومات الدفع المعروضة للتجار")}</h2>
        {fields.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label>{f.label}</Label>
            <Input
              dir="ltr"
              value={form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <Button
        variant="brand"
        className="lg:col-span-2 lg:w-fit"
        disabled={save.isPending}
        onClick={() => save.mutate()}
      >
        {save.isPending && <Loader2 className="animate-spin" />} {t("حفظ التغييرات")}
      </Button>
    </div>
  );
}
