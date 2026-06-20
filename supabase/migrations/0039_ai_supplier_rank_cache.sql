-- =====================================================================
-- Cache voor de hybride AI-rangschikking van leveranciers (#24).
--
-- De snelle rekenregel maakt een voorselectie; Gemini herrangschikt de top
-- op stijl/teksten. Die AI-call is duurder, dus we cachen het resultaat per
-- bruiloft. Alleen server-side benaderd (service role); geen client-policies.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.ai_supplier_rank_cache (
  wedding_id       uuid        PRIMARY KEY REFERENCES public.weddings(id) ON DELETE CASCADE,
  cached_ranking   jsonb       NOT NULL DEFAULT '[]'::jsonb,
  data_fingerprint text        NOT NULL DEFAULT '',
  last_updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_supplier_rank_cache ENABLE ROW LEVEL SECURITY;
-- Geen policies: uitsluitend via de service-role client (zoals rate_limits).
