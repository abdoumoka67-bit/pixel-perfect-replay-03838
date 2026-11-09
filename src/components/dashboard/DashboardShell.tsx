import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  LogOut,
  Menu,
  ShieldCheck,
  ExternalLink,
  Lock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import {
  useDocumentLanguage,
  LanguageMenu,
  useDashboardLanguage,
} from "@/components/LanguageSwitcher";
import { parseStorefrontConfig } from "@/lib/storefront-theme";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAIN_NAV, SETTINGS_NAV, type NavItem } from "./nav";
import { isAdminQuery, useMyStore } from "@/hooks/use-my-store";
import { getFeaturePlanBadge, MEMBER_ROLE_LABELS, PRO_AREAS, canOpen } from "@/lib/commerce";
import { tr, UiLanguageProvider, useTr, useUiLanguage } from "@/lib/ui-i18n";
import { ProPill } from "./ProLock";
import { GuidedTour } from "./GuidedTour";

function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}

type Tone = "dark" | "light";

const TONES = {
  dark: {
    body: "bg-sidebar text-sidebar-foreground",
    item: "rounded-xl px-3 py-2.5 text-sm",
    active: "bg-sidebar-accent text-sidebar-accent-foreground",
    idle: "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
    label: "text-sidebar-muted/80",
    group: "space-y-7",
    divider: "",
    card: "bg-sidebar-accent/70",
    name: "text-sidebar-foreground",
    sub: "text-sidebar-muted",
    link: "border-sidebar-border text-sidebar-muted hover:text-sidebar-foreground",
  },
  light: {
    body: "bg-background text-foreground",
    item: "rounded-2xl px-4 py-3.5 text-[15px]",
    active: "bg-card text-foreground shadow-card font-medium",
    idle: "text-foreground/80 hover:bg-card/70",
    label: "text-muted-foreground",
    group: "space-y-4",
    divider: "border-t pt-4",
    card: "bg-card shadow-card",
    name: "text-foreground",
    sub: "text-muted-foreground",
    link: "border-border bg-card text-muted-foreground hover:text-foreground",
  },
} as const;

function PlanBadge({ plan }: { plan: "Start" | "Pro" }) {
  const isPro = plan === "Pro";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
        isPro ? "bg-brand-soft text-brand" : "border border-current/30 text-muted-foreground",
      )}
    >
      {plan}
    </span>
  );
}

function NavLinks({ onNavigate, tone = "dark" }: { onNavigate?: (() => void) | undefined; tone?: Tone }) {
  const styles = TONES[tone];
  const t = useTr();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data: isAdmin } = useQuery(isAdminQuery);
  const { store, access, isPro } = useMyStore();
  const visible = (items: NavItem[]) => items.filter((i) => canOpen(access, i.area));
  const stats = useQuery({
    queryKey: ["order-stats", store?.id],
    enabled: !!store,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("order_stats", { _store_id: store!.id });
      if (error) throw error;
      return data;
    },
  });
  const newOrders = Number(stats.data?.find((r) => r.status === "new")?.orders_count ?? 0);
  const isActive = (to: string) => (to === "/dashboard" ? path === "/dashboard" || path === "/dashboard/" : path.startsWith(to));

  const renderItem = (item: NavItem) => {
    const active = isActive(item.to);
    const plan = getFeaturePlanBadge(item.area);
    const customIds: Partial<Record<NavItem["to"], string>> = {
      "/dashboard": "tour-overview",
      "/dashboard/orders": "tour-orders",
      "/dashboard/products": "tour-products",
      "/dashboard/analytics": "tour-analytics",
      "/dashboard/delivery": "tour-delivery",
      "/dashboard/settings": "tour-preview",
    };
    const customId = customIds[item.to];

    return (
      <Link
        key={item.to}
        id={customId}
        to={item.to}
        onClick={onNavigate}
        className={cn(
          "group flex items-center gap-3 transition-colors",
          styles.item,
          active ? styles.active : styles.idle,
        )}
      >
        <item.icon className="size-[19px]" strokeWidth={1.6} />
        <span>{t(item.label)}</span>
        <span className="ms-auto flex items-center gap-2">
          {item.to === "/dashboard/orders" && newOrders > 0 && (
            <span className="flex min-w-5 items-center justify-center rounded-full bg-notify px-1.5 text-[10px] font-medium text-primary-foreground num">
              {newOrders}
            </span>
          )}
          {!isPro && PRO_AREAS.includes(item.area) && <ProPill className="hidden sm:inline-flex" />}
          {plan && <PlanBadge plan={plan} />}
        </span>
      </Link>
    );
  };

  return (
    <nav className={styles.group}>
      <div>
        <p className={cn("mb-2 px-3 text-[11px] font-medium tracking-wider", styles.label)}>{t("لوحة التحكم")}</p>
        <div className="space-y-1">{visible(MAIN_NAV).map(renderItem)}</div>
      </div>
      {visible(SETTINGS_NAV).length > 0 && (
        <div className={styles.divider}>
          <p className={cn("mb-2 px-3 text-[11px] font-medium tracking-wider", styles.label)}>{t("الإعدادات والاشتراك")}</p>
          <div className="space-y-1">{visible(SETTINGS_NAV).map(renderItem)}</div>
        </div>
      )}
      {isAdmin && (
        <div className={styles.divider}>
          <p className={cn("mb-2 px-3 text-[11px] font-medium tracking-wider", styles.label)}>{t("المنصة")}</p>
          <Link
            to="/admin"
            onClick={onNavigate}
            className={cn("flex items-center gap-3", styles.item, styles.idle)}
          >
            <ShieldCheck className="size-[19px]" strokeWidth={1.6} /> {t("لوحة الإدارة")}
          </Link>
          <Link
            to="/onboarding"
            onClick={onNavigate}
            className={cn("flex items-center gap-3", styles.item, styles.idle)}
          >
            <ShieldCheck className="size-[19px]" strokeWidth={1.6} /> {t("مراجعة مراحل إنشاء المتجر")}
          </Link>
        </div>
      )}
    </nav>
  );
}

