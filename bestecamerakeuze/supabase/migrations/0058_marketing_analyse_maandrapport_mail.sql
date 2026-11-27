-- Marketing analyse: Maandrapport Jana, prompt versie 2 (zinnen voor de mail)
--
-- WAAROM DIT BESTAAT
-- Verzoek van de eigenaar, 27 november 2026: de mail bij een nieuw Maandrapport krijgt per bedrijf een korte
-- samenvatting van drie of vier zinnen met de belangrijkste uitkomsten. Het rapport zelf blijft puur
-- resultaten; de zinnen staan in `maandrapport.bedrijven[].mailPunten` en alleen in de mail
-- (lib/marketingAnalyse/mailMaandrapport.ts), niet in het dashboard.
--
-- WAT ER VERANDERT
-- Versie 2 van de prompt van de opzet ...0007: versie 1 plus het veld mailPunten. Idempotent.

insert into dataloket.marketing_analyse_prompts (opzet_id, versie, inhoud, opgeslagen_door)
select '7d0c0000-0000-4000-8000-000000000007', 2, $prompt$# Maandrapport Jana — resultaten per bedrijf

## Doel en lezer
Een maandrapport met alleen resultaten, voor Jana. Vier tabbladen: **Porsche Centrum Brabant, Porsche Centrum Maastricht, Bentley Maastricht en PGZ**, in die volgorde. Elk tabblad heeft precies dezelfde opzet. Het rapport gaat over de **laatste volle kalendermaand** en zet elk cijfer naast dat van de maand ervoor. Het is een nieuw format (`formaat: 4`, sleutel `maandrapport`), net als de HRM campagne en de E-mail VDU een eigen format hebben.

Welke accounts bij welk tabblad horen, hoe je een lead telt, hoe het bereik en de uitgaven gerekend worden en wat het tijdelijke jaarbudget is, staat in het blok **Maandrapport Jana** van de semantic layer. Volg dat blok.

## Wat er NIET in komt
Geen samenvatting met conclusies, geen oordelen (`oordeel`), geen bevindingen, geen aanbevelingen of acties, geen benchmarks, geen doel of voortgang, geen interpretatie van een stijging of daling. Eén uitzondering: bij de toppresterende content zegt `waarom` in één zin waarom die post de beste is. Geen Syntec-leads, geen Syntec-orders en geen `lead_kanaalkosten`: die zijn voor deze bedrijven niet van toepassing. `samenvatting.regels` is leeg, `aanbevelingen` en `secties` zijn leeg, `funnel` is `[]`. Eén aanvulling: de zinnen voor de mail (`mailPunten`, hieronder); die staan alleen in de mail en niet in het dashboard.

## Per bedrijf (`maandrapport.bedrijven[]`, vier keer dezelfde velden)
1. **leads** (tegel): `waarde` en `vorige` = aantal online leads in de rapportmaand en de maand ervoor; `reeks` = per kalendermaand (JJJJ-MM) de laatste twaalf maanden t/m de rapportmaand; `uitsplitsing` = per soort lead (labels uit het semantic-layerblok) met `waarde` en `vorige`. Het dashboard toont die uitsplitsing bij hover en tekent de grafiek en de forecast uit `reeks`.
2. **sessies** (tegel): websitebezoeken, `waarde`, `vorige` en dezelfde `reeks`.
3. **bereik** (tegel): social media bereik = betaald + organisch; `waarde`, `vorige`; `uitsplitsing` met twee regels, **Betaald** en **Organisch** (elk met `waarde` en `vorige`); in `toelichting`: "Som van de platforms, niet ontdubbeld." Een deel dat niet bestaat (geen organisch account): `waarde` null en de reden in `toelichting`.
4. **uitgaven**: `waarde` en `vorige` (de rapportmaand en de maand ervoor), `jaarTotaal` (1 januari t/m de rapportmaand), `jaarbudget` (volgens het semantic-layerblok) en `uitsplitsing` per platform (Google Ads, Meta Ads, LinkedIn Ads).
5. **kanalen**: sessies per online kanaal, `kanaal`, `waarde` en `vorige` (de rapportmaand en de maand ervoor). De cirkel en de percentages rekent het dashboard.
6. **topContent**: de beste organische post van de maand met `kanaal`, `account`, `datum`, `titel` (hoogstens 120 tekens), `url`, `afbeelding` (data-URL), `metriek` (engagement rate in procent) en `waarom`. Zonder organisch account: `topContent` null en `topContentReden`.
7. **campagnes**: alle advertentiecampagnes met uitgaven in de maand: `campagne`, `platform`, `uitgaven`, `leads`, `cpl`, elk met `waarde` en `vorige`. Geen minimumbedrag; het dashboard sorteert op uitgaven, hoog naar laag.
8. **socialKanalen**: per organisch kanaal volgers, bereik, vertoningen, likes, reacties en posts, elk met `waarde` en `vorige`. Zonder organisch account: lege lijst en `socialReden`.
9. **mailPunten**: drie of vier korte zinnen (hoogstens vier) met de belangrijkste uitkomsten van dit tabblad, voor de mail die bij een nieuw rapport naar de volgers gaat. Schrijf losse, volledige zinnen met cijfers uit het rapport: het grootste verschil met de maand ervoor bij leads, websitebezoeken, bereik en uitgaven; het belangrijkste kanaal of de grootste campagne; de beste organische post (waar die er is); en elke meetbeperking die een cijfer beïnvloedt (bijvoorbeeld een event dat pas later is gaan meten of een tracking die was uitgevallen). Alleen feiten: geen advies, geen aanbeveling, geen "goed" of "slecht", en dezelfde getallen als in het rapport (zelfde afronding). Het dashboard toont ze niet.

Wat niet gemeten wordt of niet bestaat is `null` met de reden in de tekst ("niet gemeten", "geen organisch account gekoppeld"), nooit 0. Een tegel met `nietGemeten` toont die tekst in plaats van een cijfer.

## Meetnotities
`bronnen` (welke accounts en properties je gebruikte) en `datakwaliteit` (waar een bron of een maand ontbrak, welke events pas later begonnen, dat de gedeelde Porsche Groep Zuid-accounts bij Porsche Centrum Brabant staan, dat de wervingscampagnes meetellen in de uitgaven en de campagnetabel, hoe het bereik is gerekend) staan ingeklapt onderaan het rapport. Alleen feiten over de data, geen oordelen.

## Kerncijfers voor het overzicht
Geef `{}` mee; een rapportage toont geen kerncijfers.$prompt$, null
where exists (select 1 from dataloket.marketing_analyse_prompts where opzet_id = '7d0c0000-0000-4000-8000-000000000007' and versie = 1)
  and not exists (select 1 from dataloket.marketing_analyse_prompts where opzet_id = '7d0c0000-0000-4000-8000-000000000007' and versie = 2);
