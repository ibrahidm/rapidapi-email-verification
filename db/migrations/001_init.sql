-- Email Verification API - Initial Schema
-- Run: psql $DATABASE_URL -f db/migrations/001_init.sql

-- Usage tracking table
-- Note: We store domain only, not full email (privacy)
CREATE TABLE IF NOT EXISTS usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rapidapi_user TEXT,
  email_domain TEXT,
  result TEXT NOT NULL,
  processing_time_ms INT,
  error_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_usage_created_at ON usage(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_rapidapi_user ON usage(rapidapi_user);
CREATE INDEX IF NOT EXISTS idx_usage_result ON usage(result);
CREATE INDEX IF NOT EXISTS idx_usage_email_domain ON usage(email_domain);

-- Daily statistics view
CREATE OR REPLACE VIEW daily_stats AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE result = 'deliverable') as deliverable,
  COUNT(*) FILTER (WHERE result = 'undeliverable') as undeliverable,
  COUNT(*) FILTER (WHERE result = 'risky') as risky,
  COUNT(*) FILTER (WHERE result = 'unknown') as unknown,
  AVG(processing_time_ms)::INT as avg_processing_ms
FROM usage
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Popular domains view (for caching optimization)
CREATE OR REPLACE VIEW popular_domains AS
SELECT
  email_domain,
  COUNT(*) as check_count,
  COUNT(*) FILTER (WHERE result = 'deliverable') as deliverable_count,
  COUNT(*) FILTER (WHERE result = 'undeliverable') as undeliverable_count
FROM usage
WHERE created_at > NOW() - INTERVAL '7 days'
  AND email_domain IS NOT NULL
GROUP BY email_domain
ORDER BY check_count DESC
LIMIT 1000;

-- User stats view
CREATE OR REPLACE VIEW user_stats AS
SELECT
  rapidapi_user,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE result = 'deliverable') as deliverable,
  COUNT(*) FILTER (WHERE result = 'undeliverable') as undeliverable,
  MIN(created_at) as first_request,
  MAX(created_at) as last_request
FROM usage
WHERE rapidapi_user IS NOT NULL
GROUP BY rapidapi_user
ORDER BY total_requests DESC;
