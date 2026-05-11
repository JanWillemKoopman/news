-- Klantprofielen: meerdere klanten per ingelogde gebruiker.
-- Vervangt het oude "één bedrijfsprofiel per gebruiker"-model.
-- Voer dit eenmalig uit in de Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.client_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  industry text not null default '',
  description text not null default '',
  channels jsonb not null default '[]'::jsonb,
  expertise jsonb not null default '[]'::jsonb,
  website text,
  audience text,
  usp text,
  tools text,
  budget text,
  tone_of_voice text,
  competitors text,
  goals text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_profiles_user_updated_idx
  on public.client_profiles (user_id, updated_at desc);

alter table public.client_profiles enable row level security;

drop policy if exists "client_profiles_select_own" on public.client_profiles;
create policy "client_profiles_select_own" on public.client_profiles
  for select using (auth.uid() = user_id);

drop policy if exists "client_profiles_insert_own" on public.client_profiles;
create policy "client_profiles_insert_own" on public.client_profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "client_profiles_update_own" on public.client_profiles;
create policy "client_profiles_update_own" on public.client_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "client_profiles_delete_own" on public.client_profiles;
create policy "client_profiles_delete_own" on public.client_profiles
  for delete using (auth.uid() = user_id);

-- Eenmalige migratie: kopieer bestaande company_profiles-rijen naar client_profiles.
-- Veilig: skipt gebruikers die al een client_profiles-rij hebben.
-- Defensief: werkt ongeacht of company_profiles.channels/expertise text[] of jsonb is.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'company_profiles'
  ) then
    insert into public.client_profiles (
      user_id, name, industry, description,
      channels, expertise,
      website, audience, usp, tools, budget, tone_of_voice, competitors, goals,
      updated_at, created_at
    )
    select
      cp.user_id,
      coalesce(nullif(trim(cp.name), ''), 'Mijn klant'),
      coalesce(cp.industry, ''),
      coalesce(cp.description, ''),
      coalesce(to_jsonb(cp.channels),  '[]'::jsonb),
      coalesce(to_jsonb(cp.expertise), '[]'::jsonb),
      cp.website, cp.audience, cp.usp, cp.tools, cp.budget,
      cp.tone_of_voice, cp.competitors, cp.goals,
      coalesce(cp.updated_at, now()),
      coalesce(cp.updated_at, now())
    from public.company_profiles cp
    where not exists (
      select 1 from public.client_profiles cl where cl.user_id = cp.user_id
    );
  end if;
end $$;

-- Aan chat_sessions koppelen: per sessie weten welk klantprofiel werd gebruikt.
-- Snapshot blijft in company_profile_snapshot voor backwards-compat.
alter table public.chat_sessions
  add column if not exists client_profile_id uuid references public.client_profiles(id) on delete set null;
