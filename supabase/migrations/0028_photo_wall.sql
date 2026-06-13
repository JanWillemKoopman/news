-- 0028_photo_wall.sql
-- Live fotomuur voor bruiloftsgasten: gasten uploaden foto's via een publieke
-- link; foto's verschijnen real-time op een groot scherm en op ieders telefoon.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. TABELLEN
-- ────────────────────────────────────────────────────────────────────────────

create table public.photo_wall_settings (
  id              uuid        default gen_random_uuid() primary key,
  wedding_id      uuid        not null references public.weddings(id) on delete cascade,
  is_active       boolean     not null default false,
  title           text        not null default 'Foto''s van onze bruiloft',
  moderation_required boolean not null default false,
  require_name    boolean     not null default false,
  guests_can_download boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint photo_wall_settings_wedding_id_unique unique (wedding_id)
);

create table public.photo_wall_photos (
  id           uuid        default gen_random_uuid() primary key,
  wedding_id   uuid        not null references public.weddings(id) on delete cascade,
  storage_path text        not null,
  url          text        not null,
  guest_name   text,
  message      text,
  is_approved  boolean     not null default true,
  is_featured  boolean     not null default false,
  uploaded_at  timestamptz not null default now()
);

-- Indexen
create index idx_photo_wall_settings_wedding_id
  on public.photo_wall_settings (wedding_id);
create index idx_photo_wall_photos_wedding_id
  on public.photo_wall_photos (wedding_id);
create index idx_photo_wall_photos_wedding_uploaded
  on public.photo_wall_photos (wedding_id, uploaded_at desc);

-- Updated_at trigger (hergebruik bestaande functie)
create trigger photo_wall_settings_updated_at
  before update on public.photo_wall_settings
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- 2. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────────────────────

alter table public.photo_wall_settings enable row level security;
alter table public.photo_wall_photos    enable row level security;

-- Settings: leden mogen lezen en bewerken
create policy "pws_select_members" on public.photo_wall_settings
  for select to authenticated
  using (public.is_wedding_member(wedding_id));

create policy "pws_insert_members" on public.photo_wall_settings
  for insert to authenticated
  with check (public.is_wedding_member(wedding_id));

create policy "pws_update_edit" on public.photo_wall_settings
  for update to authenticated
  using (public.can_edit(wedding_id, 'website'))
  with check (public.can_edit(wedding_id, 'website'));

-- Photos: anon mag goedgekeurde foto's lezen (nodig voor Realtime subscriptions)
create policy "pwp_select_anon" on public.photo_wall_photos
  for select to anon
  using (is_approved = true);

-- Leden mogen alle foto's lezen (inclusief nog niet goedgekeurde)
create policy "pwp_select_members" on public.photo_wall_photos
  for select to authenticated
  using (public.is_wedding_member(wedding_id));

-- INSERT wordt uitsluitend via de API-route gedaan met de service-role key;
-- geen INSERT-policy voor anon/authenticated nodig.

-- Leden kunnen foto's goedkeuren, uitlichten en bijwerken
create policy "pwp_update_edit" on public.photo_wall_photos
  for update to authenticated
  using (public.can_edit(wedding_id, 'website'))
  with check (public.can_edit(wedding_id, 'website'));

-- Leden kunnen foto's verwijderen
create policy "pwp_delete_edit" on public.photo_wall_photos
  for delete to authenticated
  using (public.can_edit(wedding_id, 'website'));

-- ────────────────────────────────────────────────────────────────────────────
-- 3. REALTIME
-- ────────────────────────────────────────────────────────────────────────────

alter table public.photo_wall_photos    replica identity full;
alter table public.photo_wall_settings  replica identity full;

alter publication supabase_realtime add table public.photo_wall_photos;
alter publication supabase_realtime add table public.photo_wall_settings;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. STORAGE
-- ────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photo-wall',
  'photo-wall',
  true,
  10485760,  -- 10 MB (client comprimeert naar <3 MB vóór upload)
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Publieke leestoegang (bucket is public; URLs werken direct)
create policy "photo_wall_public_read" on storage.objects
  for select to public
  using (bucket_id = 'photo-wall');

-- Leden kunnen bestanden van eigen bruiloft verwijderen
create policy "photo_wall_members_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photo-wall'
    and (storage.foldername(name))[1] in (
      select w.id::text
      from public.weddings w
      join public.wedding_members m on m.wedding_id = w.id
      where m.user_id = (select auth.uid())
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 5. PUBLIEKE RPC (SECURITY DEFINER — omzeilt RLS voor publieke toegang)
-- ────────────────────────────────────────────────────────────────────────────

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
  -- Zoek bruiloft via slug
  select w.id, w.partner1_naam, w.partner2_naam, w.trouwdatum
    into v_wedding_id, v_partner1, v_partner2, v_trouwdatum
  from public.website_content wc
  join public.weddings w on w.id = wc.wedding_id
  where wc.slug = p_slug
  limit 1;

  if not found then
    return null;
  end if;

  -- Instellingen ophalen (hoeft niet verplicht te bestaan)
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
        'guestsCanDownload',  v_settings.guests_can_download
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
