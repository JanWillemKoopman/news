-- Chat sessions: bewaar en hervat campagne-sessies per ingelogde gebruiker.
-- Voer dit eenmalig uit in de Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nieuwe sessie',
  preview text,
  phase text not null default 'intake' check (phase in ('intake', 'planning', 'final')),
  intake_round int not null default 0,
  planning_round int not null default 0,
  selected_agents jsonb not null default '[]'::jsonb,
  messages jsonb not null default '[]'::jsonb,
  company_profile_snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_sessions_user_updated_idx
  on public.chat_sessions (user_id, updated_at desc);

alter table public.chat_sessions enable row level security;

drop policy if exists "chat_sessions_select_own" on public.chat_sessions;
create policy "chat_sessions_select_own" on public.chat_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "chat_sessions_insert_own" on public.chat_sessions;
create policy "chat_sessions_insert_own" on public.chat_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "chat_sessions_update_own" on public.chat_sessions;
create policy "chat_sessions_update_own" on public.chat_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "chat_sessions_delete_own" on public.chat_sessions;
create policy "chat_sessions_delete_own" on public.chat_sessions
  for delete using (auth.uid() = user_id);
