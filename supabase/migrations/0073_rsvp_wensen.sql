-- =====================================================================
-- RSVP-wensen: gasten kunnen bij het bevestigen een muziekwens
-- (verzoeknummer) en een persoonlijk bericht aan het bruidspaar
-- achterlaten. Twee kolommen op guests; submit_rsvp en resolve_rsvp_guest
-- nemen ze mee. find_guest_by_name blijft bewust ongemoeid: bij zoeken op
-- naam lekken we geen eerder ingevulde antwoorden (zie 0066) — prefill
-- gebeurt alleen via de persoonlijke token-link.
-- =====================================================================

alter table public.guests
  add column verzoeknummer text not null default '',
  add column rsvp_bericht text not null default '';

-- --- submit_rsvp: nieuwe payload-sleutels 'verzoeknummer' en 'bericht' --
create or replace function public.submit_rsvp(p_token text, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest public.guests;
  v_status text := p_payload ->> 'rsvpStatus';
begin
  select * into v_guest from public.guests
  where rsvp_token = p_token and rsvp_token_revoked = false;
  if not found then
    raise exception 'Ongeldige of ingetrokken uitnodiging';
  end if;

  if v_status is not null and v_status not in ('bevestigd', 'afgemeld') then
    raise exception 'Ongeldige RSVP-status';
  end if;

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

-- --- submit_rsvp_by_name: zelfde payload-uitbreiding (naam-zoekroute) ---
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

-- --- resolve_rsvp_guest: prefill via de persoonlijke link ---------------
create or replace function public.resolve_rsvp_guest(p_token text)
returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare
  v_guest public.guests;
  v_slug  text;
begin
  select * into v_guest from public.guests
  where rsvp_token = p_token and rsvp_token_revoked = false;

  if not found then
    return null;
  end if;

  select slug into v_slug
  from public.website_content
  where wedding_id = v_guest.wedding_id;

  if v_slug is null then
    return null;
  end if;

  return jsonb_build_object(
    'slug', v_slug,
    'guest', jsonb_build_object(
      'voornaam',        v_guest.voornaam,
      'achternaam',      v_guest.achternaam,
      'rsvpStatus',      v_guest.rsvp_status,
      'dieetwensen',     v_guest.dieetwensen,
      'heeftPartner',    v_guest.heeft_partner,
      'partnerNaam',     v_guest.partner_naam,
      'aantalKinderen',  v_guest.aantal_kinderen,
      'verzoeknummer',   v_guest.verzoeknummer,
      'bericht',         v_guest.rsvp_bericht,
      'rsvpSubmittedAt', v_guest.rsvp_submitted_at
    )
  );
end;
$$;
