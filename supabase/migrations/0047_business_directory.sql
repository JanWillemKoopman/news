-- =====================================================================
-- Schone, publieke leveranciersdirectory (businesses).
--
-- Bevat uitsluitend feitelijke bedrijfsgegevens: naam, categorie, adres,
-- contactgegevens en geo-coördinaten. Bewust GEEN kolommen voor ratings,
-- reviews, prijzen, foto's, tags, slugs of externe id's — die data mag
-- niet gedeeld worden en kan hier dus ook structureel niet in terechtkomen.
--
-- `omschrijving` start leeg en wordt later door de eigenaar zelf gevuld
-- (AI-gegenereerde tekst); het sync-proces schrijft dit veld nooit.
--
-- De herkomst-administratie staat in business_source_map: een koppeltabel
-- die alleen voor de service-role leesbaar is, zodat de bron van een rij
-- voor gebruikers van de API niet te achterhalen is.
-- =====================================================================

create table public.businesses (
  id uuid primary key default gen_random_uuid(),

  naam text not null default '',
  categorie text not null default 'overig',

  -- Adres & geografie.
  straat text not null default '',
  postcode text not null default '',
  plaats text not null default '',
  provincie text not null default '',
  land text not null default '',
  lat numeric,
  lon numeric,

  -- Contact.
  telefoon text not null default '',
  email text not null default '',
  website text not null default '',

  -- Eigen (AI-)tekst; wordt nooit door de sync overschreven.
  omschrijving text,

  -- Full-text zoekvector (Nederlands), onderhouden via trigger — zelfde
  -- patroon als suppliers (0021): geen generated column mogelijk omdat de
  -- text->regconfig-lookup STABLE is, niet IMMUTABLE.
  search_vector tsvector,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- pg_trgm bestaat al (0021_suppliers.sql).
create index idx_businesses_search on public.businesses using gin (search_vector);
create index idx_businesses_naam_trgm on public.businesses using gin (naam gin_trgm_ops);
create index idx_businesses_categorie on public.businesses (categorie);
create index idx_businesses_provincie on public.businesses (provincie);
create index idx_businesses_plaats on public.businesses (plaats);

create trigger trg_businesses_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();

create or replace function public.businesses_set_search_vector()
returns trigger
language plpgsql
as $$
begin
  new.search_vector := to_tsvector('dutch',
    coalesce(new.naam, '') || ' ' ||
    coalesce(new.categorie, '') || ' ' ||
    coalesce(new.plaats, '') || ' ' ||
    coalesce(new.provincie, '') || ' ' ||
    coalesce(new.omschrijving, '')
  );
  return new;
end;
$$;

create trigger trg_businesses_search_vector
  before insert or update on public.businesses
  for each row execute function public.businesses_set_search_vector();

-- RLS: alleen-lezen directory voor ingelogde gebruikers; schrijven gebeurt
-- uitsluitend via de service-role (sync), die RLS omzeilt.
alter table public.businesses enable row level security;

create policy businesses_select
  on public.businesses
  for select to authenticated
  using (true);

grant select on public.businesses to authenticated;

-- =====================================================================
-- Herkomst-mapping: uitsluitend voor de service-role. RLS aan zonder
-- policies + ingetrokken grants = dubbel slot; anon/authenticated kunnen
-- deze tabel op geen enkele manier lezen of schrijven.
-- =====================================================================
create table public.business_source_map (
  bron text not null,
  extern_id text not null,
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (bron, extern_id)
);

alter table public.business_source_map enable row level security;
revoke all on public.business_source_map from public, anon, authenticated;

-- =====================================================================
-- Idempotente sync vanuit de brontabel. De brontabel bestaat alleen in de
-- live database (niet in verse omgevingen), daarom is alles hieronder
-- gegate op to_regclass. Aanroepbaar via scripts/sync-businesses.mjs
-- (service-role); de migratie draait de eerste kopie direct.
-- =====================================================================
do $$
begin
  if to_regclass('public.tpw_businesses') is not null then
    execute $fn$
      create or replace function public.sync_businesses_from_source()
      returns void
      language plpgsql
      security definer
      set search_path = public
      as $body$
      begin
        -- Insert: bronrijen zonder mapping. businesses-rij en map-entry
        -- ontstaan atomisch samen, dus een re-run maakt geen wezen aan.
        with nieuw as (
          select gen_random_uuid() as id, t.tpw_id, t.naam, t.categorie,
                 t.straat, t.postcode, t.plaats, t.provincie, t.land,
                 t.telefoon, t.email, t.website, t.lat, t.lon
          from public.tpw_businesses t
          where coalesce(t.naam, '') <> ''
            and not exists (
              select 1 from public.business_source_map m
              where m.bron = 'import-a' and m.extern_id = t.tpw_id::text)
        ),
        ins as (
          insert into public.businesses
            (id, naam, categorie, straat, postcode, plaats, provincie, land,
             telefoon, email, website, lat, lon)
          select id, coalesce(naam, ''), coalesce(categorie, 'overig'),
                 coalesce(straat, ''), coalesce(postcode, ''), coalesce(plaats, ''),
                 coalesce(provincie, ''), coalesce(land, ''), coalesce(telefoon, ''),
                 coalesce(email, ''), coalesce(website, ''),
                 nullif(lat::text, '')::numeric, nullif(lon::text, '')::numeric
          from nieuw
        )
        insert into public.business_source_map (bron, extern_id, business_id)
        select 'import-a', tpw_id::text, id from nieuw;

        -- Update: alleen de gekopieerde feitelijke velden; omschrijving
        -- (eigen tekst) blijft altijd staan.
        update public.businesses b set
          naam = coalesce(t.naam, ''),
          categorie = coalesce(t.categorie, 'overig'),
          straat = coalesce(t.straat, ''),
          postcode = coalesce(t.postcode, ''),
          plaats = coalesce(t.plaats, ''),
          provincie = coalesce(t.provincie, ''),
          land = coalesce(t.land, ''),
          telefoon = coalesce(t.telefoon, ''),
          email = coalesce(t.email, ''),
          website = coalesce(t.website, ''),
          lat = nullif(t.lat::text, '')::numeric,
          lon = nullif(t.lon::text, '')::numeric
        from public.business_source_map m
        join public.tpw_businesses t on t.tpw_id::text = m.extern_id
        where m.bron = 'import-a' and b.id = m.business_id
          and row(b.naam, b.categorie, b.straat, b.postcode, b.plaats, b.provincie,
                  b.land, b.telefoon, b.email, b.website) is distinct from
              row(coalesce(t.naam, ''), coalesce(t.categorie, 'overig'), coalesce(t.straat, ''),
                  coalesce(t.postcode, ''), coalesce(t.plaats, ''), coalesce(t.provincie, ''),
                  coalesce(t.land, ''), coalesce(t.telefoon, ''), coalesce(t.email, ''),
                  coalesce(t.website, ''));
      end;
      $body$;
    $fn$;

    execute 'revoke all on function public.sync_businesses_from_source() from public, anon, authenticated';
    execute 'grant execute on function public.sync_businesses_from_source() to service_role';

    -- Eenmalige initiële kopie.
    perform public.sync_businesses_from_source();
  end if;
end $$;
