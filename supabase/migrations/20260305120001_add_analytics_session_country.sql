-- Add session_id and country to analytics events
ALTER TABLE st_analytics_events
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS country text;

CREATE INDEX IF NOT EXISTS idx_st_analytics_events_session_id ON st_analytics_events (session_id);
CREATE INDEX IF NOT EXISTS idx_st_analytics_events_country ON st_analytics_events (country);
