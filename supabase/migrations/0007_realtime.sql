-- =====================================================================
-- Realtime: live samenwerking binnen één bruiloft.
-- =====================================================================
-- replica identity full zorgt dat DELETE/UPDATE het volledige OUDE record
-- meesturen (incl. wedding_id). Nodig om realtime te filteren op wedding_id
-- én om de juiste rij uit de store te verwijderen bij een DELETE.
alter table public.weddings        replica identity full;
alter table public.guests          replica identity full;
alter table public.tasks           replica identity full;
alter table public.vendors         replica identity full;
alter table public.budget_items    replica identity full;
alter table public.schedule_items  replica identity full;
alter table public.tables          replica identity full;
alter table public.website_content replica identity full;

-- Voeg de tabellen toe aan de Supabase realtime-publicatie. RLS blijft gelden:
-- een ingelogde client ontvangt alleen wijzigingen op rijen die hij mag SELECTen.
alter publication supabase_realtime add table
  public.weddings,
  public.guests,
  public.tasks,
  public.vendors,
  public.budget_items,
  public.schedule_items,
  public.tables,
  public.website_content;
