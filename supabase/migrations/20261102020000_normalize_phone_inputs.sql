-- Normalize international Algerian numbers before validation and storage.
CREATE OR REPLACE FUNCTION public.normalize_dz_phone(_phone text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH digits AS (
    SELECT regexp_replace(coalesce(_phone, ''), '[^0-9]', '', 'g') AS value
  )
  SELECT CASE
    WHEN value LIKE '003213%' THEN '0' || right(value, length(value) - 5)
    WHEN value LIKE '00213%' THEN '0' || right(value, length(value) - 4)
    WHEN value LIKE '213%' THEN '0' || right(value, length(value) - 3)
    WHEN value LIKE '0%' THEN value
    WHEN length(value) = 9 AND value ~ '^[567]' THEN '0' || value
    ELSE value
  END
  FROM digits;
$$;

CREATE OR REPLACE FUNCTION public.place_order(
  _product_id uuid, _quantity int, _customer_name text, _phone text,
  _wilaya_code int, _wilaya_name text, _commune text, _address text,
  _delivery_type public.delivery_type, _size text DEFAULT NULL, _color text DEFAULT NULL
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
  SELECT * INTO p FROM public.products WHERE id = _product_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  SELECT * INTO s FROM public.stores WHERE id = p.store_id;
  IF NOT public.store_is_active(s.id) THEN RAISE EXCEPTION 'STORE_INACTIVE'; END IF;

  clean_phone := public.normalize_dz_phone(_phone);
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

GRANT EXECUTE ON FUNCTION public.normalize_dz_phone(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, int, text, text, int, text, text, text, public.delivery_type, text, text) TO anon, authenticated;
