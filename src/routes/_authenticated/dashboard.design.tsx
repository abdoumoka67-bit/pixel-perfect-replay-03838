import { createFileRoute } from "@tanstack/react-router";
import { StorefrontThemeSettings } from "@/components/dashboard/StorefrontThemeSettings";
import { useMyStore } from "@/hooks/use-my-store";

export const Route = createFileRoute("/_authenticated/dashboard/design")({
  component: DesignPage,
});

function DesignPage() {
  const { store, readOnly } = useMyStore();
  const { user } = Route.useRouteContext();

  return <StorefrontThemeSettings store={store} readOnly={readOnly} userId={user?.id ?? ""} />;
}
