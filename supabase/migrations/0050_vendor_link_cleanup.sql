-- =====================================================================
-- Nazorg: pas toepassen NADAT de nieuwe code (die business_id gebruikt)
-- draait en geverifieerd is — oudere code schrijft nog tpw_business_id
-- en zou anders breken.
--
-- Verwijdert de laatste verwijzing naar de brontabel uit het schema.
-- =====================================================================

alter table public.vendors drop column if exists tpw_business_id;

-- Optioneel (bewuste keuze eigenaar, standaard uitgeschakeld): historisch
-- is bij het overnemen van een leverancier de bron-omschrijving in
-- vendors.notitie gekopieerd. Onderstaande maakt die notities leeg voor
-- rijen die via de directory zijn toegevoegd. LET OP: dit wist ook eigen
-- aantekeningen die gebruikers daarna aan die notitie hebben toegevoegd.
--
-- update public.vendors set notitie = '' where business_id is not null;
