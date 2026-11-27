-- Marketing analyse: opzet Maandrapport Jana (nieuw format 4, vier tabbladen)
--
-- WAAROM DIT BESTAAT
-- Verzoek van de eigenaar, 27 november 2026: een maandrapport met alleen resultaten, voor Jana, met
-- een tabblad per bedrijf (Porsche Centrum Brabant, Porsche Centrum Maastricht, Bentley Maastricht,
-- PGZ), elk precies dezelfde opzet. Geen samenvatting, oordelen, benchmarks of acties; elk cijfer van de
-- laatste volle maand naast de maand ervoor. Een eigen format, net als HRM campagne en E-mail VDU.
-- De data komt uit Windsor, live; de bedrijven hebben geen Syntec-data.
--
-- WAT ER KOMT
--  - opzet "Maandrapport Jana" (vast id ...0007), formulier rapportage, vier vaste bedrijven,
--    standaardplanning Maandelijks (eerste vrijdag van de maand);
--  - de analyse "Maandrapport Jana" met planning Maandelijks;
--  - versie 1 van de prompt van die opzet;
--  - een nieuwe versie van de semantic layer: de vorige plus het blok Maandrapport Jana (gelijk aan
--    `maandrapport` in lib/marketingAnalyse/standaardSemantiek.ts; houd ze gelijk), met het tijdelijke
--    jaarbudget (uitgaven tot en met de rapportmaand + 22%).
-- Alles is idempotent: opnieuw draaien voegt niets dubbel toe.

insert into dataloket.marketing_analyse_opzetten
  (id, naam, formulier, bedrijf, bedrijven, volgorde, standaard, standaard_planning, aangemaakt_door)
values
  ('7d0c0000-0000-4000-8000-000000000007', 'Maandrapport Jana', 'rapportage', null,
   array['Porsche Centrum Brabant','Porsche Centrum Maastricht','Bentley Maastricht','PGZ'],
   60, false, 'maand', null)
on conflict (id) do nothing;

insert into dataloket.marketing_analyse_campagnes (opzet_id, naam, bedrijven, periode_tekst, omschrijving)
select '7d0c0000-0000-4000-8000-000000000007', 'Maandrapport Jana',
       array['Porsche Centrum Brabant','Porsche Centrum Maastricht','Bentley Maastricht','PGZ'],
       'De laatste volle maand, vergeleken met de maand ervoor',
       'Maandrapport met alleen resultaten voor Porsche Centrum Brabant, Porsche Centrum Maastricht, Bentley Maastricht en PGZ: online leads, websitebezoeken, social media bereik, uitgaven, kanalen, toppresterende content, campagneprestaties en social media kanalen, elk naast de maand ervoor, met een forecast van de leads.'
where not exists (select 1 from dataloket.marketing_analyse_campagnes where opzet_id = '7d0c0000-0000-4000-8000-000000000007');

update dataloket.marketing_analyse_campagnes
   set planning = 'maand'
 where opzet_id = '7d0c0000-0000-4000-8000-000000000007' and planning is distinct from 'maand';

insert into dataloket.marketing_analyse_prompts (opzet_id, versie, inhoud, opgeslagen_door)
select '7d0c0000-0000-4000-8000-000000000007', 1, $prompt$# Maandrapport Jana — resultaten per bedrijf

## Doel en lezer
Een maandrapport met alleen resultaten, voor Jana. Vier tabbladen: **Porsche Centrum Brabant, Porsche Centrum Maastricht, Bentley Maastricht en PGZ**, in die volgorde. Elk tabblad heeft precies dezelfde opzet. Het rapport gaat over de **laatste volle kalendermaand** en zet elk cijfer naast dat van de maand ervoor. Het is een nieuw format (`formaat: 4`, sleutel `maandrapport`), net als de HRM campagne en de E-mail VDU een eigen format hebben.

Welke accounts bij welk tabblad horen, hoe je een lead telt, hoe het bereik en de uitgaven gerekend worden en wat het tijdelijke jaarbudget is, staat in het blok **Maandrapport Jana** van de semantic layer. Volg dat blok.

