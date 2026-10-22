-- ========== helpers ==========
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ========== roles ==========
CREATE TYPE public.app_role AS ENUM ('admin', 'merchant');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ========== stores ==========
CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE,
  owner_email text,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  phone text,
  whatsapp text,
  logo_url text,
  origin_wilaya_code int NOT NULL DEFAULT 16,
  default_home_price int NOT NULL DEFAULT 700,
  default_desk_price int NOT NULL DEFAULT 450,
  trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  paid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.stores TO authenticated;
GRANT UPDATE (name, slug, phone, whatsapp, logo_url, origin_wilaya_code, default_home_price, default_desk_price, updated_at) ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads store" ON public.stores FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner creates store" ON public.stores FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner updates store" ON public.stores FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

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
    NEW.owner_email := coalesce(auth.jwt() ->> 'email', NEW.owner_email);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;
CREATE TRIGGER stores_before_write BEFORE INSERT OR UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.stores_before_write();

CREATE OR REPLACE FUNCTION public.store_is_active(_store_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT now() < greatest(trial_ends_at, coalesce(paid_until, trial_ends_at)) FROM public.stores WHERE id = _store_id), false)
$$;

CREATE OR REPLACE FUNCTION public.owns_store(_store_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.stores WHERE id = _store_id AND owner_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.get_public_store(_slug text)
RETURNS TABLE (id uuid, name text, slug text, logo_url text, whatsapp text, default_home_price int, default_desk_price int, accepting_orders boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.name, s.slug, s.logo_url, s.whatsapp, s.default_home_price, s.default_desk_price, public.store_is_active(s.id)
  FROM public.stores s WHERE s.slug = lower(_slug)
$$;
GRANT EXECUTE ON FUNCTION public.get_public_store(text) TO anon, authenticated;

-- ========== products ==========
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text NOT NULL DEFAULT '',
  price int NOT NULL,
  compare_at_price int,
  images text[] NOT NULL DEFAULT '{}',
  features text[] NOT NULL DEFAULT '{}',
  sizes text[] NOT NULL DEFAULT '{}',
  colors text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, slug)
);
CREATE INDEX products_store_idx ON public.products(store_id);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads active products" ON public.products FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Owner reads products" ON public.products FOR SELECT TO authenticated USING (public.owns_store(store_id));
CREATE POLICY "Owner adds products while active" ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.owns_store(store_id) AND public.store_is_active(store_id));
CREATE POLICY "Owner edits products while active" ON public.products FOR UPDATE TO authenticated
  USING (public.owns_store(store_id) AND public.store_is_active(store_id))
  WITH CHECK (public.owns_store(store_id) AND public.store_is_active(store_id));
CREATE POLICY "Owner deletes products while active" ON public.products FOR DELETE TO authenticated
  USING (public.owns_store(store_id) AND public.store_is_active(store_id));

CREATE OR REPLACE FUNCTION public.products_before_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.slug := lower(trim(NEW.slug));
  IF NEW.slug !~ '^[a-z0-9]([a-z0-9-]{0,78}[a-z0-9])?$' THEN RAISE EXCEPTION 'INVALID_SLUG'; END IF;
  IF NEW.price < 0 THEN RAISE EXCEPTION 'INVALID_PRICE'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;
CREATE TRIGGER products_before_write BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_before_write();

-- ========== delivery rates ==========
CREATE TABLE public.delivery_rates (
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  wilaya_code int NOT NULL,
  home_price int,
  desk_price int,
  PRIMARY KEY (store_id, wilaya_code)
);
GRANT SELECT ON public.delivery_rates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_rates TO authenticated;
GRANT ALL ON public.delivery_rates TO service_role;
ALTER TABLE public.delivery_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads rates" ON public.delivery_rates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owner inserts rates" ON public.delivery_rates FOR INSERT TO authenticated
  WITH CHECK (public.owns_store(store_id) AND public.store_is_active(store_id));
CREATE POLICY "Owner updates rates" ON public.delivery_rates FOR UPDATE TO authenticated
  USING (public.owns_store(store_id) AND public.store_is_active(store_id))
  WITH CHECK (public.owns_store(store_id) AND public.store_is_active(store_id));
CREATE POLICY "Owner deletes rates" ON public.delivery_rates FOR DELETE TO authenticated
  USING (public.owns_store(store_id) AND public.store_is_active(store_id));

CREATE OR REPLACE FUNCTION public.delivery_rates_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.wilaya_code < 1 OR NEW.wilaya_code > 58 THEN RAISE EXCEPTION 'INVALID_WILAYA'; END IF;
  IF coalesce(NEW.home_price, 0) < 0 OR coalesce(NEW.desk_price, 0) < 0 THEN RAISE EXCEPTION 'INVALID_PRICE'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER delivery_rates_validate BEFORE INSERT OR UPDATE ON public.delivery_rates
  FOR EACH ROW EXECUTE FUNCTION public.delivery_rates_validate();

