-- Coördinaten voor de kaartweergave op /bruiloft/leveranciers. Gevuld via
-- geocoding van vendors.adres (Nominatim/OpenStreetMap), niet handmatig
-- ingevuld; null zolang een leverancier nog niet (succesvol) gegeocodeerd is.
alter table public.vendors
  add column latitude numeric,
  add column longitude numeric;
