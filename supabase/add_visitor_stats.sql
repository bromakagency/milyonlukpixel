-- =============================================
-- ZİYARETÇİ İSTATİSTİKLERİ (VISITOR STATS)
-- =============================================
CREATE TABLE IF NOT EXISTS visitor_stats (
  id VARCHAR PRIMARY KEY DEFAULT 'global',
  total_visits BIGINT DEFAULT 0
);

-- Başlangıç değeri olarak gerçekçi bir sayı yerleştiriyoruz (Örn: 83681)
INSERT INTO visitor_stats (id, total_visits) 
VALUES ('global', 83681) 
ON CONFLICT (id) DO NOTHING;

-- Ziyaretçi sayısını güvenli artıran RPC fonksiyonu
CREATE OR REPLACE FUNCTION increment_visits()
RETURNS void AS $$
BEGIN
  INSERT INTO visitor_stats (id, total_visits)
  VALUES ('global', 1)
  ON CONFLICT (id)
  DO UPDATE SET total_visits = visitor_stats.total_visits + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
