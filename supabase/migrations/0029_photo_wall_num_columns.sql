-- 0029_photo_wall_num_columns.sql
-- Voeg aantal kolommen toe als instelbare waarde in de fotomuur-instellingen.

alter table public.photo_wall_settings
  add column num_columns smallint not null default 3
    constraint photo_wall_settings_num_columns_check check (num_columns between 1 and 4);

-- Herdefinieer get_photo_wall zodat numColumns wordt meegestuurd
create or replace function public.get_photo_wall(p_slug text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wedding_id  uuid;
  v_partner1    text;
  v_partner2    text;
  v_trouwdatum  date;
  v_settings    record;
begin
  select w.id, w.partner1_naam, w.partner2_naam, w.trouwdatum
    into v_wedding_id, v_partner1, v_partner2, v_trouwdatum
  from public.website_content wc
  join public.weddings w on w.id = wc.wedding_id
  where wc.slug = p_slug
  limit 1;

  if not found then
    return null;
  end if;

  select * into v_settings
  from public.photo_wall_settings
  where wedding_id = v_wedding_id;

  return json_build_object(
    'weddingId',    v_wedding_id,
    'partner1Naam', v_partner1,
    'partner2Naam', v_partner2,
    'trouwdatum',   v_trouwdatum,
    'settings',     case
      when v_settings.id is not null then json_build_object(
        'isActive',           v_settings.is_active,
        'title',              v_settings.title,
        'moderationRequired', v_settings.moderation_required,
        'requireName',        v_settings.require_name,
        'guestsCanDownload',  v_settings.guests_can_download,
        'numColumns',         v_settings.num_columns
      )
      else null
    end,
    'photos', coalesce(
      (
        select json_agg(
          json_build_object(
            'id',         p.id,
            'url',        p.url,
            'guestName',  p.guest_name,
            'message',    p.message,
            'isFeatured', p.is_featured,
            'uploadedAt', p.uploaded_at
          )
          order by p.uploaded_at desc
        )
        from public.photo_wall_photos p
        where p.wedding_id = v_wedding_id
          and p.is_approved = true
      ),
      '[]'::json
    )
  );
end;
$$;

grant execute on function public.get_photo_wall(text) to anon, authenticated, service_role;
