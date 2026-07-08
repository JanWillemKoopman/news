-- Sta custom gasttype-categorieën toe (dag/avond/ceremonie/...), net als bij
-- budgetcategorieën (0043) en leverancierscategorieën (0047). Elk bruidspaar
-- beheert voortaan een eigen lijst gasttypes (toevoegen/verwijderen) op de
-- bruiloft zelf, los van de vaste suggestielijst in de UI. guests.gasttype
-- zelf is al vrije tekst sinds 0044.
alter table public.weddings
  add column gasttype_categorieen jsonb not null default '["daggast", "avondgast", "ceremonie"]'::jsonb;
