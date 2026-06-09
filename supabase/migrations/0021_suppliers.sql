-- =====================================================================
-- Globale leveranciersdirectory (suppliers).
--
-- Anders dan public.vendors (de leveranciers die ÉÉN bruiloft zelf
-- bijhoudt, gescoped op wedding_id) is dit een GEDEELDE catalogus van
-- alle trouwlocaties, fotografen, catering enz. in Nederland. Elk stel
-- kan erdoorheen zoeken; vanuit de UI kan een rij overgenomen worden in
-- de eigen public.vendors-lijst.
--
-- Data wordt periodiek ge-upsert via scripts/import-suppliers.mjs op
-- basis van (bron, external_id) — idempotent, dus her-import maakt geen
-- dubbele rijen aan.
-- =====================================================================

create extension if not exists pg_trgm;

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),

  -- Systeem & identificatie (samen uniek -> idempotente upsert).
  external_id text not null,
  bron text not null default '',

  -- Top-level categorie: matchbaar over alle CSV's heen en gekoppeld aan
  -- de budgetverdeling. Afgeleid bij import (locaties-CSV -> 'locatie' enz.).
  categorie text not null default 'overig' check (categorie in (
    'locatie', 'catering', 'fotograaf', 'videograaf', 'dj of band',
    'bloemist', 'kleding', 'vervoer', 'taart', 'overig'
  )),

  -- Kerninformatie. `type` = vrije sub-type-tekst uit de CSV (Kasteel,
  -- Boerderij, Strandtent, ...); wordt als label getoond.
  naam text not null default '',
  type text not null default '',
  omschrijving_kort text not null default '',

  -- Locatie & geografie.
  straat text not null default '',
  huisnummer text not null default '',
  postcode text not null default '',
  plaats text not null default '',
  provincie text not null default '',
  latitude numeric,
  longitude numeric,

  -- Capaciteit & eigenschappen.
  capaciteit_min integer not null default 0,
  capaciteit_max integer not null default 0,
  buiten_trouwen boolean not null default false,
  overnachting_mogelijk boolean not null default false,

  -- Financieel (budget-matching).
  prijs_vanaf numeric,
  prijs_tot numeric,
  prijs_indicatie_tekst text not null default '',
  is_prijs_op_aanvraag boolean not null default false,

  -- Contact & media.
  website text not null default '',
  email text not null default '',
  telefoon text not null default '',
  afbeelding_url text not null default '',

  -- AI & search.
  tags text[] not null default '{}',
  ai_context_tekst text not null default '',

  -- Full-text zoekvector (Nederlands), automatisch onderhouden.
  search_vector tsvector generated always as (
    to_tsvector('dutch',
      coalesce(naam, '') || ' ' ||
      coalesce(type, '') || ' ' ||
      coalesce(omschrijving_kort, '') || ' ' ||
      coalesce(plaats, '') || ' ' ||
      coalesce(provincie, '') || ' ' ||
      array_to_string(tags, ' ')
    )
  ) stored,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (bron, external_id)
);

-- Indexen voor filteren en zoeken bij 5k–50k rijen.
create index idx_suppliers_search on public.suppliers using gin (search_vector);
create index idx_suppliers_naam_trgm on public.suppliers using gin (naam gin_trgm_ops);
create index idx_suppliers_tags on public.suppliers using gin (tags);
create index idx_suppliers_categorie on public.suppliers (categorie);
create index idx_suppliers_provincie on public.suppliers (provincie);
create index idx_suppliers_plaats on public.suppliers (plaats);

create trigger trg_suppliers_updated_at before update on public.suppliers
  for each row execute function public.set_updated_at();

-- =====================================================================
-- RLS: globale, ALLEEN-LEZEN directory voor iedere ingelogde gebruiker.
-- Schrijven gebeurt uitsluitend via de service-role (import-script), die
-- RLS omzeilt — daarom zijn er bewust geen insert/update/delete-policies.
-- =====================================================================
alter table public.suppliers enable row level security;

create policy suppliers_select
  on public.suppliers
  for select to authenticated
  using (true);

grant select on public.suppliers to authenticated;
