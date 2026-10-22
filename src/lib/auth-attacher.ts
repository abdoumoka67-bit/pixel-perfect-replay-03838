import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

// Client-side function middleware: forwards the signed-in user's access token
// to server functions so requireSupabaseAuth can verify it.
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  if (typeof window === "undefined") return next();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});
