-- Koppeling tussen een persoonlijke vendor en de tpw_businesses directory.
-- Nullable: handmatig toegevoegde leveranciers hebben geen directory-bron.
-- De bestaande supplier_id kolom blijft behouden voor achterwaartse compatibiliteit.

alter table public.vendors
  add column if not exists tpw_business_id uuid references public.tpw_businesses(id) on delete set null;

create index if not exists idx_vendors_tpw_business on public.vendors(tpw_business_id);
