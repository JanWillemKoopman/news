-- Kanaalgroepindeling op KPI's 2027 GA: per bron/medium met de hand een kanaal kiezen.
--
-- 1. kpi_2027_kanalen bewaart voortaan de grootste bron/media (250, op sessies) los, nog
--    niet ingedeeld (`bronnen`: bron → maand → bron/medium → aantal), zodat een handmatige
--    keuze meteen in elke grafiek geldt zonder opnieuw op te halen. De lange staart staat
--    al ingedeeld per kanaal in `staart` (volgens de regels), zodat de rij klein blijft.
--    `bron_media` is de lijst van de losse bron/media met hun sessies; `staart_info` hoeveel
--    bron/media en sessies er in de staart zitten. `voorbeelden` is niet meer in gebruik.
--    Een bestaande rij in de oude vorm (al ingedeeld, lege `bron_media`) blijft staan maar
--    wordt genegeerd: de eerste klik of de cron op zondag haalt hem in de nieuwe vorm op.
-- 2. kpi_2027_kanaal_keuzes: de handmatige keuzes, gedeeld voor het hele team, met dezelfde
--    rechten als kpi_2027_groei (0036): elke ingelogde collega mag lezen en aanpassen, wie
--    het als laatste zette staat erbij. Geen rij = de regels in lib/kpi2027/kanalen.ts.
-- Bewust zonder delete of drop: niets gaat verloren en de migratie past zonder
-- bevestiging. De oude kolom `voorbeelden` blijft staan (met een standaard, zodat de code
-- hem niet meer hoeft te vullen), de view krijgt de nieuwe kolommen erachter. Een rij in de
-- oude vorm heeft een lege `bron_media`; de code leest die als "nog geen verdeling" en
-- haalt hem bij de eerste klik opnieuw op.
alter table dataloket.kpi_2027_kanalen
  alter column voorbeelden set default '{}'::jsonb,
  add column if not exists staart      jsonb not null default '{}'::jsonb,
  add column if not exists bron_media  jsonb not null default '[]'::jsonb,
  add column if not exists staart_info jsonb not null default '{"aantal": 0, "sessies": 0}'::jsonb;

create or replace view dataloket.v_kpi_2027_kanalen as
select website, van, peildatum, berekend_op, bronnen, voorbeelden, staart, bron_media, staart_info
  from dataloket.kpi_2027_kanalen;

comment on view dataloket.v_kpi_2027_kanalen is
  'Per website de kanaalverdeling van KPI''s 2027 GA: de grootste bron/media los (bronnen: bron → maand → bron/medium → aantal), de rest al per kanaal (staart). De indeling staat in lib/kpi2027/kanalen.ts, handmatige keuzes in kpi_2027_kanaal_keuzes. voorbeelden is niet meer in gebruik.';

grant select on dataloket.v_kpi_2027_kanalen to dataloket_lezer;

create table if not exists dataloket.kpi_2027_kanaal_keuzes (
  website         text        not null,
  bron_medium     text        not null,
  kanaal          text        not null check (kanaal in (
                    'google-ads', 'meta-ads', 'overig-betaald', 'organisch-zoeken',
                    'social-organisch', 'autoportals', 'direct', 'overig')),
  aangepast_door  uuid        not null,
  aangepast_op    timestamptz not null default now(),
  primary key (website, bron_medium)
);

comment on table dataloket.kpi_2027_kanaal_keuzes is
  'Met de hand gekozen kanaalgroep per GA4-sessiebron/medium op KPI''s 2027 GA. Gaat vóór de regels in lib/kpi2027/kanalen.ts. Geen rij = de regels.';

alter table dataloket.kpi_2027_kanaal_keuzes enable row level security;

create policy kpi_2027_kanaal_keuzes_lezen on dataloket.kpi_2027_kanaal_keuzes
  for select to authenticated using (true);

create policy kpi_2027_kanaal_keuzes_toevoegen on dataloket.kpi_2027_kanaal_keuzes
  for insert to authenticated with check (aangepast_door = auth.uid());

create policy kpi_2027_kanaal_keuzes_wijzigen on dataloket.kpi_2027_kanaal_keuzes
  for update to authenticated using (true) with check (aangepast_door = auth.uid());

create policy kpi_2027_kanaal_keuzes_verwijderen on dataloket.kpi_2027_kanaal_keuzes
  for delete to authenticated using (true);

grant select, insert, update, delete on dataloket.kpi_2027_kanaal_keuzes to authenticated;
