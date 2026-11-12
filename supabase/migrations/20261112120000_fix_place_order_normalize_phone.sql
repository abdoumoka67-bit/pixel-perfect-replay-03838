-- ========== checkout: make placing an order work again ==========
-- Root cause: public.place_order() called public.normalize_dz_phone(), but that
-- helper was missing from the live project. Every submit died with
--   42883 function public.normalize_dz_phone(text) does not exist
-- before the INSERT, and the storefront only showed "حدث خطأ، حاول مرة أخرى.".
--
-- This migration is idempotent. It:
--   1. recreates the missing helper (also used by other functions),
--   2. inlines normalisation inside place_order so checkout no longer depends
--      on a second function being deployed,
--   3. makes submit idempotent: an order created in the last 2 minutes is
--      returned instead of raising DUPLICATE_ORDER (safe on retry / double tap),
--   4. serialises concurrent submits per phone+product with an advisory lock,
--   5. realigns the orders.order_number identity sequence when it lagged behind
--      (that used to fail as duplicate key orders_order_number_key).

-- ---------- helpers (defensive / idempotent) ----------
CREATE OR REPLACE FUNCTION public.normalize_dz_phone(_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  WITH digits AS (
    SELECT regexp_replace(
      translate(
        coalesce(_phone, ''),
        '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹',
        '01234567890123456789'
      ),
      '[^0-9]',
      '',
      'g'
    ) AS value
  )
  SELECT CASE
    WHEN value LIKE '00213%' THEN '0' || substr(value, 6)
    WHEN value LIKE '213%'   THEN '0' || substr(value, 4)
    WHEN value LIKE '0%'     THEN value
    WHEN length(value) = 9 AND value ~ '^[567]' THEN '0' || value
    ELSE value
  END
  FROM digits;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_dz_phone(text) TO anon, authenticated;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS attribution jsonb;

-- Defensive cleaner: only known keys, strings only, trimmed and length-capped.
CREATE OR REPLACE FUNCTION public.clean_attribution(_raw jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _raw IS NULL OR jsonb_typeof(_raw) <> 'object' THEN NULL
    ELSE jsonb_strip_nulls(jsonb_build_object(
      'source',   nullif(left(coalesce(_raw ->> 'source', '')::text, 120), ''),
      'medium',   nullif(left(coalesce(_raw ->> 'medium', '')::text, 120), ''),
      'campaign', nullif(left(coalesce(_raw ->> 'campaign', '')::text, 120), ''),
      'content',  nullif(left(coalesce(_raw ->> 'content', '')::text, 120), ''),
      'term',     nullif(left(coalesce(_raw ->> 'term', '')::text, 120), ''),
      'fbclid',   nullif(left(coalesce(_raw ->> 'fbclid', '')::text, 180), ''),
      'ttclid',   nullif(left(coalesce(_raw ->> 'ttclid', '')::text, 180), ''),
      'gclid',    nullif(left(coalesce(_raw ->> 'gclid', '')::text, 180), ''),
      'referrer', nullif(left(coalesce(_raw ->> 'referrer', '')::text, 240), ''),
      'landing',  nullif(left(coalesce(_raw ->> 'landing', '')::text, 240), '')
    ))
  END
$$;

-- ---------- order number sequence ----------
DO $$
DECLARE
  seq_name text := pg_get_serial_sequence('public.orders', 'order_number');
  seq_last bigint;
  max_number bigint;
BEGIN
  IF seq_name IS NULL THEN
    RETURN;
  END IF;
  SELECT max(order_number) INTO max_number FROM public.orders;
  EXECUTE format('SELECT last_value FROM %s', seq_name) INTO seq_last;
  IF COALESCE(max_number, 0) > COALESCE(seq_last, 0) THEN
    EXECUTE format('SELECT setval(%L, %s, true)', seq_name, max_number);
  END IF;
END $$;

-- ---------- place_order ----------
DROP FUNCTION IF EXISTS public.place_order(
  uuid, int, text, text, int, text, text, text, public.delivery_type, text, text
);

CREATE OR REPLACE FUNCTION public.place_order(
  _product_id uuid, _quantity int, _customer_name text, _phone text,
  _wilaya_code int, _wilaya_name text, _commune text, _address text,
  _delivery_type public.delivery_type, _size text DEFAULT NULL, _color text DEFAULT NULL,
  _attribution jsonb DEFAULT NULL
) RETURNS TABLE (order_number bigint, total int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.products%ROWTYPE;
  s public.stores%ROWTYPE;
  r public.delivery_rates%ROWTYPE;
  ship int;
  sub int;
  clean_phone text;
  new_number bigint;
  existing public.orders%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.products WHERE id = _product_id AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  SELECT * INTO s FROM public.stores WHERE id = p.store_id FOR UPDATE;
  IF NOT public.store_is_active(s.id) THEN RAISE EXCEPTION 'STORE_INACTIVE'; END IF;
  IF public.store_tier(s.id) = 'start' AND public.store_month_orders(s.id) >= 300 THEN
    RAISE EXCEPTION 'ORDER_LIMIT';
  END IF;

  -- Inlined normalisation: do not depend on any other function being deployed.
  clean_phone := regexp_replace(
    translate(
      coalesce(_phone, ''),
      '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹',
      '01234567890123456789'
    ),
    '[^0-9]',
    '',
    'g'
  );
  IF clean_phone LIKE '00213%' THEN
    clean_phone := '0' || substr(clean_phone, 6);
  ELSIF clean_phone LIKE '213%' THEN
    clean_phone := '0' || substr(clean_phone, 4);
  ELSIF length(clean_phone) = 9 AND clean_phone ~ '^[567]' THEN
    clean_phone := '0' || clean_phone;
  END IF;

  IF clean_phone !~ '^0[567][0-9]{8}$' THEN RAISE EXCEPTION 'INVALID_PHONE'; END IF;
  IF length(trim(coalesce(_customer_name, ''))) < 3 OR length(_customer_name) > 80 THEN
    RAISE EXCEPTION 'INVALID_NAME';
  END IF;
  IF _quantity IS NULL OR _quantity < 1 OR _quantity > 20 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
  IF _wilaya_code IS NULL OR _wilaya_code < 1 OR _wilaya_code > 58 THEN RAISE EXCEPTION 'INVALID_WILAYA'; END IF;
  IF length(trim(coalesce(_commune, ''))) < 2 OR length(_commune) > 80 THEN
    RAISE EXCEPTION 'INVALID_COMMUNE';
  END IF;
  IF cardinality(p.sizes) > 0 AND (_size IS NULL OR NOT (_size = ANY(p.sizes))) THEN
    RAISE EXCEPTION 'INVALID_SIZE';
  END IF;
  IF cardinality(p.colors) > 0 AND (_color IS NULL OR NOT (_color = ANY(p.colors))) THEN
    RAISE EXCEPTION 'INVALID_COLOR';
  END IF;

  -- One submit at a time per customer+product: a double tap or a retry after a
  -- network timeout must not create (or fail because of) a second order.
  PERFORM pg_advisory_xact_lock(hashtextextended(clean_phone || ':' || p.id::text, 0));

  SELECT * INTO existing FROM public.orders o
  WHERE o.phone = clean_phone
    AND o.product_id = p.id
    AND o.created_at > now() - interval '2 minutes'
  ORDER BY o.created_at DESC
  LIMIT 1;
  IF FOUND THEN
    RETURN QUERY SELECT existing.order_number, existing.total;
    RETURN;
  END IF;

  IF p.stock IS NOT NULL AND p.stock < _quantity THEN RAISE EXCEPTION 'OUT_OF_STOCK'; END IF;

  SELECT * INTO r FROM public.delivery_rates WHERE store_id = s.id AND wilaya_code = _wilaya_code;
  IF FOUND THEN
    ship := CASE WHEN _delivery_type = 'home' THEN r.home_price ELSE r.desk_price END;
    IF ship IS NULL THEN RAISE EXCEPTION 'DELIVERY_UNAVAILABLE'; END IF;
  ELSE
    ship := CASE WHEN _delivery_type = 'home' THEN s.default_home_price ELSE s.default_desk_price END;
  END IF;

  sub := p.price * _quantity;

  INSERT INTO public.orders (
    store_id, product_id, product_name, product_image, variant_size, variant_color,
    unit_price, quantity, subtotal, shipping_price, total, customer_name, phone,
    wilaya_code, wilaya_name, commune, address, delivery_type, attribution
  )
  VALUES (
    s.id, p.id, p.name, p.images[1],
    CASE WHEN cardinality(p.sizes) > 0 THEN _size END,
    CASE WHEN cardinality(p.colors) > 0 THEN _color END,
    p.price, _quantity, sub, ship, sub + ship, trim(_customer_name), clean_phone,
    _wilaya_code, left(coalesce(_wilaya_name, ''), 60), trim(_commune),
    nullif(left(trim(coalesce(_address, '')), 200), ''), _delivery_type,
    public.clean_attribution(_attribution)
  )
  RETURNING orders.order_number INTO new_number;

  IF p.stock IS NOT NULL THEN
    UPDATE public.products SET stock = stock - _quantity WHERE id = p.id;
  END IF;

  RETURN QUERY SELECT new_number, sub + ship;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_order(
  uuid, int, text, text, int, text, text, text, public.delivery_type, text, text, jsonb
) TO anon, authenticated;

-- Make the new signatures visible to PostgREST immediately.
NOTIFY pgrst, 'reload schema';
