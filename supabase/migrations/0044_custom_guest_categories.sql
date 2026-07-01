-- Sta custom gastcategorieën en -gasttypes toe, net als bij leverancierstypes
-- (0036) en budgetcategorieën (0043). Gebruikers kunnen nu bij het
-- toevoegen/bewerken van een gast ook zelf een categorie of gasttype
-- intypen naast de vaste suggestielijst in de UI.
alter table public.guests drop constraint if exists guests_categorie_check;
alter table public.guests drop constraint if exists guests_gasttype_check;
