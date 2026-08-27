-- ==============================================================================
-- ADIM 1: MÜŞTERİ VERİLERİNİN HERKESE AÇIK OKUNMASINI ENGELLEME (GÜVENLİK SERTLEŞTİRME)
-- ==============================================================================
-- Bu SQL kodunu Supabase Dashboard > SQL Editor ekranına yapıştırıp "Run" butonuna basınız.

-- 1. Pixels tablosundaki hassas kolonlara (user_email, merchant_oid, price) anonim ve standart
--    kullanıcıların doğrudan erişimini iptal et (Column-Level Security):
REVOKE SELECT ON pixels FROM anon;
REVOKE SELECT ON pixels FROM authenticated;

-- 2. Sadece kamuya açık olması gereken kolonlara okuma izni ver:
GRANT SELECT (id, x, y, w, h, image_url, link_url, title, status, created_at, updated_at) ON pixels TO anon;
GRANT SELECT (id, x, y, w, h, image_url, link_url, title, status, created_at, updated_at) ON pixels TO authenticated;

-- 3. Kamuya açık güvenli bir VIEW oluştur (alternatif ve ek güvenlik katmanı):
CREATE OR REPLACE VIEW pixels_public AS
SELECT 
  id, 
  x, 
  y, 
  w, 
  h, 
  image_url, 
  link_url, 
  title, 
  status, 
  created_at, 
  updated_at
FROM pixels
WHERE status = 'approved';

GRANT SELECT ON pixels_public TO anon, authenticated;

-- Bilgilendirme: Backend (service_role) bu kısıtlamalardan etkilenmez ve admin sipariş / işlem
-- yönetimini tam yetkiyle gerçekleştirmeye devam eder.
