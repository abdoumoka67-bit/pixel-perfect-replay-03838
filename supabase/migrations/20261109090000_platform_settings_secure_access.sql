-- ============================================================
-- Security hardening for platform payment info + explicit
-- product image storage policies.
--
-- The security scanner flagged `public.platform_settings` because
-- the payment/support data was readable by every signed-in user
-- through a `USING (true)` policy. The table now stays private to
-- admins, while merchants receive only the billing fields through
-- the SECURITY DEFINER function below.
-- ============================================================

-- Safe, read-only accessor for the authenticated billing page.
CREATE OR REPLACE FUNCTION public.get_platform_payment_info()
RETURNS TABLE (
  ccp_number text,
  ccp_key text,
  ccp_holder text,
  rip text,
  support_phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.ccp_number, s.ccp_key, s.ccp_holder, s.rip, s.support_phone
  FROM public.platform_settings s
  WHERE s.id = 1;
$$;

REVOKE ALL ON FUNCTION public.get_platform_payment_info() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_payment_info() TO authenticated;

-- Only admins may read the underlying row (which also holds support_phone).
DROP POLICY IF EXISTS "Signed-in users read payment info" ON public.platform_settings;
DROP POLICY IF EXISTS "Admins read payment info" ON public.platform_settings;
CREATE POLICY "Admins read payment info" ON public.platform_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- product-images bucket
--
-- Intentionally public for reads: storefront visitors must be able
-- to browse product photos without signing in. Writes (insert,
-- update, delete) stay limited to the owning authenticated merchant
-- folder, so the public read is a false positive.
-- ============================================================
DROP POLICY IF EXISTS "Anyone views product images" ON storage.objects;
CREATE POLICY "Anyone views product images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Merchants upload product images" ON storage.objects;
CREATE POLICY "Merchants upload product images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Merchants update product images" ON storage.objects;
CREATE POLICY "Merchants update product images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Merchants delete product images" ON storage.objects;
CREATE POLICY "Merchants delete product images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- `public.plans` is intentionally world-readable: it only exposes the
-- public pricing used on the landing page and billing page.
