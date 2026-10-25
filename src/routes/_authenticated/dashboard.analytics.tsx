import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { useMyStore } from "@/hooks/use-my-store";
import { ORDER_STATUSES, STATUS_LABELS, formatDZD } from "@/lib/commerce";

export const Route = createFileRoute("/_authenticated/dashboard/analytics")({
  component: Analytics,
});

const DAYS = 30;

function Analytics() {
  const { store } = useMyStore();
  const orders = useQuery({
    queryKey: ["analytics", store?.id],
    enabled: !!store,
    queryFn: async () => {
      const since = new Date(Date.now() - DAYS * 864e5).toISOString();
      const { data, error } = await supabase
        .from("orders")
        .select("created_at,total,status,wilaya_name,product_name,quantity")
        .eq("store_id", store!.id)
        .gte("created_at", since)
        .limit(5000);
      if (error) throw error;
      return data;
    },
  });

  const m = useMemo(() => {
    const list = orders.data ?? [];
    const days: { day: string; orders: number; revenue: number }[] = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5);
      days.push({ day: d.toISOString().slice(0, 10), orders: 0, revenue: 0 });
    }
    const wilayas = new Map<string, number>();
    const products = new Map<string, number>();
    const status = new Map<string, number>();
    for (const o of list) {
      const key = o.created_at.slice(0, 10);
      const d = days.find((x) => x.day === key);
      if (d) {
        d.orders += 1;
        if (o.status !== "cancelled" && o.status !== "returned") d.revenue += o.total;
      }
      wilayas.set(o.wilaya_name, (wilayas.get(o.wilaya_name) ?? 0) + 1);
      products.set(o.product_name, (products.get(o.product_name) ?? 0) + o.quantity);
      status.set(o.status, (status.get(o.status) ?? 0) + 1);
    }
    const delivered = status.get("delivered") ?? 0;
    const cancelled = (status.get("cancelled") ?? 0) + (status.get("returned") ?? 0);
    const confirmed = list.filter((o) => o.status !== "new" && o.status !== "cancelled").length;
    return {
      days: days.map((d) => ({ ...d, label: d.day.slice(8, 10) + "/" + d.day.slice(5, 7) })),
      total: list.length,
      revenue: list.filter((o) => o.status === "delivered").reduce((a, o) => a + o.total, 0),
      confirmRate: list.length ? Math.round((confirmed / list.length) * 100) : 0,
      deliveryRate: list.length ? Math.round((delivered / list.length) * 100) : 0,
      cancelRate: list.length ? Math.round((cancelled / list.length) * 100) : 0,
      topWilayas: Array.from(wilayas.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count })),
      topProducts: Array.from(products.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5),
      status,
    };
  }, [orders.data]);

  const kpis = [
    { label: "طلبات آخر 30 يوماً", value: String(m.total) },
    { label: "مداخيل مُسلّمة", value: formatDZD(m.revenue) },
    { label: "نسبة التأكيد", value: `${m.confirmRate}%` },
    { label: "نسبة التوصيل", value: `${m.deliveryRate}%` },
  ];

  return (
    <>
      <PageHeader title="الإحصائيات" description="أداء متجرك خلال آخر 30 يوماً." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl bg-card p-5 shadow-card">
            <p className="text-sm text-muted-foreground">{k.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold num">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-card p-5 shadow-card">
        <h2 className="mb-4 font-semibold">الطلبات اليومية</h2>
        <div className="h-64" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={m.days}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={4} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={28} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} />
              <Area type="monotone" dataKey="orders" name="الطلبات" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-card p-5 shadow-card lg:col-span-2">
          <h2 className="mb-4 font-semibold">أكثر الولايات طلباً</h2>
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={m.topWilayas}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} />
                <Bar dataKey="count" name="الطلبات" fill="var(--chart-2)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl bg-card p-5 shadow-card">
            <h2 className="mb-3 font-semibold">توزيع الحالات</h2>
            <ul className="space-y-2.5">
              {ORDER_STATUSES.map((s) => {
                const c = m.status.get(s) ?? 0;
                const pct = m.total ? (c / m.total) * 100 : 0;
                return (
                  <li key={s}>
                    <div className="flex justify-between text-sm">
                      <span>{STATUS_LABELS[s]}</span>
                      <span className="num">{c}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="rounded-2xl bg-card p-5 shadow-card">
            <h2 className="mb-3 font-semibold">الأكثر مبيعاً</h2>
            <ul className="space-y-2 text-sm">
              {m.topProducts.map(([name, qty]) => (
                <li key={name} className="flex justify-between gap-2">
                  <span className="truncate">{name}</span>
                  <span className="font-semibold num">{qty}</span>
                </li>
              ))}
              {m.topProducts.length === 0 && <li className="text-muted-foreground">لا توجد بيانات بعد.</li>}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
