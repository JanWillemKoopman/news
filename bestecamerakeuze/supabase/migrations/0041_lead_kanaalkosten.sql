-- Kosten per sessiebron/medium en maand, met de hand ingevuld op het tabblad Leads
--
-- WAAROM DIT BESTAAT
-- Het tabblad Leads kent alleen de kosten van Google Ads, Meta Ads en LinkedIn Ads (uit
-- windsor_advertenties). Een aantal kanalen kost wél geld, maar levert geen kostendata:
-- Gaspedaal (`gaspedaal.nl / referral`) is na Google Ads een van de grootste bronnen en wordt
-- per maand gefactureerd, net als bijvoorbeeld een abonnement op een andere autoportal. In
-- GA4 staat dat verkeer als "referral", dus het telde tot nu toe als gratis.
--
-- Met deze tabel vult de eigenaar per bron/medium per maand een bedrag in (de knop
-- "Kostenverdeling" op het tabblad Leads). Dat bedrag wordt bij het lezen verdeeld over de
-- leads die in die maand via die bron/medium binnenkwamen (lib/leads/kanaalkosten.ts).
--
-- WAAROM DEZE SLEUTEL
-- `bron_medium` is de session_source_medium zoals GA4 hem levert, letterlijk zoals hij in
-- windsor_ga4_verkeer en windsor_ga4_leads staat ("gaspedaal.nl / referral"). Zo koppelt
-- een regel hier zonder vertaaltabel. `maand` is altijd de eerste dag van de maand.
-- Leeg = geen kosten: er staat dan geen rij (een bedrag van nul wordt niet bewaard).
create table if not exists dataloket.lead_kanaalkosten (
  bron_medium     text not null,
  maand           date not null check (maand = date_trunc('month', maand)::date),
  bedrag          numeric(12, 2) not null check (bedrag > 0),
  aangemaakt_door uuid,
  aangemaakt_op   timestamptz not null default now(),
  bijgewerkt_door uuid,
  bijgewerkt_op   timestamptz not null default now(),
  primary key (bron_medium, maand)
);

comment on table dataloket.lead_kanaalkosten is
  'Handmatige kosten per GA4-sessiebron/medium en maand (bv. de maandfactuur van Gaspedaal), ingevuld op het tabblad Leads. Worden verdeeld over de leads van die bron/medium in die maand. maand is altijd de eerste dag van de maand.';

alter table dataloket.lead_kanaalkosten enable row level security;

-- Zelfde opzet als budget_doelen: de app schrijft met de sessie van de gebruiker (de route
-- laat alleen de eigenaar toe, zie lib/beperkteTabbladen.ts), wie wat invulde blijft
-- herleidbaar via bijgewerkt_door.
drop policy if exists lead_kanaalkosten_lezen on dataloket.lead_kanaalkosten;
create policy lead_kanaalkosten_lezen on dataloket.lead_kanaalkosten
  for select to authenticated using (true);

drop policy if exists lead_kanaalkosten_toevoegen on dataloket.lead_kanaalkosten;
create policy lead_kanaalkosten_toevoegen on dataloket.lead_kanaalkosten
  for insert to authenticated with check (aangemaakt_door = auth.uid());

drop policy if exists lead_kanaalkosten_wijzigen on dataloket.lead_kanaalkosten;
create policy lead_kanaalkosten_wijzigen on dataloket.lead_kanaalkosten
  for update to authenticated using (true) with check (true);

drop policy if exists lead_kanaalkosten_verwijderen on dataloket.lead_kanaalkosten;
create policy lead_kanaalkosten_verwijderen on dataloket.lead_kanaalkosten
  for delete to authenticated using (true);

grant select, insert, update, delete on dataloket.lead_kanaalkosten to authenticated;

-- De leadroute leest met de read-only rol (metVerbinding), net als de leads zelf. Grant én
-- policy, zie 0017.
grant select on dataloket.lead_kanaalkosten to dataloket_lezer;

drop policy if exists lead_kanaalkosten_lezen_rol on dataloket.lead_kanaalkosten;
create policy lead_kanaalkosten_lezen_rol on dataloket.lead_kanaalkosten
  for select to dataloket_lezer using (true);

create or replace function dataloket.stempel_lead_kanaalkosten()
returns trigger
language plpgsql
security definer
set search_path = dataloket
as $$
begin
  new.bijgewerkt_op := now();
  return new;
end;
$$;

drop trigger if exists lead_kanaalkosten_stempel on dataloket.lead_kanaalkosten;
create trigger lead_kanaalkosten_stempel
  before update on dataloket.lead_kanaalkosten
  for each row execute function dataloket.stempel_lead_kanaalkosten();
