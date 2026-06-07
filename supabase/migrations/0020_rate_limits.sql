-- Persistente rate limiting tabel: werkt correct over meerdere serverless instanties.
-- Vervangt de in-memory Maps in AI- en registry-routes.

CREATE TABLE IF NOT EXISTS rate_limits (
  key        TEXT        PRIMARY KEY,
  count      INTEGER     NOT NULL DEFAULT 1,
  reset_at   TIMESTAMPTZ NOT NULL
);

-- Geen RLS-policies: alleen toegankelijk via service role of SECURITY DEFINER functies.
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Atomische increment: telt één verzoek op en geeft terug of het verzoek is toegestaan.
-- Als het venster verlopen is, start de teller opnieuw.
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_key            TEXT,
  p_max            INTEGER,
  p_window_seconds INTEGER
)
RETURNS TABLE (allowed BOOLEAN, current_count INTEGER, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count    INTEGER;
  v_reset_at TIMESTAMPTZ;
  v_now      TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO rate_limits AS rl (key, count, reset_at)
  VALUES (p_key, 1, v_now + (p_window_seconds || ' seconds')::INTERVAL)
  ON CONFLICT (key) DO UPDATE
    SET
      count    = CASE WHEN rl.reset_at < v_now THEN 1
                      ELSE rl.count + 1 END,
      reset_at = CASE WHEN rl.reset_at < v_now
                      THEN v_now + (p_window_seconds || ' seconds')::INTERVAL
                      ELSE rl.reset_at END
  RETURNING rl.count, rl.reset_at
  INTO v_count, v_reset_at;

  RETURN QUERY SELECT (v_count <= p_max), v_count, v_reset_at;
END;
$$;
