-- =====================================================================
-- SECURITY DEFINER RPC's. Dit is de ENIGE manier waarop publiek (anon)
-- of nog-niet-leden gecontroleerd bij data komen. Tabellen blijven dicht.
-- =====================================================================

-- Een uitnodiging accepteren: voegt de ingelogde gebruiker als lid toe.
create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.wedding_invites;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Niet ingelogd';
  end if;

  select * into v_invite from public.wedding_invites where token = p_token;
  if not found then
    raise exception 'Uitnodiging niet gevonden';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'Uitnodiging is al gebruikt';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'Uitnodiging is verlopen';
  end if;

  insert into public.wedding_members (wedding_id, user_id, role)
  values (v_invite.wedding_id, v_uid, v_invite.role)
  on conflict (wedding_id, user_id) do update set role = excluded.role;

  update public.wedding_invites set accepted_at = now() where id = v_invite.id;

  return v_invite.wedding_id;
end;
$$;

-- Publieke trouwwebsite: levert UITSLUITEND publieke velden + de eigen
-- RSVP-gegevens van DEZE gast. Nooit de gastenlijst/adressen/notities.
create or replace function public.get_public_wedding(p_token text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_guest public.guests;
  v_wedding public.weddings;
  v_content public.website_content;
begin
  select * into v_guest from public.guests
  where rsvp_token = p_token and rsvp_token_revoked = false;
  if not found then
    return null;
  end if;

  select * into v_wedding from public.weddings where id = v_guest.wedding_id;
  select * into v_content from public.website_content where wedding_id = v_guest.wedding_id;

  return jsonb_build_object(
    'wedding', jsonb_build_object(
      'partner1Naam', v_wedding.partner1_naam,
      'partner2Naam', v_wedding.partner2_naam,
      'trouwdatum', v_wedding.trouwdatum,
      'locatie', v_wedding.locatie
    ),
    'content', case when v_content.id is null then null else jsonb_build_object(
      'welkomsttekst', v_content.welkomsttekst,
      'dresscode', v_content.dresscode,
      'cadeaulijst', v_content.cadeaulijst,
      'hotels', v_content.hotels,
      'routebeschrijving', v_content.routebeschrijving,
      'contact', v_content.contact
    ) end,
    'schedule', coalesce((
      select jsonb_agg(jsonb_build_object(
        'tijd', s.tijd, 'titel', s.titel,
        'omschrijving', s.omschrijving, 'locatie', s.locatie
      ) order by s.tijd)
      from public.schedule_items s
      where s.wedding_id = v_guest.wedding_id and s.betrokkenen ? 'gasten'
    ), '[]'::jsonb),
    'guest', jsonb_build_object(
      'voornaam', v_guest.voornaam,
      'achternaam', v_guest.achternaam,
      'rsvpStatus', v_guest.rsvp_status,
      'dieetwensen', v_guest.dieetwensen,
      'heeftPartner', v_guest.heeft_partner,
      'partnerNaam', v_guest.partner_naam,
      'aantalKinderen', v_guest.aantal_kinderen,
      'rsvpSubmittedAt', v_guest.rsvp_submitted_at
    )
  );
end;
$$;

-- Publieke RSVP-inzending: werkt UITSLUITEND gewhiteliste velden van DEZE
-- ene gast bij. Andere payload-keys worden genegeerd.
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
    rsvp_submitted_at = now()
  where id = v_guest.id;
end;
$$;

-- Expliciete grants: niets staat standaard open voor anon.
revoke all on function public.accept_invite(text) from public;
grant execute on function public.accept_invite(text) to authenticated;

revoke all on function public.get_public_wedding(text) from public;
grant execute on function public.get_public_wedding(text) to anon, authenticated;

revoke all on function public.submit_rsvp(text, jsonb) from public;
grant execute on function public.submit_rsvp(text, jsonb) to anon, authenticated;
