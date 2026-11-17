import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { ShieldOff, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { myStoreQuery, useMyStore } from "@/hooks/use-my-store";
import { supabase } from "@/integrations/supabase/client";
import { areaForPath, canOpen, formatDZD } from "@/lib/commerce";
import { useTr, useUiLanguage } from "@/lib/ui-i18n";

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

/** Two soft sine tones synthesized in-browser — no MP3 asset, no network request. */
function playOrderChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;

    // First tone (880 Hz - A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second tone (1318.5 Hz - E6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1318.51, now + 0.12);
    gain2.gain.setValueAtTime(0.18, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);
  } catch {
    // AudioContext blocked or not supported — the toast still shows.
  }
}

/** Lives only in the dashboard layout: channel is removed as soon as it unmounts. */
function useOrderRealtimeAlert(storeId: string | undefined, soundEnabled: boolean) {
  const queryClient = useQueryClient();
  const t = useTr();
  const language = useUiLanguage();
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;

  useEffect(() => {
    if (!storeId) return;

    const channel = supabase
      .channel(`realtime-orders-${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          void queryClient.invalidateQueries({ queryKey: ["orders"] });
          void queryClient.invalidateQueries({ queryKey: ["order-stats"] });
          void queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
          void queryClient.invalidateQueries({ queryKey: ["activity"] });

          if (soundRef.current) playOrderChime();

          const newOrder = payload.new as {
            order_number?: number;
            customer_name?: string;
            total?: number;
          };
          const orderNum = newOrder?.order_number ? `#${newOrder.order_number}` : "";
          const customer = newOrder?.customer_name ? ` · ${newOrder.customer_name}` : "";
          const amount =
            typeof newOrder?.total === "number" ? ` (${formatDZD(newOrder.total, language)})` : "";

          toast.success(
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{t("طلب جديد وصل الآن!")}</span>
              <span className="text-xs text-muted-foreground">
                {orderNum}
                {customer}
                {amount}
              </span>
            </div>,
            {
              duration: 7000,
              action: {
                label: t("عرض الطلبات"),
                onClick: () => {
                  window.location.href = "/dashboard/orders";
                },
              },
            },
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [storeId, queryClient, t, language]);
}

function DashboardLayout() {
  const t = useTr();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { access, isAdmin, store } = useMyStore();

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("oranix_order_sound_enabled");
      return stored !== null ? stored === "true" : true;
    } catch {
      return true;
    }
  });

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("oranix_order_sound_enabled", String(next));
      } catch {
        // storage disabled
      }
      if (next) playOrderChime();
      return next;
    });
  };

  useOrderRealtimeAlert(store?.id, soundEnabled);

  // Platform admins can open every dashboard area, including the Pro ones.
  const allowed = isAdmin || canOpen(access, areaForPath(path));
  return (
    <DashboardShell>
      {allowed ? (
        <>
          <Outlet />

          {/* Sound Notification Pill Button */}
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundEnabled ? t("كتم تنبيه الطلبات") : t("تفعيل تنبيه الطلبات")}
            title={soundEnabled ? t("تنبيه الطلبات مفعل") : t("تنبيه الطلبات مكتوم")}
            className="fixed bottom-20 end-4 z-40 inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/95 px-3 py-1.5 text-xs text-foreground shadow-sm backdrop-blur transition-colors hover:bg-secondary lg:bottom-4"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="size-3.5 text-brand" />
                <span className="hidden sm:inline">{t("تنبيه الطلبات مفعل")}</span>
              </>
            ) : (
              <>
                <VolumeX className="size-3.5 text-muted-foreground" />
                <span className="hidden text-muted-foreground sm:inline">
                  {t("تنبيه الطلبات مكتوم")}
                </span>
              </>
            )}
          </button>
        </>
      ) : (
        <div className="mx-auto max-w-md rounded-3xl border bg-card p-8 text-center shadow-card">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
            <ShieldOff className="size-6" strokeWidth={1.6} />
          </span>
          <h1 className="mt-4 text-xl font-medium">{t("هذه الصفحة غير متاحة لك")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("صاحب المتجر هو من يحدد صلاحيات كل عضو في الفريق.")}
          </p>
          <Button asChild className="mt-6">
            <Link to="/dashboard/orders">{t("الذهاب إلى الطلبات")}</Link>
          </Button>
        </div>
      )}
    </DashboardShell>
  );
}
