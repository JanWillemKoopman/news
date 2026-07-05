-- =====================================================================
-- Trouwwebsite 2.0 fase 3: site-breed wachtwoord. Optioneel wachtwoord op
-- de HELE publieke trouwwebsite (niet alleen de cadeaulijst), server-side
-- gehandhaafd — de inhoud verlaat de server pas ná verificatie (zie
-- app/trouwen/[slug]/[[...pagina]]/page.tsx en
-- app/api/trouwen/check-password/route.ts). Zie trouwwebsite-roadmap.md.
-- =====================================================================

alter table public.website_content
  add column if not exists site_password         text,
  add column if not exists site_password_enabled  boolean not null default false;

-- --- Lichte, publieke metadata-RPC voor het wachtwoordscherm -----------
-- Retourneert alléén cosmetische velden (namen, thema/kleur/lettertype) en
-- of een wachtwoord vereist is — nooit blokken, foto's of het schedule.
-- Zo kan de servercomponent beslissen of hij het slotscherm of de echte
-- inhoud rendert, zonder de echte inhoud ooit op te hoeven halen als er
-- geen geldig ontgrendel-bewijs is.
create or replace function public.get_trouwwebsite_lock_meta(p_slug text)
returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare
  v_c public.website_content;
  v_w public.weddings;
begin
  select * into v_c
  from public.website_content
  where slug = lower(trim(p_slug))
    and website_gepubliceerd = true;

  if not found then return null; end if;

  select * into v_w from public.weddings where id = v_c.wedding_id;

  return jsonb_build_object(
    'weddingId',           v_c.wedding_id,
    'partner1Naam',        v_w.partner1_naam,
    'partner2Naam',        v_w.partner2_naam,
    'thema',               v_c.thema,
    'kleurAccent',         v_c.kleur_accent,
    'kopLettertype',       v_c.kop_lettertype,
    'theme',               v_c.theme,
    'sitePasswordVereist', (v_c.site_password_enabled and v_c.site_password is not null)
  );
end;
$$;
revoke all on function public.get_trouwwebsite_lock_meta(text) from public;
grant execute on function public.get_trouwwebsite_lock_meta(text) to anon, authenticated;
