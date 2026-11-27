-- Marketing analyse: standaardset lead-events in GA4 (semantic layer versie 13)
--
-- WAAROM DIT BESTAAT
-- Besluit van de eigenaar, 27 november 2026. Bij een doel in "leads" zonder soort ("Alle vormen van
-- leads in GA4") telde een Campagne analyse alle lead-events behalve vacature, HMODH, nieuwsbrief en
-- de werkplaatsplanner. Dat is te ruim. Nu telt alleen de standaardset: generate_lead_proefrit,
-- _offerte, _privatelease, _private_lease, _zakelijk_lease, _zakelijk_offerte, _leasecontact en
-- _financiering. Andere events tellen alleen als het doel ze expliciet noemt.
--
-- WAT ER KOMT
-- Een nieuwe versie van de semantic layer: de vorige met dezelfde tekstwijzigingen als in
-- lib/marketingAnalyse/standaardSemantiek.ts (blok Algemeen, regel 4 van "Leads bij een Campagne
-- analyse", en blok Google Analytics 4, "Leads tegen het doel"; houd ze gelijk).
-- Alleen als de laatste versie de oude teksten nog bevat, dus nooit twee keer. Is een tekst in het
-- dashboard inmiddels met de hand aangepast, dan matcht de oude regel niet en komt er geen versie:
-- pas die dan in het dashboard aan (knop Semantic layer).
--
-- De hoofdprompt van de opzet Campagne analyse (standaardPrompt.ts) is een aparte tabel en staat hier
-- niet in; die past de eigenaar in het dashboard aan (Analyse prompts).

insert into dataloket.marketing_analyse_semantiek (versie, inhoud, opgeslagen_door)
select s.versie + 1,
       jsonb_set(
         jsonb_set(
           s.inhoud,
           '{blokken,algemeen}',
           to_jsonb(replace((s.inhoud->'blokken'->>'algemeen'),
$o$"leads" of geen soort → alle autoleads. Noem in de analyse$o$,
$n$"leads" of geen soort → de standaardset van acht lead-events (proefrit, offerte, private lease ×2, zakelijke lease, zakelijke offerte, leasecontact, financiering; zie het blok Google Analytics 4), andere events alleen als het doel ze expliciet noemt. Noem in de analyse$n$))
         ),
         '{blokken,ga4}',
         to_jsonb(replace((s.inhoud->'blokken'->>'ga4'),
$o$- **"leads" of geen soort (alle autoleads)**: alle lead-events uit de lijst hierboven, behalve generate_lead_vacature, generate_lead_HMODH ("Houd me op de hoogte"), generate_lead_nieuwsbrief en bedanktpagina_werkplaatsplanner; die noem je apart.$o$,
$n$- **"leads" of geen soort (standaardset, besluit van de eigenaar, 27 november 2026)**: alleen deze acht events tellen standaard als lead: generate_lead_proefrit, generate_lead_offerte, generate_lead_privatelease, generate_lead_private_lease, generate_lead_zakelijk_lease, generate_lead_zakelijk_offerte, generate_lead_leasecontact en generate_lead_financiering.
- **Alle andere lead-events tellen niet mee** in het leadcijfer tegen het doel, ook niet als ze "lead" in de naam hebben: generate_lead_contact, generate_lead_overige, generate_lead_inruilwaarde, generate_lead_onderhoudsofferte, generate_lead_verhuur, generate_lead_werkplaats, bedanktpagina_werkplaatsplanner, generate_lead_vacature, generate_lead_HMODH ("Houd me op de hoogte"), generate_lead_nieuwsbrief en generate_lead (zonder achtervoegsel). Noem ze wel apart in de analyse als context, niet in het cijfer tegen het doel.
- **Alleen als het doel expliciet iets anders zegt** tellen andere events mee: noemt het doel bijvoorbeeld werkplaatsafspraken, contactaanvragen, inruil of verhuur, of staat er "alle lead-events", dan tellen precies de events die het doel noemt (of bij "alle lead-events" alle events met "lead" in de naam behalve vacature, HMODH en nieuwsbrief). Noem in de analyse welke events je hebt geteld en dat het doel dat vroeg.$n$))
       ),
       null
from dataloket.marketing_analyse_semantiek s
where s.versie = (select max(versie) from dataloket.marketing_analyse_semantiek)
  and position($c$"leads" of geen soort → alle autoleads. Noem in de analyse$c$ in s.inhoud->'blokken'->>'algemeen') > 0
  and position($c$- **"leads" of geen soort (alle autoleads)**: alle lead-events uit de lijst hierboven, behalve generate_lead_vacature, generate_lead_HMODH ("Houd me op de hoogte"), generate_lead_nieuwsbrief en bedanktpagina_werkplaatsplanner; die noem je apart.$c$ in s.inhoud->'blokken'->>'ga4') > 0;
