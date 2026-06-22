-- 0041_admin_analytics.sql
-- Uitgebreide analytics RPCs voor het ontwikkelaarsdashboard (cockpit)
-- Voegt 6 nieuwe SECURITY DEFINER functies toe voor bruiloften, AI en activiteit.

-- -----------------------------------------------------------------------
-- 1) Bruiloften- en feature-adoptie statistieken
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_wedding_stats()
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
    -- Kerngegevens bruiloften
    'total_weddings',         (SELECT count(*) FROM weddings),
    'with_date',              (SELECT count(*) FROM weddings WHERE trouwdatum IS NOT NULL),
    'date_future',            (SELECT count(*) FROM weddings WHERE trouwdatum >= CURRENT_DATE),
    'date_past',              (SELECT count(*) FROM weddings WHERE trouwdatum < CURRENT_DATE AND trouwdatum IS NOT NULL),
    'avg_daggasten',          (SELECT round(avg(aantal_daggasten)) FROM weddings WHERE aantal_daggasten > 0),
    'avg_budget',             (SELECT round(avg(totaal_budget)) FROM weddings WHERE totaal_budget > 0),
    -- Feature adoptie: hoeveel bruiloften gebruiken elke module
    'weddings_with_guests',   (SELECT count(DISTINCT wedding_id) FROM guests),
    'weddings_with_tasks',    (SELECT count(DISTINCT wedding_id) FROM tasks),
    'weddings_with_budget',   (SELECT count(DISTINCT wedding_id) FROM budget_items),
    'weddings_with_vendors',  (SELECT count(DISTINCT wedding_id) FROM vendors),
    'weddings_with_schedule', (SELECT count(DISTINCT wedding_id) FROM schedule_items),
    'weddings_website_pub',   (SELECT count(*) FROM website_content WHERE website_gepubliceerd = true),
    'weddings_registry_on',   (SELECT count(*) FROM registry_settings WHERE is_enabled = true),
    'weddings_photowall_on',  (SELECT count(*) FROM photo_wall_settings WHERE is_active = true),
    'weddings_multi_member',  (SELECT count(*) FROM (
                                SELECT wedding_id FROM wedding_members
                                GROUP BY wedding_id HAVING count(*) > 1
                              ) sub),
    -- Taken
    'total_tasks',            (SELECT count(*) FROM tasks),
    'tasks_open',             (SELECT count(*) FROM tasks WHERE status = 'open'),
    'tasks_bezig',            (SELECT count(*) FROM tasks WHERE status = 'bezig'),
    'tasks_klaar',            (SELECT count(*) FROM tasks WHERE status = 'klaar'),
    'tasks_overdue',          (SELECT count(*) FROM tasks
                               WHERE deadline < CURRENT_DATE AND status != 'klaar' AND deadline IS NOT NULL),
    -- Gasten
    'total_guests',           (SELECT count(*) FROM guests),
    'guests_bevestigd',       (SELECT count(*) FROM guests WHERE rsvp_status = 'bevestigd'),
    'guests_afgemeld',        (SELECT count(*) FROM guests WHERE rsvp_status = 'afgemeld'),
    'guests_uitgenodigd',     (SELECT count(*) FROM guests WHERE rsvp_status = 'uitgenodigd'),
    'guests_geen_reactie',    (SELECT count(*) FROM guests WHERE rsvp_status = 'geen reactie'),
    'guests_daggast',         (SELECT count(*) FROM guests WHERE gasttype = 'daggast'),
    'guests_avondgast',       (SELECT count(*) FROM guests WHERE gasttype = 'avondgast'),
    'guests_met_tafel',       (SELECT count(*) FROM guests WHERE tafel_id IS NOT NULL),
    -- Budget & leveranciers
    'total_budget_items',     (SELECT count(*) FROM budget_items),
    'total_geschat',          (SELECT coalesce(sum(geschat_bedrag), 0) FROM budget_items),
    'total_betaald',          (SELECT coalesce(sum(betaald_bedrag), 0) FROM budget_items),
    'total_vendors',          (SELECT count(*) FROM vendors),
    'vendors_geboekt',        (SELECT count(*) FROM vendors WHERE status = 'geboekt'),
    -- Cadeaulijst & fotowall
    'registry_items',         (SELECT count(*) FROM registry_items),
    'registry_contributions', (SELECT count(*) FROM registry_contributions WHERE payment_status = 'confirmed'),
    'registry_amount',        (SELECT coalesce(sum(amount), 0) FROM registry_contributions WHERE payment_status = 'confirmed'),
    'total_photos',           (SELECT count(*) FROM photo_wall_photos WHERE is_approved = true),
    -- Samenwerking
    'total_invites',          (SELECT count(*) FROM wedding_invites),
    'invites_accepted',       (SELECT count(*) FROM wedding_invites WHERE accepted_at IS NOT NULL)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_wedding_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_wedding_stats() TO authenticated, service_role;

