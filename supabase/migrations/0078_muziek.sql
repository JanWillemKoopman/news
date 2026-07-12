-- =====================================================================
-- Muziek: nummers verzamelen per moment van de dag (ceremonie, borrel,
-- diner, feest) plus een "niet draaien"-lijst voor de DJ.
--
-- Drie onderdelen:
--   1. Nieuwe module 'muziek' in de rechten-matrix (eigen tabblad onder
--      Plannen; rollen krijgen er net als bij moodboard aparte rechten voor).
--   2. music_tracks: de nummers zelf. Eigen nummers van het paar staan
--      direct op 'goedgekeurd'; wat gasten via de RSVP aandragen komt
--      binnen als 'voorgesteld' (bron 'gast') en het paar beslist — het
--      bruidspaar houdt vetorecht over de dansvloer.
--   3. music_shares + get_public_muziek: één publieke deel-link per
--      bruiloft zodat de DJ (of band) de actuele lijst kan inzien zonder
--      account — zelfde aan/uit-model als draaiboek_shares (0069).
--
-- De RSVP-flow blijft hetzelfde ene verzoeknummer-veld (0073); de
-- submit-functies schrijven de wens voortaan óók als suggestie in
-- music_tracks, zodat alles op de Muziek-pagina samenkomt.
-- =====================================================================

-- --- 1. Rechten-matrix uitbreiden -------------------------------------
alter table public.wedding_role_permissions
  drop constraint if exists wedding_role_permissions_module_check;
alter table public.wedding_role_permissions
  add constraint wedding_role_permissions_module_check
  check (module in (
    'dashboard', 'taken', 'budget', 'leveranciers', 'gasten',
    'website', 'draaiboek', 'tafels', 'registry', 'beheer', 'moodboard',
    'muziek'
  ));

-- Seed-functie bijwerken zodat nieuwe bruiloften muziek-rechten krijgen
-- (zelfde functie als 0003/0062/0077; alleen de insert-lijst breidt uit).
create or replace function public.add_creator_as_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := coalesce(new.created_by, auth.uid());
begin
  if v_uid is not null then
    insert into public.wedding_members (wedding_id, user_id, role)
    values (new.id, v_uid, 'owner')
    on conflict do nothing;
  end if;

  insert into public.wedding_role_permissions (wedding_id, role, module, level)
  values
    (new.id, 'planner', 'dashboard', 'view'),
    (new.id, 'planner', 'taken', 'edit'),
    (new.id, 'planner', 'draaiboek', 'edit'),
    (new.id, 'planner', 'tafels', 'edit'),
    (new.id, 'planner', 'gasten', 'view'),
    (new.id, 'planner', 'leveranciers', 'view'),
    (new.id, 'planner', 'budget', 'none'),
    (new.id, 'planner', 'website', 'none'),
    (new.id, 'planner', 'registry', 'view'),
    (new.id, 'planner', 'moodboard', 'edit'),
    (new.id, 'planner', 'muziek', 'edit'),
    (new.id, 'planner', 'beheer', 'none'),
    (new.id, 'helper', 'dashboard', 'view'),
    (new.id, 'helper', 'taken', 'edit'),
    (new.id, 'helper', 'draaiboek', 'view'),
    (new.id, 'helper', 'tafels', 'none'),
    (new.id, 'helper', 'gasten', 'none'),
    (new.id, 'helper', 'leveranciers', 'none'),
    (new.id, 'helper', 'budget', 'none'),
    (new.id, 'helper', 'website', 'none'),
    (new.id, 'helper', 'registry', 'none'),
    (new.id, 'helper', 'moodboard', 'view'),
    (new.id, 'helper', 'muziek', 'edit'),
    (new.id, 'helper', 'beheer', 'none'),
    (new.id, 'viewer', 'dashboard', 'view'),
    (new.id, 'viewer', 'taken', 'view'),
    (new.id, 'viewer', 'draaiboek', 'view'),
    (new.id, 'viewer', 'tafels', 'view'),
    (new.id, 'viewer', 'gasten', 'none'),
    (new.id, 'viewer', 'leveranciers', 'none'),
    (new.id, 'viewer', 'budget', 'none'),
    (new.id, 'viewer', 'website', 'none'),
    (new.id, 'viewer', 'registry', 'none'),
    (new.id, 'viewer', 'moodboard', 'view'),
    (new.id, 'viewer', 'muziek', 'view'),
    (new.id, 'viewer', 'beheer', 'none')
  on conflict do nothing;

  return new;
