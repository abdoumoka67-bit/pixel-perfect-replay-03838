import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Read the stored session first: it answers from local storage without a
    // network round trip, so opening the dashboard feels instant.
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) {
      throw redirect({ to: "/auth", search: { redirect: location.pathname } });
    }
    return { user };
  },
  component: () => <Outlet />,
});
