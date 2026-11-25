-- Marketing analyse: e-mailadressen per automerk
--
-- WAAROM DIT BESTAAT
-- Voor een merk willen vaak dezelfde mensen een mail bij een nieuwe analyse. In plaats van die
-- adressen bij elke analyse opnieuw op te geven, staan ze één keer per merk (knop E-mail settings
-- in Marketing analyse). Komt er een analyse voor dat merk bij, dan worden die adressen meteen
-- volgers van de analyse (marketing_analyse_volgers). Daarna is het een gewone volger: weghalen bij
-- één analyse kan, en dat raakt de instelling per merk niet.
--
-- HOE HET LOOPT
--  * Nieuwe analyse (dashboard, voorgestelde analyse of Claude Code): de trigger hieronder zet de
--    adressen van het merk erbij.
--  * Het merk van een analyse verandert: de adressen van het nieuwe merk komen erbij; die van het
--    oude merk blijven staan (je kunt ze bij de analyse zelf weghalen).
--  * Een adres toevoegen bij een merk: /api/marketing-analyse/merk-mail zet het ook bij de lopende
--    analyses van dat merk (einddatum leeg of vandaag of later). Weghalen bij een merk haalt het
--    niet weg bij analyses.
--
-- Het merk is vrije tekst in de briefing ("Audi", "Škoda", "Volkswagen, Audi"). We vergelijken op
-- een sleutel zonder hoofdletters en accenten, en een merkveld met meer merken telt voor elk merk.
-- Dezelfde regels staan in TypeScript in merkSleutels (lib/marketingAnalyse/rekenen.ts, getest).

create or replace function dataloket.marketing_analyse_merk_sleutel(merk text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(regexp_replace(
      -- Hoofdletters met accent eerst zelf: lower() doet dat niet onder elke collatie.
      lower(translate(coalesce(merk, ''),
        'áàäâãåéèëêíìïîóòöôõúùüûýÿšžčřńñçłđÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÝŸŠŽČŘŃÑÇŁĐ',
        'aaaaaaeeeeiiiiooooouuuuyyszcrnncldAAAAAAEEEEIIIIOOOOOUUUUYYSZCRNNCLD')),
      '[^a-z0-9]+', ' ', 'g')),
    '')
$$;

-- Alle merksleutels in een merkveld: gesplitst op komma, puntkomma, slash, plus, & en " en ".
create or replace function dataloket.marketing_analyse_merk_sleutels(merk text)
returns text[]
language sql
immutable
as $$
  select coalesce(array_agg(distinct s) filter (where s is not null), '{}')
  from (
    select dataloket.marketing_analyse_merk_sleutel(deel) as s
    from regexp_split_to_table(coalesce(merk, ''), '\s*(,|;|/|\+|&|\s+en\s+)\s*', 'i') as deel
  ) d
$$;

create table if not exists dataloket.marketing_analyse_merk_mail (
  id              uuid primary key default gen_random_uuid(),
  -- Het merk zoals het in de lijst staat ("Škoda").
  merk            text not null check (length(trim(merk)) > 0),
  merk_sleutel    text generated always as (dataloket.marketing_analyse_merk_sleutel(merk)) stored,
  email           text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  toegevoegd_door uuid,
  toegevoegd_op   timestamptz not null default now()
);

create unique index if not exists marketing_analyse_merk_mail_uniek
  on dataloket.marketing_analyse_merk_mail (merk_sleutel, lower(email));

comment on table dataloket.marketing_analyse_merk_mail is
  'Marketing analyse: per automerk de e-mailadressen die standaard volger worden van elke nieuwe analyse voor dat merk.';

alter table dataloket.marketing_analyse_merk_mail enable row level security;

-- Schrijven loopt via /api/marketing-analyse/merk-mail (dienstverbinding), die zelf controleert
-- wie wat mag. Een ingelogde gebruiker mag direct alleen lezen.
drop policy if exists ma_merk_mail_lezen on dataloket.marketing_analyse_merk_mail;
create policy ma_merk_mail_lezen on dataloket.marketing_analyse_merk_mail
  for select to authenticated using (true);
revoke all on dataloket.marketing_analyse_merk_mail from anon, authenticated;
grant select on dataloket.marketing_analyse_merk_mail to authenticated;
grant all on dataloket.marketing_analyse_merk_mail to service_role;

-- Bij een volger: via welk merk hij erbij kwam (leeg als iemand hem zelf toevoegde).
alter table dataloket.marketing_analyse_volgers
  add column if not exists via_merk text;
grant select (via_merk) on dataloket.marketing_analyse_volgers to authenticated;

-- De adressen van de merken van één analyse als volgers erbij zetten. Bestaat het adres al als
-- volger, dan blijft die regel zoals hij is.
create or replace function dataloket.marketing_analyse_merk_mail_toepassen(p_campagne uuid)
returns integer
language plpgsql
security definer
set search_path = dataloket, public
as $$
declare
  aantal integer;
begin
  insert into dataloket.marketing_analyse_volgers (campagne_id, email, toegevoegd_door, via_merk)
  select distinct on (lower(m.email)) c.id, m.email, m.toegevoegd_door, m.merk
    from dataloket.marketing_analyse_campagnes c
    join dataloket.marketing_analyse_merk_mail m
      on m.merk_sleutel = any (dataloket.marketing_analyse_merk_sleutels(c.merk))
   where c.id = p_campagne
   order by lower(m.email), m.toegevoegd_op
  on conflict (campagne_id, lower(email)) do nothing;
  get diagnostics aantal = row_count;
  return aantal;
end;
$$;

revoke all on function dataloket.marketing_analyse_merk_mail_toepassen(uuid) from public, anon, authenticated;
grant execute on function dataloket.marketing_analyse_merk_mail_toepassen(uuid) to service_role;

create or replace function dataloket.marketing_analyse_campagne_merk_mail()
returns trigger
language plpgsql
security definer
set search_path = dataloket, public
as $$
begin
  if tg_op = 'INSERT' or new.merk is distinct from old.merk then
    begin
      perform dataloket.marketing_analyse_merk_mail_toepassen(new.id);
    exception when others then
      -- Een fout hier mag het bewaren van een briefing nooit tegenhouden.
      null;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists marketing_analyse_campagne_merk_mail on dataloket.marketing_analyse_campagnes;
create trigger marketing_analyse_campagne_merk_mail
  after insert or update of merk on dataloket.marketing_analyse_campagnes
  for each row execute function dataloket.marketing_analyse_campagne_merk_mail();