end;
$$;

-- Backfill: bestaande bruiloften krijgen dezelfde muziek-defaults. Helper
-- mag bewerken (muziek verzamelen is bij uitstek iets voor getuigen), net
-- als bij taken.
insert into public.wedding_role_permissions (wedding_id, role, module, level)
select w.id, r.role, 'muziek', r.level
from public.weddings w
cross join (values ('planner', 'edit'), ('helper', 'edit'), ('viewer', 'view')) as r(role, level)
on conflict do nothing;

-- --- 2. music_tracks ---------------------------------------------------
-- Eén platte lijst per bruiloft; `moment` bepaalt de sectie op de pagina.
-- 'niet_draaien' is bewust een moment en geen aparte tabel: het gedraagt
-- zich identiek (toevoegen, opmerking, verwijderen) en de DJ leest het als
-- gewoon nog een sectie van dezelfde lijst.
create table public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  titel text not null,
  artiest text not null default '',
  moment text not null default 'feest'
    check (moment in ('ceremonie', 'borrel', 'diner', 'feest', 'niet_draaien')),
  -- Vrije notitie voor de DJ ("openingsdans", "vader-dochterdans", ...).
  opmerking text not null default '',
  -- Optionele link naar Spotify/YouTube; puur ter referentie, we embedden niets.
  url text not null default '',
  -- 'gast' = via de RSVP aangedragen; gast_naam/guest_id zeggen door wie.
  -- guest_id is set-null zodat de wens blijft staan als de gast verdwijnt.
  bron text not null default 'paar' check (bron in ('paar', 'gast')),
  gast_naam text not null default '',
  guest_id uuid references public.guests(id) on delete set null,
  -- Gastsuggesties komen binnen als 'voorgesteld'; het paar keurt goed of
  -- verwijdert. Eigen nummers zijn meteen 'goedgekeurd'.
  status text not null default 'goedgekeurd'
    check (status in ('voorgesteld', 'goedgekeurd')),
  volgorde integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_music_tracks_wedding on public.music_tracks(wedding_id, moment, volgorde);

alter table public.music_tracks enable row level security;

create policy music_tracks_select on public.music_tracks
  for select to authenticated
  using (public.is_wedding_member(wedding_id) or public.is_platform_admin());
create policy music_tracks_insert on public.music_tracks
  for insert to authenticated
  with check (public.can_edit(wedding_id, 'muziek'));
create policy music_tracks_update on public.music_tracks
  for update to authenticated
  using (public.can_edit(wedding_id, 'muziek'))
  with check (public.can_edit(wedding_id, 'muziek'));
create policy music_tracks_delete on public.music_tracks
  for delete to authenticated
  using (public.can_edit(wedding_id, 'muziek'));

grant select, insert, update, delete on public.music_tracks to authenticated;
revoke all on public.music_tracks from anon;

-- Server-autoritatief: created_by is altijd de ingelogde gebruiker (zelfde
-- patroon als mood_board_items_prepare in 0077). RSVP-suggesties lopen via
-- SECURITY DEFINER-functies en hebben geen auth.uid(); daar blijft
-- created_by dan null — precies goed, de gast ís geen app-gebruiker.
create or replace function public.music_tracks_prepare()
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

create trigger trg_music_tracks_prepare before insert on public.music_tracks
  for each row execute function public.music_tracks_prepare();

alter table public.music_tracks replica identity full;
alter publication supabase_realtime add table public.music_tracks;

