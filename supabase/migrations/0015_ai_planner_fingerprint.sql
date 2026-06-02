-- Voeg data_fingerprint toe aan ai_wedding_planner_cache voor fingerprint-gebaseerde
-- cache-invalidatie. Vervangt de pure TTL-logica van 10 minuten.
alter table public.ai_wedding_planner_cache
  add column data_fingerprint text not null default '';