## Wat er NIET in komt
Geen samenvatting met conclusies, geen oordelen (`oordeel`), geen bevindingen, geen aanbevelingen of acties, geen benchmarks, geen doel of voortgang, geen interpretatie van een stijging of daling. Eén uitzondering: bij de toppresterende content zegt `waarom` in één zin waarom die post de beste is. Geen Syntec-leads, geen Syntec-orders en geen `lead_kanaalkosten`: die zijn voor deze bedrijven niet van toepassing. `samenvatting.regels` is leeg, `aanbevelingen` en `secties` zijn leeg, `funnel` is `[]`.

## Per bedrijf (`maandrapport.bedrijven[]`, vier keer dezelfde velden)
1. **leads** (tegel): `waarde` en `vorige` = aantal online leads in de rapportmaand en de maand ervoor; `reeks` = per kalendermaand (JJJJ-MM) de laatste twaalf maanden t/m de rapportmaand; `uitsplitsing` = per soort lead (labels uit het semantic-layerblok) met `waarde` en `vorige`. Het dashboard toont die uitsplitsing bij hover en tekent de grafiek en de forecast uit `reeks`.
2. **sessies** (tegel): websitebezoeken, `waarde`, `vorige` en dezelfde `reeks`.
3. **bereik** (tegel): social media bereik = betaald + organisch; `waarde`, `vorige`; `uitsplitsing` met twee regels, **Betaald** en **Organisch** (elk met `waarde` en `vorige`); in `toelichting`: "Som van de platforms, niet ontdubbeld." Een deel dat niet bestaat (geen organisch account): `waarde` null en de reden in `toelichting`.
4. **uitgaven**: `waarde` en `vorige` (de rapportmaand en de maand ervoor), `jaarTotaal` (1 januari t/m de rapportmaand), `jaarbudget` (volgens het semantic-layerblok) en `uitsplitsing` per platform (Google Ads, Meta Ads, LinkedIn Ads).
5. **kanalen**: sessies per online kanaal, `kanaal`, `waarde` en `vorige` (de rapportmaand en de maand ervoor). De cirkel en de percentages rekent het dashboard.
6. **topContent**: de beste organische post van de maand met `kanaal`, `account`, `datum`, `titel` (hoogstens 120 tekens), `url`, `afbeelding` (data-URL), `metriek` (engagement rate in procent) en `waarom`. Zonder organisch account: `topContent` null en `topContentReden`.
7. **campagnes**: alle advertentiecampagnes met uitgaven in de maand: `campagne`, `platform`, `uitgaven`, `leads`, `cpl`, elk met `waarde` en `vorige`. Geen minimumbedrag; het dashboard sorteert op uitgaven, hoog naar laag.
8. **socialKanalen**: per organisch kanaal volgers, bereik, vertoningen, likes, reacties en posts, elk met `waarde` en `vorige`. Zonder organisch account: lege lijst en `socialReden`.

Wat niet gemeten wordt of niet bestaat is `null` met de reden in de tekst ("niet gemeten", "geen organisch account gekoppeld"), nooit 0. Een tegel met `nietGemeten` toont die tekst in plaats van een cijfer.

## Meetnotities
`bronnen` (welke accounts en properties je gebruikte) en `datakwaliteit` (waar een bron of een maand ontbrak, welke events pas later begonnen, dat de gedeelde Porsche Groep Zuid-accounts bij Porsche Centrum Brabant staan, dat de wervingscampagnes meetellen in de uitgaven en de campagnetabel, hoe het bereik is gerekend) staan ingeklapt onderaan het rapport. Alleen feiten over de data, geen oordelen.

## Kerncijfers voor het overzicht
Geef `{}` mee; een rapportage toont geen kerncijfers.$prompt$, null
where not exists (
  select 1 from dataloket.marketing_analyse_prompts where opzet_id = '7d0c0000-0000-4000-8000-000000000007'
);

