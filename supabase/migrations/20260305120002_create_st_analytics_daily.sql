CREATE TABLE st_analytics_daily (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date date NOT NULL,
  event text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  unique_sessions integer NOT NULL DEFAULT 0,
  country text DEFAULT 'unknown',
  properties_summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(date, event, country)
);