-- -----------------------------------------------------------------------
-- 2) AI gebruik samenvatting
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_ai_stats()
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
    'total_calls',          (SELECT count(*) FROM ai_usage_log),
    'calls_24h',            (SELECT count(*) FROM ai_usage_log WHERE created_at > now() - interval '24 hours'),
    'calls_7d',             (SELECT count(*) FROM ai_usage_log WHERE created_at > now() - interval '7 days'),
    'cached_total',         (SELECT count(*) FROM ai_usage_log WHERE cached = true),
    'cache_hit_rate',       (SELECT round(
                               count(*) FILTER (WHERE cached)::numeric
                               / nullif(count(*), 0) * 100, 1)
                             FROM ai_usage_log),
    'avg_latency_ms',       (SELECT round(avg(latency_ms))
                             FROM ai_usage_log
                             WHERE latency_ms IS NOT NULL AND cached = false),
    'p95_latency_ms',       (SELECT round(
                               percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms))
                             FROM ai_usage_log
                             WHERE latency_ms IS NOT NULL AND cached = false),
    'failures',             (SELECT count(*) FROM ai_usage_log WHERE success = false),
    'success_rate',         (SELECT round(
                               count(*) FILTER (WHERE success)::numeric
                               / nullif(count(*), 0) * 100, 1)
                             FROM ai_usage_log),
    'unique_weddings',      (SELECT count(DISTINCT wedding_id) FROM ai_usage_log WHERE wedding_id IS NOT NULL),
    'feedback_up',          (SELECT count(*) FROM ai_advice_feedback WHERE waardering = 'omhoog'),
    'feedback_down',        (SELECT count(*) FROM ai_advice_feedback WHERE waardering = 'omlaag'),
    'active_caches',        (SELECT count(*) FROM ai_advice_cache),
    'planner_caches',       (SELECT count(*) FROM ai_wedding_planner_cache),
    'supplier_caches',      (SELECT count(*) FROM ai_supplier_rank_cache),
    'draaiboek_caches',     (SELECT count(*) FROM ai_draaiboek_cache),
    'rate_limit_incidents', (SELECT count(*) FROM ai_rate_limits WHERE call_count >= 10)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_ai_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_ai_stats() TO authenticated, service_role;

-- -----------------------------------------------------------------------
-- 3) AI gebruik per endpoint
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_ai_by_endpoint()
RETURNS TABLE(
  endpoint       text,
  total_calls    bigint,
  cached_calls   bigint,
  cache_hit_pct  numeric,
  avg_latency    numeric,
  p95_latency    numeric,
  failures       bigint
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
    al.endpoint,
    count(*)                                                              AS total_calls,
    count(*) FILTER (WHERE al.cached)                                    AS cached_calls,
    round(
      count(*) FILTER (WHERE al.cached)::numeric / nullif(count(*), 0) * 100, 1
    )                                                                     AS cache_hit_pct,
    round(avg(al.latency_ms) FILTER (WHERE NOT al.cached AND al.latency_ms IS NOT NULL)) AS avg_latency,
    round(
      percentile_cont(0.95) WITHIN GROUP (ORDER BY al.latency_ms)
      FILTER (WHERE NOT al.cached AND al.latency_ms IS NOT NULL)
    )                                                                     AS p95_latency,
    count(*) FILTER (WHERE NOT al.success)                               AS failures
  FROM ai_usage_log al
  GROUP BY al.endpoint
  ORDER BY total_calls DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_ai_by_endpoint() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_ai_by_endpoint() TO authenticated, service_role;

-- -----------------------------------------------------------------------
-- 4) AI dagelijks gebruik (laatste 30 dagen, generate_series voor gaten)
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_ai_daily()
RETURNS TABLE(
  dag          text,
  total_calls  bigint,
  cached_calls bigint,
  failures     bigint
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
    to_char(gs.dag::date, 'DD-MM')                                  AS dag,
    count(al.id)                                                     AS total_calls,
    count(al.id) FILTER (WHERE al.cached = true)                     AS cached_calls,
    count(al.id) FILTER (WHERE al.success = false)                   AS failures
  FROM generate_series(
    (now() - interval '29 days')::date,
    now()::date,
    '1 day'::interval
  ) gs(dag)
  LEFT JOIN ai_usage_log al ON al.created_at::date = gs.dag::date
  GROUP BY gs.dag
  ORDER BY gs.dag ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_ai_daily() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_ai_daily() TO authenticated, service_role;

-- -----------------------------------------------------------------------
-- 5) App activiteit dagelijks (laatste 30 dagen)
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_activity_daily()
RETURNS TABLE(
  dag              text,
  action_count     bigint,
  unique_weddings  bigint,
  unique_users     bigint
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
    to_char(gs.dag::date, 'DD-MM')          AS dag,
    count(wa.id)                             AS action_count,
    count(DISTINCT wa.wedding_id)            AS unique_weddings,
    count(DISTINCT wa.actor_id)              AS unique_users
  FROM generate_series(
    (now() - interval '29 days')::date,
    now()::date,
    '1 day'::interval
  ) gs(dag)
  LEFT JOIN wedding_activity wa ON wa.created_at::date = gs.dag::date
  GROUP BY gs.dag
  ORDER BY gs.dag ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_activity_daily() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_activity_daily() TO authenticated, service_role;

-- -----------------------------------------------------------------------
-- 6) Analytics event types overzicht
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_event_types()
RETURNS TABLE(
  event_type    text,
  total_count   bigint,
  unique_users  bigint,
  last_7d       bigint,
  last_seen     timestamptz
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
    ae.event_type,
    count(*)                                                             AS total_count,
    count(DISTINCT ae.user_id)                                           AS unique_users,
    count(*) FILTER (WHERE ae.created_at > now() - interval '7 days')   AS last_7d,
    max(ae.created_at)                                                   AS last_seen
  FROM analytics_events ae
  GROUP BY ae.event_type
  ORDER BY total_count DESC
  LIMIT 30;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_event_types() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_event_types() TO authenticated, service_role;