insert into dataloket.marketing_analyse_semantiek (versie, inhoud, opgeslagen_door)
select s.versie + 1,
       jsonb_set(s.inhoud, '{blokken,maandrapport}', to_jsonb($maandrapport$## Wat dit blok is
Hoort bij de opzet **Maandrapport Jana** (formaat 4, besluiten van de eigenaar, 27 november 2026): één rapport met vier tabbladen, **Porsche Centrum Brabant, Porsche Centrum Maastricht, Bentley Maastricht en PGZ**, elk met precies dezelfde opzet. Alleen resultaten, elk cijfer van de laatste volle maand naast die van de maand ervoor. Geen Syntec-leads en geen Syntec-orders: die bestaan alleen voor Van den Udenhout. Alle bronnen zijn Windsor, live.

## Welk account bij welk tabblad
- **Porsche Centrum Brabant**: GA4 www.porschecentrumbrabant.nl (306403800, niet de inactieve 442472211); Meta Ads "Porsche Groep Zuid" (293327521823561); Google Ads "Porsche Centrum Brabant B.V." (846-005-3447); LinkedIn Ads 515422432; Facebook 152454588113374; Instagram porschebrabant (17841400735388282); LinkedIn organisch 1688996.
- **Porsche Centrum Maastricht**: GA4 www.porschecentrummaastricht.nl (306394313); Meta Ads 315013592825616; Google Ads 383-831-5062; LinkedIn Ads 515419437; Facebook 1856659467764845; Instagram porschecentrummaastricht (17841409820778415); LinkedIn organisch 77458602.
- **Bentley Maastricht**: GA4 "PON Bentley Maastricht" (435349999), de testhosts bentley-maastricht.acc2.ddp.uname-it.digital en pon-test-maastricht.uname-it.digital uitsluiten; Meta Ads 192180818785600; Google Ads 703-471-9539; LinkedIn Ads 515420450. Geen organisch account gekoppeld.
- **PGZ**: GA4 www.pgz.nl (405407306), staging.pgz.nl uitsluiten; Meta Ads "PGZ" (744220736319839); Google Ads 973-942-0035; LinkedIn Ads 515420451. Geen organisch account gekoppeld.
- Het Meta-account "Porsche Groep Zuid" en het Google Ads-account "Porsche Centrum Brabant B.V." horen volledig bij **Porsche Centrum Brabant** (besluit van de eigenaar, 27 november 2026): uitgaven, bereik en campagnes van die accounts zijn niet per bedrijf te splitsen. Zeg dat in de meetnotities.
- Een bron die er niet is, krijgt de tekst "niet gemeten" of "geen organisch account gekoppeld", nooit 0.

## Periode
De rapportmaand is de **laatste volle kalendermaand** vóór de dag van de analyse; de vergelijkingsmaand is de maand daarvoor. De maandreeks voor de grafiek loopt over de laatste twaalf kalendermaanden t/m de rapportmaand (JJJJ-MM), een maand zonder meting is null. De forecast rekent het dashboard zelf uit (een rechte lijn door de laatste zes maanden, doorgetrokken naar de volgende maand); lever alleen de maandcijfers.

## Totaal online leads (GA4, per bedrijf)
- Een online lead is een GA4-event dat met `generate_lead` begint, geteld met `event_count` op de website van het bedrijf. **Niet** meegeteld: `generate_lead_vacature`, `generate_lead_nieuwsbrief`, `generate_lead_snelsolliciteren` en `generate_lead_meeloopdagen` (werving en nieuwsbrief zijn geen autoleads).
- **Soort lead** (voor de uitsplitsing bij hover; gebruik deze labels): `generate_lead_proefrit` → Proefrit; `generate_lead_offerte` → Offerte; `generate_lead_contact` → Contactaanvraag; `generate_lead_info` → Meer informatie; `generate_lead_werkplaats` en `generate_lead_werkplaatsafspraak` → Werkplaatsafspraak; `generate_lead_financieren` → Financiering; `generate_lead_verzekeren` → Verzekering; `generate_lead` en `generate_lead_` (zonder soort, de oude meting) → Overig. Een ander `generate_lead_*`-event dat hier niet staat telt mee als Overig; noem het in de meetnotities.
- **Bentley**: het event `Contactaanvraag` telt alleen als offerte met `/caw-bedankt/offerte/` in `page_path` (t/m 29 september 2026); vanaf 20 oktober 2026 vuurt `generate_lead_offerte`, vanaf 21 oktober `generate_lead_contact` en `generate_lead_werkplaats`. Een proefrit staat daar óók onder `Contactaanvraag` zonder dat pad: telt niet mee.
- **PGZ**: `generate_lead_proefrit`, `generate_lead_contact` en, vanaf 11 oktober 2026, `generate_lead_offerte`.
- Een maand waarin de tracking niet (volledig) werkte is **null** in de reeks, niet 0: controleer per maand of er dagen zonder sessies zijn. Bekend: beide Porsche-properties van 25 juni t/m 11 augustus 2026 (juni, juli en augustus zijn dus null). Zeg het in de meetnotities.
- De meting van de events verschilt per periode (nieuwe tracking, nieuwe events). Een verschil met een eerdere maand kan dus deels aan de meting liggen; zet de data waarop een event begon in de meetnotities als dat in de reeks of in de vergelijking meespeelt.
- Tel in één opvraging per bedrijf: `year_month` × `event_name` × `event_count`, filter `event_name` bevat "generate_lead" (Bentley: ook `Contactaanvraag` met `page_path`).

## Websitebezoeken (sessies)
GA4 `sessions` per `year_month`, met een filter dat de uit te sluiten hosts weglaat. **Nooit** sessies per hostname optellen: een sessie staat dan bij meerdere hosts (semantic layer, GA4). Sessies zijn sessies van de hele website, uit elk kanaal.

## Prestaties per online kanaal (cirkeldiagram)
**Sessies** per kanaal (besluit van de eigenaar), voor de rapportmaand en de maand ervoor. Haal `session_source_medium` × `sessions` op (een filter op `hostname` kan rijen dubbel geven: komt de som van de bronnen niet bij de sessies van de maand, haal het dan zonder hostfilter op) en deel in met de bestaande indeling van het dashboard, `kanaalVoor` in `lib/kpi2027/kanalen.ts`: Google Ads, Meta Ads, Overig betaald, Organisch zoeken, Social organisch, Autoportals, Direct, Verwijzingen en overig. Gebruik de namen uit `KANALEN` in dat bestand. Het dashboard rekent de percentages en het verschil in procentpunten uit; lever de sessies per kanaal en maand.

## Social media bereik (betaald en organisch)
Het totaal is **betaald + organisch**, klein uitgesplitst. Bereik telt unieke mensen per platform en per periode; tel daarom nooit dagcijfers op.
- **Betaald** = Meta Ads `reach` over de hele maand zonder dagkorrel (per account één opvraging, zonder campagne als dimensie, anders tellen mensen dubbel) + LinkedIn Ads `approximate_unique_impressions` (alleen voor een periode van hoogstens 92 dagen, per maand dus goed). Google Ads levert geen bereik.
- **Organisch** = Instagram `reach` over de hele maand zonder `date` (levert het periodebereik; een som van dagcijfers komt veel hoger uit; gebruik `year_month` hier niet, het label klopt niet, maar vraag elke maand apart op met `date_from` en `date_to`) + Facebook-paginabereik (`page_impressions_unique`). LinkedIn organisch levert alleen dagelijkse unieke weergaven, die niet optelbaar zijn: LinkedIn telt niet mee in het bereik (wel in de tabel Social media kanalen). Noem dat in de meetnotities.
- Het totaal is de **som van de platforms**, niet ontdubbeld over platforms. Dat staat in de toelichting van de tegel.

## Uitgaven advertentiecampagnes en jaarbudget
- Uitgaven = Google Ads, Meta Ads en LinkedIn Ads `spend` van het bedrijf (accounts hierboven), alle campagnes, zonder minimumbedrag; ook de wervingscampagnes (die staan er dan ook in de campagnetabel). Uitsplitsing per platform voor de hover.
- `jaarTotaal` = uitgaven van 1 januari t/m de laatste dag van de rapportmaand, in dezelfde accounts.
- **Jaarbudget (tijdelijk, besluit van de eigenaar, 27 november 2026)**: er is nog geen jaarbudget per merk. Neem als jaarbudget voor alle bedrijven `jaarTotaal` × 1,22 (de uitgaven tot en met de rapportmaand plus 22%). De balk in het rapport staat daardoor elke maand op ongeveer 82%. Zodra het echte jaarbudget er is, vervangt de eigenaar deze regel in dit blok en rekent het rapport met dat bedrag.
- Het budget is een voorlopig bedrag en geen oordeel: zeg niets over tempo.

## Toppresterende content (organisch)
- Alleen bij Porsche Centrum Brabant en Porsche Centrum Maastricht (de enige met organische accounts); anders `topContent` null met `topContentReden` ("geen organisch account gekoppeld").
- De beste **Instagram**-post van de rapportmaand op **engagement rate** = (likes + reacties + shares + saves) ÷ weergaven van die post, alleen posts met minstens 500 weergaven. Alleen Instagram, omdat daar weergaven, likes, reacties, shares en opslagen vergelijkbaar zijn en er een beeld is; Facebook en LinkedIn tellen engagement anders (LinkedIn telt klikken mee) en doen niet mee. Haal de posts in twee stappen op: eerst `media_id`, `timestamp`, `media_type`, `media_permalink`, `media_caption`, `media_url`, `media_thumbnail_url` voor de posts van de maand, daarna `media_views`, `media_like_count`, `media_comments_count`, `media_shares`, `media_saved` met een `in`-filter op de gevonden id's.
- **Beeld**: haal `media_url` (bij een video `media_thumbnail_url`) op en bewaar het beeld in het rapport als data-URL (JPEG, hoogstens 800 px breed, een paar honderd kB): een platformlink verloopt. Lukt het ophalen niet, zet dan `afbeelding` op null en noem het in de meetnotities.
- **Waarom** (`waarom`): één zin die zegt waarom dit de beste post is, met de cijfers erbij: de engagement rate tegen het gemiddelde van de andere posts van dezelfde maand op dat account, en het aantal weergaven. Dit is het enige oordeel in het rapport; geen advies.

## Campagneprestaties (tabel)
Alle advertentiecampagnes met uitgaven in de rapportmaand (ook die zonder lead), per platform. Leads: Meta `actions_lead`; Google Ads `conversions` (de conversieacties die het account zelf meetelt); LinkedIn Ads levert hier geen lead: null (n.v.t.). Kosten per lead = uitgaven ÷ leads (null zonder leads). Elke regel krijgt de cijfers van de maand ervoor mee (`vorige`); een campagne die toen niet draaide krijgt null. Het dashboard sorteert op uitgaven, hoog naar laag.

## Social media kanalen (tabel)
Per organisch kanaal (Facebook, Instagram, LinkedIn): volgers, bereik, vertoningen, likes, reacties en posts, elk met de waarde van de maand ervoor. Instagram `followers_count` en LinkedIn `organization_follower_count` zijn alleen de stand van vandaag (geen historie): volgers zonder `vorige`. Facebook: `page_follows`, `page_impressions_unique` (bereik), `page_impressions` (vertoningen), likes = `post_reactions_like_total` van de posts die in de maand zijn geplaatst, reacties n.v.t., posts = het aantal posts van de maand. LinkedIn: vertoningen, likes en reacties zijn de som van de dagwaarden (`account_analytics_*`, een negatieve dagwaarde telt als 0), bereik n.v.t., posts uit `share_id`. Instagram `reach` over de hele maand zonder `date`; `views`, `likes` en `comments` zijn optelbaar over de dagen. Een kanaal dat een cijfer niet levert: null (n.v.t.).

## Wat het rapport niet doet
Geen samenvatting, geen oordelen, geen aanbevelingen, geen acties, geen benchmarks, geen voortgang tegen een doel. De bronnen en meetnotities staan ingeklapt onderaan.$maandrapport$::text)),
       null
from dataloket.marketing_analyse_semantiek s
where s.versie = (select max(versie) from dataloket.marketing_analyse_semantiek)
  and not (s.inhoud->'blokken' ? 'maandrapport');
