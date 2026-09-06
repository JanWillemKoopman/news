-- Profielen: naam + avatar per collega, ingesteld via Instellingen. Getoond bij
-- aantekeningen (zie 0005_campagne_notities.sql) zodat zichtbaar is wie welke learning
-- heeft toegevoegd, en in de sidebar als gebruikersprofiel.
--
-- Eén rij per auth.users-account. Een trigger maakt bij het aanmaken van een account
-- automatisch een lege profielrij aan (naam = het deel vóór de @ in het e-mailadres),
-- zodat een net aangemaakte collega altijd al een naam heeft, ook vóórdat die zelf naar
-- Instellingen is geweest.

create table if not exists dataloket.profielen (
  id            uuid primary key references auth.users (id) on delete cascade,
  naam          text,
  avatar_url    text,
  bijgewerkt_op timestamptz not null default now()
);

comment on table dataloket.profielen is
  'Naam en avatarafbeelding per collega. Gedeeld leesbaar (nodig om aantekeningen aan een naam te koppelen), alleen de eigenaar mag zijn eigen rij wijzigen.';

alter table dataloket.profielen enable row level security;

drop policy if exists profielen_lezen on dataloket.profielen;
create policy profielen_lezen on dataloket.profielen
  for select to authenticated using (true);

drop policy if exists profielen_eigen_aanmaken on dataloket.profielen;
create policy profielen_eigen_aanmaken on dataloket.profielen
  for insert to authenticated with check (id = auth.uid());

drop policy if exists profielen_eigen_wijzigen on dataloket.profielen;
create policy profielen_eigen_wijzigen on dataloket.profielen
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

grant select, insert, update on dataloket.profielen to authenticated;

create or replace function dataloket.stempel_profiel()
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

drop trigger if exists profiel_stempel on dataloket.profielen;
create trigger profiel_stempel
  before update on dataloket.profielen
  for each row execute function dataloket.stempel_profiel();

-- Automatisch een profielrij aanmaken zodra een account wordt aangemaakt (via de
-- Supabase-auth, of via scripts/maak-gebruiker.ts).
create or replace function dataloket.nieuw_profiel()
returns trigger
language plpgsql
security definer
set search_path = dataloket
as $$
begin
  insert into dataloket.profielen (id, naam)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function dataloket.nieuw_profiel();

-- Avatarafbeeldingen: publieke bucket (het zijn alleen profielfoto's van collega's, dus
-- geen gevoelige data), maar iedereen mag alleen bestanden in zijn eigen map (de
-- user-id als mapnaam) uploaden of wijzigen.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists avatars_lezen on storage.objects;
create policy avatars_lezen on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists avatars_eigen_uploaden on storage.objects;
create policy avatars_eigen_uploaden on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_eigen_bijwerken on storage.objects;
create policy avatars_eigen_bijwerken on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_eigen_verwijderen on storage.objects;
create policy avatars_eigen_verwijderen on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
