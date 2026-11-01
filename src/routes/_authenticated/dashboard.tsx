import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { ShieldOff } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { myStoreQuery, useMyStore } from "@/hooks/use-my-store";
import { areaForPath, canOpen } from "@/lib/commerce";

export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: async ({ context }) => {
    const store = await context.queryClient.ensureQueryData(myStoreQuery);
    if (!store) throw redirect({ to: "/onboarding" });
  },
  head: () => ({
    meta: [
      { title: "لوحة التحكم — oranix" },
      { name: "description", content: "إدارة طلبات ومنتجات متجرك على oranix." },
      { property: "og:title", content: "لوحة التحكم — oranix" },
      { property: "og:description", content: "إدارة طلبات ومنتجات متجرك على oranix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { access } = useMyStore();
  const allowed = canOpen(access, areaForPath(path));
  return (
    <DashboardShell>
      {allowed ? (
        <Outlet />
      ) : (
        <div className="mx-auto max-w-md rounded-3xl border bg-card p-8 text-center shadow-card">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
            <ShieldOff className="size-6" strokeWidth={1.6} />
          </span>
          <h1 className="mt-4 text-xl font-medium">هذه الصفحة غير متاحة لك</h1>
          <p className="mt-2 text-sm text-muted-foreground">صاحب المتجر هو من يحدد صلاحيات كل عضو في الفريق.</p>
          <Button asChild className="mt-6">
            <Link to="/dashboard/orders">الذهاب إلى الطلبات</Link>
          </Button>
        </div>
      )}
    </DashboardShell>
  );
}
