-- =====================================================================
-- vendors koppelen aan de schone directory (businesses) i.p.v. de
-- afgeschermde brontabel. De oude kolom tpw_business_id blijft nog even
-- staan tot de nieuwe code draait (drop volgt in 0050).
-- =====================================================================

alter table public.vendors
  add column if not exists business_id uuid references public.businesses(id) on delete set null;

create index if not exists idx_vendors_business on public.vendors (business_id);

-- Backfill via de herkomst-mapping. De kolom tpw_business_id bestaat
-- alleen in omgevingen waar de brontabel ooit gekoppeld is (0042).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vendors'
      and column_name = 'tpw_business_id'
  ) then
    update public.vendors v
       set business_id = m.business_id
      from public.business_source_map m
     where m.bron = 'import-a'
       and v.tpw_business_id is not null
       and m.extern_id = v.tpw_business_id::text
       and v.business_id is null;
  end if;
end $$;

-- De AI-rank-cache verwijst naar de oude integer-id's; leegmaken zodat hij
-- vers regenereert op basis van de nieuwe uuid's.
delete from public.ai_supplier_rank_cache;