function MerchantCard({ tone = "dark" }: { tone?: Tone }) {
  const styles = TONES[tone];
  const t = useTr();
  const { store, access } = useMyStore();
  const signOut = useSignOut();
  const initials = (store?.name ?? t("؟")).trim().slice(0, 1);
  return (
    <div className={cn("rounded-2xl p-3", styles.card)}>
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-display font-medium text-primary-foreground">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm font-medium", styles.name)}>{store?.name}</p>
          {access === "owner" ? (
            <p className={cn("truncate text-xs", styles.sub)} dir="ltr">{store?.owner_email}</p>
          ) : (
            <p className={cn("truncate text-xs", styles.sub)}>{t(MEMBER_ROLE_LABELS[access])}</p>
          )}
        </div>
        <button
          onClick={signOut}
          className={cn("rounded-lg p-2 transition-colors hover:bg-secondary/20", styles.sub)}
          aria-label={t("تسجيل الخروج")}
          title={t("تسجيل الخروج")}
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
}

function SidebarBody({ onNavigate, tone = "dark" }: { onNavigate?: (() => void) | undefined; tone?: Tone }) {
  const { store } = useMyStore();
  const language = useUiLanguage();
  const { setLanguage } = useDashboardLanguage(language);
  const styles = TONES[tone];
  return (
    <div className={cn("flex h-full flex-col gap-6 p-4", styles.body)}>
      <div className="flex items-center justify-between gap-2 px-2 pt-2">
        <Logo tone={tone === "dark" ? "light" : "dark"} />
        <LanguageMenu
          value={language}
          onChange={setLanguage}
          className={tone === "dark" ? "border-sidebar-border bg-sidebar-accent/70 text-sidebar-foreground hover:bg-sidebar-accent" : undefined}
        />
      </div>
      {store && (
        <a
          id="tour-preview"
          href={`/m/${store.slug}`}
          target="_blank"
          rel="noreferrer"
          className={cn("mx-1 flex items-center justify-between rounded-xl border px-3 py-2 text-xs", styles.link)}
        >
          <span className="truncate" dir="ltr">/m/{store.slug}</span>
          <ExternalLink className="size-3.5 shrink-0" />
        </a>
      )}
      <div className="flex-1 overflow-y-auto">
        <NavLinks onNavigate={onNavigate} tone={tone} />
      </div>
      <MerchantCard tone={tone} />
    </div>
  );
}

const TOUR_TARGETS: Partial<Record<NavItem["to"], string>> = {
  "/dashboard": "tour-overview",
  "/dashboard/orders": "tour-orders",
  "/dashboard/products": "tour-products",
  "/dashboard/analytics": "tour-analytics",
};

