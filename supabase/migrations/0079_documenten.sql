-- =====================================================================
-- Documenten: één centrale plek waar het paar alle bruiloftsbestanden
-- bewaart en organiseert — als de verkenner op een computer, met mappen.
--
-- Drie onderdelen:
--   1. Nieuwe module 'documenten' in de rechten-matrix (eigen tabblad
--      onder Plannen; documenten zijn administratie — contracten,
--      facturen — dus standaard terughoudende rechten).
--   2. document_folders + documents: eigen mappen en bestanden. De
--      bestanden staan in de PRIVATE storage-bucket 'wedding-documents'
--      (pad: <wedding_id>/documenten/<bestandsnaam>); downloads lopen via
--      signed URLs, zelfde opzet als vendor-documents (0068).
--   3. Bestaande leveranciers- en budgetdocumenten worden NIET verhuisd:
--      de Documenten-pagina toont ze als automatische systeemmappen
--      (aggregatie in de client). Eén bestand, één plek, geen kopieën.
--
-- Mappen verwijderen is bewust niet-destructief: documents.folder_id is
-- ON DELETE SET NULL, dus bestanden in een verwijderde map vallen terug
-- naar de hoofdmap in plaats van mee te verdwijnen.
-- =====================================================================

-- --- 1. Rechten-matrix uitbreiden -------------------------------------
alter table public.wedding_role_permissions
  drop constraint if exists wedding_role_permissions_module_check;
alter table public.wedding_role_permissions
  add constraint wedding_role_permissions_module_check
  check (module in (
    'dashboard', 'taken', 'budget', 'leveranciers', 'gasten',
    'website', 'draaiboek', 'tafels', 'registry', 'beheer', 'moodboard',
    'muziek', 'documenten'
  ));

-- Seed-functie bijwerken zodat nieuwe bruiloften documenten-rechten
-- krijgen (zelfde functie als 0003/0062/0077/0078; alleen de insert-lijst
-- breidt uit). Standaard terughoudend: planner kijkt mee, helper/viewer
-- niets — het gaat om contracten en facturen. De owner kan dit per
-- bruiloft verruimen via Samen plannen.
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
    (new.id, 'planner', 'muziek', 'edit'),
    (new.id, 'planner', 'documenten', 'view'),
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
    (new.id, 'helper', 'muziek', 'edit'),
    (new.id, 'helper', 'documenten', 'none'),
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
    (new.id, 'viewer', 'muziek', 'view'),
    (new.id, 'viewer', 'documenten', 'none'),
    (new.id, 'viewer', 'beheer', 'none')
  on conflict do nothing;

  return new;
end;
$$;

-- Backfill: bestaande bruiloften krijgen dezelfde documenten-defaults.
insert into public.wedding_role_permissions (wedding_id, role, module, level)
select w.id, r.role, 'documenten', r.level
from public.weddings w
cross join (values ('planner', 'view'), ('helper', 'none'), ('viewer', 'none')) as r(role, level)
on conflict do nothing;

-- --- 2. document_folders ------------------------------------------------
-- Vrije mappenboom per bruiloft; parent_id = null is de hoofdmap. Cascade
-- op parent_id ruimt submappen mee op — de bestanden zelf niet (zie
-- documents.folder_id hieronder).
create table public.document_folders (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  parent_id uuid references public.document_folders(id) on delete cascade,
  naam text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_document_folders_wedding on public.document_folders(wedding_id);

alter table public.document_folders enable row level security;

create policy document_folders_select on public.document_folders
  for select to authenticated
  using (public.is_wedding_member(wedding_id) or public.is_platform_admin());
create policy document_folders_insert on public.document_folders
  for insert to authenticated
  with check (public.can_edit(wedding_id, 'documenten'));
create policy document_folders_update on public.document_folders
  for update to authenticated
  using (public.can_edit(wedding_id, 'documenten'))
  with check (public.can_edit(wedding_id, 'documenten'));
create policy document_folders_delete on public.document_folders
  for delete to authenticated
  using (public.can_edit(wedding_id, 'documenten'));

grant select, insert, update, delete on public.document_folders to authenticated;
revoke all on public.document_folders from anon;

-- Server-autoritatief created_by + limiet van 100 mappen per bruiloft
-- (zelfde principe als vendor_documents_check_limit in 0074).
create or replace function public.document_folders_prepare()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.document_folders where wedding_id = new.wedding_id) >= 100 then
    raise exception 'Maximaal 100 mappen per bruiloft';
  end if;
  new.created_by := auth.uid();
  return new;
