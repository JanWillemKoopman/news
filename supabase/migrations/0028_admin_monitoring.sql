-- 0028_admin_monitoring.sql
-- Admin monitoring: error_logs + analytics_events tabel,
-- admin statistieken RPCs en eigenaar platform_admin rechten.

-- -----------------------------------------------------------------------
-- 1) Error logs: vastleggen van client/server fouten
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.error_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  level       text        NOT NULL DEFAULT 'error' CHECK (level IN ('error', 'warning', 'info')),
  message     text        NOT NULL,
  stack       text,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  path        text,
  component   text,
  metadata    jsonb
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "error_logs_admin_select" ON public.error_logs
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "error_logs_insert_authenticated" ON public.error_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) OR user_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id    ON public.error_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_level      ON public.error_logs (level);

-- -----------------------------------------------------------------------
-- 2) Analytics events: gebruiksgedrag vastleggen
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type  text        NOT NULL,
  path        text,
  metadata    jsonb
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_events_admin_select" ON public.analytics_events
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "analytics_events_insert_authenticated" ON public.analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id    ON public.analytics_events (user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON public.analytics_events (event_type);

-- -----------------------------------------------------------------------
-- 3) Admin stats RPC (leest auth.users, vereist SECURITY DEFINER)
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN jsonb_build_object(
    'total_users',      (SELECT count(*)                FROM auth.users),
    'new_users_7d',     (SELECT count(*)                FROM auth.users WHERE created_at > now() - interval '7 days'),
    'new_users_30d',    (SELECT count(*)                FROM auth.users WHERE created_at > now() - interval '30 days'),
    'active_users_7d',  (SELECT count(DISTINCT user_id) FROM public.analytics_events WHERE created_at > now() - interval '7 days'),
    'active_users_30d', (SELECT count(DISTINCT user_id) FROM public.analytics_events WHERE created_at > now() - interval '30 days'),
    'total_weddings',   (SELECT count(*)                FROM public.weddings),
    'new_weddings_7d',  (SELECT count(*)                FROM public.weddings WHERE created_at > now() - interval '7 days'),
    'errors_24h',       (SELECT count(*)                FROM public.error_logs WHERE created_at > now() - interval '24 hours' AND level = 'error'),
    'errors_7d',        (SELECT count(*)                FROM public.error_logs WHERE created_at > now() - interval '7 days'   AND level = 'error')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated, service_role;

-- -----------------------------------------------------------------------
-- 4) Admin gebruikerslijst RPC
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_users(
  p_limit  integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id              uuid,
  email           text,
  display_name    text,
  created_at      timestamptz,
  last_sign_in_at timestamptz,
  wedding_count   bigint,
  event_count_30d bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    p.display_name,
    u.created_at,
    u.last_sign_in_at,
    (SELECT count(*) FROM public.wedding_members wm WHERE wm.user_id = u.id)                                                AS wedding_count,
    (SELECT count(*) FROM public.analytics_events ae WHERE ae.user_id = u.id AND ae.created_at > now() - interval '30 days') AS event_count_30d
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  ORDER BY u.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_users(integer, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_users(integer, integer) TO authenticated, service_role;

-- -----------------------------------------------------------------------
-- 5) Platform admin toewijzen aan eigenaar
-- -----------------------------------------------------------------------
UPDATE public.profiles
SET app_role = 'platform_admin'
WHERE email = 'koopman.janwillem@gmail.com';