-- ========== orders ==========
CREATE TYPE public.order_status AS ENUM ('new', 'confirmed', 'shipping', 'delivered', 'cancelled', 'returned');
CREATE TYPE public.delivery_type AS ENUM ('home', 'desk');
CREATE TYPE public.call_outcome AS ENUM ('no_answer_1', 'no_answer_2', 'busy_callback', 'confirmed');

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number bigint GENERATED ALWAYS AS IDENTITY (START WITH 1001) UNIQUE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_image text,
  variant_size text,
  variant_color text,
  unit_price int NOT NULL,
  quantity int NOT NULL,
  subtotal int NOT NULL,
  shipping_price int NOT NULL,
  total int NOT NULL,
  customer_name text NOT NULL,
  phone text NOT NULL,
  wilaya_code int NOT NULL,
  wilaya_name text NOT NULL,
  commune text NOT NULL,
  address text,
  delivery_type public.delivery_type NOT NULL,
  status public.order_status NOT NULL DEFAULT 'new',
  payment_status text NOT NULL DEFAULT 'unpaid',
  call_attempts int NOT NULL DEFAULT 0,
  last_call_outcome public.call_outcome,
  tracking_number text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_store_created_idx ON public.orders(store_id, created_at DESC);
GRANT SELECT, DELETE ON public.orders TO authenticated;
GRANT UPDATE (status, payment_status, notes, tracking_number, address, updated_at) ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads orders" ON public.orders FOR SELECT TO authenticated USING (public.owns_store(store_id));
CREATE POLICY "Owner updates orders while active" ON public.orders FOR UPDATE TO authenticated
  USING (public.owns_store(store_id) AND public.store_is_active(store_id))
  WITH CHECK (public.owns_store(store_id) AND public.store_is_active(store_id));
CREATE POLICY "Owner deletes orders while active" ON public.orders FOR DELETE TO authenticated
  USING (public.owns_store(store_id) AND public.store_is_active(store_id));

CREATE OR REPLACE FUNCTION public.orders_before_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.payment_status NOT IN ('unpaid', 'paid') THEN RAISE EXCEPTION 'INVALID_PAYMENT_STATUS'; END IF;
  IF NEW.status = 'delivered' AND OLD.status <> 'delivered' THEN NEW.payment_status := 'paid'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;
CREATE TRIGGER orders_before_update BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_before_update();

CREATE OR REPLACE FUNCTION public.order_stats(_store_id uuid)
RETURNS TABLE (status public.order_status, orders_count bigint, orders_total bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT o.status, count(*), coalesce(sum(o.total), 0) FROM public.orders o WHERE o.store_id = _store_id GROUP BY o.status
$$;
GRANT EXECUTE ON FUNCTION public.order_stats(uuid) TO authenticated;

-- Public COD order placement (validated, prices recomputed server-side)
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
  SELECT * INTO p FROM public.products WHERE id = _product_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  SELECT * INTO s FROM public.stores WHERE id = p.store_id;
  IF NOT public.store_is_active(s.id) THEN RAISE EXCEPTION 'STORE_INACTIVE'; END IF;

  clean_phone := regexp_replace(coalesce(_phone, ''), '[^0-9]', '', 'g');
  IF clean_phone !~ '^0[567][0-9]{8}$' THEN RAISE EXCEPTION 'INVALID_PHONE'; END IF;
  IF length(trim(coalesce(_customer_name, ''))) < 3 OR length(_customer_name) > 80 THEN RAISE EXCEPTION 'INVALID_NAME'; END IF;
  IF _quantity IS NULL OR _quantity < 1 OR _quantity > 20 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
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

  RETURN QUERY SELECT new_number, sub + ship;
END; $$;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, int, text, text, int, text, text, text, public.delivery_type, text, text) TO anon, authenticated;

-- ========== call logs ==========
CREATE TABLE public.call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  outcome public.call_outcome NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX call_logs_order_idx ON public.call_logs(order_id);
GRANT SELECT, INSERT ON public.call_logs TO authenticated;
GRANT ALL ON public.call_logs TO service_role;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads call logs" ON public.call_logs FOR SELECT TO authenticated USING (public.owns_store(store_id));
CREATE POLICY "Owner logs calls while active" ON public.call_logs FOR INSERT TO authenticated
  WITH CHECK (public.owns_store(store_id) AND public.store_is_active(store_id)
    AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.store_id = call_logs.store_id));

CREATE OR REPLACE FUNCTION public.call_logs_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.orders SET
    call_attempts = call_attempts + 1,
    last_call_outcome = NEW.outcome,
    status = CASE WHEN NEW.outcome = 'confirmed' AND status = 'new' THEN 'confirmed'::public.order_status ELSE status END,
    updated_at = now()
  WHERE id = NEW.order_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER call_logs_after_insert AFTER INSERT ON public.call_logs
  FOR EACH ROW EXECUTE FUNCTION public.call_logs_after_insert();

