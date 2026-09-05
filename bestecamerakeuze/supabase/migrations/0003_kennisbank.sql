-- Kennisbank: bedrijfskennis die marketeers zelf onderhouden.
--
-- Verschil met het datawoordenboek in lib/dictionary/: dat beschrijft de VORM van de
-- data (welke tabellen, wat een kolom betekent) en verandert zelden, dus het hoort in
-- code. Deze tabel bevat kennis over de WERELD die de data beschrijft — welke
-- Ads-campagne bij welke mailing hoort, wanneer een actie liep, welke afspraak er
-- veranderde. Dat wijzigt wekelijks en moet zonder deploy aanpasbaar zijn.
--
-- Bewust gedeeld en niet per gebruiker: als één marketeer vastlegt dat twee campagnes
-- bij elkaar horen, klopt dat voor iedereen.

create table if not exists dataloket.kennis (
  id             uuid primary key default gen_random_uuid(),
  soort          text        not null default 'context'
                   check (soort in ('koppeling', 'definitie', 'context', 'let_op')),
  titel          text        not null,
  inhoud         text        not null,
  -- Optioneel: kennis die alleen voor een bepaalde periode geldt, bijvoorbeeld een
  -- actie die liep of een afspraak die op een datum is ingegaan.
  geldig_van     date,
  geldig_tot     date,
  -- Uitzetten zonder weggooien: handig voor kennis die tijdelijk niet van toepassing is
  -- maar die je niet kwijt wilt.
  actief         boolean     not null default true,
  aangemaakt_door uuid       not null,
  aangemaakt_op  timestamptz not null default now(),
  bijgewerkt_door uuid,
  bijgewerkt_op  timestamptz not null default now()
);

comment on table dataloket.kennis is
  'Bedrijfskennis voor de chat, onderhouden door de marketingafdeling zelf. Wordt aan de systeemprompt toegevoegd bij elke vraag.';

create index if not exists kennis_actief_idx
  on dataloket.kennis (bijgewerkt_op desc) where actief;

alter table dataloket.kennis enable row level security;

-- Iedereen die is ingelogd mag lezen én bijdragen: dit is gedeelde kennis, geen
-- persoonlijke aantekening. Wie wat aanpaste blijft zichtbaar via bijgewerkt_door.
drop policy if exists kennis_lezen on dataloket.kennis;
create policy kennis_lezen on dataloket.kennis
  for select to authenticated using (true);

drop policy if exists kennis_toevoegen on dataloket.kennis;
create policy kennis_toevoegen on dataloket.kennis
  for insert to authenticated with check (aangemaakt_door = auth.uid());

drop policy if exists kennis_wijzigen on dataloket.kennis;
create policy kennis_wijzigen on dataloket.kennis
  for update to authenticated using (true) with check (true);

drop policy if exists kennis_verwijderen on dataloket.kennis;
create policy kennis_verwijderen on dataloket.kennis
  for delete to authenticated using (true);

grant select, insert, update, delete on dataloket.kennis to authenticated;

create or replace function dataloket.stempel_kennis()
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

drop trigger if exists kennis_stempel on dataloket.kennis;
create trigger kennis_stempel
  before update on dataloket.kennis
  for each row execute function dataloket.stempel_kennis();
