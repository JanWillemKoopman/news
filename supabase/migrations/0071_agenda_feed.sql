-- =====================================================================
-- agenda_shares: de agenda-koppeling (ICS-abonnement) per bruiloft. Eén
-- token per bruiloft; de feed op /api/agenda/[token] toont de trouwdag,
-- leveranciersafspraken, taak-deadlines en betaaltermijnen. Zelfde
-- aan/uit-model als draaiboek_shares: rij bestaat = koppeling actief,
-- verwijderen maakt de link per direct ongeldig.
--
-- Rechten: élk lid van de bruiloft mag de koppeling beheren — de feed
-- bundelt gegevens uit meerdere modules (taken/budget/leveranciers) en
-- toont niets wat een lid in de app niet ook al kan zien; er is dus geen
-- enkele module-permissie die hier logisch leidend is.
-- =====================================================================

create table public.agenda_shares (
  wedding_id uuid primary key references public.weddings(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.agenda_shares enable row level security;

create policy agenda_shares_select on public.agenda_shares
  for select to authenticated
  using (public.is_wedding_member(wedding_id) or public.is_platform_admin());
create policy agenda_shares_insert on public.agenda_shares
  for insert to authenticated
  with check (public.is_wedding_member(wedding_id));
create policy agenda_shares_delete on public.agenda_shares
  for delete to authenticated
  using (public.is_wedding_member(wedding_id));

grant select, insert, delete on public.agenda_shares to authenticated;
revoke all on public.agenda_shares from anon;

-- Server-autoritatief: created_by is altijd de ingelogde gebruiker (zelfde
-- patroon als draaiboek_shares_prepare in 0069).
create or replace function public.agenda_shares_prepare()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_by := auth.uid();
  return new;
end;
$$;

create trigger trg_agenda_shares_prepare before insert on public.agenda_shares
  for each row execute function public.agenda_shares_prepare();

alter table public.agenda_shares replica identity full;
alter publication supabase_realtime add table public.agenda_shares;
