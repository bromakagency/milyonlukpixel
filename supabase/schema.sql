-- =============================================
-- PIXEL PROJESİ - SUPABASE DATABASE SCHEMA
-- =============================================

-- Pixels Tablosu - Satılan pixel blokları
CREATE TABLE pixels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  x INTEGER NOT NULL CHECK (x >= 0 AND x <= 99),
  y INTEGER NOT NULL CHECK (y >= 0 AND y <= 99),
  w INTEGER NOT NULL CHECK (w >= 1 AND w <= 100),
  h INTEGER NOT NULL CHECK (h >= 1 AND h <= 100),
  image_url TEXT NOT NULL,
  link_url TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pixel overlapping kontrolü
CREATE UNIQUE INDEX pixels_location_idx ON pixels (x, y);

-- Boyut ve konum kontrolü (overlapping yok)
CREATE OR REPLACE FUNCTION check_pixel_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pixels p
    WHERE p.id != NEW.id
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

CREATE TRIGGER pixels_overlap_trigger
  BEFORE INSERT OR UPDATE ON pixels
  FOR EACH ROW EXECUTE FUNCTION check_pixel_overlap();

-- Admins Tablosu - Admin hesapları
CREATE TABLE admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Activity Logs Tablosu
CREATE TABLE activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  target_type TEXT DEFAULT 'system' CHECK (target_type IN ('pixel', 'admin', 'system', 'order')),
  target_id UUID,
  description TEXT NOT NULL,
  admin_id UUID REFERENCES admins(id),
  admin_username TEXT,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  details JSONB
);

-- Orders Tablosu (gelecekte ödeme için)
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- İndeksler
CREATE INDEX idx_pixels_created_at ON pixels(created_at DESC);
CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- RLS (Row Level Security) - Satır bazlı güvenlik
ALTER TABLE pixels ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Pixel okuma herkese açık, yazma sadece authenticated
CREATE POLICY "Pixels are viewable by everyone" ON pixels
  FOR SELECT USING (true);

CREATE POLICY "Pixels can be modified by authenticated users" ON pixels
  FOR ALL USING (auth.role() = 'authenticated');

-- Admin sadece kendini görebilir
CREATE POLICY "Admins are viewable by authenticated users" ON admins
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can be modified by superadmin" ON admins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins a
      WHERE a.id = auth.uid() AND a.role = 'superadmin'
    )
  );

-- Activity logs herkes görebilir
CREATE POLICY "Activity logs are viewable by everyone" ON activity_logs
  FOR SELECT USING (true);

-- Orders sadece authenticated görebilir
CREATE POLICY "Orders are viewable by authenticated users" ON orders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Orders can be modified by admin" ON orders
  FOR ALL USING (auth.role() = 'authenticated');

-- =============================================
-- İLK ADMIN OLUŞTURMA (Manuel çalıştır)
-- Password: YourSecurePassword123!
-- =============================================
-- Bu SQL'i Supabase Dashboard > SQL Editor'da çalıştır:
-- INSERT INTO admins (username, password_hash, role)
-- VALUES ('admin', '$2a$12$...', 'superadmin');
-- =============================================
