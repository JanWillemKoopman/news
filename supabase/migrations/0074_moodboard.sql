-- =====================================================================
-- Moodboard: inspiratiebeelden voor de droomfase van de planning — een
-- Pinterest-achtig bord waarop het bruidspaar (en wie ze uitnodigen) foto's
-- verzamelt en ordent. Nieuwe module 'moodboard' in de rechten-matrix,
-- zodat rollen er net als bij elke andere module apart voor ingesteld
-- kunnen worden.
-- =====================================================================

-- --- 1. Rechten-matrix uitbreiden -------------------------------------
alter table public.wedding_role_permissions
  drop constraint if exists wedding_role_permissions_module_check;
alter table public.wedding_role_permissions
  add constraint wedding_role_permissions_module_check
  check (module in (
    'dashboard', 'taken', 'budget', 'leveranciers', 'gasten',
    'website', 'draaiboek', 'tafels', 'registry', 'beheer', 'moodboard'
  ));

-- Seed-functie bijwerken zodat nieuwe bruiloften moodboard-rechten krijgen
-- (zelfde functie als 0003/0062; alleen de insert-lijst breidt uit).
create or replace function public.add_creator_as_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := coalesce(new.created_by, auth.uid());
begin
  if v_uid is not null then
    insert into public.wedding_members (wedding_id, user_id, role)
    values (new.id, v_uid, 'owner')
    on conflict do nothing;
  end if;

  insert into public.wedding_role_permissions (wedding_id, role, module, level)
  values
    (new.id, 'planner', 'dashboard', 'view'),
    (new.id, 'planner', 'taken', 'edit'),
    (new.id, 'planner', 'draaiboek', 'edit'),
    (new.id, 'planner', 'tafels', 'edit'),
    (new.id, 'planner', 'gasten', 'view'),
    (new.id, 'planner', 'leveranciers', 'view'),
    (new.id, 'planner', 'budget', 'none'),
    (new.id, 'planner', 'website', 'none'),
    (new.id, 'planner', 'registry', 'view'),
    (new.id, 'planner', 'moodboard', 'edit'),
    (new.id, 'planner', 'beheer', 'none'),
    (new.id, 'helper', 'dashboard', 'view'),
    (new.id, 'helper', 'taken', 'edit'),
    (new.id, 'helper', 'draaiboek', 'view'),
    (new.id, 'helper', 'tafels', 'none'),
    (new.id, 'helper', 'gasten', 'none'),
    (new.id, 'helper', 'leveranciers', 'none'),
    (new.id, 'helper', 'budget', 'none'),
    (new.id, 'helper', 'website', 'none'),
    (new.id, 'helper', 'registry', 'none'),
    (new.id, 'helper', 'moodboard', 'view'),
    (new.id, 'helper', 'beheer', 'none'),
    (new.id, 'viewer', 'dashboard', 'view'),
    (new.id, 'viewer', 'taken', 'view'),
    (new.id, 'viewer', 'draaiboek', 'view'),
    (new.id, 'viewer', 'tafels', 'view'),
    (new.id, 'viewer', 'gasten', 'none'),
    (new.id, 'viewer', 'leveranciers', 'none'),
    (new.id, 'viewer', 'budget', 'none'),
    (new.id, 'viewer', 'website', 'none'),
    (new.id, 'viewer', 'registry', 'none'),
    (new.id, 'viewer', 'moodboard', 'view'),
    (new.id, 'viewer', 'beheer', 'none')
  on conflict do nothing;

  return new;
end;
$$;

-- Backfill: bestaande bruiloften krijgen dezelfde moodboard-defaults.
insert into public.wedding_role_permissions (wedding_id, role, module, level)
select w.id, r.role, 'moodboard', r.level
from public.weddings w
cross join (values ('planner', 'edit'), ('helper', 'view'), ('viewer', 'view')) as r(role, level)
on conflict do nothing;

-- --- 2. mood_board_items -----------------------------------------------
-- Eén plat bord per bruiloft (geen aparte "borden"-tabel: één moodboard
-- houdt de droomfase laagdrempelig, filteren gebeurt via categorie). `url`
-- is altijd de directe afbeeldings-URL — bij een upload een publieke
-- 'wedding-media'-URL (subfolder 'moodboard', RLS daar is al op
-- wedding-lidmaatschap ingericht, zie 0010), bij een pin de rechtstreekse
-- hotlink naar de bron (bewust niet gedownload, net als Pinterest zelf).
-- Zelfde vorm als website_fotos.url/registry_items.image_url elders in dit
-- schema: één url-kolom, geen aparte storage-path-modellering.
create table public.mood_board_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  categorie text not null default 'overig',
  url text not null,
  bron text not null default 'upload' check (bron in ('upload', 'link')),
  -- Alleen bij bron='link': de paginalink waar de gebruiker 'm vandaan
  -- pinde, voor "Bekijk bron" in de lightbox.
  bron_url text,
  titel text not null default '',
  volgorde integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_mood_board_items_wedding on public.mood_board_items(wedding_id, volgorde);

alter table public.mood_board_items enable row level security;

create policy mood_board_items_select on public.mood_board_items
  for select to authenticated
  using (public.is_wedding_member(wedding_id) or public.is_platform_admin());
create policy mood_board_items_insert on public.mood_board_items
  for insert to authenticated
  with check (public.can_edit(wedding_id, 'moodboard'));
create policy mood_board_items_update on public.mood_board_items
  for update to authenticated
  using (public.can_edit(wedding_id, 'moodboard'))
  with check (public.can_edit(wedding_id, 'moodboard'));
create policy mood_board_items_delete on public.mood_board_items
  for delete to authenticated
  using (public.can_edit(wedding_id, 'moodboard'));

grant select, insert, update, delete on public.mood_board_items to authenticated;
revoke all on public.mood_board_items from anon;

-- Server-autoritatief: created_by is altijd de ingelogde gebruiker (zelfde
-- patroon als vendor_documents_prepare in 0068).
create or replace function public.mood_board_items_prepare()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_by := auth.uid();
  return new;
end;
$$;

create trigger trg_mood_board_items_prepare before insert on public.mood_board_items
  for each row execute function public.mood_board_items_prepare();

alter table public.mood_board_items replica identity full;
alter publication supabase_realtime add table public.mood_board_items;
