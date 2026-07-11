-- =====================================================================
-- vendor_documents: de documentenkluis per leverancier (offertes,
-- contracten, facturen). Metadata staat hier; de bestanden zelf staan in
-- de PRIVATE storage-bucket 'vendor-documents' (pad:
-- <wedding_id>/leveranciers/<vendor_id>/<bestandsnaam>). Downloads lopen
-- via signed URLs — de bucket is bewust niet publiek, dit zijn
-- privé-administratiestukken (anders dan wedding-media/photo-wall).
-- Rechten volgen de leveranciers-module: lezen mag elk lid van de
-- bruiloft, schrijven vereist can_edit(wedding_id, 'leveranciers') —
-- zelfde principe als vendors zelf.
-- =====================================================================

create table public.vendor_documents (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  naam text not null,
  soort text not null default 'overig'
    check (soort in ('offerte', 'contract', 'factuur', 'overig')),
  storage_path text not null,
  mime_type text not null default '',
  grootte integer not null default 0, -- bytes
  geupload_door uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_vendor_documents_wedding
  on public.vendor_documents(wedding_id, created_at desc);
create index idx_vendor_documents_vendor on public.vendor_documents(vendor_id);

alter table public.vendor_documents enable row level security;

create policy vendor_documents_select on public.vendor_documents
  for select to authenticated
  using (public.is_wedding_member(wedding_id) or public.is_platform_admin());
create policy vendor_documents_insert on public.vendor_documents
  for insert to authenticated
  with check (public.can_edit(wedding_id, 'leveranciers'));
create policy vendor_documents_delete on public.vendor_documents
  for delete to authenticated
  using (public.can_edit(wedding_id, 'leveranciers'));

grant select, insert, delete on public.vendor_documents to authenticated;
revoke all on public.vendor_documents from anon;

-- Server-autoritatief: geupload_door is altijd de ingelogde gebruiker
-- (zelfde patroon als message_reads_prepare in 0058).
create or replace function public.vendor_documents_prepare()
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

create trigger trg_vendor_documents_prepare before insert on public.vendor_documents
  for each row execute function public.vendor_documents_prepare();

alter table public.vendor_documents replica identity full;
alter publication supabase_realtime add table public.vendor_documents;

-- --- Storage: private vendor-documents bucket -------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vendor-documents',
  'vendor-documents',
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
create policy "vendor_documents_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vendor-documents'
    and public.is_wedding_member(((storage.foldername(name))[1])::uuid)
  );

-- Uploaden: alleen wie de leveranciers-module mag bewerken.
create policy "vendor_documents_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vendor-documents'
    and public.can_edit(((storage.foldername(name))[1])::uuid, 'leveranciers')
  );

-- Verwijderen: idem.
create policy "vendor_documents_remove" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vendor-documents'
    and public.can_edit(((storage.foldername(name))[1])::uuid, 'leveranciers')
  );
