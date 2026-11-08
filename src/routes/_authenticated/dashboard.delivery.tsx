import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Info,
  Loader2,
  PlugZap,
  Save,
  Search,
  Truck,
  Unplug,
  Wand2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { CarrierLogo } from "@/components/delivery/CarrierLogo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { WILAYAS } from "@/data/wilayas";
import { useMyStore } from "@/hooks/use-my-store";
import { friendlyError } from "@/lib/commerce";
import {
  CARRIER_CATEGORY_CONFIG,
  DELIVERY_CARRIERS,
  EMPTY_CARRIER_FORM,
  carrierById,
  type CarrierForm,
  type DeliveryCarrier,
} from "@/lib/delivery-carriers";
import { useTranslatedMessage, useTr, useUiLanguage } from "@/lib/ui-i18n";
import { testYalidineConnection } from "@/lib/yalidine.functions";

export const Route = createFileRoute("/_authenticated/dashboard/delivery")({
  component: DeliveryRates,
});

// ---------- Algerian carrier hub (19 companies) ----------

type CarrierIntegration = {
  connected: boolean;
  api_key?: string | undefined;
  token?: string | undefined;
  account_id?: string | undefined;
};

type Row = { home: string; desk: string; homeOn: boolean; deskOn: boolean };

function DeliveryRates() {
  const t = useTr();
  const language = useUiLanguage();
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
      const { data, error } = await supabase
        .from("delivery_rates")
        .select("*")
        .eq("store_id", store!.id);
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
        ? {
            home: r.home_price != null ? String(r.home_price) : "",
            desk: r.desk_price != null ? String(r.desk_price) : "",
            homeOn: r.home_price != null,
            deskOn: r.desk_price != null,
          }
        : {
            home: String(store.default_home_price),
            desk: String(store.default_desk_price),
            homeOn: true,
            deskOn: true,
          };
    }
    setRows(next);
  }, [store, rates.data]);

  const visible = useMemo(
    () =>
      WILAYAS.filter(
        (w) =>
          !filter ||
          w.ar.includes(filter) ||
          w.fr.toLowerCase().includes(filter.toLowerCase()) ||
          String(w.code) === filter,
      ),
    [filter],
  );

  const applyDefault = () => {
    const next: Record<number, Row> = {};
    for (const w of WILAYAS)
      next[w.code] = { home: defHome, desk: defDesk, homeOn: true, deskOn: true };
    setRows(next);
    toast.success(t("تم تطبيق السعر الافتراضي على كل الولايات. لا تنسَ الحفظ."));
  };

  const save = useMutation({
    mutationFn: async () => {
      const h = Number(defHome);
      const d = Number(defDesk);
      if (!Number.isFinite(h) || !Number.isFinite(d) || h < 0 || d < 0)
        throw new Error("INVALID_PRICE");
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
      const { error } = await supabase
        .from("delivery_rates")
        .upsert(payload, { onConflict: "store_id,wilaya_code" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("تم حفظ أسعار التوصيل"));
      qc.invalidateQueries({ queryKey: ["delivery-rates"] });
      qc.invalidateQueries({ queryKey: ["my-store"] });
    },
    onError: (e: Error) => toast.error(t(friendlyError(e.message, t("تعذر الحفظ")))),
  });

  const set = (code: number, patch: Partial<Row>) =>
    setRows((r) => ({ ...r, [code]: { ...(r[code] as Row), ...patch } }));

  return (
    <>
      <PageHeader
        title={t("أسعار التوصيل")}
        description={t("حدّد سعر التوصيل للمنزل وللمكتب في كل ولاية من الـ 58 ولاية.")}
        actions={
          <Button
            variant="brand"
            disabled={readOnly || save.isPending || !Object.keys(rows).length}
            onClick={() => save.mutate()}
          >
            {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} {t("حفظ الأسعار")}
          </Button>
        }
      />

      {store ? <CarrierHub store={store} readOnly={readOnly} /> : null}

      <div className="mb-6 grid gap-4 rounded-2xl bg-card p-5 shadow-card md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div className="space-y-1.5">
          <Label>{t("السعر الافتراضي للمنزل (د.ج)")}</Label>
          <Input
            type="number"
            dir="ltr"
            value={defHome}
            onChange={(e) => setDefHome(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("السعر الافتراضي للمكتب (د.ج)")}</Label>
          <Input
            type="number"
            dir="ltr"
            value={defDesk}
            onChange={(e) => setDefDesk(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={applyDefault} disabled={readOnly}>
          <Wand2 /> {t("تطبيق على كل الولايات")}
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-11 bg-card ps-10"
          placeholder={t("ابحث عن ولاية...")}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-2xl bg-card shadow-card">
        <div className="hidden grid-cols-[2fr_1.5fr_1.5fr] gap-4 border-b bg-table-header px-5 py-3 text-xs font-medium text-muted-foreground md:grid">
          <span>{t("الولاية")}</span>
          <span>{t("توصيل للمنزل")}</span>
          <span>{t("توصيل للمكتب (Stopdesk)")}</span>
        </div>
        <ul className="divide-y">
          {visible.map((w) => {
            const r = rows[w.code];
            if (!r) return null;
            return (
              <li
                key={w.code}
                className="grid gap-3 px-5 py-3 md:grid-cols-[2fr_1.5fr_1.5fr] md:items-center md:gap-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-xs font-medium num">
                    {w.code}
                  </span>
                  <div>
                    <p className="font-medium">{language === "ar" ? w.ar : w.fr}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {w.fr}
                    </p>
                  </div>
                </div>
                {(["home", "desk"] as const).map((k) => {
                  const on = k === "home" ? r.homeOn : r.deskOn;
                  return (
                    <div key={k} className="flex items-center gap-2">
                      <span className="w-14 text-xs text-muted-foreground md:hidden">
                        {k === "home" ? t("منزل") : t("مكتب")}
                      </span>
                      <Switch
                        checked={on}
                        disabled={readOnly}
                        onCheckedChange={(v) =>
                          set(w.code, k === "home" ? { homeOn: v } : { deskOn: v })
                        }
                        aria-label={t("متوفر")}
                      />
                      <Input
                        type="number"
                        dir="ltr"
                        className="h-9"
                        disabled={!on || readOnly}
                        value={k === "home" ? r.home : r.desk}
                        onChange={(e) =>
                          set(
                            w.code,
                            k === "home" ? { home: e.target.value } : { desk: e.target.value },
                          )
                        }
                        placeholder={on ? "0" : t("غير متوفر")}
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

function CarrierHub({
  store,
  readOnly,
}: {
  store: NonNullable<ReturnType<typeof useMyStore>["store"]>;
  readOnly: boolean;
}) {
  const t = useTr();
  const msg = useTranslatedMessage();
  const qc = useQueryClient();
  const testFn = useServerFn(testYalidineConnection);
  const [editing, setEditing] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [form, setForm] = useState<CarrierForm>({ ...EMPTY_CARRIER_FORM });
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const yalidineCreds = useQuery({
    queryKey: ["yalidine", store.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("yalidine_credentials")
        .select("api_id, api_token")
        .eq("store_id", store.id)
        .maybeSingle();
      if (error) throw error;
      return data;
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
    const map: Partial<Record<string, CarrierIntegration>> = {};
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

  const editingCarrier = editing ? (carrierById(editing) ?? null) : null;
  const editingConfig = editingCarrier ? CARRIER_CATEGORY_CONFIG[editingCarrier.category] : null;
  const disconnectingCarrier = disconnecting ? (carrierById(disconnecting) ?? null) : null;

  const isLinked = (id: string) =>
    id === "yalidine"
      ? Boolean(integrations["yalidine"]?.connected || yalidineCreds.data)
      : Boolean(integrations[id]?.connected);

  const invalidateCarrierQueries = () => {
    qc.invalidateQueries({ queryKey: ["carrier-integrations", store.id] });
    qc.invalidateQueries({ queryKey: ["yalidine", store.id] });
    qc.invalidateQueries({ queryKey: ["connected-carriers"] });
    qc.invalidateQueries({ queryKey: ["yalidine-linked"] });
  };

  const openLink = (carrier: DeliveryCarrier) => {
    const row = integrations[carrier.id];
    const next = { ...EMPTY_CARRIER_FORM };
    if (carrier.category === "private") {
      next.courier_name = row?.account_id ?? "";
      next.phone = row?.token ?? "";
    } else if (carrier.category === "yalidine") {
      next.api_id = row?.account_id ?? yalidineCreds.data?.api_id ?? "";
      next.api_token = row?.token ?? row?.api_key ?? yalidineCreds.data?.api_token ?? "";
    } else {
      next.api_token = row?.token ?? row?.api_key ?? "";
    }
    setForm(next);
    setTestResult(null);
    setEditing(carrier.id);
  };

  const saveCarrier = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!editingCarrier || !editingConfig) return;
      for (const field of editingConfig.fields) {
        if (!form[field.key].trim()) throw new Error("VALIDATION_REQUIRED");
      }

      let accountId: string | null = null;
      let token: string | null = null;
      if (editingCarrier.category === "private") {
        accountId = form.courier_name.trim();
        token = form.phone.trim();
      } else if (editingCarrier.category === "yalidine") {
        accountId = form.api_id.trim();
        token = form.api_token.trim();
      } else {
        token = form.api_token.trim();
      }

      const { error } = await supabase.from("carrier_integrations").upsert(
        {
          store_id: store.id,
          carrier_id: editingCarrier.id,
          connected: true,
          account_id: accountId,
          token,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id,carrier_id" },
      );
      if (error) throw error;

      // Yalidine dispatch still reads the dedicated table, so keep both in sync.
      if (editingCarrier.category === "yalidine") {
        const { error: credsError } = await supabase.from("yalidine_credentials").upsert({
          store_id: store.id,
          api_id: form.api_id.trim(),
          api_token: form.api_token.trim(),
          updated_at: new Date().toISOString(),
        });
        if (credsError) throw credsError;
      }
    },
    onSuccess: () => {
      toast.success(t("تم تفعيل الربط بنجاح"));
      invalidateCarrierQueries();
      setEditing(null);
    },
    onError: (e: Error) => {
      const message =
        e.message === "VALIDATION_REQUIRED"
          ? t("يرجى ملء كل الحقول المطلوبة.")
          : t(friendlyError(e.message, t("تعذر الحفظ")));
      toast.error(message);
    },
  });

  const disconnectCarrier = useMutation({
    mutationFn: async (carrierId: string): Promise<void> => {
      const { error } = await supabase
        .from("carrier_integrations")
        .delete()
        .eq("store_id", store.id)
        .eq("carrier_id", carrierId);
      if (error) throw error;
      if (carrierId === "yalidine") {
        const { error: credsError } = await supabase
          .from("yalidine_credentials")
          .delete()
          .eq("store_id", store.id);
        if (credsError) throw credsError;
      }
    },
    onSuccess: () => {
      toast.success(t("تم إلغاء الربط"));
      invalidateCarrierQueries();
      setDisconnecting(null);
    },
    onError: (e: Error) => toast.error(t(friendlyError(e.message, t("تعذر إلغاء الربط")))),
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      const apiId = form.api_id.trim();
      const apiToken = form.api_token.trim();
      if (apiId.length < 3 || apiToken.length < 3) {
        throw new Error(t("يرجى ملء كل الحقول المطلوبة."));
      }
      return testFn({ data: { api_id: apiId, api_token: apiToken } });
    },
    onSuccess: (result) => {
      setTestResult({ ok: result.ok, message: result.message });
      if (result.ok) toast.success(msg(result.message));
      else toast.error(msg(result.message));
    },
    onError: (e: Error) => toast.error(t(e.message)),
  });

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Truck className="size-5" strokeWidth={1.6} />
        </span>
        <div className="flex-1">
          <h2 className="font-medium">{t("شركات التوصيل الجزائرية")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("اربط حسابك عند شركتك المفضلة من {n} شركة مدعومة.", { n: DELIVERY_CARRIERS.length })}
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {DELIVERY_CARRIERS.map((carrier) => {
          const linked = isLinked(carrier.id);
          return (
            <div
              key={carrier.id}
              className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-card"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <CarrierLogo id={carrier.id} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t(carrier.name)}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {t(carrier.note)}
                    </p>
                  </div>
                </div>
                <span
                  className={[
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    linked ? "bg-success-soft text-success" : "bg-muted text-muted-foreground",
                  ].join(" ")}
                >
                  {linked ? <CheckCircle2 className="size-3" /> : null}
                  {linked ? t("متصل") : t("غير مفعل")}
                </span>
              </div>
              <div className="mt-auto flex flex-col gap-2">
                <Button
                  variant={linked ? "outline" : "brand"}
                  size="sm"
                  className="w-full"
                  disabled={readOnly}
                  onClick={() => openLink(carrier)}
                >
                  <PlugZap />{" "}
                  {linked
                    ? t("تعديل الربط")
                    : carrier.category === "private"
                      ? t("إضافة الساعي")
                      : t("ربط API")}
                </Button>
                {linked ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-danger"
                    disabled={readOnly || disconnectCarrier.isPending}
                    onClick={() => setDisconnecting(carrier.id)}
                  >
                    <Unplug /> {t("إلغاء الربط")}
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(next) => !next && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 text-start">
              {editingCarrier ? <CarrierLogo id={editingCarrier.id} className="size-11" /> : null}
              <div className="min-w-0">
                <DialogTitle>
                  {editingCarrier?.category === "private"
                    ? t("بيانات الساعي — {name}", { name: t(editingCarrier.name) })
                    : t("ربط API — {name}", { name: editingCarrier ? t(editingCarrier.name) : "" })}
                </DialogTitle>
                {editingCarrier ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {t(editingCarrier.note)}
                  </p>
                ) : null}
              </div>
            </div>
          </DialogHeader>
          {editingCarrier && editingConfig ? (
            <div className="space-y-4">
              {editingConfig.fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={`carrier-${field.key}`}>{t(field.label)}</Label>
                  <Input
                    id={`carrier-${field.key}`}
                    dir="ltr"
                    type={field.type ?? "text"}
                    inputMode={field.inputMode ?? "text"}
                    autoComplete="off"
                    value={form[field.key]}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, [field.key]: e.target.value }))
                    }
                    placeholder={t(field.placeholder)}
                  />
                </div>
              ))}

              <div className="rounded-xl border bg-muted/50 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium">
                  <Info className="size-3.5 text-brand" /> {t("دليل الربط خطوة بخطوة")}
                </p>
                {editingConfig.steps.length > 0 ? (
                  <ol className="list-inside list-decimal space-y-1 text-xs leading-5 text-muted-foreground">
                    {editingConfig.steps.map((step) => (
                      <li key={step}>{t(step)}</li>
                    ))}
                  </ol>
                ) : null}
                {editingConfig.note ? (
                  <p className="text-xs leading-5 text-muted-foreground">{t(editingConfig.note)}</p>
                ) : null}
              </div>

              {editingConfig.testable ? (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={testConnection.isPending}
                    onClick={() => testConnection.mutate()}
                  >
                    {testConnection.isPending ? <Loader2 className="animate-spin" /> : <PlugZap />}{" "}
                    {t("فحص الاتصال الفوري")}
                  </Button>
                  {testResult ? (
                    <p
                      className={[
                        "rounded-lg px-3 py-2 text-xs leading-5",
                        testResult.ok
                          ? "bg-success-soft text-success"
                          : "bg-destructive/10 text-destructive",
                      ].join(" ")}
                    >
                      {msg(testResult.message)}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <Button
                variant="brand"
                className="w-full"
                onClick={() => saveCarrier.mutate()}
                disabled={saveCarrier.isPending}
              >
                {saveCarrier.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}{" "}
                {t("حفظ وتفعيل")}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!disconnecting} onOpenChange={(next) => !next && setDisconnecting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle>{t("إلغاء الربط")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("سيتم حذف مفاتيح الربط مع {name}. يمكنك إعادة الربط في أي وقت.", {
                name: disconnectingCarrier ? t(disconnectingCarrier.name) : "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("إلغاء")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={disconnectCarrier.isPending}
              onClick={() => {
                if (disconnecting) disconnectCarrier.mutate(disconnecting);
              }}
            >
              {t("تأكيد إلغاء الربط")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