function BottomNav() {
  const t = useTr();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { access } = useMyStore();
  const BOTTOM_NAV = MAIN_NAV.filter((i) => canOpen(access, i.area)).slice(0, 4);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-safe backdrop-blur lg:hidden">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${BOTTOM_NAV.length}, minmax(0, 1fr))` }}>
        {BOTTOM_NAV.map((item) => {
          const active = item.to === "/dashboard" ? path === "/dashboard" || path === "/dashboard/" : path.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              data-tour={TOUR_TARGETS[item.to]}
              className={cn(
                "flex min-w-0 flex-col items-center gap-1 pt-2.5 text-[11px] font-medium",
                active ? "text-brand" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
              {t(item.label)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function SubscriptionBanner() {
  const t = useTr();
  const { sub } = useMyStore();
  if (!sub) return null;
  if (sub.isGracePeriod) {
    return (
      <div className="flex flex-wrap items-center gap-3 border-b border-destructive/20 bg-danger-soft px-4 py-3 text-sm text-danger md:px-8">
        <Lock className="size-4 shrink-0" />
        <span className="flex-1">{t("متجرك مقفل مؤقتاً. اختر باقة لتفعيله وحماية بياناتك قبل الحذف النهائي.")}</span>
        <Button asChild size="sm" variant="destructive">
          <Link to="/dashboard/billing">{t("تفعيل الاشتراك")}</Link>
        </Button>
      </div>
    );
  }
  if (!sub.isActive) {
    return (
      <div className="flex flex-wrap items-center gap-3 border-b border-destructive/20 bg-danger-soft px-4 py-3 text-sm text-danger md:px-8">
        <Lock className="size-4 shrink-0" />
        <span className="flex-1">
          {t("انتهت فترة اشتراكك. حسابك الآن في وضع القراءة فقط وصفحاتك متوقفة عن استقبال الطلبات.")}
        </span>
        <Button asChild size="sm" variant="destructive">
          <Link to="/dashboard/billing">{t("جدّد الاشتراك")}</Link>
        </Button>
      </div>
    );
  }
  if (sub.showWarning) {
    const period = sub.daysLeft === 1 ? t("يوم واحد") : t("{n} أيام", { n: sub.daysLeft });
    return (
      <div className="flex flex-wrap items-center gap-3 border-b border-warning/20 bg-warning-soft px-4 py-3 text-sm text-warning md:px-8">
        <AlertTriangle className="size-4 shrink-0" />
        <span className="flex-1">
          {sub.isTrial
            ? t("تنبيه: تنتهي تجربتك المجانية بعد {period}. اختر باقتك الآن للاستمرار.", { period })
            : t("تنبيه: ينتهي اشتراكك بعد {period}. اختر باقتك الآن للاستمرار.", { period })}
        </span>
        <Button asChild size="sm" variant="brand">
          <Link to="/dashboard/billing">{t("تجديد الاشتراك")}</Link>
        </Button>
      </div>
    );
  }
  return null;
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const lastPath = useRef(path);
  const [hasPreviousDashboardPage, setHasPreviousDashboardPage] = useState(false);
  const { store, sub } = useMyStore();
  // The dashboard has its own language choice; the store language is only the initial default.
  const storeLanguage = parseStorefrontConfig(store?.storefront_config, store?.name ?? "").language;
  const { language, setLanguage } = useDashboardLanguage(storeLanguage);
  const isRtl = language === "ar";
  useDocumentLanguage(language);
  const t = (text: string, vars?: Record<string, string | number>) => tr(language, text, vars);
  const trialLink = useMemo(() =>
    sub && sub.isTrial && sub.daysLeft > 0
      ? t("تجربة Pro مجانية · بقي {n} أيام", { n: sub.daysLeft })
      : t("تجربة Pro مجانية"),
  [sub, language]);

  useEffect(() => {
    if (lastPath.current === path) return;
    setHasPreviousDashboardPage(
      lastPath.current === "/dashboard" || lastPath.current.startsWith("/dashboard/"),
    );
    lastPath.current = path;
  }, [path]);

  const goBack = () => {
    if (hasPreviousDashboardPage && router.history.canGoBack()) {
      router.history.back();
      return;
    }
    if (path === "/dashboard" || path === "/dashboard/") {
      navigate({ to: "/" });
      return;
    }
    navigate({ to: "/dashboard" });
  };

  return (
    <UiLanguageProvider language={language}>
    <div className="min-h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
      <GuidedTour />
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 lg:block">
        <SidebarBody />
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side={isRtl ? "right" : "left"} className="w-[82vw] max-w-sm border-0 bg-background p-0">
          <SheetTitle className="sr-only">{t("القائمة")}</SheetTitle>
          <SidebarBody tone="light" onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="overflow-x-clip lg:ps-64">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card/90 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-secondary" aria-label={t("فتح القائمة")}>
            <Menu className="size-5" />
          </button>
          <Logo />
          <LanguageMenu value={language} onChange={setLanguage} />
        </header>

        {store && sub && sub.isTrial && sub.daysLeft <= 2 && (
          <div className="border-b border-brand/20 bg-brand-soft px-4 py-3 text-sm text-brand md:px-8">
            <div className="mx-auto flex max-w-[1400px] items-center gap-2">
              <span className="inline-flex size-2 rounded-full bg-brand" />
              <span>
                {t("تنبيه: تنتهي تجربتك المجانية بعد {period}. اختر باقتك الآن للاستمرار.", {
                  period: sub.daysLeft === 1 ? t("يوم واحد") : t("{n} أيام", { n: sub.daysLeft }),
                })}
              </span>
            </div>
          </div>
        )}

        {sub?.isTrial && (
          <div className="border-b bg-card/95 px-4 py-2 md:px-8">
            <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-end gap-2 sm:gap-3">
              <Link
                to="/dashboard/billing"
                className="inline-flex max-w-full items-center rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground shadow-sm"
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span className="inline-flex size-2 shrink-0 rounded-full bg-brand" />
                  <span className="truncate">{trialLink}</span>
                </span>
              </Link>
            </div>
          </div>
        )}

        <SubscriptionBanner />
        <main className="mx-auto max-w-[1400px] px-4 pb-28 pt-6 md:px-8 md:pt-8 lg:pb-12">
          <div className="mb-4">
            <Button type="button" variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="size-4 rtl:rotate-180" />
              {t("السابق")}
            </Button>
          </div>
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
    </UiLanguageProvider>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-medium md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
