import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { ShieldOff } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { myStoreQuery, useMyStore } from "@/hooks/use-my-store";
import { areaForPath, canOpen } from "@/lib/commerce";
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

function DashboardLayout() {
  const t = useTr();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { access, isAdmin } = useMyStore();
  // Platform admins can open every dashboard area, including the Pro ones.
  const allowed = isAdmin || canOpen(access, areaForPath(path));
  return (
    <DashboardShell>
      {allowed ? (
        <Outlet />
      ) : (
        <div className="mx-auto max-w-md rounded-3xl border bg-card p-8 text-center shadow-card">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent-orange-soft text-accent-orange">
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
