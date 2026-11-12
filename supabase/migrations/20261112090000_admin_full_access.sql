-- ========== platform admin: lifetime, unrestricted access ==========
-- A platform admin (user_roles.role = 'admin') has no trial, no order limit and
-- no read-only mode. The same applies to any store owned by an admin account.
-- The four helpers below are used by every RLS policy on stores, products,
-- orders, call logs, delivery settings, team members and analytics, so updating
-- them is enough to unlock the whole dashboard for that account.

-- 1. Store activity: admins and admin-owned stores never expire.
CREATE OR REPLACE FUNCTION public.store_is_active(_store_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(
    -- the signed-in user is a platform admin
    public.has_role(auth.uid(), 'admin')
    -- or the store belongs to a platform admin
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.stores s ON s.owner_id = ur.user_id
      WHERE s.id = _store_id AND ur.role = 'admin'
    )
    -- regular accounts follow the trial / paid subscription window
    OR (SELECT now() < greatest(trial_ends_at, coalesce(paid_until, trial_ends_at)) FROM public.stores WHERE id = _store_id),
    false
  )
$$;

-- 2. Plan tier: admins always get Pro, which also lifts the monthly order cap
--    (store_usage only limits the 'start' tier).
CREATE OR REPLACE FUNCTION public.store_tier(_store_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.has_role(auth.uid(), 'admin') THEN 'pro'
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.stores s ON s.owner_id = ur.user_id
      WHERE s.id = _store_id AND ur.role = 'admin'
    ) THEN 'pro'
    WHEN s.paid_until IS NOT NULL AND s.paid_until > now() AND s.paid_until > s.trial_ends_at THEN s.plan_tier
    WHEN s.trial_ends_at > now() THEN 'pro'
    ELSE s.plan_tier
  END
  FROM public.stores s WHERE s.id = _store_id
$$;

-- 3. Ownership: an admin passes owner checks on any store.
CREATE OR REPLACE FUNCTION public.owns_store(_store_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.stores WHERE id = _store_id AND owner_id = auth.uid())
$$;

-- 4. Management: an admin can manage any store, even without a team membership.
CREATE OR REPLACE FUNCTION public.can_manage_store(_store_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
    OR coalesce(public.store_access(_store_id) IN ('owner', 'manager'), false)
$$;
