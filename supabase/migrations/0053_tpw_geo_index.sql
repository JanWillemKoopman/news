-- Index voor het geografisch zoeken op /bruiloft/ontdekken: de zoek-API
-- filtert altijd eerst op categorie en daarna op een lat/lon-bounding-box,
-- en de categorie-tellingen tellen per categorie. Eén samengestelde index
-- dekt beide paden. Idempotent en puur een versneller — de query's werken
-- ook zonder deze index, alleen trager.

create index if not exists idx_tpw_businesses_categorie_lat_lon
  on public.tpw_businesses (categorie, lat, lon);
