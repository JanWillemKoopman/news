-- Marketing analyse: HRM campagne, VELOO als eigen cluster
--
-- WAAROM DIT BESTAAT
-- Besluit van de eigenaar, 27 november 2026: VELOO hoort niet bij het cluster Van den Udenhout maar
-- staat apart. Het maandrapport toont voortaan drie clusters: Van den Udenhout (VDU, Instra, Caromi),
-- PGZ (Porsche Groep Zuid, Porsche Centrum Maastricht, PGZ, Bentley Maastricht) en VELOO.
--
-- WAT ER VERANDERT
-- Versie 3 van de prompt van de opzet HRM campagne (...0006): versie 2 (migratie 0054) met alleen de
-- clusterregels aangepast. Idempotent: opnieuw draaien voegt geen tweede versie 3 toe.

insert into dataloket.marketing_analyse_prompts (opzet_id, versie, inhoud, opgeslagen_door)
select opzet_id, 3,
       replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(inhoud, $r$En dat steeds **apart voor Van den Udenhout en voor PGZ** (zie Clusters).$r$, $r$En dat steeds **apart voor Van den Udenhout, PGZ en VELOO** (zie Clusters).$r$), $r$Elk hoofdcijfer staat er voor de hele groep én apart voor twee clusters:$r$, $r$Elk hoofdcijfer staat er voor de hele groep én apart voor drie clusters:$r$), $r$en Caromi (Meta "Van den Udenhout", Google Ads "Udenhout") en VELOO (Meta "Veloo"). Sollicitaties: udenhout.nl.$r$, $r$en Caromi (Meta "Van den Udenhout", Google Ads "Udenhout"). Sollicitaties: udenhout.nl.$r$), $r$de Porsche-sites en Bentley meten geen sollicitaties.
$r$, $r$de Porsche-sites en Bentley meten geen sollicitaties.
- **VELOO** (besluit van de eigenaar, 27 november 2026: apart, niet bij Van den Udenhout): Meta "Veloo"; geen Google Ads-werving. veloo.nl meet geen sollicitaties: "niet gemeten", nooit 0.
$r$), $r$(eerst de bedrijven van Van den Udenhout, dan die van PGZ)$r$, $r$(eerst Van den Udenhout, dan VELOO, dan PGZ; VELOO is één bedrijf en krijgt geen subtotaal)$r$), $r$  5. De opvallendste verschuiving of het belangrijkste gat in de data.$r$, $r$  5. VELOO in de focusmaand: leads en kosten per lead, met het verschil; zet de opvallendste verschuiving of het belangrijkste gat in de data in de toelichting of in een bevinding.$r$), $r$Tabel **Van den Udenhout** en tabel **PGZ**, elk met$r$, $r$Tabellen **Van den Udenhout**, **PGZ** en **VELOO**, elk met$r$), $r$(bij PGZ: pgz.nl)$r$, $r$(bij PGZ: pgz.nl; bij VELOO "niet gemeten")$r$), $r$reeksen Groep, Van den Udenhout en PGZ$r$, $r$reeksen Groep, Van den Udenhout, PGZ en VELOO$r$), $r$reeksen Van den Udenhout en PGZ$r$, $r$reeksen Van den Udenhout, PGZ en VELOO$r$), $r$Van den Udenhout in de focusmaand; PGZ in de focusmaand;$r$, $r$Van den Udenhout in de focusmaand; PGZ in de focusmaand; VELOO in de focusmaand;$r$), $r$PGZ: leads in de focusmaand (met de vergelijkingsmaand).$r$, $r$PGZ: leads in de focusmaand (met de vergelijkingsmaand); VELOO: leads in de focusmaand (met de vergelijkingsmaand).$r$), $r$apart voor Van den Udenhout en PGZ in de bevindingen$r$, $r$apart voor Van den Udenhout, PGZ en VELOO in de bevindingen$r$),
       null
from dataloket.marketing_analyse_prompts
where opzet_id = '7d0c0000-0000-4000-8000-000000000006' and versie = 2
  and not exists (
    select 1 from dataloket.marketing_analyse_prompts
    where opzet_id = '7d0c0000-0000-4000-8000-000000000006' and versie = 3
  );
