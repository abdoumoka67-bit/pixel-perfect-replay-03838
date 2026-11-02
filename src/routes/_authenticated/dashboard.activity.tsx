import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { ProLock } from "@/components/dashboard/ProLock";
import { useMyStore } from "@/hooks/use-my-store";
import { ACTIVITY_LABELS, CALL_LABELS, MEMBER_ROLE_LABELS, STATUS_LABELS, type CallOutcome, type OrderStatus } from "@/lib/commerce";

export const Route = createFileRoute("/_authenticated/dashboard/activity")({
  component: ActivityPage,
});

function ActivityPage() {
  const { isPro } = useMyStore();
  if (!isPro) {
    return (
      <>
        <PageHeader title="سجل الأنشطة" description="كل ما يحدث في متجرك." />
        <ProLock
          title="سجل الأنشطة في Pro"
          description="تابع ما يفعله فريقك: من غيّر حالة طلب، من اتصل بالزبون، ومن عدّل منتجاً."
          points={["تاريخ ووقت كل عملية", "اسم العضو الذي قام بها", "تغيير الحالات، المكالمات، المنتجات والفريق"]}
        />
      </>
    );
  }
  return <ActivityPro />;
}

type Details = {
  order_number?: number;
  from?: string;
  to?: string;
  outcome?: string;
  email?: string | null;
  tracking?: string;
  customer?: string;
  name?: string;
  role?: string;
};

function describe(action: string, d: Details): string {
  const order = d.order_number ? `ORX-${d.order_number}` : "";
  switch (action) {
    case "order.status":
      return `${order}: ${STATUS_LABELS[d.from as OrderStatus] ?? d.from} ← ${STATUS_LABELS[d.to as OrderStatus] ?? d.to}`;
    case "call.logged":
      return `${order}: ${CALL_LABELS[d.outcome as CallOutcome] ?? ""}`;
    case "order.assigned":
      return `${order} ← ${d.email ?? "بدون عضو"}`;
    case "order.shipped":
      return `${order} · رقم التتبع ${d.tracking ?? ""}`;
    case "order.notes":
      return order;
    case "order.deleted":
      return `${order} · ${d.customer ?? ""}`;
    case "product.created":
    case "product.updated":
    case "product.deleted":
      return String(d.name ?? "");
    case "member.added":
    case "member.role":
      return `${d.email ?? ""} · ${MEMBER_ROLE_LABELS[d.role as "manager" | "agent"] ?? ""}`;
    case "member.removed":
      return String(d.email ?? "");
    default:
      return "";
  }
}

function ActivityPro() {
  const { store } = useMyStore();
  const logs = useQuery({
    queryKey: ["activity", store?.id],
    enabled: !!store,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("id,action,actor_email,details,created_at")
        .eq("store_id", store!.id)
        .order("created_at", { ascending: false })
        .limit(150);
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <PageHeader title="سجل الأنشطة" description="آخر 150 عملية قام بها أنت وفريقك." />
      <div className="rounded-2xl bg-card shadow-card">
        {logs.data?.length ? (
          <ul className="divide-y">
            {logs.data.map((l) => {
              const d = (l.details ?? {}) as unknown as Details;
              const who = l.actor_email ?? "النظام";
              return (
                <li key={l.id} className="flex items-start gap-3 p-4">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <History className="size-4" strokeWidth={1.6} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium" dir="ltr">{who}</span>{" "}
                      <span className="text-muted-foreground">{ACTIVITY_LABELS[l.action] ?? l.action}</span>
                    </p>
                    <p className="truncate text-sm">{describe(l.action, d)}</p>
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground num">
                    {new Date(l.created_at).toLocaleString("fr-DZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </time>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="p-10 text-center text-sm text-muted-foreground">
            {logs.isLoading ? "…" : "لا توجد أنشطة بعد. ستظهر هنا تغييرات الطلبات والمكالمات والمنتجات."}
          </p>
        )}
      </div>
    </>
  );
}
