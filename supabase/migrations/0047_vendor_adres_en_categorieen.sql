-- Adres als vrij tekstveld op leveranciers (net als notitie), en een zelf te beheren
-- lijst leverancierscategorieën per bruiloft (mirror van 0043_budget_categories.sql).
alter table public.vendors
  add column adres text not null default '';

alter table public.weddings
  add column vendor_categorieen jsonb not null default '[
    "locatie", "catering", "fotograaf", "videograaf", "dj of band",
    "bloemist", "kleding", "vervoer", "taart", "overig"
  ]'::jsonb;
