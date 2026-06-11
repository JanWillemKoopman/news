-- Koppeling tussen een persoonlijke vendor en de globale leveranciersdirectory.
-- Hiermee blijft "Toegevoegd" op de Ontdekken-pagina zichtbaar na herladen.
-- Nullable: handmatig toegevoegde leveranciers hebben geen directory-bron.

alter table public.vendors
  add column supplier_id uuid references public.suppliers(id) on delete set null;

create index idx_vendors_supplier on public.vendors(supplier_id);
