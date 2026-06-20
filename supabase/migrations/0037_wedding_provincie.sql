-- =====================================================================
-- Provincie van het bruidspaar. Vormt samen met woonplaats het
-- geografische ankerpunt voor leveranciersmatching: de bestaande
-- match-rekenregel weegt "in jullie regio" 30% mee, maar die weging
-- werkte tot nu toe alleen bij een exacte plaatsnaam-match omdat de
-- provincie nergens werd vastgelegd. Met dit veld kan de regio-match
-- ook aanslaan wanneer een leverancier in dezelfde provincie zit.
-- =====================================================================

alter table public.weddings
  add column provincie text not null default '';
