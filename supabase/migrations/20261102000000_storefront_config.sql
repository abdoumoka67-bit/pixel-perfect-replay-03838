-- ========== storefront_config column and get_public_store update ==========
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS storefront_config jsonb NOT NULL DEFAULT '{}'::jsonb;

GRANT UPDATE (storefront_config) ON public.stores TO authenticated;

DROP FUNCTION IF EXISTS public.get_public_store(text);

CREATE OR REPLACE FUNCTION public.get_public_store(_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  logo_url text,
  whatsapp text,
  default_home_price int,
  default_desk_price int,
  accepting_orders boolean,
  meta_pixel_id text,
  tiktok_pixel_id text,
  storefront_config jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    s.id,
    s.name,
    s.slug,
    s.logo_url,
    s.whatsapp,
    s.default_home_price,
    s.default_desk_price,
    public.store_is_active(s.id) AND (public.store_tier(s.id) = 'pro' OR public.store_month_orders(s.id) < 300),
    CASE WHEN public.store_tier(s.id) = 'pro' THEN s.meta_pixel_id END,
    CASE WHEN public.store_tier(s.id) = 'pro' THEN s.tiktok_pixel_id END,
    s.storefront_config
  FROM public.stores s
  WHERE s.slug = lower(_slug)
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_store(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_store(text) TO anon, authenticated;

