-- Trial lifecycle: 10-day Pro trial + 7-day grace period
CREATE OR REPLACE FUNCTION public.stores_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.slug := lower(trim(NEW.slug));
  IF NEW.slug !~ '^[a-z0-9]([a-z0-9-]{1,38})[a-z0-9]$' THEN
    RAISE EXCEPTION 'INVALID_SLUG';
  END IF;
  IF length(trim(NEW.name)) < 2 THEN RAISE EXCEPTION 'INVALID_NAME'; END IF;
  IF NEW.default_home_price < 0 OR NEW.default_desk_price < 0 THEN RAISE EXCEPTION 'INVALID_PRICE'; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.trial_ends_at := now() + interval '10 days';
    NEW.paid_until := NULL;
    NEW.plan_tier := 'start';
    NEW.meta_pixel_id := NULL;
    NEW.tiktok_pixel_id := NULL;
    NEW.owner_email := coalesce(auth.jwt() ->> 'email', NEW.owner_email);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

