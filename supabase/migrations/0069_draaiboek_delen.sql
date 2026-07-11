-- =====================================================================
-- draaiboek_shares: het draaiboek delen met leveranciers/ceremoniemeester
-- via een publieke (token-)link, zonder dat de ontvanger een account nodig
-- heeft. Eén share per bruiloft: delen staat aan (rij bestaat) of uit (geen
-- rij); stoppen verwijdert de rij en maakt de link per direct ongeldig.
--
-- Bewust een eigen tabel en GEEN kolom op weddings: weddings_update vereist
-- can_edit('beheer'), terwijl delen ook moet kunnen voor een lid met alleen
-- draaiboek-rechten. Deze tabel volgt daarom de draaiboek-module, net als
-- schedule_items zelf.
-- =====================================================================

create table public.draaiboek_shares (
  wedding_id uuid primary key references public.weddings(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.draaiboek_shares enable row level security;

create policy draaiboek_shares_select on public.draaiboek_shares
  for select to authenticated
  using (public.is_wedding_member(wedding_id) or public.is_platform_admin());
create policy draaiboek_shares_insert on public.draaiboek_shares
  for insert to authenticated
  with check (public.can_edit(wedding_id, 'draaiboek'));
create policy draaiboek_shares_delete on public.draaiboek_shares
  for delete to authenticated
  using (public.can_edit(wedding_id, 'draaiboek'));

grant select, insert, delete on public.draaiboek_shares to authenticated;
revoke all on public.draaiboek_shares from anon;

-- Server-autoritatief: created_by is altijd de ingelogde gebruiker (zelfde
-- patroon als vendor_documents_prepare in 0068).
create or replace function public.draaiboek_shares_prepare()
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

create trigger trg_draaiboek_shares_prepare before insert on public.draaiboek_shares
  for each row execute function public.draaiboek_shares_prepare();

alter table public.draaiboek_shares replica identity full;
alter publication supabase_realtime add table public.draaiboek_shares;

-- =====================================================================
-- get_public_draaiboek: leest het draaiboek voor de publieke deelpagina
-- (/draaiboek/[token]) — anon-aanroepbaar, SECURITY DEFINER, en geeft
-- uitsluitend de dagindeling + namen/datum/locatie terug (geen e-mail,
-- budget of andere plannergegevens). Sorteren op dagvolgorde (05:00-anker,
-- zie lib/bruiloft/draaiboek.ts) doet de client.
-- =====================================================================

create or replace function public.get_public_draaiboek(p_token uuid)
returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare
  v_wedding_id uuid;
  v_result jsonb;
begin
  select wedding_id into v_wedding_id
  from public.draaiboek_shares
  where token = p_token;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'partner1Naam', w.partner1_naam,
    'partner2Naam', w.partner2_naam,
    'trouwdatum', w.trouwdatum,
    'locatie', w.locatie,
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'tijd', s.tijd,
          'eindtijd', s.eindtijd,
          'titel', s.titel,
          'omschrijving', s.omschrijving,
          'locatie', s.locatie,
          'betrokkenen', s.betrokkenen
        )
        order by s.tijd
      )
      from public.schedule_items s
      where s.wedding_id = w.id
    ), '[]'::jsonb)
  )
  into v_result
  from public.weddings w
  where w.id = v_wedding_id;

  return v_result;
end;
$$;
revoke all on function public.get_public_draaiboek(uuid) from public;
grant execute on function public.get_public_draaiboek(uuid) to anon, authenticated;
