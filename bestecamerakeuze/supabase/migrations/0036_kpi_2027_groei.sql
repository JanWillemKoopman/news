-- KPI's 2027 en KPI's 2027 Syntec: het groeipercentage per KPI, met de hand aan te passen.
--
-- Standaard is het target voor 2027 de verwachting voor 2026 plus 5% (KPI_GROEI in
-- lib/kpi2027/definities.ts). Op beide tabbladen kan een gebruiker per KPI op het
-- percentage klikken en een ander getal typen; het target, het maandtarget en de lijn in
-- de grafiek rekenen dan mee. Hier staat alleen wat afwijkt van de standaard: geen rij is
-- 5%, en "terug naar 5%" haalt de rij weg.
--
-- Eén rij per tabblad, website en KPI — een huidige stand, geen geschiedenis. Gedeeld en
-- niet per gebruiker (het target is van het team), met wie het als laatste zette in
-- aangepast_door, net als campagne_cijfers (0018).
--
--   tabblad  'kpi-2027' of 'kpi-2027-syntec' (de view in de app)
--   website  sleutel uit lib/kpi2027/definities.ts (bv. 'udenhout'); '' bij Syntec
--   kpi      sleutel van de KPI uit definities.ts van dat tabblad
--   groei    als fractie: 0.05 = +5%, -0.1 = -10%
--
-- Totalen en combinatiekaarten op KPI's 2027 Syntec hebben geen eigen percentage: zij
-- zijn de som van hun kaarten, en hun percentage volgt daaruit.

create table if not exists dataloket.kpi_2027_groei (
  tabblad         text        not null check (tabblad in ('kpi-2027', 'kpi-2027-syntec')),
  website         text        not null default '',
  kpi             text        not null,
  groei           numeric     not null check (groei > -1 and groei <= 10),
  aangepast_door  uuid        not null,
  aangepast_op    timestamptz not null default now(),
  primary key (tabblad, website, kpi)
);

comment on table dataloket.kpi_2027_groei is
  'Met de hand aangepast groeipercentage per KPI op de tabbladen KPI''s 2027 en KPI''s 2027 Syntec (fractie: 0.05 = +5%). Geen rij = de standaard van +5%. Target 2027 = verwachting 2026 × (1 + groei).';

alter table dataloket.kpi_2027_groei enable row level security;

drop policy if exists kpi_2027_groei_lezen on dataloket.kpi_2027_groei;
create policy kpi_2027_groei_lezen on dataloket.kpi_2027_groei
  for select to authenticated using (true);

drop policy if exists kpi_2027_groei_toevoegen on dataloket.kpi_2027_groei;
create policy kpi_2027_groei_toevoegen on dataloket.kpi_2027_groei
  for insert to authenticated with check (aangepast_door = auth.uid());

drop policy if exists kpi_2027_groei_wijzigen on dataloket.kpi_2027_groei;
create policy kpi_2027_groei_wijzigen on dataloket.kpi_2027_groei
  for update to authenticated using (true) with check (aangepast_door = auth.uid());

drop policy if exists kpi_2027_groei_verwijderen on dataloket.kpi_2027_groei;
create policy kpi_2027_groei_verwijderen on dataloket.kpi_2027_groei
  for delete to authenticated using (true);

grant select, insert, update, delete on dataloket.kpi_2027_groei to authenticated;
