-- Marketing analyse: Maandrapport Jana, prompt versie 3 (echte analyse in de mail)
--
-- WAAROM DIT BESTAAT
-- Verzoek van de eigenaar, 27 november 2026: het dashboard blijft puur beschrijvend (aantallen, geen
-- interpretatie of advies), maar de mail bij een nieuw Maandrapport bevat per bedrijf wél een analyse van vijf tot
-- zeven zinnen: welk soort lead stijgt of daalt, uit welke kanalen een verschil in bezoek komt, wat de uitgaven en het
-- bereik verklaart. Die analyse staat in `maandrapport.bedrijven[].mailPunten` en alleen in de mail.
--
-- WAT ER VERANDERT
-- Versie 3 van de prompt van de opzet ...0007: versie 2 met een uitgebreide regel 9 (mailPunten). Idempotent.

insert into dataloket.marketing_analyse_prompts (opzet_id, versie, inhoud, opgeslagen_door)
select '7d0c0000-0000-4000-8000-000000000007', 3, $prompt$# Maandrapport Jana — resultaten per bedrijf

## Doel en lezer
Een maandrapport met alleen resultaten, voor Jana. Vier tabbladen: **Porsche Centrum Brabant, Porsche Centrum Maastricht, Bentley Maastricht en PGZ**, in die volgorde. Elk tabblad heeft precies dezelfde opzet. Het rapport gaat over de **laatste volle kalendermaand** en zet elk cijfer naast dat van de maand ervoor. Het is een nieuw format (`formaat: 4`, sleutel `maandrapport`), net als de HRM campagne en de E-mail VDU een eigen format hebben.

Welke accounts bij welk tabblad horen, hoe je een lead telt, hoe het bereik en de uitgaven gerekend worden en wat het tijdelijke jaarbudget is, staat in het blok **Maandrapport Jana** van de semantic layer. Volg dat blok.

## Wat er NIET in komt
Geen samenvatting met conclusies, geen oordelen (`oordeel`), geen bevindingen, geen aanbevelingen of acties, geen benchmarks, geen doel of voortgang, geen interpretatie van een stijging of daling. Eén uitzondering: bij de toppresterende content zegt `waarom` in één zin waarom die post de beste is. Geen Syntec-leads, geen Syntec-orders en geen `lead_kanaalkosten`: die zijn voor deze bedrijven niet van toepassing. `samenvatting.regels` is leeg, `aanbevelingen` en `secties` zijn leeg, `funnel` is `[]`. Eén aanvulling: de analyse voor de mail (`mailPunten`, hieronder). Die staat alleen in de mail; het rapport en het dashboard blijven puur beschrijvend.

