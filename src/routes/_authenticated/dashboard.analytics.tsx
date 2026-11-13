import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { MapPin } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { ProLock } from "@/components/dashboard/ProLock";
import { useMyStore } from "@/hooks/use-my-store";
import { ORDER_STATUSES, STATUS_LABELS, formatDZD, type OrderStatus } from "@/lib/commerce";
import { useTr, useUiLanguage } from "@/lib/ui-i18n";

export const Route = createFileRoute("/_authenticated/dashboard/analytics")({
  component: Analytics,
});

const DAYS = 30;

type AnalyticsData = {
  days: number;
  total: number;
  delivered_revenue: number;
  statuses: Partial<Record<OrderStatus, number>>;
  daily: { day: string; orders: number; revenue: number }[] | null;
  wilayas: { name: string; count: number }[];
  products: { name: string; orders: number; qty: number; delivered: number; revenue: number }[];
  sources: { name: string; count: number }[];
};

function Analytics() {
  const { isPro } = useMyStore();
  const t = useTr();
  if (!isPro) {
    return (
      <>
        <PageHeader title={t("الإحصائيات")} description={t("أداء متجرك ومبيعاتك.")} />
        <ProLock
          title={t("الإحصائيات المتقدمة في Pro")}
          description={t("اعرف من أين تأتي طلباتك، وما هي منتجاتك الرابحة، ونسبة التأكيد والتوصيل.")}
          points={[
            t("الطلبات والمداخيل يوماً بيوم"),
            t("أكثر الولايات طلباً"),
            t("نسبة التأكيد والتوصيل والإلغاء"),
            t("المنتجات الأكثر ربحاً"),
            t("مصادر الطلبات والإعلانات"),
          ]}
        />
      </>
    );
  }
  return <AnalyticsPro />;
}

