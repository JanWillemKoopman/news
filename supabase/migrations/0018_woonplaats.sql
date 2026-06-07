-- =====================================================================
-- Woonplaats van het bruidspaar. De trouwlocatie (locatie) kan nog
-- onbekend zijn; woonplaats geeft een geografisch ankerpunt voor
-- personalisatie (AI-advies, lokale tips).
-- =====================================================================

alter table public.weddings
  add column woonplaats text not null default '';
