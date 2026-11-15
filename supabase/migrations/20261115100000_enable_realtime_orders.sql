-- ========== realtime: notify the dashboard about new orders ==========
-- The dashboard layout subscribes to INSERT events on public.orders through
-- Supabase Realtime to play the cash-register chime, toast the new order and
-- invalidate its caches. Without a publication entry the channel subscribes
-- successfully but never receives a row, so orders only appear after a poll.
--
-- Idempotent: safe to re-run, and it also creates the publication on projects
-- where Realtime was never started.
--
-- Note: Realtime still honours RLS, so the store owner keeps reading only the
-- rows covered by the existing SELECT policy on public.orders.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime FOR TABLE public.orders;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;

-- Make the change visible to PostgREST / Realtime immediately.
NOTIFY pgrst, 'reload schema';
