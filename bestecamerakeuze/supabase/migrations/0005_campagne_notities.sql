-- Aantekeningen per campagne: de learnings die marketeers vastleggen terwijl ze een
-- campagne draaien of achteraf evalueren ("targeting was te breed", "creative X werkte
-- beter dan Y"). Gekoppeld op campagnenaam, niet op een campagne-id — de campagnes zelf
-- komen uit de Google Sheet en hebben geen database-record, alleen hun naam is de
-- gedeelde sleutel tussen de sheet en deze tabel.
--
-- Net als de kennisbank: gedeeld en niet per gebruiker. Eén punt per aantekening, zodat
-- de pop-up een simpele, oplopende lijst is die iedereen mag aanvullen, aanpassen of
-- opruimen.

create table if not exists dataloket.campagne_notities (
  id              uuid primary key default gen_random_uuid(),
  campagne_naam   text        not null,
  tekst           text        not null,
  aangemaakt_door uuid        not null,
  aangemaakt_op   timestamptz not null default now(),
  bijgewerkt_door uuid,
  bijgewerkt_op   timestamptz not null default now()
);

comment on table dataloket.campagne_notities is
  'Aantekeningen/learnings per campagne, ingevoerd via de pop-up op het campagnedashboard. Gekoppeld op campagne_naam (de naam uit de sheet), niet op een id.';

create index if not exists campagne_notities_campagne_idx
  on dataloket.campagne_notities (campagne_naam, aangemaakt_op);

alter table dataloket.campagne_notities enable row level security;

-- Iedereen die is ingelogd mag lezen én bijdragen: dit is gedeelde kennis over een
-- campagne, geen persoonlijke aantekening. Wie wat aanpaste blijft zichtbaar via
-- bijgewerkt_door.
drop policy if exists campagne_notities_lezen on dataloket.campagne_notities;
create policy campagne_notities_lezen on dataloket.campagne_notities
  for select to authenticated using (true);

drop policy if exists campagne_notities_toevoegen on dataloket.campagne_notities;
create policy campagne_notities_toevoegen on dataloket.campagne_notities
  for insert to authenticated with check (aangemaakt_door = auth.uid());

drop policy if exists campagne_notities_wijzigen on dataloket.campagne_notities;
create policy campagne_notities_wijzigen on dataloket.campagne_notities
  for update to authenticated using (true) with check (true);

drop policy if exists campagne_notities_verwijderen on dataloket.campagne_notities;
create policy campagne_notities_verwijderen on dataloket.campagne_notities
  for delete to authenticated using (true);

grant select, insert, update, delete on dataloket.campagne_notities to authenticated;

create or replace function dataloket.stempel_campagne_notitie()
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

drop trigger if exists campagne_notitie_stempel on dataloket.campagne_notities;
create trigger campagne_notitie_stempel
  before update on dataloket.campagne_notities
  for each row execute function dataloket.stempel_campagne_notitie();
