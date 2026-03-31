-- Rate Limits table: shared rate limiting across serverless instances
-- Uses upsert + window check instead of in-memory Maps

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,          -- e.g. "upload:203.0.113.5"
  count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (key)
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits (window_start);

-- RPC: check and increment rate limit atomically
-- Returns TRUE if the request is ALLOWED, FALSE if rate-limited
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_max INT,
  p_window_ms INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_window INTERVAL;
  v_count INT;
BEGIN
  v_window := (p_window_ms || ' milliseconds')::INTERVAL;

  -- Try to insert or update
  INSERT INTO rate_limits (key, count, window_start)
  VALUES (p_key, 1, now())
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN rate_limits.window_start + v_window < now() THEN 1  -- window expired, reset
      ELSE rate_limits.count + 1
    END,
    window_start = CASE
      WHEN rate_limits.window_start + v_window < now() THEN now()  -- reset window
      ELSE rate_limits.window_start
    END
  RETURNING count INTO v_count;

  RETURN v_count <= p_max;
END;
$$;

-- Cleanup function: delete expired entries (run periodically or via pg_cron)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM rate_limits WHERE window_start < now() - INTERVAL '5 minutes';
END;
$$;

-- Disable RLS (this table is only accessed via SECURITY DEFINER RPCs)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies = no direct access from client, only through RPCs
