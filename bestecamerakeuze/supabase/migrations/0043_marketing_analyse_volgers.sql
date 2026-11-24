-- Marketing analyse: e-mail bij een nieuwe analyse
--
-- WAAROM DIT BESTAAT
-- Collega's (en eventueel anderen) kunnen een campagne volgen. Zodra Claude Code een nieuwe
-- versie van de analyse wegschrijft, krijgen de volgers een mail met de samenvatting en een
-- link naar de analyse. Verstuurd via het gedeelde Gmail-account (app-wachtwoord in Vercel,
-- GMAIL_GEBRUIKER en GMAIL_APP_WACHTWOORD), zie app/api/marketing-analyse/notificatie.
--
-- HOE HET LOOPT
--  1. Insert in marketing_analyse_versies → de trigger hieronder doet via pg_net een POST naar
--     /api/marketing-analyse/notificatie met alleen het analyse-id.
--  2. De route claimt de versie (notificatie_verstuurd_op van leeg naar nu), haalt de volgers op
--     en verstuurt per volger een mail met een eigen afmeldlink.
--  3. Mislukt het, dan gaat de claim terug naar leeg met de fout erbij; de nachtelijke sync
--     (/api/sync) probeert openstaande versies van de laatste zeven dagen opnieuw.
-- De route heeft geen geheim nodig: hij verstuurt alleen voor een bestaande, nog niet
-- verstuurde versie van hoogstens zeven dagen oud, en dat maar één keer. Wie hem aanroept, kan
-- dus hoogstens een mail die toch al zou komen iets eerder laten vertrekken.

create table if not exists dataloket.marketing_analyse_volgers (
  id              uuid primary key default gen_random_uuid(),
  campagne_id     uuid not null references dataloket.marketing_analyse_campagnes (id) on delete cascade,
  email           text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- Gevuld als een collega zichzelf aanmeldt (het adres van zijn account).
  gebruiker_id    uuid,
  toegevoegd_door uuid,
  toegevoegd_op   timestamptz not null default now(),
  -- Voor de afmeldlink in de mail; werkt zonder inloggen.
  afmeld_token    uuid not null default gen_random_uuid() unique
);

create unique index if not exists marketing_analyse_volgers_uniek
  on dataloket.marketing_analyse_volgers (campagne_id, lower(email));

comment on table dataloket.marketing_analyse_volgers is
  'Marketing analyse: wie een mail krijgt bij een nieuwe analyse van een campagne. Afmelden kan zonder inloggen via afmeld_token.';

alter table dataloket.marketing_analyse_volgers enable row level security;

-- Toevoegen en weghalen loopt via /api/marketing-analyse/volgers (dienstverbinding), die zelf
-- controleert wie wat mag. Direct via PostgREST mag een ingelogde gebruiker alleen lezen, en
-- dan zonder afmeld_token: wie het token heeft, kan iemand afmelden.
drop policy if exists ma_volgers_lezen on dataloket.marketing_analyse_volgers;
create policy ma_volgers_lezen on dataloket.marketing_analyse_volgers
  for select to authenticated using (true);
revoke all on dataloket.marketing_analyse_volgers from anon, authenticated;
grant select (id, campagne_id, email, gebruiker_id, toegevoegd_door, toegevoegd_op)
  on dataloket.marketing_analyse_volgers to authenticated;
grant all on dataloket.marketing_analyse_volgers to service_role;

-- Notificatiestatus per versie.
alter table dataloket.marketing_analyse_versies
  add column if not exists notificatie_verstuurd_op timestamptz,
  add column if not exists notificatie_aantal integer,
  add column if not exists notificatie_fout text;

-- Versies van vóór deze migratie gelden als afgehandeld: niemand volgde ze toen.
update dataloket.marketing_analyse_versies
   set notificatie_verstuurd_op = geanalyseerd_op, notificatie_aantal = 0
 where notificatie_verstuurd_op is null;

-- De trigger: na een nieuwe versie het dashboard laten mailen. pg_net is asynchroon, dus de
-- insert wacht er niet op; en een fout hier mag het bewaren van een analyse nooit tegenhouden.
create or replace function dataloket.marketing_analyse_meld_nieuwe_versie()
returns trigger
language plpgsql
security definer
set search_path = dataloket, public
as $$
begin
  begin
    perform net.http_post(
      url     := 'https://news-ten-chi.vercel.app/api/marketing-analyse/notificatie',
      body    := jsonb_build_object('analyseId', new.id),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  exception when others then
    -- Niet erg: de nachtelijke sync verstuurt openstaande notificaties alsnog.
    null;
  end;
  return new;
end;
$$;

drop trigger if exists marketing_analyse_nieuwe_versie on dataloket.marketing_analyse_versies;
create trigger marketing_analyse_nieuwe_versie
  after insert on dataloket.marketing_analyse_versies
  for each row execute function dataloket.marketing_analyse_meld_nieuwe_versie();
