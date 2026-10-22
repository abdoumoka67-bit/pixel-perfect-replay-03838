import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { myStoreQuery } from "@/hooks/use-my-store";

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
  component: () => (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  ),
});
