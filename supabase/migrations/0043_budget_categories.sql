-- Sta custom budgetcategorieën toe, net als bij leveranciers (0036). Elk
-- bruidspaar beheert voortaan een eigen lijst budgetcategorieën
-- (toevoegen/verwijderen) op de bruiloft zelf, los van de vaste
-- suggestielijst in de UI.
alter table public.budget_items drop constraint if exists budget_items_categorie_check;

alter table public.weddings
  add column budget_categorieen jsonb not null default '[
    "locatie", "catering", "kleding", "fotografie en video", "muziek",
    "bloemen en decoratie", "vervoer", "taart", "uitnodigingen en drukwerk",
    "ringen", "overig"
  ]'::jsonb;
