-- KPI's 2027 per website: de stand per website per jaar, met dagcijfers.
--
-- WAT ER VERANDERT TEN OPZICHTE VAN 0034
-- 0034 bewaarde één website (udenhout.nl) met maandcijfers en één rij per peildatum. Het
-- tabblad toont nu zes websites, en daarvoor was die opzet te grof:
--
--   * Dagcijfers in plaats van maandcijfers. Op meerdere websites begon een meting midden
--     in een maand (Bentley contact op 21 oktober, Porsche-werkplaats op 3 september) en
--     beide Porsche-properties maten van 25 juni t/m 11 augustus niets. Het gemiddelde per
--     dag rekent alleen over de gemeten dagen (lib/kpi2027/definities.ts); dat kan alleen
--     als de stand weet wat er op welke dag gebeurde.
--   * Gebruikers blijven per maand (actieve gebruikers, per maand ontdubbeld): een
--     dagcijfer telt op tot een veel te hoog jaartotaal.
--   * Eén rij per website per jaar, overschreven door elke wekelijkse run. Met dagcijfers
--     wordt een rij tientallen kilobytes, en een week-op-weekhistorie gebruikt niemand: elke
--     run staat al in sync_runs. Het jaar 2027 krijgt vanaf januari zijn eigen rij: de
--     realisatie die tegen het target wordt afgezet.
--
-- De tabel wordt opnieuw aangemaakt in plaats van omgebouwd: de enige rij uit 0034 had de
-- oude vorm (maandcijfers, totalusers in plaats van active_users) en wordt direct opnieuw
-- opgehaald. Er gaat dus niets verloren dat niet bij Windsor terug te halen is.
--
-- WAT ER IN STAAT, EN WAT NIET
-- De ruwe GA4-cijfers, niet de KPI's, de verwachting of het target. Welke bron bij welke
-- KPI hoort en welke dagen als gemeten tellen staat in lib/kpi2027/definities.ts, het
-- rekenwerk in lib/kpi2027/rekenen.ts. Zo geldt een gewijzigde definitie meteen voor de
-- bewaarde stand, en is er geen tweede waarheid over hoe het target tot stand kwam.
drop view if exists dataloket.v_kpi_2027_standen;
drop table if exists dataloket.kpi_2027_standen;

create table dataloket.kpi_2027_standen (
  website     text        not null,  -- sleutel uit lib/kpi2027/definities.ts, bv. 'porsche-brabant'
  jaar        smallint    not null,  -- 2026 (de basis) of 2027 (de realisatie)
  peildatum   date        not null,  -- t/m welke dag: altijd een zaterdag, of 31 december
  berekend_op timestamptz not null default now(),
  definitief  boolean     not null default false,
  -- Per bron een map datum → aantal, alleen dagen met een waarde:
  -- {"sessies": {"2026-01-01": 3912, …}, "event:generate_lead_proefrit": {…},
  --  "event:Contactaanvraag@/caw-bedankt/offerte/": {…}, "aankopen": {…}}
  dagen       jsonb       not null,
  -- [jan, …, dec]: actieve gebruikers per maand, per maand ontdubbeld.
  gebruikers  jsonb       not null,
  primary key (website, jaar)
);

comment on table dataloket.kpi_2027_standen is
  'Per website en jaar de GA4-cijfers achter het tabblad KPI''s 2027: per bron (sessies, aankopen, event) het aantal per dag, en actieve gebruikers per maand. Elke zondag overschreven t/m zaterdag; 2026 wordt definitief na de jaarwisseling.';

-- Alleen de eigenaar (de sync) schrijft; de app en de chat lezen via de view. RLS aan
-- zonder policies, zoals bij windsor_ga4_leads (0033).
alter table dataloket.kpi_2027_standen enable row level security;

create view dataloket.v_kpi_2027_standen as
select website, jaar, peildatum, berekend_op, definitief, dagen, gebruikers
  from dataloket.kpi_2027_standen;

comment on view dataloket.v_kpi_2027_standen is
  'Per website en jaar de GA4-cijfers achter het tabblad KPI''s 2027 (dagen: bron → datum → aantal; gebruikers: per maand). De koppeling naar KPI''s, de gemeten dagen en het target (+5%) staan in de code van het dashboard.';

grant select on dataloket.v_kpi_2027_standen to dataloket_lezer;