-- ========== plans & platform settings ==========
CREATE TABLE public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  months int NOT NULL,
  price int NOT NULL,
  sort int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT UPDATE (name, price) ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads plans" ON public.plans FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins edit plans" ON public.plans FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.plans (id, name, months, price, sort) VALUES
  ('m1', 'شهر واحد', 1, 2500, 1),
  ('m3', '3 أشهر', 3, 6900, 2),
  ('m6', '6 أشهر', 6, 12900, 3),
  ('m12', 'سنة كاملة', 12, 23900, 4);

CREATE TABLE public.platform_settings (
  id int PRIMARY KEY DEFAULT 1,
  ccp_number text NOT NULL DEFAULT '',
  ccp_key text NOT NULL DEFAULT '',
  ccp_holder text NOT NULL DEFAULT '',
  rip text NOT NULL DEFAULT '',
  support_phone text NOT NULL DEFAULT '',
  CONSTRAINT single_row CHECK (id = 1)
);
GRANT SELECT ON public.platform_settings TO authenticated;
GRANT UPDATE (ccp_number, ccp_key, ccp_holder, rip, support_phone) ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read payment info" ON public.platform_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins edit payment info" ON public.platform_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.platform_settings (id, ccp_number, ccp_key, ccp_holder, rip, support_phone)
VALUES (1, '0000000000', '00', 'ORANIX', '00799999000000000000', '0550000000');

-- ========== payment receipts ==========
CREATE TABLE public.payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.plans(id),
  amount int NOT NULL DEFAULT 0,
  months int NOT NULL DEFAULT 0,
  transaction_ref text NOT NULL,
  receipt_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reject_reason text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.payment_receipts TO authenticated;
GRANT ALL ON public.payment_receipts TO service_role;
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or admin reads receipts" ON public.payment_receipts FOR SELECT TO authenticated
  USING (public.owns_store(store_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner submits receipts" ON public.payment_receipts FOR INSERT TO authenticated
  WITH CHECK (public.owns_store(store_id));

CREATE OR REPLACE FUNCTION public.payment_receipts_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pl public.plans%ROWTYPE;
BEGIN
  SELECT * INTO pl FROM public.plans WHERE id = NEW.plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_PLAN'; END IF;
  IF length(trim(NEW.transaction_ref)) < 3 THEN RAISE EXCEPTION 'INVALID_REFERENCE'; END IF;
  NEW.amount := pl.price;
  NEW.months := pl.months;
  NEW.status := 'pending';
  NEW.reject_reason := NULL;
  NEW.reviewed_at := NULL;
  RETURN NEW;
END; $$;
CREATE TRIGGER payment_receipts_before_insert BEFORE INSERT ON public.payment_receipts
  FOR EACH ROW EXECUTE FUNCTION public.payment_receipts_before_insert();

CREATE OR REPLACE FUNCTION public.approve_receipt(_receipt_id uuid)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rc public.payment_receipts%ROWTYPE; s public.stores%ROWTYPE; base timestamptz; new_until timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO rc FROM public.payment_receipts WHERE id = _receipt_id FOR UPDATE;
  IF NOT FOUND OR rc.status <> 'pending' THEN RAISE EXCEPTION 'NOT_PENDING'; END IF;
  SELECT * INTO s FROM public.stores WHERE id = rc.store_id FOR UPDATE;
  base := greatest(now(), s.trial_ends_at, coalesce(s.paid_until, now()));
  new_until := base + make_interval(months => rc.months);
  UPDATE public.stores SET paid_until = new_until WHERE id = s.id;
  UPDATE public.payment_receipts SET status = 'approved', reviewed_at = now() WHERE id = rc.id;
  RETURN new_until;
END; $$;
GRANT EXECUTE ON FUNCTION public.approve_receipt(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_receipt(_receipt_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF length(trim(coalesce(_reason, ''))) < 3 THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
  UPDATE public.payment_receipts SET status = 'rejected', reject_reason = trim(_reason), reviewed_at = now()
  WHERE id = _receipt_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_PENDING'; END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.reject_receipt(uuid, text) TO authenticated;

-- ========== yalidine credentials ==========
CREATE TABLE public.yalidine_credentials (
  store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  api_id text NOT NULL,
  api_token text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.yalidine_credentials TO authenticated;
GRANT ALL ON public.yalidine_credentials TO service_role;
ALTER TABLE public.yalidine_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages yalidine" ON public.yalidine_credentials FOR ALL TO authenticated
  USING (public.owns_store(store_id)) WITH CHECK (public.owns_store(store_id));
CREATE TRIGGER yalidine_touch BEFORE UPDATE ON public.yalidine_credentials
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- tracking number can be set by the yalidine flow (owner, while active) — covered by orders update grant.

-- ========== storage policies ==========
CREATE POLICY "Merchants upload product images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Merchants update product images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Merchants delete product images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Anyone views product images" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');
CREATE POLICY "Merchants upload receipts" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owner or admin views receipts" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));