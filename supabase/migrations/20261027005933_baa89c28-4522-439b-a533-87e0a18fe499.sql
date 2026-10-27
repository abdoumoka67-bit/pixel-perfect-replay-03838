-- ========== plans: Start / Pro ==========
ALTER TABLE public.plans ADD COLUMN tier text NOT NULL DEFAULT 'start' CHECK (tier IN ('start', 'pro'));
ALTER TABLE public.plans ADD COLUMN is_active boolean NOT NULL DEFAULT true;
UPDATE public.plans SET is_active = false;
INSERT INTO public.plans (id, name, months, price, sort, tier, is_active) VALUES
  ('start', 'Start', 1, 1700, 1, 'start', true),
  ('pro', 'Pro', 1, 3400, 2, 'pro', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, months = EXCLUDED.months, price = EXCLUDED.price,
  sort = EXCLUDED.sort, tier = EXCLUDED.tier, is_active = true;
DELETE FROM public.plans p WHERE NOT p.is_active
  AND NOT EXISTS (SELECT 1 FROM public.payment_receipts r WHERE r.plan_id = p.id);

-- ========== stores: plan tier + pixels ==========
ALTER TABLE public.stores
  ADD COLUMN plan_tier text NOT NULL DEFAULT 'start' CHECK (plan_tier IN ('start', 'pro')),
  ADD COLUMN meta_pixel_id text,
  ADD COLUMN tiktok_pixel_id text;

CREATE OR REPLACE FUNCTION public.stores_before_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.slug := lower(trim(NEW.slug));
  IF NEW.slug !~ '^[a-z0-9]([a-z0-9-]{1,38})[a-z0-9]$' THEN
    RAISE EXCEPTION 'INVALID_SLUG';
  END IF;
  IF length(trim(NEW.name)) < 2 THEN RAISE EXCEPTION 'INVALID_NAME'; END IF;
  IF NEW.default_home_price < 0 OR NEW.default_desk_price < 0 THEN RAISE EXCEPTION 'INVALID_PRICE'; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.trial_ends_at := now() + interval '7 days';
    NEW.paid_until := NULL;
    NEW.plan_tier := 'start';
    NEW.meta_pixel_id := NULL;
    NEW.tiktok_pixel_id := NULL;
    NEW.owner_email := coalesce(auth.jwt() ->> 'email', NEW.owner_email);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

-- ========== products: stock + category ==========
ALTER TABLE public.products
  ADD COLUMN stock int CHECK (stock IS NULL OR stock >= 0),
  ADD COLUMN category text;

CREATE OR REPLACE FUNCTION public.products_before_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.slug := lower(trim(NEW.slug));
  IF NEW.slug !~ '^[a-z0-9]([a-z0-9-]{0,78}[a-z0-9])?$' THEN RAISE EXCEPTION 'INVALID_SLUG'; END IF;
  IF NEW.price < 0 THEN RAISE EXCEPTION 'INVALID_PRICE'; END IF;
  NEW.category := nullif(left(trim(coalesce(NEW.category, '')), 40), '');
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

-- ========== team members ==========
CREATE TYPE public.member_role AS ENUM ('manager', 'agent');

CREATE TABLE public.store_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.member_role NOT NULL DEFAULT 'agent',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, email)
);
CREATE INDEX store_members_email_idx ON public.store_members(email);
GRANT SELECT, DELETE ON public.store_members TO authenticated;
GRANT INSERT (store_id, email, role) ON public.store_members TO authenticated;
GRANT UPDATE (role) ON public.store_members TO authenticated;
GRANT ALL ON public.store_members TO service_role;
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.orders ADD COLUMN assigned_member_id uuid REFERENCES public.store_members(id) ON DELETE SET NULL;
CREATE INDEX orders_assigned_idx ON public.orders(assigned_member_id);

