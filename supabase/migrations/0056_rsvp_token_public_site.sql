-- =====================================================================
-- Trouwwebsite RSVP fase 1: de persoonlijke /rsvp/[token]-link toont
-- voortaan dezelfde thematische site (get_public_website_v2/get_public_website)
-- als de publieke /trouwen/[slug]-route — volledige pariteit (alle blokken,
-- paginanavigatie), niet alleen kleur/lettertype — met een personalisatielaag
-- in het RSVP-blok. resolve_rsvp_guest geeft alleen de slug + gastgegevens
-- terug (nooit de token zelf), waarna de Next.js-route dezelfde gedeelde
-- site-data-functie aanroept die de publieke route ook gebruikt. Bevestigen
-- gaat via de bestaande submit_rsvp(p_token, p_payload) — die matcht op
-- token, dus zonder de naam-ambiguïteit van submit_rsvp_by_name.
--
-- get_public_wedding (oorspronkelijk 0005, herzien in 0055 voor een eigen,
-- versimpelde RSVP-pagina) heeft na deze migratie geen aanroepers meer: de
-- route gebruikt voortaan resolve_rsvp_guest + de gedeelde site-data-laag.
-- get_rsvp_unlock_meta/auto-unlock uit 0055 blijven wél in gebruik — die
-- ontgrendelen de wachtwoord-beveiligde publieke site automatisch voor een
-- gast die via zijn persoonlijke link binnenkomt, ongeacht welke pagina hij
-- daar te zien krijgt.
-- =====================================================================

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
      'rsvpSubmittedAt', v_guest.rsvp_submitted_at
    )
  );
end;
$$;
revoke all on function public.resolve_rsvp_guest(text) from public;
grant execute on function public.resolve_rsvp_guest(text) to anon, authenticated;

-- get_public_wedding is vervangen door resolve_rsvp_guest + de gedeelde
-- publieke site-data (zie lib/bruiloft/publicSite.ts) en heeft geen
-- aanroepers meer.
drop function if exists public.get_public_wedding(text);
