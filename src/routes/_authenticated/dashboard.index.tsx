import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Clock, PackageCheck, Plus, Truck, XCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { useMyStore } from "@/hooks/use-my-store";
import { formatDZD, type OrderStatus } from "@/lib/commerce";
import { useTr, useUiLanguage } from "@/lib/ui-i18n";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: Overview,
});

const CARDS: { status: OrderStatus; label: string; icon: typeof Clock; tone: string }[] = [
  { status: "new", label: "طلبات جديدة", icon: Sparkles, tone: "bg-info-soft text-info" },
  { status: "confirmed", label: "مؤكدة", icon: CheckCircle2, tone: "bg-warning-soft text-warning" },
  { status: "shipping", label: "قيد التوصيل", icon: Truck, tone: "bg-brand-soft text-brand" },
  { status: "delivered", label: "تم التوصيل", icon: PackageCheck, tone: "bg-success-soft text-success" },
  { status: "cancelled", label: "ملغاة", icon: XCircle, tone: "bg-danger-soft text-danger" },
];

function Overview() {
  const { store, sub } = useMyStore();
  const t = useTr();
  const language = useUiLanguage();
  const dateLocale = language === "ar" ? "ar-DZ" : language === "fr" ? "fr-DZ" : "en-GB";
  const stats = useQuery({
    queryKey: ["order-stats", store?.id],
    enabled: !!store,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("order_stats", { _store_id: store!.id });
      if (error) throw error;
      return data;
    },
  });
  const recent = useQuery({
    queryKey: ["recent-orders", store?.id],
    enabled: !!store,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,order_number,customer_name,wilaya_name,total,status,created_at,product_name")
        .eq("store_id", store!.id)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  const byStatus = (s: OrderStatus) => stats.data?.find((r) => r.status === s);
  const totalOrders = (stats.data ?? []).reduce((a, r) => a + Number(r.orders_count), 0);
  const delivered = byStatus("delivered");

  return (
    <>
      <PageHeader
        title={t("أهلاً، {store}", { store: store?.name ?? "" })}
        description={
          sub?.isActive
            ? sub.isTrial
              ? t("تجربتك المجانية: {n} أيام متبقية", { n: sub.daysLeft })
              : t("اشتراكك فعّال حتى {date}", { date: sub.endsAt.toLocaleDateString(dateLocale) })
            : t("حسابك في وضع القراءة فقط")
        }
        actions={
          <Button asChild variant="brand">
            <Link to="/dashboard/products" search={{ new: true }}>
              <Plus /> {t("منتج جديد")}
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {CARDS.map((c) => {
          const row = byStatus(c.status);
          return (
            <div key={c.status} className="rounded-2xl bg-card p-4 shadow-card md:p-5">
              <div className={`inline-flex size-9 items-center justify-center rounded-xl ${c.tone}`}>
                <c.icon className="size-[18px]" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{t(c.label)}</p>
              <p className="mt-0.5 font-display text-2xl font-medium num">{Number(row?.orders_count ?? 0)}</p>
              <p className="text-xs text-muted-foreground num">{formatDZD(Number(row?.orders_total ?? 0), language)}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-card p-5 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium">{t("آخر الطلبات")}</h2>
            <Link to="/dashboard/orders" className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
              {t("عرض الكل")} <ArrowLeft className="size-4" />
            </Link>
          </div>
          {recent.data?.length ? (
            <ul className="divide-y">
              {recent.data.map((o) => (
                <li key={o.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{o.customer_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {o.product_name} · {o.wilaya_name}
                    </p>
                  </div>
                  <span className="text-sm font-medium num">{formatDZD(o.total, language)}</span>
                  <StatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              {t("لا توجد طلبات بعد. أضف منتجاً وشارك رابط صفحة الهبوط في إعلاناتك.")}
            </div>
          )}
        </div>
        <div className="rounded-2xl bg-sidebar p-6 text-sidebar-foreground shadow-card">
          <p className="text-sm text-sidebar-muted">{t("إجمالي الطلبات")}</p>
          <p className="mt-1 font-display text-4xl font-medium num">{totalOrders}</p>
          <div className="my-5 h-px bg-sidebar-border" />
          <p className="text-sm text-sidebar-muted">{t("مداخيل الطلبات المسلّمة")}</p>
          <p className="mt-1 font-display text-2xl font-medium text-sidebar-primary num">
            {formatDZD(Number(delivered?.orders_total ?? 0), language)}
          </p>
          <p className="mt-4 text-xs text-sidebar-muted">
            {t("نسبة التوصيل: {value}", {
              value: `${totalOrders ? Math.round((Number(delivered?.orders_count ?? 0) / totalOrders) * 100) : 0}%`,
            })}
          </p>
        </div>
      </div>
    </>
  );
}
