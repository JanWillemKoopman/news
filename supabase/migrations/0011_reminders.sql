-- =====================================================================
-- Slimme herinneringen: e-mail vóór taak-deadlines en betaaltermijnen.
-- Idempotentie via reminder_log; opt-out per gebruiker via profiles.
-- Wordt aangestuurd door een dagelijkse cron die /api/cron/reminders
-- aanroept met de service-role (omzeilt RLS).
-- =====================================================================

-- --- Opt-out per gebruiker -------------------------------------------
alter table public.profiles
  add column if not exists email_herinneringen boolean not null default true;

-- --- Verzendlog (voorkomt dubbele herinneringen) ---------------------
-- Eén rij per (soort, ref, mijlpaal, ontvanger). De unieke sleutel
-- garandeert dat een herinnering exact één keer uitgaat.
create table if not exists public.reminder_log (
  id         uuid        primary key default gen_random_uuid(),
  wedding_id uuid        not null references public.weddings(id) on delete cascade,
  soort      text        not null check (soort in ('taak', 'betaaltermijn')),
  ref_id     text        not null,  -- tasks.id of betaaltermijn.id
  mijlpaal   text        not null check (mijlpaal in ('7d', '1d', '14d', '3d', 'te-laat')),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  email      text        not null default '',
  sent_at    timestamptz not null default now(),
  unique (soort, ref_id, mijlpaal, user_id)
);
create index if not exists idx_reminder_log_wedding on public.reminder_log(wedding_id);

-- RLS aan, geen policies: alleen de service-role (cron) schrijft/leest.
-- Gewone clients hebben hier niets te zoeken.
alter table public.reminder_log enable row level security;
