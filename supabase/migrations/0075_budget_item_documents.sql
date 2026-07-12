-- =====================================================================
-- budget_item_documents: documentenkluis per budgetpost (offertes,
-- contracten, facturen) — zelfde patroon als vendor_documents (0068), maar
-- gekoppeld aan budget_items in plaats van vendors. Metadata staat hier; de
-- bestanden zelf staan in de PRIVATE storage-bucket 'budget-documents' (pad:
-- <wedding_id>/budget/<budget_item_id>/<bestandsnaam>). Downloads lopen via
-- signed URLs — bewust niet publiek, dit zijn privé-administratiestukken.
-- Rechten volgen de budget-module: lezen mag elk lid van de bruiloft,
-- schrijven vereist can_edit(wedding_id, 'budget').
-- =====================================================================

create table public.budget_item_documents (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  budget_item_id uuid not null references public.budget_items(id) on delete cascade,
  naam text not null,
  soort text not null default 'overig'
    check (soort in ('offerte', 'contract', 'factuur', 'overig')),
  storage_path text not null,
  mime_type text not null default '',
  grootte integer not null default 0, -- bytes
  geupload_door uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_budget_item_documents_wedding
  on public.budget_item_documents(wedding_id, created_at desc);
create index idx_budget_item_documents_item on public.budget_item_documents(budget_item_id);

alter table public.budget_item_documents enable row level security;

create policy budget_item_documents_select on public.budget_item_documents
  for select to authenticated
  using (public.is_wedding_member(wedding_id) or public.is_platform_admin());
create policy budget_item_documents_insert on public.budget_item_documents
  for insert to authenticated
  with check (public.can_edit(wedding_id, 'budget'));
create policy budget_item_documents_delete on public.budget_item_documents
  for delete to authenticated
  using (public.can_edit(wedding_id, 'budget'));

grant select, insert, delete on public.budget_item_documents to authenticated;
revoke all on public.budget_item_documents from anon;

-- Server-autoritatief: geupload_door is altijd de ingelogde gebruiker
-- (zelfde patroon als vendor_documents_prepare in 0068).
create or replace function public.budget_item_documents_prepare()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.geupload_door := auth.uid();
  return new;
end;
$$;

create trigger trg_budget_item_documents_prepare before insert on public.budget_item_documents
  for each row execute function public.budget_item_documents_prepare();

alter table public.budget_item_documents replica identity full;
alter publication supabase_realtime add table public.budget_item_documents;

-- --- Storage: private budget-documents bucket -------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'budget-documents',
  'budget-documents',
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
create policy "budget_item_documents_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'budget-documents'
    and public.is_wedding_member(((storage.foldername(name))[1])::uuid)
  );

-- Uploaden: alleen wie de budget-module mag bewerken.
create policy "budget_item_documents_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'budget-documents'
    and public.can_edit(((storage.foldername(name))[1])::uuid, 'budget')
  );

-- Verwijderen: idem.
create policy "budget_item_documents_remove" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'budget-documents'
    and public.can_edit(((storage.foldername(name))[1])::uuid, 'budget')
  );
