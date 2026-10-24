import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Search, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { WILAYAS } from "@/data/wilayas";
import { useMyStore } from "@/hooks/use-my-store";
import { friendlyError } from "@/lib/commerce";

export const Route = createFileRoute("/_authenticated/dashboard/delivery")({
  component: DeliveryRates,
});

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
        <div className="hidden grid-cols-[2fr_1.5fr_1.5fr] gap-4 border-b bg-muted/50 px-5 py-3 text-xs font-medium text-muted-foreground md:grid">
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
                  <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-xs font-semibold num">{w.code}</span>
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