function AnalyticsPro() {
  const { store } = useMyStore();
  const t = useTr();
  const language = useUiLanguage();
  const q = useQuery({
    queryKey: ["analytics", store?.id, DAYS],
    enabled: !!store,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("store_analytics", { _store_id: store!.id, _days: DAYS });
      if (error) throw error;
      return data as unknown as AnalyticsData;
    },
  });

  const m = useMemo(() => {
    const d = q.data;
    const st: Partial<Record<OrderStatus, number>> = d?.statuses ?? {};
    const total = d?.total ?? 0;
    const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
    const confirmed = total - (st.new ?? 0) - (st.cancelled ?? 0);
    return {
      total,
      revenue: d?.delivered_revenue ?? 0,
      confirmRate: pct(Math.max(0, confirmed)),
      deliveryRate: pct(st.delivered ?? 0),
      daily: (d?.daily ?? []).map((x) => ({ ...x, label: x.day.slice(8, 10) + "/" + x.day.slice(5, 7) })),
      wilayas: d?.wilayas ?? [],
      products: d?.products ?? [],
      sources: d?.sources ?? [],
      st,
    };
  }, [q.data]);

  const kpis = [
    { label: t("طلبات آخر 30 يوماً"), value: String(m.total) },
    { label: t("مداخيل مُسلّمة"), value: formatDZD(m.revenue, language) },
    { label: t("نسبة التأكيد"), value: `${m.confirmRate}%` },
    { label: t("نسبة التوصيل"), value: `${m.deliveryRate}%` },
  ];

  return (
    <>
      <PageHeader title={t("الإحصائيات")} description={t("أداء متجرك خلال آخر 30 يوماً.")} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl bg-card p-5 shadow-card">
            <p className="text-sm text-muted-foreground">{k.label}</p>
            <p className="mt-1 font-display text-2xl font-medium num">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-card p-5 shadow-card">
        <h2 className="mb-4 font-medium">{t("الطلبات اليومية")}</h2>
        <div className="h-64" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={m.daily}
              accessibilityLayer
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={4} />
              <YAxis
                allowDecimals={false}
                domain={[0, (max: number) => Math.max(max, 1)]}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              {/* Dashed cursor follows the pointer on both mouse and touch. */}
              <Tooltip
                cursor={{ stroke: "#10B981", strokeDasharray: "4 4", strokeWidth: 1.5 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0]?.payload as
                    | { label: string; orders: number; revenue: number }
                    | undefined;
                  if (!point) return null;
                  return (
                    <div
                      className="min-w-[130px] rounded-xl border border-border bg-card/95 p-3 text-xs shadow-lg backdrop-blur-xs"
                      dir="auto"
                    >
                      <p className="border-b border-border/50 pb-1 font-medium text-foreground">
                        {label}
                      </p>
                      <p className="mt-1.5 flex items-center justify-between gap-3 text-muted-foreground">
                        <span>{t("الطلبات")}:</span>
                        <span className="font-bold text-foreground num">{point.orders}</span>
                      </p>
                      {/* Sales always render, even when the day totals zero. */}
                      <p className="mt-1 flex items-center justify-between gap-3 text-muted-foreground">
                        <span>{t("المبيعات")}:</span>
                        <span className="font-bold text-[#10B981] num">
                          {formatDZD(Number(point.revenue ?? 0), language)}
                        </span>
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="orders"
                name={t("الطلبات")}
                stroke="#10B981"
                strokeWidth={2.5}
                fill="url(#g1)"
                dot={{ r: 2, fill: "#10B981", stroke: "var(--card)", strokeWidth: 1 }}
                activeDot={{ r: 5, fill: "#10B981", stroke: "var(--card)", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-card p-5 shadow-card lg:col-span-2">
          <h2 className="mb-4 font-medium">{t("أكثر الولايات طلباً")}</h2>
          <div className="flex h-64 items-center justify-center" dir="ltr">
            {m.wilayas.length > 0 ? (
              <div className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={m.wilayas} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      width={28}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--muted)/30" }}
                      contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }}
                    />
                    <Bar
                      dataKey="count"
                      name={t("الطلبات")}
                      fill="var(--primary)"
                      maxBarSize={32}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
                <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-muted/50">
                  <MapPin className="size-5 text-muted-foreground" />
                </div>
                <p>{t("لا توجد بيانات كافية لعرض توزيع الولايات بعد.")}</p>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl bg-card p-5 shadow-card">
            <h2 className="mb-3 font-medium">{t("توزيع الحالات")}</h2>
            <ul className="space-y-2.5">
              {ORDER_STATUSES.map((s) => {
                const c = m.st[s] ?? 0;
                const pct = m.total ? (c / m.total) * 100 : 0;
                return (
                  <li key={s}>
                    <div className="flex justify-between text-sm">
                      <span>{t(STATUS_LABELS[s])}</span>
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
            <h2 className="mb-3 font-medium">{t("المنتجات الأكثر ربحاً")}</h2>
            <ul className="space-y-3 text-sm">
              {m.products.map((p) => (
                <li key={p.name} className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("{orders} طلب · {delivered} مُسلّم", { orders: p.orders, delivered: p.delivered })}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium num">{formatDZD(p.revenue, language)}</span>
                </li>
              ))}
              {m.products.length === 0 && <li className="text-muted-foreground">{t("لا توجد بيانات بعد.")}</li>}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-card p-5 shadow-card">
        <h2 className="mb-3 font-medium">{t("مصادر الطلبات والإعلانات")}</h2>
        <ul className="space-y-2.5">
          {m.sources.map((src) => {
            const pct = m.total ? Math.round((src.count / m.total) * 100) : 0;
            const isFb = src.name === "Facebook";
            const isIg = src.name === "Instagram";
            const isDirect = src.name === "direct";
            const displayName = isDirect ? t("زيارات مباشرة") : src.name;
            const dotColor = isFb ? "bg-[#1877F2]" : isIg ? "bg-[#E1306C]" : "bg-muted-foreground";

            return (
              <li key={src.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${dotColor}`} aria-hidden />
                    <span>{displayName}</span>
                  </span>
                  <span className="num text-xs text-muted-foreground">
                    {src.count} ({pct}%)
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${dotColor}`} style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
          {m.sources.length === 0 && <li className="text-sm text-muted-foreground">{t("لا توجد بيانات بعد.")}</li>}
        </ul>
      </div>
    </>
  );
}
