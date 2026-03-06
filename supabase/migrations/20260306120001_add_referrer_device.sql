-- Add referrer_domain and device_type to both analytics tables
-- for traffic source and device breakdown reporting.

ALTER TABLE sl_analytics_events
  ADD COLUMN IF NOT EXISTS referrer_domain TEXT,
  ADD COLUMN IF NOT EXISTS device_type TEXT;

CREATE INDEX IF NOT EXISTS idx_sl_events_referrer ON sl_analytics_events (referrer_domain);
CREATE INDEX IF NOT EXISTS idx_sl_events_device ON sl_analytics_events (device_type);

ALTER TABLE sl_analytics_daily
  ADD COLUMN IF NOT EXISTS referrer_domain TEXT DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'unknown';

-- Widen the unique constraint to include the new dimensions
ALTER TABLE sl_analytics_daily DROP CONSTRAINT IF EXISTS sl_analytics_daily_date_event_country_key;
ALTER TABLE sl_analytics_daily ADD CONSTRAINT sl_analytics_daily_unique
  UNIQUE(date, event, country, referrer_domain, device_type);