-- --- 3. music_shares: de lijst delen met de DJ -------------------------
-- Eén share per bruiloft: rij bestaat = delen staat aan; verwijderen maakt
-- de link per direct ongeldig. Eigen tabel en geen kolom op weddings, om
-- dezelfde reden als draaiboek_shares (0069): delen moet ook kunnen voor
-- een lid met alleen muziek-rechten.
create table public.music_shares (
  wedding_id uuid primary key references public.weddings(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.music_shares enable row level security;

create policy music_shares_select on public.music_shares
  for select to authenticated
  using (public.is_wedding_member(wedding_id) or public.is_platform_admin());
create policy music_shares_insert on public.music_shares
  for insert to authenticated
  with check (public.can_edit(wedding_id, 'muziek'));
create policy music_shares_delete on public.music_shares
  for delete to authenticated
  using (public.can_edit(wedding_id, 'muziek'));

grant select, insert, delete on public.music_shares to authenticated;
revoke all on public.music_shares from anon;

create or replace function public.music_shares_prepare()
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

create trigger trg_music_shares_prepare before insert on public.music_shares
  for each row execute function public.music_shares_prepare();

alter table public.music_shares replica identity full;
alter publication supabase_realtime add table public.music_shares;

-- =====================================================================
-- get_public_muziek: leest de muzieklijst voor de publieke deelpagina
-- (/muziek/[token]) — anon-aanroepbaar, SECURITY DEFINER, en geeft
-- uitsluitend goedgekeurde nummers + namen/datum terug. Nog niet
-- beoordeelde gastsuggesties blijven privé tot het paar ze goedkeurt.
-- =====================================================================

create or replace function public.get_public_muziek(p_token uuid)
returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare
  v_wedding_id uuid;
  v_result jsonb;
begin
  select wedding_id into v_wedding_id
  from public.music_shares
  where token = p_token;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'partner1Naam', w.partner1_naam,
    'partner2Naam', w.partner2_naam,
    'trouwdatum', w.trouwdatum,
    'tracks', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'titel', t.titel,
          'artiest', t.artiest,
          'moment', t.moment,
          'opmerking', t.opmerking,
          'url', t.url,
          'bron', t.bron,
          'gastNaam', t.gast_naam
        )
        order by t.moment, t.volgorde, t.created_at
      )
      from public.music_tracks t
      where t.wedding_id = w.id and t.status = 'goedgekeurd'
    ), '[]'::jsonb)
  )
  into v_result
  from public.weddings w
  where w.id = v_wedding_id;

  return v_result;
end;
$$;
revoke all on function public.get_public_muziek(uuid) from public;
grant execute on function public.get_public_muziek(uuid) to anon, authenticated;

-- =====================================================================
-- RSVP-koppeling: het verzoeknummer uit de RSVP (0073) belandt voortaan
-- óók als suggestie in music_tracks. Alleen bij een nieuwe of gewijzigde
-- wens (anders zou elke her-inzending een duplicaat maken); een eerdere,
-- nog niet beoordeelde suggestie van dezelfde gast wordt dan vervangen —
-- al goedgekeurde nummers blijven staan.
-- =====================================================================

