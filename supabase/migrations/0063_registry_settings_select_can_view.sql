-- =====================================================================
-- Fix (audit 2026-07-11): registry_settings-select te ruim.
--
-- De oorspronkelijke policy (0012_registry.sql) gaf ELK lid van de bruiloft
-- (is_wedding_member) leestoegang tot registry_settings — inclusief de
-- bankrekening (bank_account_iban/-name) en de wachtwoordhash. Een lid met
-- rol 'viewer'/'helper' en registry='none' in de rechten-matrix kon die
-- gegevens zo alsnog uitlezen via de directe client-query (store.loadRegistry).
--
-- Dit trekt de policy gelijk met alle andere entiteittabellen: lezen mag
-- wie de 'registry'-module mag zien (can_view), niet iedereen zonder meer.
-- De eigenaar heeft altijd 'edit' (dus can_view = true); een planner met de
-- standaard registry='view' behoudt toegang. De publieke cadeaulijst blijft
-- ongewijzigd: die loopt via de SECURITY DEFINER-RPC (get_public_registry)
-- en de server-side API-routes, niet via deze policy.
-- =====================================================================

drop policy if exists registry_settings_select on public.registry_settings;

create policy registry_settings_select on public.registry_settings
  for select to authenticated
  using (public.can_view(wedding_id, 'registry'));
