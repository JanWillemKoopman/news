-- =====================================================================
-- Trouwwebsite 2.0 fase 3: RSVP-blok op de publieke trouwwebsite. Een
-- gast kan zichzelf opzoeken op voornaam + achternaam en direct
-- bevestigen, náást de bestaande persoonlijke /rsvp/[token]-links.
-- Rate-limiting (rate_limits-tabel, zie 0020_rate_limits.sql) gebeurt aan
-- de Next.js-kant in app/api/rsvp/zoek en app/api/rsvp/bevestig — deze
-- RPC's zelf doen geen rate-limiting (net als de bestaande
-- get_public_wedding/submit_rsvp).
-- =====================================================================

-- --- Opzoeken op naam --------------------------------------------------
-- Retourneert nooit de rsvp_token aan de client (die hoeft de browser
-- nooit te zien); bij >1 gelijknamige gasten laten we het aan de mens over
-- (neutrale melding) i.p.v. blind de eerste te kiezen.
create or replace function public.find_guest_by_name(p_slug text, p_voornaam text, p_achternaam text)
returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare
  v_wedding_id uuid;
  v_matches    int;
  v_guest      public.guests;
begin
  select wedding_id into v_wedding_id
  from public.website_content
  where slug = lower(trim(p_slug)) and website_gepubliceerd = true;

  if v_wedding_id is null then
    return jsonb_build_object('found', false, 'multiple', false);
  end if;

  select count(*) into v_matches
  from public.guests
  where wedding_id = v_wedding_id
    and lower(trim(voornaam)) = lower(trim(p_voornaam))
    and lower(trim(achternaam)) = lower(trim(p_achternaam))
    and trim(p_voornaam) <> '' and trim(p_achternaam) <> '';

  if v_matches = 0 then
    return jsonb_build_object('found', false, 'multiple', false);
  end if;

  if v_matches > 1 then
    return jsonb_build_object('found', false, 'multiple', true);
  end if;

  select * into v_guest
  from public.guests
  where wedding_id = v_wedding_id
    and lower(trim(voornaam)) = lower(trim(p_voornaam))
    and lower(trim(achternaam)) = lower(trim(p_achternaam))
  limit 1;

  return jsonb_build_object(
    'found', true,
    'multiple', false,
    'guest', jsonb_build_object(
      'voornaam',        v_guest.voornaam,
      'achternaam',      v_guest.achternaam,
      'rsvpStatus',      v_guest.rsvp_status,
      'dieetwensen',     v_guest.dieetwensen,
      'heeftPartner',    v_guest.heeft_partner,
      'partnerNaam',     v_guest.partner_naam,
      'aantalKinderen',  v_guest.aantal_kinderen,
      'rsvpSubmittedAt', v_guest.rsvp_submitted_at
    )
  );
end;
$$;
revoke all on function public.find_guest_by_name(text, text, text) from public;
grant execute on function public.find_guest_by_name(text, text, text) to anon, authenticated;

-- --- Bevestigen op naam --------------------------------------------------
-- Zelfde update-logica als submit_rsvp (0019_fix_rsvp_submitted_at.sql),
-- maar matcht op wedding_id (via slug) + naam i.p.v. rsvp_token. Faalt
-- (raise exception) bij 0 of >1 matches, zodat er nooit per ongeluk de
-- verkeerde gast wordt bijgewerkt.
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
    rsvp_submitted_at   = coalesce(rsvp_submitted_at, now())
  where id = v_guest.id;
end;
$$;
revoke all on function public.submit_rsvp_by_name(text, text, text, jsonb) from public;
grant execute on function public.submit_rsvp_by_name(text, text, text, jsonb) to anon, authenticated;
