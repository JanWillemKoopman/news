-- =====================================================================
-- Opruiming: bijna alle Gemini AI-functionaliteit is uit de app verwijderd.
-- De enige overgebleven AI-functie is de gastenlijst-import
-- (app/api/ai/gasten-import), die blijft loggen naar ai_usage_log.
--
-- De tabellen/kolom hieronder worden nergens meer door de app gebruikt.
-- We laten de data staan (geen dataverlies) maar hernoemen ze met een
-- 'x_'-prefix zodat ze herkenbaar zijn als niet langer in gebruik.
-- =====================================================================

alter table public.ai_wedding_planner_cache rename to x_ai_wedding_planner_cache;
alter table public.ai_advice_cache          rename to x_ai_advice_cache;
alter table public.ai_budget_cache          rename to x_ai_budget_cache;
alter table public.ai_taken_cache           rename to x_ai_taken_cache;
alter table public.ai_advice_feedback       rename to x_ai_advice_feedback;
alter table public.ai_supplier_rank_cache   rename to x_ai_supplier_rank_cache;
alter table public.ai_draaiboek_cache       rename to x_ai_draaiboek_cache;

alter table public.profiles rename column ai_prewarmed_on to x_ai_prewarmed_on;

-- De /admin/ai-pagina (AI Monitor) is verwijderd; de RPC's erachter ook.
drop function if exists public.get_admin_ai_stats();
drop function if exists public.get_admin_ai_by_endpoint();
drop function if exists public.get_admin_ai_daily();
