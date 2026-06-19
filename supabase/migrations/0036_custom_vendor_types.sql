-- Sta custom leverancierscategorieën toe door de hardcoded CHECK-constraint te verwijderen.
-- Gebruikers kunnen nu eigen categorieën invullen naast de standaardlijst.
alter table public.vendors drop constraint if exists vendors_type_check;
