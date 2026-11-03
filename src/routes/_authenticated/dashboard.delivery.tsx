import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, PlugZap, Save, Search, Wand2, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { WILAYAS } from "@/data/wilayas";
import { useMyStore } from "@/hooks/use-my-store";
import { friendlyError } from "@/lib/commerce";

export const Route = createFileRoute("/_authenticated/dashboard/delivery")({
  component: DeliveryRates,
});

// ---------- Algerian carrier hub (19 companies) ----------

type CarrierIntegration = { connected: boolean; api_key?: string | undefined; token?: string | undefined; account_id?: string | undefined };
type CarrierId = string;

const CARRIER_LINK_INFO: Record<CarrierId, string> = {};
const DELIVERY_CARRIERS: Array<{ id: CarrierId; name: string; note: string }> = [
  { id: "yalidine", name: "Yalidine Express", note: "مربوط عبر صفحة Yalidine — يرسل الطلبات مباشرة" },
  { id: "zr-express", name: "ZR Express", note: "يشمل Stopdesk في جميع الولايات" },
  { id: "maystro", name: "Maystro Delivery", note: "توصيل سريع ناجم/عنابة" },
  { id: "tsl", name: "TSL Express", note: "شبكة مكاتب واسعة في الوسط والشرق" },
  { id: "dhd", name: "DHD Express", note: "متخصص في المنازل" },
  { id: "ecotrack", name: "Ecotrack", note: "منصة تتبع مركزية" },
  { id: "elogistia", name: "Elogistia", note: "حلول لوجستية للتجار" },
  { id: "anderson", name: "Anderson", note: "شبكة بلدية" },
  { id: "economiqua", name: "Economiqua", note: "أثمنة اقتصادية" },
  { id: "navex", name: "Navex Delivery", note: "تغطية وطنية" },
  { id: "noest", name: "NOEST", note: "استرجاع سريع للطلبات المرفوضة" },
  { id: "goupex", name: "Goupex", note: "توصيل جماعي بالحمولة" },
  { id: "hr48", name: "48HR Express", note: "ضمان 48 ساعة" },
  { id: "hr48-2", name: "48HR 2 Express", note: "خط الدعم الثاني" },
  { id: "ecom-delivery-v2", name: "Ecom Delivery V2", note: "الإصدار الجديد" },
  { id: "wecan", name: "WeCan Services", note: "خدمة متخصصة في DIR" },
  { id: "zimou", name: "Zimou Express", note: "أثمنة تنافسية" },
  { id: "osen", name: "Osen Express", note: "شبكة مكاتب بالغرب" },
  { id: "private", name: "ساعي خاص (Private Courier)", note: "مناوب خاص — بدون API، سجل بياناته للأرشفة" },
];

type Row = { home: string; desk: string; homeOn: boolean; deskOn: boolean };

