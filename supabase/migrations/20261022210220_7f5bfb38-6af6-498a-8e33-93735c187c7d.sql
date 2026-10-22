-- trigger functions: never callable via API
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.stores_before_write() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.products_before_write() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delivery_rates_validate() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.orders_before_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.call_logs_after_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.payment_receipts_before_insert() FROM PUBLIC, anon, authenticated;

-- policy helpers: signed-in only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.owns_store(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_store(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.store_is_active(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.store_is_active(uuid) TO authenticated;

-- admin actions: signed-in only (admin check inside)
REVOKE EXECUTE ON FUNCTION public.approve_receipt(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_receipt(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.reject_receipt(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_receipt(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.order_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.order_stats(uuid) TO authenticated;

-- intentionally public: storefront lookup + COD order placement
REVOKE EXECUTE ON FUNCTION public.get_public_store(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_store(text) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.place_order(uuid, int, text, text, int, text, text, text, public.delivery_type, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, int, text, text, int, text, text, text, public.delivery_type, text, text) TO anon, authenticated;