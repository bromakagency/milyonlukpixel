-- =============================================
-- AKTİF ZİYARETÇİ SEANSLARI (ACTIVE SESSIONS)
-- =============================================
CREATE TABLE IF NOT EXISTS active_sessions (
  visitor_id VARCHAR PRIMARY KEY,
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- Hızlı sorgulama için indeks
CREATE INDEX IF NOT EXISTS idx_active_sessions_last_seen ON active_sessions(last_seen DESC);
