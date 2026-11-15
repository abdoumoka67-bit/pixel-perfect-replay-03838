-- ========== web push: order notifications with the app closed ==========
-- Stores the browser PushSubscription of every dashboard device so the
-- `send-order-push` Edge Function can notify the team even when the PWA is not
-- running. Rows belong to one auth user and one store; the service role (used by
-- the Edge Function) reads them across users.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  language text NOT NULL DEFAULT 'ar' CHECK (language IN ('ar', 'en', 'fr')),
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

-- Push endpoints are long URLs, so index their digest instead of the raw text.
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_key
  ON public.push_subscriptions ((md5(endpoint)));

CREATE INDEX IF NOT EXISTS push_subscriptions_store_idx
  ON public.push_subscriptions (store_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Members read own push subscriptions" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Members add own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Members add own push subscriptions" ON public.push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.store_access(store_id) IS NOT NULL);

DROP POLICY IF EXISTS "Members update own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Members update own push subscriptions" ON public.push_subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND public.store_access(store_id) IS NOT NULL);

DROP POLICY IF EXISTS "Members delete own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Members delete own push subscriptions" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

REVOKE ALL ON public.push_subscriptions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

NOTIFY pgrst, 'reload schema';
