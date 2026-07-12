-- =====================================================================
-- Afspraken/bezichtigingen bij leveranciers. Eén (eerstvolgende) afspraak
-- per leverancier: datum + optionele tijd — bezichtiging, proeverij of
-- kennismakingsgesprek. Bewust géén aparte afsprakentabel: het mentale
-- model is "wanneer gaan we langs bij deze leverancier", historie hoort
-- in de notitie. RLS van vendors dekt deze kolommen automatisch.
-- =====================================================================

alter table public.vendors
  add column afspraak_datum date,
  add column afspraak_tijd text not null default '';

-- --- reminder_log: afspraken meenemen in de dagelijkse herinneringen --
-- Op productie bleek reminder_log (migratie 0011) nooit aangemaakt — de
-- database is destijds opgezet vanuit een schema.sql waar 0011 niet in
-- zat, waardoor de herinneringen-cron op die query faalde. Daarom hier
-- create-if-not-exists (met dezelfde definitie als 0011), gevolgd door
-- het verruimen van de checks: nieuwe soort 'afspraak' (ref_id =
-- vendors.id) en mijlpaal '0d' (de dag zelf). Een verstreken afspraak
-- krijgt bewust geen 'te-laat': die is geweest, niet te laat.
create table if not exists public.reminder_log (
  id         uuid        primary key default gen_random_uuid(),
  wedding_id uuid        not null references public.weddings(id) on delete cascade,
  soort      text        not null check (soort in ('taak', 'betaaltermijn')),
  ref_id     text        not null,  -- tasks.id, betaaltermijn.id of vendors.id
  mijlpaal   text        not null check (mijlpaal in ('7d', '1d', '14d', '3d', 'te-laat')),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  email      text        not null default '',
  sent_at    timestamptz not null default now(),
  unique (soort, ref_id, mijlpaal, user_id)
);
create index if not exists idx_reminder_log_wedding on public.reminder_log(wedding_id);

-- RLS aan, geen policies: alleen de service-role (cron) schrijft/leest.
alter table public.reminder_log enable row level security;

alter table public.reminder_log drop constraint if exists reminder_log_soort_check;
alter table public.reminder_log
  add constraint reminder_log_soort_check
  check (soort in ('taak', 'betaaltermijn', 'afspraak'));

alter table public.reminder_log drop constraint if exists reminder_log_mijlpaal_check;
alter table public.reminder_log
  add constraint reminder_log_mijlpaal_check
  check (mijlpaal in ('7d', '1d', '14d', '3d', '0d', 'te-laat'));
