-- Run this once on the live Supabase database before deploying the payment changes.

ALTER TABLE pixels
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS merchant_oid TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS price INTEGER;

UPDATE pixels
SET status = 'approved'
WHERE status IS NULL OR status NOT IN ('approved', 'rejected');

CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_oid TEXT UNIQUE,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  w INTEGER NOT NULL,
  h INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT NOT NULL,
  title TEXT NOT NULL,
  email TEXT,
  customer_name TEXT,
  amount INTEGER NOT NULL DEFAULT 100,
  status TEXT DEFAULT 'pending',
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS merchant_oid TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS details JSONB;

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'failed', 'rejected', 'paid'));

CREATE INDEX IF NOT EXISTS idx_pixels_status ON pixels(status);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_oid ON orders(merchant_oid);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

CREATE OR REPLACE FUNCTION check_pixel_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pixels p
    WHERE p.id != NEW.id
      AND COALESCE(p.status, 'approved') = 'approved'
      AND COALESCE(NEW.status, 'approved') = 'approved'
      AND NEW.x < p.x + p.w
      AND NEW.x + NEW.w > p.x
      AND NEW.y < p.y + p.h
      AND NEW.y + NEW.h > p.y
  ) THEN
    RAISE EXCEPTION 'Bu alan zaten dolu';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Orders are viewable by authenticated users" ON orders;
DROP POLICY IF EXISTS "Orders can be modified by admin" ON orders;

CREATE POLICY "Orders are viewable by authenticated users" ON orders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Orders can be modified by admin" ON orders
  FOR ALL USING (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
