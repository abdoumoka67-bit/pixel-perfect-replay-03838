import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AlertTriangle, LogOut, Menu, ShieldCheck, ExternalLink, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAIN_NAV, SETTINGS_NAV, type NavItem } from "./nav";
import { isAdminQuery, useMyStore } from "@/hooks/use-my-store";

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

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data: isAdmin } = useQuery(isAdminQuery);
  const isActive = (to: string) => (to === "/dashboard" ? path === "/dashboard" || path === "/dashboard/" : path.startsWith(to));

  const renderItem = (item: NavItem) => {
    const active = isActive(item.to);
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={onNavigate}
        className={cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
        )}
      >
        <item.icon className={cn("size-[18px]", active ? "text-sidebar-primary" : "")} />
        <span>{item.label}</span>
        {active && <span className="ms-auto size-1.5 rounded-full bg-sidebar-primary" />}
      </Link>
    );
  };

  return (
    <nav className="space-y-7">
      <div>
        <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-sidebar-muted/80">لوحة التحكم</p>
        <div className="space-y-1">{MAIN_NAV.map(renderItem)}</div>
      </div>
      <div>
        <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-sidebar-muted/80">الإعدادات والاشتراك</p>
        <div className="space-y-1">{SETTINGS_NAV.map(renderItem)}</div>
      </div>
      {isAdmin && (
        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-sidebar-muted/80">المنصة</p>
          <Link
            to="/admin"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          >
            <ShieldCheck className="size-[18px]" /> لوحة الإدارة
          </Link>
        </div>
      )}
    </nav>
  );
}

function MerchantCard() {
  const { store } = useMyStore();
  const signOut = useSignOut();
  const initials = (store?.name ?? "؟").trim().slice(0, 1);
  return (
    <div className="rounded-2xl bg-sidebar-accent/70 p-3">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-brand font-display font-bold text-brand-foreground">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">{store?.name}</p>
          <p className="truncate text-xs text-sidebar-muted" dir="ltr">{store?.owner_email}</p>
        </div>
        <button
          onClick={signOut}
          className="rounded-lg p-2 text-sidebar-muted transition-colors hover:bg-sidebar hover:text-sidebar-foreground"
          aria-label="تسجيل الخروج"
          title="تسجيل الخروج"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { store } = useMyStore();
  return (
    <div className="flex h-full flex-col gap-6 bg-sidebar p-4 text-sidebar-foreground">
      <div className="flex items-center justify-between px-2 pt-2">
        <Logo tone="light" />
      </div>
      {store && (
        <a
          href={`/m/${store.slug}`}
          target="_blank"
          rel="noreferrer"
          className="mx-1 flex items-center justify-between rounded-xl border border-sidebar-border px-3 py-2 text-xs text-sidebar-muted hover:text-sidebar-foreground"
        >
          <span className="truncate" dir="ltr">/m/{store.slug}</span>
          <ExternalLink className="size-3.5 shrink-0" />
        </a>
      )}
      <div className="flex-1 overflow-y-auto">
        <NavLinks onNavigate={onNavigate} />
      </div>
      <MerchantCard />
    </div>
  );
}

const BOTTOM_NAV = [MAIN_NAV[0], MAIN_NAV[1], MAIN_NAV[2], MAIN_NAV[3]];

function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-safe backdrop-blur md:hidden">
      <div className="grid grid-cols-4">
        {BOTTOM_NAV.map((item) => {
          const active = item.to === "/dashboard" ? path === "/dashboard" || path === "/dashboard/" : path.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 pt-2.5 text-[11px] font-medium",
                active ? "text-brand" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.label.replace("إدارة ", "")}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function SubscriptionBanner() {
  const { sub } = useMyStore();
  if (!sub) return null;
  if (!sub.isActive) {
    return (
      <div className="flex flex-wrap items-center gap-3 border-b border-destructive/20 bg-danger-soft px-4 py-3 text-sm text-danger md:px-8">
        <Lock className="size-4 shrink-0" />
        <span className="flex-1">
          انتهت فترة اشتراكك. حسابك الآن في <b>وضع القراءة فقط</b> وصفحاتك متوقفة عن استقبال الطلبات.
        </span>
        <Button asChild size="sm" variant="destructive">
          <Link to="/dashboard/billing">جدّد الاشتراك</Link>
        </Button>
      </div>
    );
  }
  if (sub.showWarning) {
    return (
      <div className="flex flex-wrap items-center gap-3 border-b border-warning/20 bg-warning-soft px-4 py-3 text-sm text-warning md:px-8">
        <AlertTriangle className="size-4 shrink-0" />
        <span className="flex-1">
          {sub.isTrial ? "تنتهي تجربتك المجانية" : "ينتهي اشتراكك"} خلال {sub.daysLeft === 1 ? "يوم واحد" : `${sub.daysLeft} أيام`}.
        </span>
        <Button asChild size="sm" variant="brand">
          <Link to="/dashboard/billing">تجديد الاشتراك</Link>
        </Button>
      </div>
    );
  }
  return null;
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 md:block">
        <SidebarBody />
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-72 border-0 bg-sidebar p-0 [&>button]:text-sidebar-foreground">
          <SheetTitle className="sr-only">القائمة</SheetTitle>
          <SidebarBody onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="md:ps-64">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card/90 px-4 backdrop-blur md:hidden">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-secondary" aria-label="فتح القائمة">
            <Menu className="size-5" />
          </button>
          <Logo />
          <span className="w-9" />
        </header>
        <SubscriptionBanner />
        <main className="mx-auto max-w-[1400px] px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-8">{children}</main>
      </div>
      <BottomNav />
    </div>
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
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