create or replace function public.rsvp_verzoeknummer_naar_muziek(
  p_guest public.guests,
  p_wens text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_wens is null or p_wens = '' or p_wens = p_guest.verzoeknummer then
    return;
  end if;

  delete from public.music_tracks
  where guest_id = p_guest.id and status = 'voorgesteld';

  insert into public.music_tracks (wedding_id, titel, moment, bron, gast_naam, guest_id, status)
  values (
    p_guest.wedding_id,
    p_wens,
    'feest',
    'gast',
    trim(p_guest.voornaam || ' ' || p_guest.achternaam),
    p_guest.id,
    'voorgesteld'
  );
end;
$$;
revoke all on function public.rsvp_verzoeknummer_naar_muziek(public.guests, text) from public;

-- --- submit_rsvp: wens doorzetten naar music_tracks --------------------
create or replace function public.submit_rsvp(p_token text, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest public.guests;
  v_status text := p_payload ->> 'rsvpStatus';
  v_wens text := left(trim(coalesce(p_payload ->> 'verzoeknummer', '')), 200);
begin
  select * into v_guest from public.guests
  where rsvp_token = p_token and rsvp_token_revoked = false;
  if not found then
    raise exception 'Ongeldige of ingetrokken uitnodiging';
  end if;

  if v_status is not null and v_status not in ('bevestigd', 'afgemeld') then
    raise exception 'Ongeldige RSVP-status';
  end if;

  perform public.rsvp_verzoeknummer_naar_muziek(v_guest, v_wens);

  update public.guests set
    rsvp_status = coalesce(v_status, rsvp_status),
    dieetwensen = coalesce(p_payload ->> 'dieetwensen', dieetwensen),
    heeft_partner = coalesce((p_payload ->> 'heeftPartner')::boolean, heeft_partner),
    partner_naam = coalesce(p_payload ->> 'partnerNaam', partner_naam),
    aantal_kinderen = coalesce((p_payload ->> 'aantalKinderen')::integer, aantal_kinderen),
    verzoeknummer = coalesce(left(p_payload ->> 'verzoeknummer', 200), verzoeknummer),
    rsvp_bericht = coalesce(left(p_payload ->> 'bericht', 1000), rsvp_bericht),
    rsvp_submitted_at = now()
  where id = v_guest.id;
end;
$$;

-- --- submit_rsvp_by_name: zelfde doorzetting (naam-zoekroute) -----------
create or replace function public.submit_rsvp_by_name(
  p_slug text,
  p_voornaam text,
  p_achternaam text,
  p_payload jsonb
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_wedding_id uuid;
  v_guest      public.guests;
  v_matches    int;
  v_status     text := p_payload ->> 'rsvpStatus';
  v_wens       text := left(trim(coalesce(p_payload ->> 'verzoeknummer', '')), 200);
begin
  select wedding_id into v_wedding_id
  from public.website_content
  where slug = lower(trim(p_slug)) and website_gepubliceerd = true;

  if v_wedding_id is null then
    raise exception 'Ongeldige trouwwebsite';
  end if;

  select count(*) into v_matches
  from public.guests
  where wedding_id = v_wedding_id
    and lower(trim(voornaam)) = lower(trim(p_voornaam))
    and lower(trim(achternaam)) = lower(trim(p_achternaam));

  if v_matches <> 1 then
    raise exception 'Gast niet eenduidig gevonden';
  end if;

  select * into v_guest
  from public.guests
  where wedding_id = v_wedding_id
    and lower(trim(voornaam)) = lower(trim(p_voornaam))
    and lower(trim(achternaam)) = lower(trim(p_achternaam))
  limit 1;

  if v_status is not null and v_status not in ('bevestigd', 'afgemeld') then
    raise exception 'Ongeldige RSVP-status';
  end if;

  perform public.rsvp_verzoeknummer_naar_muziek(v_guest, v_wens);

  update public.guests set
    rsvp_status        = coalesce(v_status, rsvp_status),
    dieetwensen         = coalesce(p_payload ->> 'dieetwensen', dieetwensen),
    heeft_partner       = coalesce((p_payload ->> 'heeftPartner')::boolean, heeft_partner),
    partner_naam        = coalesce(p_payload ->> 'partnerNaam', partner_naam),
    aantal_kinderen     = coalesce((p_payload ->> 'aantalKinderen')::integer, aantal_kinderen),
    verzoeknummer       = coalesce(left(p_payload ->> 'verzoeknummer', 200), verzoeknummer),
    rsvp_bericht        = coalesce(left(p_payload ->> 'bericht', 1000), rsvp_bericht),
    rsvp_submitted_at   = coalesce(rsvp_submitted_at, now())
  where id = v_guest.id;
end;
$$;

-- --- Backfill: eerder achtergelaten RSVP-wensen worden suggesties -------
-- Gasten die vóór deze migratie al een verzoeknummer achterlieten horen
-- ook op de Muziek-pagina te verschijnen (als 'voorgesteld', het paar
-- beoordeelt ze net als nieuwe suggesties).
insert into public.music_tracks (wedding_id, titel, moment, bron, gast_naam, guest_id, status)
select
  g.wedding_id,
  left(trim(g.verzoeknummer), 200),
  'feest',
  'gast',
  trim(g.voornaam || ' ' || g.achternaam),
  g.id,
  'voorgesteld'
from public.guests g
where trim(g.verzoeknummer) <> '';