## Per bedrijf (`maandrapport.bedrijven[]`, vier keer dezelfde velden)
1. **leads** (tegel): `waarde` en `vorige` = aantal online leads in de rapportmaand en de maand ervoor; `reeks` = per kalendermaand (JJJJ-MM) de laatste twaalf maanden t/m de rapportmaand; `uitsplitsing` = per soort lead (labels uit het semantic-layerblok) met `waarde` en `vorige`. Het dashboard toont die uitsplitsing bij hover en tekent de grafiek en de forecast uit `reeks`.
2. **sessies** (tegel): websitebezoeken, `waarde`, `vorige` en dezelfde `reeks`.
3. **bereik** (tegel): social media bereik = betaald + organisch; `waarde`, `vorige`; `uitsplitsing` met twee regels, **Betaald** en **Organisch** (elk met `waarde` en `vorige`); in `toelichting`: "Som van de platforms, niet ontdubbeld." Een deel dat niet bestaat (geen organisch account): `waarde` null en de reden in `toelichting`.
4. **uitgaven**: `waarde` en `vorige` (de rapportmaand en de maand ervoor), `jaarTotaal` (1 januari t/m de rapportmaand), `jaarbudget` (volgens het semantic-layerblok) en `uitsplitsing` per platform (Google Ads, Meta Ads, LinkedIn Ads).
5. **kanalen**: sessies per online kanaal, `kanaal`, `waarde` en `vorige` (de rapportmaand en de maand ervoor). De cirkel en de percentages rekent het dashboard.
6. **topContent**: de beste organische post van de maand met `kanaal`, `account`, `datum`, `titel` (hoogstens 120 tekens), `url`, `afbeelding` (data-URL), `metriek` (engagement rate in procent) en `waarom`. Zonder organisch account: `topContent` null en `topContentReden`.
7. **campagnes**: alle advertentiecampagnes met uitgaven in de maand: `campagne`, `platform`, `uitgaven`, `leads`, `cpl`, elk met `waarde` en `vorige`. Geen minimumbedrag; het dashboard sorteert op uitgaven, hoog naar laag.
8. **socialKanalen**: per organisch kanaal volgers, bereik, vertoningen, likes, reacties en posts, elk met `waarde` en `vorige`. Zonder organisch account: lege lijst en `socialReden`.
9. **mailPunten**: de analyse voor de mail die bij een nieuw rapport naar de volgers gaat: vijf tot zeven zinnen per bedrijf, als een lijst van hoogstens zeven punten van één of twee zinnen. Hier mag en moet je wél interpreteren: het dashboard beschrijft alleen, de mail verklaart. Werk zo:
   - Begin bij de leads: zeg welk soort lead stijgt of daalt (gebruik de uitsplitsing per soort) en splits een meetwijziging eruit, bijvoorbeeld de werkplaatsafspraken apart van de rest.
   - Zeg bij een stijging of daling van de websitebezoeken uit welke kanalen dat komt, met het aantal sessies per kanaal en wat dat met het aandeel doet. Koppel dat waar het kan aan de uitgaven: kosten per sessie per platform en welke campagnes meer of minder budget kregen.
   - Verklaar het bereik (betaald en organisch, welk platform of welke post) en de uitgaven (welk platform, welke campagnes), en noem de grootste verschuivingen in de campagnes (leads en kosten per lead).
   - Noem de beste organische post, als die er is.
   - Zeg eerlijk wat een meetwijziging, een uitval of een klein aantal (onder ongeveer tien) voor de conclusie betekent, en markeer een verklaring die je niet uit de cijfers kunt halen als veronderstelling ("waarschijnlijk", "een aanname").
   - Sluit af met een zin over de forecast van de leads en hoe stevig die is.
   Een korte aandachtspunt-zin mag als de data daar aanleiding toe geeft ("dat is de moeite van een controle waard"); geen uitgebreide adviezen. Gebruik dezelfde getallen en afrondingen als in het rapport; elk getal staat in het rapport of in de opgehaalde data, verzin niets. Het dashboard toont deze punten niet.

Wat niet gemeten wordt of niet bestaat is `null` met de reden in de tekst ("niet gemeten", "geen organisch account gekoppeld"), nooit 0. Een tegel met `nietGemeten` toont die tekst in plaats van een cijfer.

## Meetnotities
`bronnen` (welke accounts en properties je gebruikte) en `datakwaliteit` (waar een bron of een maand ontbrak, welke events pas later begonnen, dat de gedeelde Porsche Groep Zuid-accounts bij Porsche Centrum Brabant staan, dat de wervingscampagnes meetellen in de uitgaven en de campagnetabel, hoe het bereik is gerekend) staan ingeklapt onderaan het rapport. Alleen feiten over de data, geen oordelen.

## Kerncijfers voor het overzicht
Geef `{}` mee; een rapportage toont geen kerncijfers.$prompt$, null
where exists (select 1 from dataloket.marketing_analyse_prompts where opzet_id = '7d0c0000-0000-4000-8000-000000000007' and versie = 2)
  and not exists (select 1 from dataloket.marketing_analyse_prompts where opzet_id = '7d0c0000-0000-4000-8000-000000000007' and versie = 3);
