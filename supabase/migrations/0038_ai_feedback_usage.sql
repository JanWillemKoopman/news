-- =====================================================================
-- AI-instrumentatie: feedback op adviezen (#14) en gebruikslogging (#31).
--
-- Doel: meetbaar maken of het AI-advies daadwerkelijk helpt, en zicht
-- houden op kosten/snelheid van de Gemini-calls. Zonder deze basis
-- kunnen we de adviezen niet structureel verbeteren of bewaken.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Feedback op individuele adviezen (duim omhoog / omlaag)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_advice_feedback (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  wedding_id   uuid        NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  -- Stabiele sleutel van het advies (sectie|titel), zodat een herformuleerd
  -- advies als nieuw telt maar identiek advies herkenbaar blijft.
  advies_key   text        NOT NULL,
  advies_titel text        NOT NULL DEFAULT '',
  advies_type  text        NOT NULL DEFAULT 'actie',
  sectie       text        NOT NULL DEFAULT '',
  waardering   text        NOT NULL CHECK (waardering IN ('omhoog', 'omlaag')),
  -- Eén stem per gebruiker per advies; opnieuw stemmen overschrijft.
  UNIQUE (wedding_id, user_id, advies_key)
);

ALTER TABLE public.ai_advice_feedback ENABLE ROW LEVEL SECURITY;

-- Leden van de bruiloft mogen hun eigen feedback schrijven/bijwerken/lezen.
CREATE POLICY "ai_feedback_select_own" ON public.ai_advice_feedback
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_platform_admin());

CREATE POLICY "ai_feedback_insert_own" ON public.ai_advice_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.can_view('leveranciers', wedding_id)
  );

CREATE POLICY "ai_feedback_update_own" ON public.ai_advice_feedback
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS idx_ai_feedback_wedding ON public.ai_advice_feedback (wedding_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created ON public.ai_advice_feedback (created_at DESC);

-- ---------------------------------------------------------------------
-- 2) Gebruikslogging van de Gemini-calls (kosten + latency + succes)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  user_id        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  wedding_id     uuid,
  endpoint       text        NOT NULL,            -- bijv. 'advice', 'budget', 'taken'
  model          text        NOT NULL DEFAULT '',
  latency_ms     integer,
  cached         boolean     NOT NULL DEFAULT false,
  success        boolean     NOT NULL DEFAULT true,
  prompt_chars   integer,
  response_chars integer,
  error          text
);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Alleen admins lezen; schrijven gebeurt uitsluitend via de service-role
-- client server-side (geen authenticated insert-policy nodig).
CREATE POLICY "ai_usage_admin_select" ON public.ai_usage_log
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

CREATE INDEX IF NOT EXISTS idx_ai_usage_created  ON public.ai_usage_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_endpoint ON public.ai_usage_log (endpoint);
