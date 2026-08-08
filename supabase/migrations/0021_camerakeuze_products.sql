-- bestecamerakeuze.nl — affiliate-site voor fotocamera's, staat als eigen Next.js-project
-- in bestecamerakeuze/. Deelt dit Supabase-project met mmm-wizard en sander, maar krijgt
-- een eigen schema zodat er geen overlap met mmm.* of sander.* ontstaat.
create schema if not exists camerakeuze;

grant usage on schema camerakeuze to anon, authenticated, service_role;

-- Kolommen volgen 1-op-1 de kolommen van data/demo_cameras.csv. pros/cons staan in de CSV
-- als pijp-gescheiden string maar hier als text[], omdat we er in de UI over itereren;
-- scripts/import-csv.ts doet die split bij het inlezen.
create table camerakeuze.products (
  id text primary key,
  title text not null,
  brand text not null,
  category text not null,
  price numeric(10, 2) not null,
  old_price numeric(10, 2),
  rating numeric(2, 1),
  review_count integer not null default 0,
  image_url text,
  affiliate_url text not null,
  description text,
  specs jsonb not null default '{}'::jsonb,
  pros text[] not null default '{}',
  cons text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Filteren op merk/categorie en sorteren op prijs zijn de twee queries die de homepage
-- doet; met tien producten maakt dat niets uit, maar de feed groeit naar duizenden rijen.
create index products_brand_idx on camerakeuze.products (brand);
create index products_category_idx on camerakeuze.products (category);
create index products_price_idx on camerakeuze.products (price);

-- Productdata is publieke catalogusinformatie: iedereen mag lezen, ook uitgelogd. Schrijven
-- gaat uitsluitend via het importscript met de service_role key, die RLS overslaat — er is
-- dus bewust geen insert/update/delete policy voor anon of authenticated.
alter table camerakeuze.products enable row level security;

create policy "products_public_read" on camerakeuze.products
  for select using (true);

grant select on camerakeuze.products to anon, authenticated;

create or replace function camerakeuze.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
  before update on camerakeuze.products
  for each row execute function camerakeuze.set_updated_at();