function DeliveryRates() {
  const { store, readOnly } = useMyStore();
  const qc = useQueryClient();
  const [rows, setRows] = useState<Record<number, Row>>({});
  const [defHome, setDefHome] = useState("");
  const [defDesk, setDefDesk] = useState("");
  const [filter, setFilter] = useState("");

  const rates = useQuery({
    queryKey: ["delivery-rates", store?.id],
    enabled: !!store,
    queryFn: async () => {
      const { data, error } = await supabase.from("delivery_rates").select("*").eq("store_id", store!.id);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!store || !rates.data) return;
    setDefHome(String(store.default_home_price));
    setDefDesk(String(store.default_desk_price));
    const next: Record<number, Row> = {};
    for (const w of WILAYAS) {
      const r = rates.data.find((x) => x.wilaya_code === w.code);
      next[w.code] = r
        ? { home: r.home_price != null ? String(r.home_price) : "", desk: r.desk_price != null ? String(r.desk_price) : "", homeOn: r.home_price != null, deskOn: r.desk_price != null }
        : { home: String(store.default_home_price), desk: String(store.default_desk_price), homeOn: true, deskOn: true };
    }
    setRows(next);
  }, [store, rates.data]);

  const visible = useMemo(
    () => WILAYAS.filter((w) => !filter || w.ar.includes(filter) || w.fr.toLowerCase().includes(filter.toLowerCase()) || String(w.code) === filter),
    [filter],
  );

  const applyDefault = () => {
    const next: Record<number, Row> = {};
    for (const w of WILAYAS) next[w.code] = { home: defHome, desk: defDesk, homeOn: true, deskOn: true };
    setRows(next);
    toast.success("تم تطبيق السعر الافتراضي على كل الولايات. لا تنسَ الحفظ.");
  };

  const save = useMutation({
    mutationFn: async () => {
      const h = Number(defHome);
      const d = Number(defDesk);
      if (!Number.isFinite(h) || !Number.isFinite(d) || h < 0 || d < 0) throw new Error("INVALID_PRICE");
      const { error: e1 } = await supabase
        .from("stores")
        .update({ default_home_price: h, default_desk_price: d })
        .eq("id", store!.id);
      if (e1) throw e1;
      const payload = WILAYAS.map((w) => {
        const r = rows[w.code] ?? { home: "", desk: "", homeOn: false, deskOn: false };
        return {
          store_id: store!.id,
          wilaya_code: w.code,
          home_price: r.homeOn && r.home !== "" ? Math.max(0, Number(r.home)) : null,
          desk_price: r.deskOn && r.desk !== "" ? Math.max(0, Number(r.desk)) : null,
        };
      });
      const { error } = await supabase.from("delivery_rates").upsert(payload, { onConflict: "store_id,wilaya_code" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حفظ أسعار التوصيل");
      qc.invalidateQueries({ queryKey: ["delivery-rates"] });
      qc.invalidateQueries({ queryKey: ["my-store"] });
    },
    onError: (e: Error) => toast.error(friendlyError(e.message, "تعذر الحفظ")),
  });

  const set = (code: number, patch: Partial<Row>) => setRows((r) => ({ ...r, [code]: { ...(r[code] as Row), ...patch } }));

  return (
    <>
      <PageHeader
        title="أسعار التوصيل"
        description="حدّد سعر التوصيل للمنزل وللمكتب في كل ولاية من الـ 58 ولاية."
        actions={
          <Button variant="brand" disabled={readOnly || save.isPending || !Object.keys(rows).length} onClick={() => save.mutate()}>
            {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} حفظ الأسعار
          </Button>
        }
      />

      {store ? <CarrierHub store={store} readOnly={readOnly} /> : null}

      <div className="mb-6 grid gap-4 rounded-2xl bg-card p-5 shadow-card md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div className="space-y-1.5">
          <Label>السعر الافتراضي للمنزل (د.ج)</Label>
          <Input type="number" dir="ltr" value={defHome} onChange={(e) => setDefHome(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>السعر الافتراضي للمكتب (د.ج)</Label>
          <Input type="number" dir="ltr" value={defDesk} onChange={(e) => setDefDesk(e.target.value)} />
        </div>
        <Button variant="outline" onClick={applyDefault} disabled={readOnly}>
          <Wand2 /> تطبيق على كل الولايات
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-11 bg-card ps-10" placeholder="ابحث عن ولاية..." value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>

      <div className="overflow-hidden rounded-2xl bg-card shadow-card">
        <div className="hidden grid-cols-[2fr_1.5fr_1.5fr] gap-4 border-b bg-table-header px-5 py-3 text-xs font-medium text-muted-foreground md:grid">
          <span>الولاية</span>
          <span>توصيل للمنزل</span>
          <span>توصيل للمكتب (Stopdesk)</span>
        </div>
        <ul className="divide-y">
          {visible.map((w) => {
            const r = rows[w.code];
            if (!r) return null;
            return (
              <li key={w.code} className="grid gap-3 px-5 py-3 md:grid-cols-[2fr_1.5fr_1.5fr] md:items-center md:gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-xs font-medium num">{w.code}</span>
                  <div>
                    <p className="font-medium">{w.ar}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{w.fr}</p>
                  </div>
                </div>
                {(["home", "desk"] as const).map((k) => {
                  const on = k === "home" ? r.homeOn : r.deskOn;
                  return (
                    <div key={k} className="flex items-center gap-2">
                      <span className="w-14 text-xs text-muted-foreground md:hidden">{k === "home" ? "منزل" : "مكتب"}</span>
                      <Switch
                        checked={on}
                        disabled={readOnly}
                        onCheckedChange={(v) => set(w.code, k === "home" ? { homeOn: v } : { deskOn: v })}
                        aria-label="متوفر"
                      />
                      <Input
                        type="number"
                        dir="ltr"
                        className="h-9"
                        disabled={!on || readOnly}
                        value={k === "home" ? r.home : r.desk}
                        onChange={(e) => set(w.code, k === "home" ? { home: e.target.value } : { desk: e.target.value })}
                        placeholder={on ? "0" : "غير متوفر"}
                      />
                    </div>
                  );
                })}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}


function CarrierHub({ store, readOnly }: { store: NonNullable<ReturnType<typeof useMyStore>["store"]>; readOnly: boolean }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CarrierId | null>(null);
  const [form, setForm] = useState<CarrierIntegration>({ connected: false });

  const yalidineCreds = useQuery({
    queryKey: ["yalidine", store.id],
    queryFn: async () => {
      const { error } = await supabase.from("yalidine_credentials").select("api_id").eq("store_id", store.id).limit(1);
      if (error) throw error;
      return true;
    },
  });

  const carrierRows = useQuery({
    queryKey: ["carrier-integrations", store.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carrier_integrations")
        .select("carrier_id, connected, api_key, token, account_id")
        .eq("store_id", store.id);
      if (error) throw error;
      return data;
    },
  });
  const integrations = useMemo(() => {
    const map: Partial<Record<CarrierId, CarrierIntegration>> = {};
    for (const r of carrierRows.data ?? []) {
      map[r.carrier_id] = {
        connected: r.connected,
        api_key: r.api_key ?? undefined,
        token: r.token ?? undefined,
        account_id: r.account_id ?? undefined,
      };
    }
    return map;
  }, [carrierRows.data]);
  const editingCarrier = DELIVERY_CARRIERS.find((c) => c.id === editing) ?? null;

  const openLink = (carrier: (typeof DELIVERY_CARRIERS)[number]) => {
    setForm(integrations[carrier.id] ?? { connected: false });
    setEditing(carrier.id);
  };

  const saveCarrier = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!editing) return;
      const { error } = await supabase.from("carrier_integrations").upsert(
        {
          store_id: store.id,
          carrier_id: editing,
          connected: form.connected,
          api_key: form.api_key?.trim() || null,
          token: form.token?.trim() || null,
          account_id: form.account_id?.trim() || null,
        },
        { onConflict: "store_id,carrier_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حفظ بيانات الربط");
      qc.invalidateQueries({ queryKey: ["carrier-integrations", store.id] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(friendlyError(e.message, "تعذر الحفظ")),
  });

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Truck className="size-5" strokeWidth={1.6} />
        </span>
        <div className="flex-1">
          <h2 className="font-medium">شركات التوصيل الجزائرية</h2>
          <p className="text-xs text-muted-foreground">اربط حسابك عند شركتك المفضلة من {DELIVERY_CARRIERS.length} شركة مدعومة.</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {DELIVERY_CARRIERS.map((carrier) => {
          const linked =
            carrier.id === "yalidine" ? Boolean(yalidineCreds.data) : Boolean(integrations[carrier.id]?.connected);
          return (
            <div key={carrier.id} className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{carrier.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{carrier.note}</p>
                </div>
                <span
                  className={[
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    linked ? "bg-success-soft text-success" : "bg-muted text-muted-foreground",
                  ].join(" ")}
                >
                  {linked ? <CheckCircle2 className="size-3" /> : null}
                  {linked ? "مربوط" : "غير مفعل"}
                </span>
              </div>
              {carrier.id === "yalidine" ? (
                <Button asChild variant={linked ? "outline" : "brand"} size="sm" className="mt-auto w-full">
                  <Link to="/dashboard/yalidine">
                    <PlugZap /> إدارة ربط Yalidine
                  </Link>
                </Button>
              ) : (
                <Button
                  variant={linked ? "outline" : "brand"}
                  size="sm"
                  className="mt-auto w-full"
                  disabled={readOnly}
                  onClick={() => openLink(carrier)}
                >
                  <PlugZap /> {linked ? "تعديل بيانات الربط" : "ربط API"}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ربط API — {editingCarrier?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>API Key</Label>
              <Input
                dir="ltr"
                value={form.api_key ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))}
                placeholder="مثال: ak_123456"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Token</Label>
              <Input
                dir="ltr"
                value={form.token ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
                placeholder="مثال: eyJhbGciOi..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Account ID</Label>
              <Input
                dir="ltr"
                value={form.account_id ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, account_id: e.target.value }))}
                placeholder="رقم حسابك لدى الناقل"
              />
            </div>
            <p className="rounded-xl bg-warning-soft px-3 py-2 text-xs leading-5 text-warning">
              تُحفظ المفاتيح حالياً في إعدادات متجرك، وسيتم تشغيل الإرسال التلقائي لكل شركة تدريجياً.
            </p>
            <Button
              variant="brand"
              className="w-full"
              onClick={() => saveCarrier.mutate()}
              disabled={saveCarrier.isPending}
            >
              {saveCarrier.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} حفظ الربط
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
