-- Percentages horen niet tussen de conversie-acties.
--
-- WAAROM DIT BESTAAT
-- Windsor biedt naast elke conversie-actie ook zijn verhouding aan:
-- `conversions_from_interactions_rate` is het conversiepercentage, geen aantal
-- conversies. De sync herkende zo'n veld niet als bijzonder en zette hem gewoon bij de
-- acties in `conversie_acties`. Daardoor stond er op de Koppeltabel een regel "From
-- interactions rate — 531" die je kon aanvinken als lead, en dan werden er percentages
-- bij aantallen opgeteld.
--
-- De sync laat ze er vanaf nu buiten (`isVerhouding` in lib/windsor/velden.ts). Deze
-- migratie haalt ze uit de rijen die er al staan, want het voortschrijdende venster van
-- dertig dagen komt nooit bij de oudere rijen.
--
-- Er verandert geen enkel getoond cijfer door: Google's conversiekolom komt uit het
-- `conversions`-veld en niet uit deze jsonb, en er was niets als lead aangewezen.
update dataloket.windsor_advertenties w
   set conversie_acties = (
     select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
       from jsonb_each(w.conversie_acties) as e(key, value)
      where e.key !~ '_(rate|ratio)$'
   )
 where exists (
   select 1 from jsonb_each(w.conversie_acties) as e(key, value)
    where e.key ~ '_(rate|ratio)$'
 );

-- En uit de catalogus, zodat ze niet als lege regel in de keuzelijst blijven hangen.
-- Alleen als er niets op aangewezen staat: een verhouding die iemand tóch heeft
-- aangevinkt is een gesprek waard en hoort niet stilletjes te verdwijnen.
delete from dataloket.windsor_conversie_acties
 where veld ~ '_(rate|ratio)$'
   and not telt_als_lead
   and not telt_als_conversie;
