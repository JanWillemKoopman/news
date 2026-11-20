-- KPI's 2027 CRM: per dag per KPI het aantal uit de Selligent-export.
--
-- WAAROM
-- Het tabblad KPI's CRM leest de Selligent-export op Azure, en die bevat alleen de stand van
-- vandaag. Zonder deze tabel is de stand van 31 december 2026 (de basis voor het target 2027)
-- in januari 2027 al niet meer te lezen. Daarom wordt elke dag van elke KPI het aantal bewaard.
--
-- WAT ER IN STAAT — EN WAT NIET
-- Alleen aantallen: geen e-mailadres, kenteken of andere waarde uit de export. De afspraak dat
-- de persoonsgegevens uit de export niet in een tweede database belanden (README-selligent.md)
-- blijft dus staan. Eén rij per dag (de dag waarop Selligent de export neerzette, Nederlandse
-- kalender) per KPI-sleutel:
--   'contacten', 'met-optin', 'autos', 'autos-optin' of 'optin:<kolomnaam>'
-- Wat een sleutel telt, staat in lib/kpi2027crm/definities.ts en rekenen.ts.
--
-- WIE SCHRIJFT
-- De dagelijkse taak (/api/kpi-2027-crm/bijwerken, vercel.json) en, als vangnet, elk bezoek
-- aan het tabblad — allebei via SYNC_DATABASE_URL, met upsert op (datum, kpi): dezelfde dag
-- nog een keer schrijven overschrijft alleen die dag. Er wordt nooit iets verwijderd.

create table if not exists dataloket.kpi_2027_crm_standen (
  datum          date        not null,  -- de dag van de export (Nederlandse kalender)
  kpi            text        not null,  -- de KPI-sleutel, zie hierboven
  naam           text        not null,  -- de naam zoals hij toen op het tabblad stond
  aantal         integer     not null check (aantal >= 0),
  export_van     timestamptz,           -- Last-Modified van de export op Azure
  vastgelegd_op  timestamptz not null default now(),
  primary key (datum, kpi)
);

comment on table dataloket.kpi_2027_crm_standen is
  'Per dag per KPI het aantal (unieke e-mailadressen of kentekens) uit de Selligent-export, voor het tabblad KPI''s CRM. Alleen aantallen, geen persoonsgegevens.';

-- Alleen de eigenaar (de taak en de route via SYNC_DATABASE_URL) schrijft; de app leest via de view.
alter table dataloket.kpi_2027_crm_standen enable row level security;

create or replace view dataloket.v_kpi_2027_crm_standen as
select datum, kpi, naam, aantal, export_van, vastgelegd_op
  from dataloket.kpi_2027_crm_standen;

comment on view dataloket.v_kpi_2027_crm_standen is
  'Per dag per KPI het aantal achter KPI''s CRM (unieke e-mailadressen of kentekens uit de Selligent-export). De definities staan in de code.';

grant select on dataloket.v_kpi_2027_crm_standen to dataloket_lezer;
