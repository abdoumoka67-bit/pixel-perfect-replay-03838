-- First-touch ad attribution stored with every order (UTMs + Meta/TikTok/Google click ids).
-- Without it "which ad brought this order" can never be answered after the fact.

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
BEGIN
  SELECT * INTO p FROM public.products WHERE id = _product_id AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  SELECT * INTO s FROM public.stores WHERE id = p.store_id FOR UPDATE;
  IF NOT public.store_is_active(s.id) THEN RAISE EXCEPTION 'STORE_INACTIVE'; END IF;
  IF public.store_tier(s.id) = 'start' AND public.store_month_orders(s.id) >= 300 THEN
    RAISE EXCEPTION 'ORDER_LIMIT';
  END IF;

  clean_phone := public.normalize_dz_phone(_phone);
  IF clean_phone !~ '^0[567][0-9]{8}$' THEN RAISE EXCEPTION 'INVALID_PHONE'; END IF;
  IF length(trim(coalesce(_customer_name, ''))) < 3 OR length(_customer_name) > 80 THEN
    RAISE EXCEPTION 'INVALID_NAME';
  END IF;
  IF _quantity IS NULL OR _quantity < 1 OR _quantity > 20 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
  IF p.stock IS NOT NULL AND p.stock < _quantity THEN RAISE EXCEPTION 'OUT_OF_STOCK'; END IF;
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

  IF EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.phone = clean_phone AND o.product_id = p.id AND o.created_at > now() - interval '2 minutes'
  ) THEN
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
