-- Persoonlijke RSVP-pagina (app/rsvp/[token]) krijgt voortaan de eigen
-- trouwwebsite-theme (kleur/lettertype/vormtaal + structurele thema-
-- renderer) en toont alleen introtekst + formulier — geen programma,
-- dresscode, cadeaulijst e.d. meer. get_public_wedding levert daarom de
-- theme-tokens + publicatiestatus i.p.v. de losse contentvelden die niet
-- meer getoond worden.
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
      'headerFotoUrl', v_content.header_foto_url,
      'headerOverlay', v_content.header_overlay
    ) end,
    'theme', v_content.theme,
    'fallback', jsonb_build_object(
      'thema', coalesce(v_content.thema, 'klassiek'),
      'kleurAccent', coalesce(v_content.kleur_accent, '#a75573'),
      'kopLettertype', coalesce(v_content.kop_lettertype, 'cormorant')
    ),
    'website', jsonb_build_object(
      'slug', v_content.slug,
      'gepubliceerd', coalesce(v_content.website_gepubliceerd, false)
    ),
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

-- Lichte, publieke metadata-RPC voor het automatisch ontgrendelen van een
-- wachtwoord-beveiligde trouwwebsite vanaf de persoonlijke RSVP-link: de
-- gast is al geverifieerd via het rsvp_token, dus hoeft het wachtwoord van
-- de site niet apart in te voeren (dat wachtwoord staat bovendien alleen
-- als onomkeerbare hash opgeslagen, zie 0050_site_password.sql).
create or replace function public.get_rsvp_unlock_meta(p_token text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_guest public.guests;
  v_content public.website_content;
begin
  select * into v_guest from public.guests
  where rsvp_token = p_token and rsvp_token_revoked = false;
  if not found then
    return null;
  end if;

  select * into v_content from public.website_content where wedding_id = v_guest.wedding_id;

  return jsonb_build_object(
    'weddingId', v_guest.wedding_id,
    'sitePasswordVereist', case
      when v_content.id is null then false
      else coalesce(v_content.site_password_enabled, false) and v_content.site_password is not null
    end
  );
end;
$$;
revoke all on function public.get_rsvp_unlock_meta(text) from public;
grant execute on function public.get_rsvp_unlock_meta(text) to anon, authenticated;
