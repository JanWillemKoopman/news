-- AI-statussamenvatting meecachen in dezelfde advies-rij (manier A).
-- De dashboard-intro toont deze korte, door de AI gegenereerde statuszin.
-- Wordt in één en dezelfde Gemini-call met het advies gegenereerd, dus geen
-- extra API-call. Nullable + lege default zodat bestaande rijen geldig blijven
-- (de client valt dan terug op de deterministische intro).
alter table public.ai_advice_cache
  add column if not exists cached_samenvatting text not null default '';
