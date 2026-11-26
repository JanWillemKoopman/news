-- Marketing analyse: acties afvinken op de analysepagina
--
-- WAAROM DIT BESTAAT
-- De samenvatting van een analyse heeft een lijst "Wat nu te doen" (de acties voor de campagne
-- als geheel). Het team vinkt daar af wat gedaan is (verzoek van de eigenaar, 25 november 2026).
-- Dat is gedeeld: wat de een afvinkt, ziet de ander ook, met naam en moment.
--
-- HOE HET WERKT
-- Eén rij per afgevinkte actie van één versie. Een versie verandert nooit, dus de actie wordt
-- aangewezen met haar plek in de lijst (`geheel-0`, `geheel-1`, …). Een nieuwe versie begint
-- met een lege lijst: de acties zijn dan opnieuw bepaald. Uitvinken haalt de rij weg.
-- Schrijven loopt via /api/marketing-analyse/acties (dienstverbinding), die controleert dat de
-- gebruiker is ingelogd en dat de actie in de versie bestaat.

create table if not exists dataloket.marketing_analyse_acties_klaar (
  versie_id       uuid not null references dataloket.marketing_analyse_versies (id) on delete cascade,
  actie           text not null check (actie ~ '^geheel-[0-9]{1,3}$'),
  afgevinkt_door  uuid,
  afgevinkt_op    timestamptz not null default now(),
  primary key (versie_id, actie)
);

comment on table dataloket.marketing_analyse_acties_klaar is
  'Marketing analyse: welke acties uit "Wat nu te doen" van een versie zijn afgevinkt, door wie en wanneer.';

alter table dataloket.marketing_analyse_acties_klaar enable row level security;

drop policy if exists ma_acties_klaar_lezen on dataloket.marketing_analyse_acties_klaar;
create policy ma_acties_klaar_lezen on dataloket.marketing_analyse_acties_klaar
  for select to authenticated using (true);
revoke all on dataloket.marketing_analyse_acties_klaar from anon, authenticated;
grant select on dataloket.marketing_analyse_acties_klaar to authenticated;
grant all on dataloket.marketing_analyse_acties_klaar to service_role;