end;
$$;

create trigger trg_document_folders_prepare before insert on public.document_folders
  for each row execute function public.document_folders_prepare();

alter table public.document_folders replica identity full;
alter publication supabase_realtime add table public.document_folders;

-- --- 3. documents --------------------------------------------------------
-- Eigen geüploade bestanden. folder_id null = hoofdmap; ON DELETE SET NULL
-- zodat het verwijderen van een map de bestanden naar de hoofdmap
-- verplaatst in plaats van ze te vernietigen.
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  folder_id uuid references public.document_folders(id) on delete set null,
  naam text not null, -- weergavenaam (origineel bestandsnaam), hernoembaar
  storage_path text not null,
  mime_type text not null default '',
  grootte integer not null default 0, -- bytes
  geupload_door uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_documents_wedding on public.documents(wedding_id, created_at desc);
create index idx_documents_folder on public.documents(folder_id);

alter table public.documents enable row level security;

create policy documents_select on public.documents
  for select to authenticated
  using (public.is_wedding_member(wedding_id) or public.is_platform_admin());
create policy documents_insert on public.documents
  for insert to authenticated
  with check (public.can_edit(wedding_id, 'documenten'));
create policy documents_update on public.documents
  for update to authenticated
  using (public.can_edit(wedding_id, 'documenten'))
  with check (public.can_edit(wedding_id, 'documenten'));
create policy documents_delete on public.documents
  for delete to authenticated
  using (public.can_edit(wedding_id, 'documenten'));

grant select, insert, update, delete on public.documents to authenticated;
revoke all on public.documents from anon;

-- Server-autoritatief geupload_door + limiet van 200 documenten per
-- bruiloft, zodat de storage niet ongecontroleerd kan volgroeien.
create or replace function public.documents_prepare()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.documents where wedding_id = new.wedding_id) >= 200 then
    raise exception 'Maximaal 200 documenten per bruiloft';
  end if;
  new.geupload_door := auth.uid();
  return new;
end;
$$;

create trigger trg_documents_prepare before insert on public.documents
  for each row execute function public.documents_prepare();

alter table public.documents replica identity full;
alter publication supabase_realtime add table public.documents;

-- --- 4. Storage: private wedding-documents bucket ----------------------
-- Zelfde opzet en mime-lijst als vendor-documents (0068): privé,
-- 20 MB per bestand, alleen benaderbaar via RLS/signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wedding-documents',
  'wedding-documents',
  false, -- privé: alleen via RLS/signed URLs, nooit een publieke URL
  20971520, -- 20 MB
  array[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
on conflict (id) do nothing;

-- Lezen (en dus signed URLs aanmaken): alleen leden van de bruiloft.
create policy "wedding_documents_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'wedding-documents'
    and public.is_wedding_member(((storage.foldername(name))[1])::uuid)
  );

-- Uploaden: alleen wie de documenten-module mag bewerken.
create policy "wedding_documents_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'wedding-documents'
    and public.can_edit(((storage.foldername(name))[1])::uuid, 'documenten')
  );

-- Verwijderen: idem.
create policy "wedding_documents_remove" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'wedding-documents'
    and public.can_edit(((storage.foldername(name))[1])::uuid, 'documenten')
  );
