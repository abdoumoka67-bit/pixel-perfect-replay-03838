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
                       FROM o GROUP BY product_name ORDER BY rev DESC, c DESC LIMIT 8) p),
    'sources', (SELECT coalesce(jsonb_agg(jsonb_build_object('name', src.name, 'count', src.c) ORDER BY src.c DESC), '[]'::jsonb)
                FROM (
                  SELECT
                    CASE
                      WHEN lower(coalesce(attribution ->> 'source', '')) LIKE '%facebook%' OR lower(coalesce(attribution ->> 'source', '')) LIKE '%fb%' THEN 'Facebook'
                      WHEN lower(coalesce(attribution ->> 'source', '')) LIKE '%instagram%' OR lower(coalesce(attribution ->> 'source', '')) LIKE '%ig%' THEN 'Instagram'
                      WHEN lower(coalesce(attribution ->> 'source', '')) LIKE '%tiktok%' THEN 'TikTok'
                      WHEN attribution ->> 'source' IS NOT NULL AND trim(attribution ->> 'source') <> '' THEN attribution ->> 'source'
                      ELSE 'direct'
                    END AS name,
                    count(*) AS c
                  FROM o
                  GROUP BY 1
                ) src)
  ) INTO result;
  RETURN result;
END; $$;
