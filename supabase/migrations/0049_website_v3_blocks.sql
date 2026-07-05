-- =====================================================================
-- Website v3: theme-engine + blokkenmodel (fase 1 van trouwwebsite 2.0).
-- Zie trouwwebsite-roadmap.md. Voegt toe:
--   * website_content.theme (jsonb design-tokens; null = afleiden uit
--     de bestaande thema/kleur_accent/kop_lettertype-kolommen)
--   * website_pages: pagina's met elk een geordende lijst blokken (jsonb)
--   * get_public_website_v2(p_slug): publieke RPC voor het nieuwe model
-- De oude kolommen en get_public_website blijven bestaan als legacy-pad
-- voor sites die nog niet naar blokken zijn geconverteerd.
-- =====================================================================

-- --- Theme-tokens op website_content ----------------------------------
alter table public.website_content
  add column if not exists theme jsonb;

-- --- Nieuwe tabel: website_pages --------------------------------------
create table if not exists public.website_pages (
  id         uuid        primary key default gen_random_uuid(),
  wedding_id uuid        not null references public.weddings(id) on delete cascade,
  titel      text        not null default '',
  page_slug  text        not null default '', -- '' = homepagina
  volgorde   integer     not null default 0,
  zichtbaar  boolean     not null default true,
  blocks     jsonb       not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wedding_id, page_slug)
);
create index if not exists idx_website_pages_wedding on public.website_pages(wedding_id);

-- drop/create i.p.v. create-alleen: triggers en policies kennen geen
-- "if not exists" in Postgres, dit maakt het bestand veilig herhaalbaar.
drop trigger if exists trg_website_pages_updated_at on public.website_pages;
create trigger trg_website_pages_updated_at before update on public.website_pages
  for each row execute function public.set_updated_at();

alter table public.website_pages enable row level security;

-- RLS: zelfde grenzen als website_content/website_fotos (module 'website').
drop policy if exists wp_select on public.website_pages;
create policy wp_select on public.website_pages for select to authenticated
  using (public.can_view(wedding_id, 'website'));
drop policy if exists wp_insert on public.website_pages;
create policy wp_insert on public.website_pages for insert to authenticated
  with check (public.can_edit(wedding_id, 'website'));
drop policy if exists wp_update on public.website_pages;
create policy wp_update on public.website_pages for update to authenticated
  using (public.can_edit(wedding_id, 'website')) with check (public.can_edit(wedding_id, 'website'));
drop policy if exists wp_delete on public.website_pages;
create policy wp_delete on public.website_pages for delete to authenticated
  using (public.can_edit(wedding_id, 'website'));

-- Realtime: wijzigingen live naar de editor (patroon uit 0010). Postgres
-- kent geen "add table if not exists" voor publicaties, dus checken we
-- eerst of de tabel er al in zit.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'website_pages'
  ) then
    alter publication supabase_realtime add table public.website_pages;
  end if;
end $$;

-- --- Publieke RPC v2 ---------------------------------------------------
-- Retourneert null wanneer de site niet gepubliceerd is OF nog geen
-- zichtbare pagina's heeft (dan valt de route terug op get_public_website).
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
      'id',       p.id,
      'titel',    p.titel,
      'pageSlug', p.page_slug,
      'volgorde', p.volgorde,
      'blocks',   p.blocks
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
    -- Fallback voor sites zonder expliciete theme-tokens: de legacy
    -- preset-velden waaruit de client een theme afleidt.
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
