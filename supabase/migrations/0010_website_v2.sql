-- =====================================================================
-- Website v2: thema, kleuren, foto-upload, secties-config, FAQ, slug.
-- Breidt website_content uit; voegt website_fotos-tabel + Storage toe.
-- =====================================================================

-- --- Uitbreidingen website_content -----------------------------------
alter table public.website_content
  add column if not exists slug                  text unique,
  add column if not exists website_gepubliceerd  boolean      not null default false,
  add column if not exists thema                 text         not null default 'klassiek',
  add column if not exists kleur_accent          text         not null default '#a75573',
  add column if not exists kop_lettertype        text         not null default 'cormorant',
  add column if not exists header_foto_url       text         not null default '',
  add column if not exists header_overlay        numeric(4,2) not null default 0.35,
  add column if not exists secties_config        jsonb        not null default '{"welkom":{"zichtbaar":true,"naam":"Welkom"},"programma":{"zichtbaar":true,"naam":"Programma"},"dresscode":{"zichtbaar":true,"naam":"Dresscode"},"cadeaulijst":{"zichtbaar":true,"naam":"Cadeaulijst"},"hotels":{"zichtbaar":true,"naam":"Overnachten"},"routebeschrijving":{"zichtbaar":true,"naam":"Route"},"contact":{"zichtbaar":true,"naam":"Contact"},"faq":{"zichtbaar":false,"naam":"FAQ"},"fotos":{"zichtbaar":false,"naam":"Foto\'s"}}',
  add column if not exists faq                   jsonb        not null default '[]',
  add column if not exists gallerij              jsonb        not null default '[]';

-- --- Nieuwe tabel: website_fotos -------------------------------------
create table if not exists public.website_fotos (
  id         uuid        primary key default gen_random_uuid(),
  wedding_id uuid        not null references public.weddings(id) on delete cascade,
  url        text        not null,
  bijschrift text        not null default '',
  volgorde   integer     not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_website_fotos_wedding on public.website_fotos(wedding_id);

alter table public.website_fotos enable row level security;

create policy wf_select on public.website_fotos for select to authenticated
  using (public.can_view(wedding_id, 'website'));
create policy wf_insert on public.website_fotos for insert to authenticated
  with check (public.can_edit(wedding_id, 'website'));
create policy wf_update on public.website_fotos for update to authenticated
  using (public.can_edit(wedding_id, 'website')) with check (public.can_edit(wedding_id, 'website'));
create policy wf_delete on public.website_fotos for delete to authenticated
  using (public.can_edit(wedding_id, 'website'));

-- --- Realtime: website_fotos toevoegen aan publicatie -----------------
alter publication supabase_realtime add table public.website_fotos;

-- --- Storage: wedding-media bucket -----------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wedding-media',
  'wedding-media',
  true,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Upload: alleen ingelogde leden van de bijbehorende bruiloft.
create policy "wedding_media_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'wedding-media'
    and (storage.foldername(name))[1] in (
      select w.id::text
      from public.weddings w
      join public.wedding_members m on m.wedding_id = w.id
      where m.user_id = auth.uid()
    )
  );

-- Lezen: publiek (foto's zijn openbaar op de trouwwebsite).
create policy "wedding_media_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'wedding-media');

-- Verwijderen: alleen eigen bruiloft-leden.
create policy "wedding_media_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'wedding-media'
    and (storage.foldername(name))[1] in (
      select w.id::text
      from public.weddings w
      join public.wedding_members m on m.wedding_id = w.id
      where m.user_id = auth.uid()
    )
  );

-- --- Hulpfunctie: slug beschikbaarheidscheck -------------------------
create or replace function public.check_slug_available(p_slug text)
returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.website_content
    where slug = lower(trim(p_slug))
  );
$$;
revoke all on function public.check_slug_available(text) from public;
grant execute on function public.check_slug_available(text) to authenticated;

-- --- Publieke trouwwebsite RPC (slug-gebaseerd, geen token nodig) ---
create or replace function public.get_public_website(p_slug text)
returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare
  v_c  public.website_content;
  v_w  public.weddings;
begin
  select * into v_c
  from public.website_content
  where slug = lower(trim(p_slug))
    and website_gepubliceerd = true;

  if not found then return null; end if;

  select * into v_w from public.weddings where id = v_c.wedding_id;

  return jsonb_build_object(
    'wedding', jsonb_build_object(
      'partner1Naam', v_w.partner1_naam,
      'partner2Naam', v_w.partner2_naam,
      'trouwdatum',   v_w.trouwdatum,
      'locatie',      v_w.locatie
    ),
    'content', jsonb_build_object(
      'thema',              v_c.thema,
      'kleurAccent',        v_c.kleur_accent,
      'kopLettertype',      v_c.kop_lettertype,
      'headerFotoUrl',      v_c.header_foto_url,
      'headerOverlay',      v_c.header_overlay,
      'welkomsttekst',      v_c.welkomsttekst,
      'dresscode',          v_c.dresscode,
      'cadeaulijst',        v_c.cadeaulijst,
      'hotels',             v_c.hotels,
      'routebeschrijving',  v_c.routebeschrijving,
      'contact',            v_c.contact,
      'faq',                v_c.faq,
      'gallerij',           v_c.gallerij,
      'sectiesConfig',      v_c.secties_config
    ),
    'schedule', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'tijd',         s.tijd,
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
revoke all on function public.get_public_website(text) from public;
grant execute on function public.get_public_website(text) to anon, authenticated;
