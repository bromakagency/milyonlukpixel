-- Run in Supabase Dashboard > SQL Editor after the existing hardening scripts.
-- Backend service_role access remains available for visitor tracking and payments.

BEGIN;

ALTER TABLE public.visitor_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.visitor_stats FROM anon, authenticated;
REVOKE ALL ON TABLE public.active_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.activity_logs FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_visits() FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.visitor_stats TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.active_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.activity_logs TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_visits() TO service_role;

DROP POLICY IF EXISTS "Activity logs are viewable by everyone" ON public.activity_logs;

DO $$
BEGIN
  IF to_regclass('public.admins') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON TABLE public.admins FROM anon, authenticated';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admins TO service_role';
    EXECUTE 'DROP POLICY IF EXISTS "Admins are viewable by authenticated users" ON public.admins';
  END IF;
END;
$$;

-- Public traffic reaches these only through rate-limited server endpoints.
-- Do not add browser-facing policies for these tables.

NOTIFY pgrst, 'reload schema';

COMMIT;
