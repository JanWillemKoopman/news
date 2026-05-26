-- =====================================================================
-- AI-gegenereerde vormgeving voor de publieke RSVP-pagina.
--
-- We slaan het thema op als JSONB-object op website_content. Validatie
-- gebeurt server-side (Zod) voor we opslaan; de DB houdt het structuur-
-- vrij zodat we het schema zonder migratie kunnen evolueren.
--
-- Vorm van theme_config (zie lib/bruiloft/theme.ts voor het Zod-schema):
--   {
--     "colors": { "primary": "339 39% 50%", ... },     -- HSL-tripletten
--     "fonts":  { "serif": "Cormorant Garamond", "sans": "Inter" },
--     "radius": "0.375rem"
--   }
-- =====================================================================

alter table public.website_content
  add column if not exists theme_config jsonb;

-- get_public_wedding moet theme_config meeleveren, zodat de publieke
-- /rsvp/[token]-pagina het thema kan toepassen zonder extra round-trip.
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
    'theme', v_content.theme_config,
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

revoke all on function public.get_public_wedding(text) from public;
grant execute on function public.get_public_wedding(text) to anon, authenticated;
