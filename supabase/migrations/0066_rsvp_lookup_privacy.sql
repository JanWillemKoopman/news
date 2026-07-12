-- =====================================================================
-- Fix (audit 2026-07-11): find_guest_by_name lekte privégegevens.
--
-- De self-service RSVP laat een gast zichzelf opzoeken op voornaam +
-- achternaam (naast de persoonlijke /rsvp/[token]-link). De RPC gaf daarbij
-- óók de dieetwensen, partnernaam, het aantal kinderen en de huidige
-- RSVP-status terug. Iedereen die een gepubliceerde slug kent en een naam kan
-- raden, kon zo die privégegevens uitlezen.
--
-- Die velden zijn niet nodig om het RSVP-formulier te starten: de gast vult ze
-- zelf (opnieuw) in. We geven ze daarom niet langer terug, maar wél neutrale
-- defaults zodat het client-contract (themes/shared.tsx → GevondenGast)
-- ongewijzigd blijft. De found/multiple-logica verandert niet.
--
-- De persoonlijke tokenlink (resolve_rsvp_guest) blijft wél personaliseren:
-- daar bewijst het onraadbare token de identiteit van de gast.
-- =====================================================================

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

  -- Bewust GEEN privégegevens meer: neutrale defaults houden het
  -- client-contract intact zonder dieetwensen/partner/status te lekken.
  return jsonb_build_object(
    'found', true,
    'multiple', false,
    'guest', jsonb_build_object(
      'voornaam',        v_guest.voornaam,
      'achternaam',      v_guest.achternaam,
      'rsvpStatus',      'uitgenodigd',
      'dieetwensen',     '',
      'heeftPartner',    false,
      'partnerNaam',     '',
      'aantalKinderen',  0
    )
  );
end;
$$;

revoke all on function public.find_guest_by_name(text, text, text) from public;
grant execute on function public.find_guest_by_name(text, text, text) to anon, authenticated;
