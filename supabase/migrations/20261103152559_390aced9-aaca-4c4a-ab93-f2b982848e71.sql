CREATE TABLE public.block_phones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  phone text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, phone)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.block_phones TO authenticated;
GRANT ALL ON public.block_phones TO service_role;
ALTER TABLE public.block_phones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages blocked phones" ON public.block_phones FOR ALL TO authenticated
  USING (public.owns_store(store_id)) WITH CHECK (public.owns_store(store_id));
CREATE OR REPLACE FUNCTION public.block_phones_normalize() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.phone := regexp_replace(coalesce(NEW.phone,''), '[^0-9]', '', 'g');
  IF NEW.phone ~ '^213[567][0-9]{8}$' THEN NEW.phone := '0' || substr(NEW.phone, 4); END IF;
  IF NEW.phone !~ '^0[567][0-9]{8}$' THEN RAISE EXCEPTION 'INVALID_PHONE'; END IF;
  NEW.reason := nullif(left(trim(coalesce(NEW.reason,'')), 200), '');
  RETURN NEW;
END; $$;
CREATE TRIGGER block_phones_normalize BEFORE INSERT OR UPDATE ON public.block_phones FOR EACH ROW EXECUTE FUNCTION public.block_phones_normalize();

CREATE TABLE public.carrier_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  carrier_id text NOT NULL,
  connected boolean NOT NULL DEFAULT false,
  api_key text,
  token text,
  account_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, carrier_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carrier_integrations TO authenticated;
GRANT ALL ON public.carrier_integrations TO service_role;
ALTER TABLE public.carrier_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages carrier integrations" ON public.carrier_integrations FOR ALL TO authenticated
  USING (public.owns_store(store_id)) WITH CHECK (public.owns_store(store_id));
CREATE TRIGGER carrier_integrations_touch BEFORE UPDATE ON public.carrier_integrations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();