import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { ShieldOff, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { myStoreQuery, useMyStore } from "@/hooks/use-my-store";
import { areaForPath, canOpen, formatDZD } from "@/lib/commerce";
import { useTr } from "@/lib/ui-i18n";

export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: async ({ context }) => {
    const store = await context.queryClient.ensureQueryData(myStoreQuery);
    if (!store?.store) {
      // The store may have just been created and the first read can miss it, so
      // retry once with a forced fetch before deciding the account has no store.
      const refreshed = await context.queryClient.fetchQuery({ ...myStoreQuery, staleTime: 0 });
      if (!refreshed?.store) throw redirect({ to: "/onboarding" });
    }
  },
  head: () => ({
    meta: [
      { title: "Dashboard — oranix" },
      { name: "description", content: "Manage your store orders and products on oranix." },
      { property: "og:title", content: "Dashboard — oranix" },
      { property: "og:description", content: "Manage your store orders and products on oranix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardLayout,
});

function playOrderChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    
    // First tone (pleasant chime)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.12); // E6
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // Second harmonic bell
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(1760, now + 0.08); // A6
    gain2.gain.setValueAtTime(0.15, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.005, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.6);
  } catch {
    // Audio context may be suspended before user interaction
  }
}

function DashboardLayout() {
  const t = useTr();
  const qc = useQueryClient();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { access, isAdmin, store } = useMyStore();

  useEffect(() => {
    if (!store?.id) return;

    const channel = supabase
      .channel(`store-orders-realtime-${store.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `store_id=eq.${store.id}`,
        },
        (payload) => {
          const newOrder = payload.new as {
            order_number?: number;
            customer_name?: string;
            total?: number;
          };

          // Play audio notification
          playOrderChime();

          // Refresh query cache across all dashboard pages
          qc.invalidateQueries({ queryKey: ["orders"] });
          qc.invalidateQueries({ queryKey: ["dashboard-overview"] });
          qc.invalidateQueries({ queryKey: ["analytics"] });

          // Show prominent toast with order details
          const name = newOrder.customer_name || t("زبون");
          const num = newOrder.order_number ? `#${newOrder.order_number}` : "";
          const amount = formatDZD(Number(newOrder.total ?? 0));

          toast.success(`${t("طلب جديد")} ${num}: ${name} (${amount})`, {
            icon: <ShoppingBag className="size-5 text-brand" />,
            duration: 8000,
            action: {
              label: t("عرض الطلبات"),
              onClick: () => {
                window.location.href = "/dashboard/orders";
              },
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [store?.id, qc, t]);

  // Platform admins can open every dashboard area, including the Pro ones.
  const allowed = isAdmin || canOpen(access, areaForPath(path));
  return (
    <DashboardShell>
      {allowed ? (
        <Outlet />
      ) : (
        <div className="mx-auto max-w-md rounded-3xl border bg-card p-8 text-center shadow-card">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
            <ShieldOff className="size-6" strokeWidth={1.6} />
          </span>
          <h1 className="mt-4 text-xl font-medium">{t("هذه الصفحة غير متاحة لك")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("صاحب المتجر هو من يحدد صلاحيات كل عضو في الفريق.")}</p>
          <Button asChild className="mt-6">
            <Link to="/dashboard/orders">{t("الذهاب إلى الطلبات")}</Link>
          </Button>
        </div>
      )}
    </DashboardShell>
  );
}
