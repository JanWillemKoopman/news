-- =====================================================================
-- vendor_contact_requests: log van offerte-/contactaanvragen naar
-- leveranciers, zodat "Mijn leveranciers" kan tonen wanneer en wat er
-- verstuurd is. Append-only (geen update/delete-policy): het is een
-- geschiedenis, geen bewerkbare staat. Status-pipeline blijft op
-- vendors.status staan; deze tabel is er puur voor de losse contactmomenten.
-- =====================================================================

create table public.vendor_contact_requests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  type text not null check (type in ('offerte', 'contact')),
  onderwerp text not null default '',
  bericht text not null default '',
  verzonden_naar text not null default '',
  verzonden_door uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_vendor_contact_requests_vendor on public.vendor_contact_requests(vendor_id, created_at desc);
create index idx_vendor_contact_requests_wedding on public.vendor_contact_requests(wedding_id);

alter table public.vendor_contact_requests enable row level security;

-- Zelfde rechten-patroon als vendors zelf (0004_rls.sql): select = can_view,
-- insert = can_edit op de 'leveranciers'-module. Geen update/delete: append-only.
create policy vendor_contact_requests_select on public.vendor_contact_requests for select to authenticated
  using (public.can_view(wedding_id, 'leveranciers'));
create policy vendor_contact_requests_insert on public.vendor_contact_requests for insert to authenticated
  with check (public.can_edit(wedding_id, 'leveranciers'));

grant select, insert on public.vendor_contact_requests to authenticated;
revoke all on public.vendor_contact_requests from anon;

alter table public.vendor_contact_requests replica identity full;
alter publication supabase_realtime add table public.vendor_contact_requests;