-- ========== access helpers ==========
CREATE OR REPLACE FUNCTION public.store_tier(_store_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN s.paid_until IS NOT NULL AND s.paid_until > now() AND s.paid_until > s.trial_ends_at THEN s.plan_tier
    WHEN s.trial_ends_at > now() THEN 'pro'
    ELSE s.plan_tier
  END
  FROM public.stores s WHERE s.id = _store_id
$$;

CREATE OR REPLACE FUNCTION public.algiers_month_start()
RETURNS timestamptz LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT (date_trunc('month', now() AT TIME ZONE 'Africa/Algiers')) AT TIME ZONE 'Africa/Algiers'
$$;

CREATE OR REPLACE FUNCTION public.store_month_orders(_store_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.orders WHERE store_id = _store_id AND created_at >= public.algiers_month_start()
$$;

CREATE OR REPLACE FUNCTION public.current_verified_email()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT lower(u.email) FROM auth.users u WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.store_access(_store_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.stores WHERE id = _store_id AND owner_id = auth.uid()) THEN 'owner'
    ELSE (
      SELECT m.role::text FROM public.store_members m
      WHERE m.store_id = _store_id AND m.email = public.current_verified_email()
        AND public.store_tier(_store_id) = 'pro'
      LIMIT 1
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.my_member_id(_store_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id FROM public.store_members m
  WHERE m.store_id = _store_id AND m.email = public.current_verified_email() AND public.store_tier(_store_id) = 'pro'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.can_manage_store(_store_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.store_access(_store_id) IN ('owner', 'manager'), false)
$$;

CREATE OR REPLACE FUNCTION public.can_access_order(_store_id uuid, _assigned uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE public.store_access(_store_id)
    WHEN 'owner' THEN true
    WHEN 'manager' THEN true
    WHEN 'agent' THEN _assigned IS NOT NULL AND _assigned = public.my_member_id(_store_id)
    ELSE false
  END
$$;

CREATE OR REPLACE FUNCTION public.my_store_access()
RETURNS TABLE (store_id uuid, access text, member_id uuid, tier text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT x.id, x.access, x.member_id, public.store_tier(x.id) FROM (
    SELECT s.id, 'owner'::text AS access, NULL::uuid AS member_id, 0 AS pri FROM public.stores s WHERE s.owner_id = auth.uid()
    UNION ALL
    SELECT m.store_id, m.role::text, m.id, 1 FROM public.store_members m
    WHERE m.email = public.current_verified_email() AND public.store_tier(m.store_id) = 'pro'
  ) x
  ORDER BY x.pri
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.store_usage(_store_id uuid)
RETURNS TABLE (tier text, month_orders int, order_limit int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE t text;
BEGIN
  IF public.store_access(_store_id) IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  t := public.store_tier(_store_id);
  RETURN QUERY SELECT t, public.store_month_orders(_store_id), CASE WHEN t = 'start' THEN 300 ELSE NULL END;
END; $$;

-- ========== team members rules ==========
CREATE OR REPLACE FUNCTION public.store_members_before_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  IF NEW.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(NEW.email) > 120 THEN RAISE EXCEPTION 'INVALID_EMAIL'; END IF;
  IF TG_OP = 'INSERT' THEN
    PERFORM 1 FROM public.stores WHERE id = NEW.store_id FOR UPDATE;
    IF EXISTS (SELECT 1 FROM public.stores WHERE id = NEW.store_id AND lower(coalesce(owner_email, '')) = NEW.email) THEN
      RAISE EXCEPTION 'MEMBER_IS_OWNER';
    END IF;
    IF (SELECT count(*) FROM public.store_members WHERE store_id = NEW.store_id) >= 4 THEN
      RAISE EXCEPTION 'TEAM_LIMIT';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER store_members_before_write BEFORE INSERT OR UPDATE ON public.store_members
  FOR EACH ROW EXECUTE FUNCTION public.store_members_before_write();

CREATE POLICY "Owner and managers read team" ON public.store_members FOR SELECT TO authenticated
  USING (public.can_manage_store(store_id) OR email = public.current_verified_email());
CREATE POLICY "Owner adds team on Pro" ON public.store_members FOR INSERT TO authenticated
  WITH CHECK (public.owns_store(store_id) AND public.store_tier(store_id) = 'pro' AND public.store_is_active(store_id));
CREATE POLICY "Owner changes roles on Pro" ON public.store_members FOR UPDATE TO authenticated
  USING (public.owns_store(store_id) AND public.store_tier(store_id) = 'pro' AND public.store_is_active(store_id))
  WITH CHECK (public.owns_store(store_id));
CREATE POLICY "Owner removes team" ON public.store_members FOR DELETE TO authenticated
  USING (public.owns_store(store_id));

-- ========== stores / orders / products / call logs: team access ==========
CREATE POLICY "Team reads store" ON public.stores FOR SELECT TO authenticated
  USING (public.store_access(id) IS NOT NULL);

DROP POLICY "Owner reads orders" ON public.orders;
DROP POLICY "Owner updates orders while active" ON public.orders;
DROP POLICY "Owner deletes orders while active" ON public.orders;
CREATE POLICY "Team reads orders" ON public.orders FOR SELECT TO authenticated
  USING (public.can_access_order(store_id, assigned_member_id));
CREATE POLICY "Team updates orders while active" ON public.orders FOR UPDATE TO authenticated
  USING (public.can_access_order(store_id, assigned_member_id) AND public.store_is_active(store_id))
  WITH CHECK (public.can_access_order(store_id, assigned_member_id) AND public.store_is_active(store_id));
CREATE POLICY "Owner and managers delete orders while active" ON public.orders FOR DELETE TO authenticated
  USING (public.can_manage_store(store_id) AND public.store_is_active(store_id));

DROP POLICY "Owner reads products" ON public.products;
DROP POLICY "Owner adds products while active" ON public.products;
DROP POLICY "Owner edits products while active" ON public.products;
DROP POLICY "Owner deletes products while active" ON public.products;
CREATE POLICY "Team reads products" ON public.products FOR SELECT TO authenticated
  USING (public.store_access(store_id) IS NOT NULL);
CREATE POLICY "Owner and managers add products while active" ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_store(store_id) AND public.store_is_active(store_id));
CREATE POLICY "Owner and managers edit products while active" ON public.products FOR UPDATE TO authenticated
  USING (public.can_manage_store(store_id) AND public.store_is_active(store_id))
  WITH CHECK (public.can_manage_store(store_id) AND public.store_is_active(store_id));
CREATE POLICY "Owner and managers delete products while active" ON public.products FOR DELETE TO authenticated
  USING (public.can_manage_store(store_id) AND public.store_is_active(store_id));

DROP POLICY "Owner reads call logs" ON public.call_logs;
DROP POLICY "Owner logs calls while active" ON public.call_logs;
CREATE POLICY "Team reads call logs" ON public.call_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = call_logs.order_id
    AND public.can_access_order(o.store_id, o.assigned_member_id)));
CREATE POLICY "Team logs calls while active" ON public.call_logs FOR INSERT TO authenticated
  WITH CHECK (public.store_is_active(store_id) AND EXISTS (SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND o.store_id = call_logs.store_id AND public.can_access_order(o.store_id, o.assigned_member_id)));

-- ========== activity log ==========
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_logs_store_created_idx ON public.activity_logs(store_id, created_at DESC);
GRANT SELECT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner and managers read activity on Pro" ON public.activity_logs FOR SELECT TO authenticated
  USING (public.can_manage_store(store_id) AND public.store_tier(store_id) = 'pro');

CREATE OR REPLACE FUNCTION public.log_activity(_store_id uuid, _action text, _details jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO public.activity_logs (store_id, actor_id, actor_email, action, details)
  VALUES (_store_id, auth.uid(), auth.jwt() ->> 'email', _action, coalesce(_details, '{}'::jsonb));
END; $$;

CREATE OR REPLACE FUNCTION public.orders_after_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.log_activity(NEW.store_id, 'order.status',
      jsonb_build_object('order_number', NEW.order_number, 'from', OLD.status, 'to', NEW.status));
    IF NEW.product_id IS NOT NULL THEN
      IF NEW.status IN ('cancelled', 'returned') AND OLD.status NOT IN ('cancelled', 'returned') THEN
        UPDATE public.products SET stock = stock + NEW.quantity WHERE id = NEW.product_id AND stock IS NOT NULL;
      ELSIF OLD.status IN ('cancelled', 'returned') AND NEW.status NOT IN ('cancelled', 'returned') THEN
        UPDATE public.products SET stock = greatest(stock - NEW.quantity, 0) WHERE id = NEW.product_id AND stock IS NOT NULL;
      END IF;
    END IF;
  END IF;
  IF NEW.assigned_member_id IS DISTINCT FROM OLD.assigned_member_id THEN
    PERFORM public.log_activity(NEW.store_id, 'order.assigned', jsonb_build_object(
      'order_number', NEW.order_number,
      'email', (SELECT email FROM public.store_members WHERE id = NEW.assigned_member_id)));
  END IF;
  IF NEW.tracking_number IS DISTINCT FROM OLD.tracking_number AND NEW.tracking_number IS NOT NULL THEN
    PERFORM public.log_activity(NEW.store_id, 'order.shipped',
      jsonb_build_object('order_number', NEW.order_number, 'tracking', NEW.tracking_number));
  END IF;
  IF NEW.notes IS DISTINCT FROM OLD.notes THEN
    PERFORM public.log_activity(NEW.store_id, 'order.notes', jsonb_build_object('order_number', NEW.order_number));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER orders_after_update AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_after_update();

CREATE OR REPLACE FUNCTION public.orders_after_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.log_activity(OLD.store_id, 'order.deleted',
    jsonb_build_object('order_number', OLD.order_number, 'customer', OLD.customer_name));
  RETURN OLD;
END; $$;
CREATE TRIGGER orders_after_delete AFTER DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_after_delete();

CREATE OR REPLACE FUNCTION public.call_logs_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE num bigint;
BEGIN
  UPDATE public.orders SET
    call_attempts = call_attempts + 1,
    last_call_outcome = NEW.outcome,
    status = CASE WHEN NEW.outcome = 'confirmed' AND status = 'new' THEN 'confirmed'::public.order_status ELSE status END,
    updated_at = now()
  WHERE id = NEW.order_id
  RETURNING order_number INTO num;
  PERFORM public.log_activity(NEW.store_id, 'call.logged', jsonb_build_object('order_number', num, 'outcome', NEW.outcome));
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.products_after_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity(NEW.store_id, 'product.created', jsonb_build_object('name', NEW.name));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(NEW) - 'stock' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'stock' - 'updated_at') THEN
      PERFORM public.log_activity(NEW.store_id, 'product.updated', jsonb_build_object('name', NEW.name));
    END IF;
    RETURN NEW;
  ELSE
    PERFORM public.log_activity(OLD.store_id, 'product.deleted', jsonb_build_object('name', OLD.name));
    RETURN OLD;
  END IF;
END; $$;
CREATE TRIGGER products_after_write AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_after_write();

CREATE OR REPLACE FUNCTION public.store_members_after_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity(NEW.store_id, 'member.added', jsonb_build_object('email', NEW.email, 'role', NEW.role));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      PERFORM public.log_activity(NEW.store_id, 'member.role', jsonb_build_object('email', NEW.email, 'role', NEW.role));
    END IF;
    RETURN NEW;
  ELSE
    IF EXISTS (SELECT 1 FROM public.stores WHERE id = OLD.store_id) THEN
      PERFORM public.log_activity(OLD.store_id, 'member.removed', jsonb_build_object('email', OLD.email));
    END IF;
    RETURN OLD;
  END IF;
END; $$;
CREATE TRIGGER store_members_after_write AFTER INSERT OR UPDATE OR DELETE ON public.store_members
  FOR EACH ROW EXECUTE FUNCTION public.store_members_after_write();

-- ========== order assignment ==========
CREATE OR REPLACE FUNCTION public.assign_order(_order_id uuid, _member_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders%ROWTYPE;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND OR NOT public.can_manage_store(o.store_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF NOT public.store_is_active(o.store_id) THEN RAISE EXCEPTION 'READ_ONLY'; END IF;
  IF public.store_tier(o.store_id) <> 'pro' THEN RAISE EXCEPTION 'PRO_REQUIRED'; END IF;
  IF _member_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.store_members WHERE id = _member_id AND store_id = o.store_id) THEN
    RAISE EXCEPTION 'INVALID_MEMBER';
  END IF;
  UPDATE public.orders SET assigned_member_id = _member_id WHERE id = _order_id;
END; $$;

-- ========== pixels (Pro, owner only) ==========
CREATE OR REPLACE FUNCTION public.set_store_pixels(_store_id uuid, _meta text, _tiktok text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  m text := nullif(regexp_replace(coalesce(_meta, ''), '\s', '', 'g'), '');
  t text := nullif(upper(regexp_replace(coalesce(_tiktok, ''), '\s', '', 'g')), '');
BEGIN
  IF NOT public.owns_store(_store_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF NOT public.store_is_active(_store_id) THEN RAISE EXCEPTION 'READ_ONLY'; END IF;
  IF public.store_tier(_store_id) <> 'pro' THEN RAISE EXCEPTION 'PRO_REQUIRED'; END IF;
  IF m IS NOT NULL AND m !~ '^[0-9]{10,20}$' THEN RAISE EXCEPTION 'INVALID_META_PIXEL'; END IF;
  IF t IS NOT NULL AND t !~ '^[A-Z0-9]{10,30}$' THEN RAISE EXCEPTION 'INVALID_TIKTOK_PIXEL'; END IF;
  UPDATE public.stores SET meta_pixel_id = m, tiktok_pixel_id = t WHERE id = _store_id;
  PERFORM public.log_activity(_store_id, 'store.pixels', '{}'::jsonb);
END; $$;

-- ========== analytics (Pro only) ==========
CREATE OR REPLACE FUNCTION public.store_analytics(_store_id uuid, _days int DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d int := least(greatest(coalesce(_days, 30), 7), 90);
  today timestamp := date_trunc('day', now() AT TIME ZONE 'Africa/Algiers');
  since timestamptz;
  result jsonb;
BEGIN
  IF NOT public.can_manage_store(_store_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF public.store_tier(_store_id) <> 'pro' THEN RAISE EXCEPTION 'PRO_REQUIRED'; END IF;
  since := (today - make_interval(days => d - 1)) AT TIME ZONE 'Africa/Algiers';
  WITH o AS (SELECT * FROM public.orders WHERE store_id = _store_id AND created_at >= since)
  SELECT jsonb_build_object(
    'days', d,
    'total', (SELECT count(*) FROM o),
    'delivered_revenue', (SELECT coalesce(sum(total), 0) FROM o WHERE status = 'delivered'),
    'statuses', (SELECT coalesce(jsonb_object_agg(x.status::text, x.c), '{}'::jsonb)
                 FROM (SELECT status, count(*) AS c FROM o GROUP BY status) x),
    'daily', (SELECT jsonb_agg(jsonb_build_object('day', to_char(g.day, 'YYYY-MM-DD'), 'orders', coalesce(x.c, 0), 'revenue', coalesce(x.r, 0)) ORDER BY g.day)
              FROM generate_series(today - make_interval(days => d - 1), today, interval '1 day') AS g(day)
              LEFT JOIN (SELECT date_trunc('day', created_at AT TIME ZONE 'Africa/Algiers') AS dd, count(*) AS c,
                           coalesce(sum(total) FILTER (WHERE status NOT IN ('cancelled', 'returned')), 0) AS r
                         FROM o GROUP BY 1) x ON x.dd = g.day),
    'wilayas', (SELECT coalesce(jsonb_agg(jsonb_build_object('name', w.wilaya_name, 'count', w.c) ORDER BY w.c DESC), '[]'::jsonb)
                FROM (SELECT wilaya_name, count(*) AS c FROM o GROUP BY wilaya_name ORDER BY c DESC LIMIT 8) w),
    'products', (SELECT coalesce(jsonb_agg(jsonb_build_object('name', p.product_name, 'orders', p.c, 'qty', p.q,
                   'delivered', p.dlv, 'revenue', p.rev) ORDER BY p.rev DESC, p.c DESC), '[]'::jsonb)
                 FROM (SELECT product_name, count(*) AS c, sum(quantity) AS q,
                         count(*) FILTER (WHERE status = 'delivered') AS dlv,
                         coalesce(sum(subtotal) FILTER (WHERE status = 'delivered'), 0) AS rev
                       FROM o GROUP BY product_name ORDER BY rev DESC, c DESC LIMIT 8) p)
  ) INTO result;
  RETURN result;
END; $$;

-- ========== public store + order placement ==========
DROP FUNCTION public.get_public_store(text);
CREATE FUNCTION public.get_public_store(_slug text)
RETURNS TABLE (id uuid, name text, slug text, logo_url text, whatsapp text, default_home_price int, default_desk_price int,
  accepting_orders boolean, meta_pixel_id text, tiktok_pixel_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.name, s.slug, s.logo_url, s.whatsapp, s.default_home_price, s.default_desk_price,
    public.store_is_active(s.id) AND (public.store_tier(s.id) = 'pro' OR public.store_month_orders(s.id) < 300),
    CASE WHEN public.store_tier(s.id) = 'pro' THEN s.meta_pixel_id END,
    CASE WHEN public.store_tier(s.id) = 'pro' THEN s.tiktok_pixel_id END
  FROM public.stores s WHERE s.slug = lower(_slug)
$$;

CREATE OR REPLACE FUNCTION public.place_order(
  _product_id uuid, _quantity int, _customer_name text, _phone text,
  _wilaya_code int, _wilaya_name text, _commune text, _address text,
  _delivery_type public.delivery_type, _size text DEFAULT NULL, _color text DEFAULT NULL
) RETURNS TABLE (order_number bigint, total int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.products%ROWTYPE;
  s public.stores%ROWTYPE;
  r public.delivery_rates%ROWTYPE;
  ship int;
  sub int;
  clean_phone text;
  new_number bigint;
BEGIN
  SELECT * INTO p FROM public.products WHERE id = _product_id AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  SELECT * INTO s FROM public.stores WHERE id = p.store_id FOR UPDATE;
  IF NOT public.store_is_active(s.id) THEN RAISE EXCEPTION 'STORE_INACTIVE'; END IF;
  IF public.store_tier(s.id) = 'start' AND public.store_month_orders(s.id) >= 300 THEN RAISE EXCEPTION 'ORDER_LIMIT'; END IF;

  clean_phone := regexp_replace(coalesce(_phone, ''), '[^0-9]', '', 'g');
  IF clean_phone !~ '^0[567][0-9]{8}$' THEN RAISE EXCEPTION 'INVALID_PHONE'; END IF;
  IF length(trim(coalesce(_customer_name, ''))) < 3 OR length(_customer_name) > 80 THEN RAISE EXCEPTION 'INVALID_NAME'; END IF;
  IF _quantity IS NULL OR _quantity < 1 OR _quantity > 20 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
  IF p.stock IS NOT NULL AND p.stock < _quantity THEN RAISE EXCEPTION 'OUT_OF_STOCK'; END IF;
  IF _wilaya_code IS NULL OR _wilaya_code < 1 OR _wilaya_code > 58 THEN RAISE EXCEPTION 'INVALID_WILAYA'; END IF;
  IF length(trim(coalesce(_commune, ''))) < 2 OR length(_commune) > 80 THEN RAISE EXCEPTION 'INVALID_COMMUNE'; END IF;
  IF cardinality(p.sizes) > 0 AND (_size IS NULL OR NOT (_size = ANY(p.sizes))) THEN RAISE EXCEPTION 'INVALID_SIZE'; END IF;
  IF cardinality(p.colors) > 0 AND (_color IS NULL OR NOT (_color = ANY(p.colors))) THEN RAISE EXCEPTION 'INVALID_COLOR'; END IF;

  IF EXISTS (SELECT 1 FROM public.orders o WHERE o.phone = clean_phone AND o.product_id = p.id AND o.created_at > now() - interval '2 minutes') THEN
    RAISE EXCEPTION 'DUPLICATE_ORDER';
  END IF;

  SELECT * INTO r FROM public.delivery_rates WHERE store_id = s.id AND wilaya_code = _wilaya_code;
  IF FOUND THEN
    ship := CASE WHEN _delivery_type = 'home' THEN r.home_price ELSE r.desk_price END;
    IF ship IS NULL THEN RAISE EXCEPTION 'DELIVERY_UNAVAILABLE'; END IF;
  ELSE
    ship := CASE WHEN _delivery_type = 'home' THEN s.default_home_price ELSE s.default_desk_price END;
  END IF;

  sub := p.price * _quantity;

  INSERT INTO public.orders (store_id, product_id, product_name, product_image, variant_size, variant_color,
    unit_price, quantity, subtotal, shipping_price, total, customer_name, phone, wilaya_code, wilaya_name,
    commune, address, delivery_type)
  VALUES (s.id, p.id, p.name, p.images[1], CASE WHEN cardinality(p.sizes) > 0 THEN _size END, CASE WHEN cardinality(p.colors) > 0 THEN _color END,
    p.price, _quantity, sub, ship, sub + ship, trim(_customer_name), clean_phone, _wilaya_code, left(coalesce(_wilaya_name, ''), 60),
    trim(_commune), nullif(left(trim(coalesce(_address, '')), 200), ''), _delivery_type)
  RETURNING orders.order_number INTO new_number;

  IF p.stock IS NOT NULL THEN
    UPDATE public.products SET stock = stock - _quantity WHERE id = p.id;
  END IF;

  RETURN QUERY SELECT new_number, sub + ship;
END; $$;

-- ========== billing: plan tier on approval ==========
CREATE OR REPLACE FUNCTION public.payment_receipts_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pl public.plans%ROWTYPE;
BEGIN
  SELECT * INTO pl FROM public.plans WHERE id = NEW.plan_id;
  IF NOT FOUND OR NOT pl.is_active THEN RAISE EXCEPTION 'INVALID_PLAN'; END IF;
  IF length(trim(NEW.transaction_ref)) < 3 THEN RAISE EXCEPTION 'INVALID_REFERENCE'; END IF;
  NEW.amount := pl.price;
  NEW.months := pl.months;
  NEW.status := 'pending';
  NEW.reject_reason := NULL;
  NEW.reviewed_at := NULL;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.approve_receipt(_receipt_id uuid)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rc public.payment_receipts%ROWTYPE; s public.stores%ROWTYPE; base timestamptz; new_until timestamptz; t text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO rc FROM public.payment_receipts WHERE id = _receipt_id FOR UPDATE;
  IF NOT FOUND OR rc.status <> 'pending' THEN RAISE EXCEPTION 'NOT_PENDING'; END IF;
  SELECT * INTO s FROM public.stores WHERE id = rc.store_id FOR UPDATE;
  SELECT tier INTO t FROM public.plans WHERE id = rc.plan_id;
  base := greatest(now(), s.trial_ends_at, coalesce(s.paid_until, now()));
  new_until := base + make_interval(months => rc.months);
  UPDATE public.stores SET paid_until = new_until, plan_tier = coalesce(t, 'start') WHERE id = s.id;
  UPDATE public.payment_receipts SET status = 'approved', reviewed_at = now() WHERE id = rc.id;
  RETURN new_until;
END; $$;

-- ========== function permissions ==========
REVOKE EXECUTE ON FUNCTION public.algiers_month_start() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.store_month_orders(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_activity(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.orders_after_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.orders_after_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.products_after_write() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.store_members_before_write() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.store_members_after_write() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.store_tier(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.store_tier(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.current_verified_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_verified_email() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.store_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.store_access(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.my_member_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_member_id(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.can_manage_store(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_store(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.can_access_order(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_order(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.my_store_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_store_access() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.store_usage(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.store_usage(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_order(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_order(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.set_store_pixels(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_store_pixels(uuid, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.store_analytics(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.store_analytics(uuid, int) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_public_store(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_store(text) TO anon, authenticated;