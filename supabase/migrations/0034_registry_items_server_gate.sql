-- Beveilig cadeaulijst-items server-side.
-- Tot nu toe gaf get_public_registry() alle items terug óók als het wachtwoord
-- vereist was; alleen de IBAN werd al gemaskeerd. Iemand met DevTools kon de
-- items zien door sessionStorage.setItem('registry_unlocked_<slug>', '1') te
-- typen, of door __NEXT_DATA__ in de paginabron te lezen.
--
-- Nu geldt: wachtwoordbeveiligde registries geven een lege itemslijst terug.
-- Items zijn pas beschikbaar via /api/registry/items (server-side
-- wachtwoordverificatie met scrypt).

create or replace function public.get_public_registry(p_slug text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_wedding_id        uuid;
  v_partner1_naam     text;
  v_partner2_naam     text;
  v_trouwdatum        date;
  v_is_enabled        boolean;
  v_password          text;
  v_intro_text        text;
  v_bank_iban         text;
  v_bank_name         text;
  v_thema             text;
  v_kleur_accent      text;
  v_kop_lettertype    text;
  v_header_foto_url   text;
  v_items             jsonb;
  v_password_protected boolean;
begin
  select w.id, w.partner1_naam, w.partner2_naam, w.trouwdatum,
         wc.thema, wc.kleur_accent, wc.kop_lettertype, wc.header_foto_url
  into v_wedding_id, v_partner1_naam, v_partner2_naam, v_trouwdatum,
       v_thema, v_kleur_accent, v_kop_lettertype, v_header_foto_url
  from public.website_content wc
  join public.weddings w on w.id = wc.wedding_id
  where wc.slug = p_slug
  limit 1;

  if not found then
    return null;
  end if;

  select is_enabled, password, intro_text, bank_account_iban, bank_account_name
  into v_is_enabled, v_password, v_intro_text, v_bank_iban, v_bank_name
  from public.registry_settings
  where wedding_id = v_wedding_id;

  if not found or not v_is_enabled then
    return jsonb_build_object('enabled', false);
  end if;

  v_password_protected := v_password is not null and v_password <> '';

  -- Items alleen ophalen als de registry NIET wachtwoordbeveiligd is.
  -- Bij wachtwoordbeveiliging zijn items pas beschikbaar na server-side
  -- verificatie via /api/registry/items.
  if not v_password_protected then
    select jsonb_agg(
      jsonb_build_object(
        'id',                ri.id,
        'type',              ri.type,
        'title',             ri.title,
        'description',       ri.description,
        'image_url',         ri.image_url,
        'shop_url',          ri.shop_url,
        'target_amount',     ri.target_amount,
        'suggested_amounts', ri.suggested_amounts,
        'payment_link',      ri.payment_link,
        'sort_order',        ri.sort_order,
        'is_reserved',       case when rr.id is not null then true else false end,
        'total_confirmed',   coalesce(rc.total_confirmed, 0),
        'total_pending',     coalesce(rc.total_pending, 0),
        'contributor_count', coalesce(rc.contributor_count, 0)
      )
      order by ri.sort_order, ri.created_at
    )
    into v_items
    from public.registry_items ri
    left join public.registry_reservations rr on rr.item_id = ri.id
    left join (
      select
        item_id,
        sum(case when payment_status = 'confirmed' then amount else 0 end) as total_confirmed,
        sum(case when payment_status = 'pending'   then amount else 0 end) as total_pending,
        count(case when payment_status in ('confirmed', 'pending') then 1 end) as contributor_count
      from public.registry_contributions
      group by item_id
    ) rc on rc.item_id = ri.id
    where ri.wedding_id = v_wedding_id
      and ri.is_visible = true;
  end if;

  return jsonb_build_object(
    'enabled',           true,
    'password_required', v_password_protected,
    'intro_text',        v_intro_text,
    'bank_account_iban', case when v_password_protected then '' else v_bank_iban end,
    'bank_account_name', case when v_password_protected then '' else v_bank_name end,
    'wedding_id',        v_wedding_id,
    'partner1_naam',     v_partner1_naam,
    'partner2_naam',     v_partner2_naam,
    'trouwdatum',        v_trouwdatum,
    'thema',             coalesce(v_thema, 'klassiek'),
    'kleur_accent',      coalesce(v_kleur_accent, '#a75573'),
    'kop_lettertype',    coalesce(v_kop_lettertype, 'cormorant'),
    'header_foto_url',   coalesce(v_header_foto_url, ''),
    'items',             coalesce(v_items, '[]'::jsonb)
  );
end;
$$;
