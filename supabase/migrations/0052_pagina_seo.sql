-- =====================================================================
-- Trouwwebsite 2.0 fase 4: SEO/OG-titel en -omschrijving per pagina.
-- Zonder deze velden gokt de publieke route een omschrijving uit het
-- eerste tekstblok van de pagina — met deze velden kan het stel dat zelf
-- bepalen (bijv. voor de RSVP- of programma-pagina).
-- =====================================================================

alter table public.website_pages
  add column if not exists seo_titel         text not null default '',
  add column if not exists seo_omschrijving   text not null default '';

-- --- get_public_website_v2 uitbreiden met de nieuwe velden -------------
create or replace function public.get_public_website_v2(p_slug text)
returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare
  v_c     public.website_content;
  v_w     public.weddings;
  v_pages jsonb;
begin
  select * into v_c
  from public.website_content
  where slug = lower(trim(p_slug))
    and website_gepubliceerd = true;

  if not found then return null; end if;

  select jsonb_agg(
    jsonb_build_object(
      'id',               p.id,
      'titel',            p.titel,
      'pageSlug',         p.page_slug,
      'volgorde',         p.volgorde,
      'blocks',           p.blocks,
      'seoTitel',         p.seo_titel,
      'seoOmschrijving',  p.seo_omschrijving
    ) order by p.volgorde
  ) into v_pages
  from public.website_pages p
  where p.wedding_id = v_c.wedding_id
    and p.zichtbaar = true;

  if v_pages is null then return null; end if;

  select * into v_w from public.weddings where id = v_c.wedding_id;

  return jsonb_build_object(
    'wedding', jsonb_build_object(
      'partner1Naam', v_w.partner1_naam,
      'partner2Naam', v_w.partner2_naam,
      'trouwdatum',   v_w.trouwdatum,
      'locatie',      v_w.locatie
    ),
    'theme', v_c.theme,
    'fallback', jsonb_build_object(
      'thema',         v_c.thema,
      'kleurAccent',   v_c.kleur_accent,
      'kopLettertype', v_c.kop_lettertype
    ),
    'pages', v_pages,
    'schedule', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'tijd',         s.tijd,
          'eindtijd',     s.eindtijd,
          'titel',        s.titel,
          'omschrijving', s.omschrijving,
          'locatie',      s.locatie
        ) order by s.tijd
      )
      from public.schedule_items s
      where s.wedding_id = v_c.wedding_id
        and s.betrokkenen ? 'gasten'
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.get_public_website_v2(text) from public;
grant execute on function public.get_public_website_v2(text) to anon, authenticated;
