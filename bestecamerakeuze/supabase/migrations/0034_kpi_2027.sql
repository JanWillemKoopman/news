-- De stand achter het tabblad KPI's 2027: per week de GA4-cijfers van udenhout.nl over
-- 2026, per maand.
--
-- WAAROM DIT BESTAAT
-- Het tabblad zet per KPI (sessies, gebruikers, proefrit-, offerte-, lease-, verhuur-,
-- werkplaats- en onderhoudsaanvragen) een target voor 2027: de verwachting voor heel 2026
-- plus 5%. De verwachting is wat GA4 tot nu toe telde, aangevuld met het gemiddelde per
-- dag voor de rest van het jaar. Dat wordt wekelijks op zondag bijgewerkt, tot 2026 voorbij
-- is (cron in vercel.json, route /api/kpi-2027/bijwerken).
--
-- WAAROM NIET UIT DE BESTAANDE GA4-TABELLEN
-- windsor_ga4_events en windsor_ga4_verkeer beginnen op 1 augustus 2026, en kennen
-- gebruikers alleen per dag. De wekelijkse ophaalactie vraagt het hele jaar daarom
-- rechtstreeks bij Windsor op, per maand (zie lib/kpi2027/ophalen.ts).
--
-- WAT ER IN STAAT, EN WAT NIET
-- De ruwe maandcijfers per GA4-event en de sessies en gebruikers per maand — niet de KPI's
-- zelf en niet de verwachting of het target. Welk event bij welke KPI hoort staat in
-- lib/kpi2027/definities.ts, het rekenwerk in lib/kpi2027/rekenen.ts. Zo geldt een
-- gewijzigde definitie meteen voor de bewaarde stand, zonder opnieuw op te halen, en is er
-- geen tweede waarheid over hoe het target tot stand kwam.
--
-- Eén rij per peildatum (altijd een zaterdag, of 31 december): zo'n vijftig rijen per jaar,
-- elk een paar kilobyte. Opnieuw berekenen in dezelfde week overschrijft de rij van die
-- week. `definitief` staat aan zodra 2026 helemaal gemeten is; daarna slaat de cron over.
create table if not exists dataloket.kpi_2027_standen (
  peildatum   date        primary key,
  berekend_op timestamptz not null default now(),
  definitief  boolean     not null default false,
  -- {"generate_lead_proefrit": [jan, feb, …, dec], …} — event_count per maand, t/m de peildatum.
  events      jsonb       not null,
  -- [jan, …, dec]: sessies per maand.
  sessies     jsonb       not null,
  -- [jan, …, dec]: totaal aantal gebruikers per maand, per maand ontdubbeld.
  gebruikers  jsonb       not null
);

comment on table dataloket.kpi_2027_standen is
  'Wekelijkse stand (peildatum = zaterdag) van de GA4-cijfers van udenhout.nl over 2026, per maand: event_count per KPI-event, sessies en per maand ontdubbelde gebruikers. Basis voor de targets op het tabblad KPI''s 2027.';

-- Alleen de eigenaar (de sync) schrijft; de app en de chat lezen via de view. RLS aan
-- zonder policies, zoals bij windsor_ga4_leads (0033).
alter table dataloket.kpi_2027_standen enable row level security;

create or replace view dataloket.v_kpi_2027_standen as
select peildatum, berekend_op, definitief, events, sessies, gebruikers
  from dataloket.kpi_2027_standen;

comment on view dataloket.v_kpi_2027_standen is
  'Wekelijkse stand van de GA4-cijfers van udenhout.nl over 2026, per maand (index 0 = januari), t/m de peildatum. De koppeling naar KPI''s en het target (+5%) staan in de code van het dashboard.';

grant select on dataloket.v_kpi_2027_standen to dataloket_lezer;
