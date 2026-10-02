-- Ontwerpvoorstellen bij landingspagina-audits (Monitoren → Landingspagina)
--
-- WAAROM DIT BESTAAT
-- Na een analyse met screenshot tekent een beeldmodel de pagina opnieuw, met de
-- belangrijkste verbeterpunten verwerkt en in het design van de screenshot. Zo ziet de
-- content marketeer hoe de pagina eruit kan zien, niet alleen wat er beter kan. De
-- afbeelding (webp, als data-URL) staat hier met de lijst wijzigingen die het model
-- doorvoerde; app/api/landingspagina/ontwerp/route.ts maakt hem.
--
-- EEN APARTE TABEL
-- De afbeelding is een paar honderd kB; in landingspagina_analyses zou elke upsert van
-- een rapport hem meeslepen. Bovendien staat een rapport op naam van wie het analyseerde
-- (de update-policy daar eist geanalyseerd_door = auth.uid()), terwijl een collega later
-- een ontwerp bij datzelfde rapport kan maken.
--
-- VEROUDERD ONTWERP
-- Opnieuw analyseren overschrijft het rapport onder dezelfde id. Een ontwerp dat ouder
-- is dan de laatste analyse hoort bij het vorige rapport; de app toont het dan niet
-- (gemaakt_op < geanalyseerd_op) en een nieuw ontwerp overschrijft het.
create table if not exists dataloket.landingspagina_ontwerpen (
  analyse_id   uuid primary key references dataloket.landingspagina_analyses (id) on delete cascade,
  afbeelding   text not null,
  ontwerp      jsonb not null,
  model        text,
  gemaakt_door uuid not null default auth.uid(),
  gemaakt_op   timestamptz not null default now()
);

comment on table dataloket.landingspagina_ontwerpen is
  'Ontwerpvoorstel per landingspagina-analyse: verbeterde pagina als afbeelding (data-URL) plus de doorgevoerde wijzigingen.';

alter table dataloket.landingspagina_ontwerpen enable row level security;

-- Gedeeld, net als de analyses: iedereen die ingelogd is mag de ontwerpen zien.
drop policy if exists landingspagina_ontwerpen_lezen on dataloket.landingspagina_ontwerpen;
create policy landingspagina_ontwerpen_lezen on dataloket.landingspagina_ontwerpen
  for select to authenticated using (true);

drop policy if exists landingspagina_ontwerpen_toevoegen on dataloket.landingspagina_ontwerpen;
create policy landingspagina_ontwerpen_toevoegen on dataloket.landingspagina_ontwerpen
  for insert to authenticated with check (gemaakt_door = auth.uid());

drop policy if exists landingspagina_ontwerpen_bijwerken on dataloket.landingspagina_ontwerpen;
create policy landingspagina_ontwerpen_bijwerken on dataloket.landingspagina_ontwerpen
  for update to authenticated using (true) with check (gemaakt_door = auth.uid());

grant select, insert, update on dataloket.landingspagina_ontwerpen to authenticated;
