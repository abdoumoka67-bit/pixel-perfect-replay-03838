import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const AUTH_RETURN_TIMEOUT_MS = 4000;
const AUTH_RETURN_POLL_MS = 250;

/** True when Supabase is still expected to turn the URL into a session. */
function hasPendingAuthParams() {
  const hash = window.location.hash;
  const search = window.location.search;
  // A failed exchange is not worth waiting for; /auth explains it instead.
  if (hash.includes("error") || search.includes("error")) return false;
  return hash.includes("access_token") || search.includes("code=");
}

async function currentUser() {
  // Reads the stored session first: it answers from local storage without a
  // network round trip, so opening the dashboard feels instant.
  const { data } = await supabase.auth.getSession();
  return data?.session?.user ?? null;
}

/**
 * Supabase restores an OAuth session in the background. A mobile browser that
 * reloads straight into /dashboard can run this guard before the exchange has
 * finished, which used to bounce a freshly signed-in merchant back to /auth.
 * When the URL carries auth params we give the client a short window to land.
 */
async function resolveUser() {
  const user = await currentUser();
  if (user) return user;
  if (!hasPendingAuthParams()) return null;

  const deadline = Date.now() + AUTH_RETURN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, AUTH_RETURN_POLL_MS));
    const restored = await currentUser();
    if (restored) return restored;
  }
  return null;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const user = await resolveUser();
    if (!user) {
      throw redirect({ to: "/auth", search: { redirect: location.pathname } });
    }
    return { user };
  },
  component: () => <Outlet />,
});
