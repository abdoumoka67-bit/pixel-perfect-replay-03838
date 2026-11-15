import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bell, ShieldOff, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { myStoreQuery, useMyStore } from "@/hooks/use-my-store";
import { useSignedUrls } from "@/hooks/use-signed-urls";
import { areaForPath, canOpen, formatDZD } from "@/lib/commerce";
import {
  orderNotificationPermission,
  requestOrderNotificationPermission,
  showOrderNotification,
  subscribeOrderPush,
} from "@/lib/order-notifications";
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

// One shared context per tab: browsers cap the number of live AudioContexts,
// so creating a new one for every order would eventually silence the chime.
let orderAudioCtx: AudioContext | null = null;

function getOrderAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  orderAudioCtx ??= new AudioCtor();
  return orderAudioCtx;
}

function playOrderChime() {
  try {
    const ctx = getOrderAudioCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
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

function NotificationsOptIn() {
  const t = useTr();
  const language = useUiLanguage();
  const { store } = useMyStore();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(orderNotificationPermission);
  // Rendered only after mount so the server and the first client paint agree.
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(window.localStorage.getItem("oranix:notifications-prompt") === "dismissed");
    } catch {
      setHidden(false);
    }
  }, []);

  if (hidden || permission !== "default") return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem("oranix:notifications-prompt", "dismissed");
    } catch {
      // Private mode blocks storage; the banner simply comes back next time.
    }
    setHidden(true);
  };

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <Bell className="size-4 shrink-0 text-brand" />
        <span className="font-medium">{t("إشعارات الطلبات")}</span>
        <span className="truncate text-muted-foreground">{t("فعّل الإشعارات لتصلك الطلبات الجديدة على هاتفك.")}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          onClick={async () => {
            const result = await requestOrderNotificationPermission();
            setPermission(result);
            if (result === "granted") {
              toast.success(t("تم تفعيل الإشعارات"));
              if (store?.id) void subscribeOrderPush(store.id, language);
            }
            if (result === "denied") toast.error(t("الإشعارات محظورة من إعدادات المتصفح."));
          }}
        >
          {t("تفعيل")}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={dismiss}>
          {t("لاحقًا")}
        </Button>
      </div>
    </div>
  );
}

function DashboardLayout() {
  const t = useTr();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const language = useUiLanguage();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { access, isAdmin, store } = useMyStore();
  const signedLogos = useSignedUrls([store?.logo_url]);
  const logoUrl = store?.logo_url ? signedLogos[store.logo_url] : undefined;

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
          const amount = formatDZD(Number(newOrder.total ?? 0), language);

          // The in-app toast is invisible while the PWA sits in the background,
          // so mirror it as a system notification with the store logo.
          if (typeof document !== "undefined" && document.visibilityState === "hidden") {
            void showOrderNotification({
              title: `${t("طلب جديد")} ${num}`.trim(),
              body: `${name} · ${amount}`,
              icon: logoUrl,
              tag: newOrder.order_number ? `order-${newOrder.order_number}` : undefined,
              url: "/dashboard/orders",
            });
          }

          toast.success(`${t("طلب جديد")} ${num}: ${name} (${amount})`, {
            icon: <ShoppingBag className="size-5 text-brand" />,
            duration: 8000,
            action: {
              label: t("عرض الطلبات"),
              onClick: () => {
                navigate({ to: "/dashboard/orders" });
              },
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [store?.id, qc, t, language, navigate, logoUrl]);

  // Keep this device registered for background pushes (app closed) whenever the
  // permission is already granted — e.g. after a reinstall or a store switch.
  useEffect(() => {
    if (!store?.id || orderNotificationPermission() !== "granted") return;
    void subscribeOrderPush(store.id, language);
  }, [store?.id, language]);

  // Platform admins can open every dashboard area, including the Pro ones.
  const allowed = isAdmin || canOpen(access, areaForPath(path));
  return (
    <DashboardShell>
      <NotificationsOptIn />
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
