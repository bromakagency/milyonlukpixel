-- Emergency hardening for the live site.
-- Run in Supabase Dashboard > SQL Editor.
--
-- Goal:
-- - Public visitors can only read approved pixels.
-- - Browser clients cannot insert/update/delete pixels or orders directly.
-- - The backend service role still works for PayTR callbacks and admin actions.

BEGIN;

ALTER TABLE public.pixels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pixels are viewable by everyone" ON public.pixels;
DROP POLICY IF EXISTS "Pixels can be modified by authenticated users" ON public.pixels;
DROP POLICY IF EXISTS "Orders are viewable by authenticated users" ON public.orders;
DROP POLICY IF EXISTS "Orders can be modified by admin" ON public.orders;

CREATE POLICY "Approved pixels are public read only"
  ON public.pixels
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

-- Intentionally no INSERT/UPDATE/DELETE policy for pixels.
-- New public purchases must go through /api/payment/paytr-token and PayTR callback.

-- Intentionally no browser-client policy for orders.
-- Order reads/writes must go through backend service-role endpoints only.

NOTIFY pgrst, 'reload schema';

COMMIT;
