-- Landingspagina-audits (tabblad Monitoren → Landingspagina)
--
-- WAAROM DIT BESTAAT
-- Elke analyse wordt bewaard, zodat het team later terug kan kijken welke campagnepagina
-- op welke datum is beoordeeld en met welk resultaat. Het rapport zelf staat als jsonb
-- (het gestructureerde antwoord van Claude), met url en eindcijfer als losse kolommen
-- zodat de lijst zonder alle rapporten op te halen te tonen is.
--
-- ÉÉN REGEL PER PAGINA
-- `url` is uniek: wie een pagina opnieuw analyseert, overschrijft het rapport (upsert)
-- in plaats van een tweede regel toe te voegen. De app normaliseert de url vóór het
-- opslaan (lib/landingspagina.ts → normaliseerUrl), zodat een link met utm-parameters
-- of een slash aan het eind niet als aparte pagina telt. `eerst_geanalyseerd_op` blijft
-- staan; `geanalyseerd_op` en `geanalyseerd_door` gaan over de laatste analyse.
create table if not exists dataloket.landingspagina_analyses (
  id                     uuid primary key default gen_random_uuid(),
  url                    text not null unique,
  eindcijfer             numeric(3, 1),
  rapport                jsonb not null,
  model                  text,
  geanalyseerd_door      uuid not null default auth.uid(),
  geanalyseerd_op        timestamptz not null default now(),
  eerst_geanalyseerd_op  timestamptz not null default now()
);

create index if not exists landingspagina_analyses_tijd_idx
  on dataloket.landingspagina_analyses (geanalyseerd_op desc);

comment on table dataloket.landingspagina_analyses is
  'Landingspagina-audits: één regel per (genormaliseerde) url met het laatste rapport (jsonb) en eindcijfer.';

alter table dataloket.landingspagina_analyses enable row level security;

-- Gedeeld: iedereen die ingelogd is mag alle analyses inzien, niet alleen de eigen.
drop policy if exists landingspagina_analyses_lezen on dataloket.landingspagina_analyses;
create policy landingspagina_analyses_lezen on dataloket.landingspagina_analyses
  for select to authenticated using (true);

drop policy if exists landingspagina_analyses_toevoegen on dataloket.landingspagina_analyses;
create policy landingspagina_analyses_toevoegen on dataloket.landingspagina_analyses
  for insert to authenticated with check (geanalyseerd_door = auth.uid());

-- Opnieuw analyseren mag iedereen, maar de regel staat daarna op naam van wie het deed.
drop policy if exists landingspagina_analyses_bijwerken on dataloket.landingspagina_analyses;
create policy landingspagina_analyses_bijwerken on dataloket.landingspagina_analyses
  for update to authenticated using (true) with check (geanalyseerd_door = auth.uid());

grant select, insert, update on dataloket.landingspagina_analyses to authenticated;
