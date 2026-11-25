---
name: campagne-voorstellen
description: Zoek in de Windsor-data van alle bedrijven van de groep Van den Udenhout (Van den Udenhout, Porsche Centrum Brabant, Porsche Centrum Maastricht, PGZ, Bentley Maastricht, VELOO, Instra …) welke actiecampagnes nu live zijn, vul per campagne een voorzet voor de briefing in en zet ze in het dashboard in de balk "Voorgestelde campagne analyses" (Campagnes → Marketing analyse). Gebruik dit als de gebruiker vraagt om nieuwe of live campagnes te zoeken of voor te stellen ("zoek nieuwe campagnes", "welke campagnes staan er live", "werk de voorgestelde analyses bij", "maak campagnevoorstellen").
---

# Campagnevoorstellen — live actiecampagnes zoeken

Het dashboard (`bestecamerakeuze/`, tabblad **Campagnes → Marketing analyse**) toont bovenaan de
balk **Voorgestelde campagne analyses**; jij vult hem. Een gebruiker klikt op Toevoegen, loopt de
briefing na en zet hem op de lijst (Campagne analyse, Analyse ronde aan). Plan en besluiten:
`bestecamerakeuze/campagne-voorstellen-plan.md`. Supabase-project `pzpoptfljgrskebnuggt` ("MMM"),
schema `dataloket`.

## Wat een voorstel is
- Een **actiecampagne die nu live is**: in de laatste **7 dagen** (t/m gisteren, Nederlandse
  kalender) is er op Google Ads, Meta Ads of LinkedIn Ads geld uitgegeven aan advertenties over
  één duidelijke actie of één model.
- **Met eigen campagnepagina**: een pagina op de website van het bedrijf die over die ene actie of
  dat ene model gaat (bijv. `udenhout.nl/acties/a2-e-tron`, `…/porsche-x-cervelo`). Zekerheid
  `zeker` of `waarschijnlijk`.
- **Duidelijke actie zonder eigen pagina** (lead form, homepage, algemene pagina, Performance Max
  zonder URL): wél een voorstel, met zekerheid **`twijfel`** en de reden in `reden`.
- **Geen voorstel**: campagnes die altijd aan staan zonder actie. Branding ("Branded", "Branding
  VDU", "Dealer"), algemene voorraad en occasions, algemene service en onderhoud
  ("After Sales", werkplaatsafspraak), modelpagina's onder `/modellen/…` zonder actie, remarketing
  en custom intent naar algemene pagina's, vacatures, DSA en Pmax Vehicle Ads. Twijfel je of iets een
  actie is: liever een voorstel met `twijfel` dan niets.
- **Eén voorstel per campagnepagina per bedrijf.** Leiden Google, Meta en LinkedIn naar dezelfde
  pagina, dan is het één voorstel. Loopt dezelfde actie bij twee bedrijven, dan krijgt elk bedrijf
  een eigen voorstel. Zonder pagina: één voorstel per onderwerp per bedrijf.
- **Jij oordeelt.** Er staan geen vaste URL-patronen in de code. Het kopje **Campagnevoorstellen**
  in het blok Algemeen van de semantic layer bevat de aanvullingen van de eigenaar; volg die.

## Harde regel: alleen deze bronnen
- **Windsor, live** (`get_data`, eerst `get_fields`): `google_ads`, `facebook` (Meta Ads),
  `linkedin`, `facebook_organic`, `instagram`, `linkedin_organic`, `googleanalytics4`. Alleen de
  accounts en properties uit het blok Algemeen van de semantic layer.
- **Supabase, alleen de tabellen van de tool**: `marketing_analyse_semantiek`,
  `marketing_analyse_campagnes`, `marketing_analyse_voorstellen` (lezen) en de functie
  `marketing_analyse_voorstellen_bewaar` (schrijven). Niets anders: geen `windsor_*`, `leads_raw`,
  `v_leads` of andere tabellen. Schrijf nooit rechtstreeks in de tabellen.

## Stap 1 — Wat er al is
```sql
select id, versie, inhoud from dataloket.marketing_analyse_semantiek order by versie desc limit 1;
select naam, bedrijven, merk, modellen, startdatum, einddatum, campagnepaginas
  from dataloket.marketing_analyse_campagnes
 where coalesce(einddatum, current_date) >= current_date - 30;
select naam, bedrijven, status, campagnepaginas, sleutel
  from dataloket.marketing_analyse_voorstellen where status in ('open', 'genegeerd', 'toegevoegd');
```
- Geen semantic layer opgeslagen? Dan geldt `bestecamerakeuze/lib/marketingAnalyse/standaardSemantiek.ts`.
- Lees in Algemeen de bedrijven, hun accounts, properties en domeinen, de naamgeving van
  campagnes en het kopje Campagnevoorstellen (als dat er is).
- Een campagne die al op de lijst staat (zelfde bedrijf, zelfde pagina, of zonder pagina zelfde
  onderwerp, merk/model en looptijd) stel je **niet** opnieuw voor. Een genegeerd voorstel stuur je
  wel mee (de functie laat hem genegeerd); een toegevoegd voorstel ook.

## Stap 2 — Advertenties ophalen (het vertrekpunt)
Periode: de laatste 90 dagen t/m gisteren, per dag, alleen rijen met `spend > 0`. Per bron eerst
`get_fields`; een pull die "pending" teruggeeft, herhaal je tot hij klaar is. Grote antwoorden komen
in een bestand: vat ze samen met `jq` (per bedrijf, campagne en URL de uitgaven, eerste en laatste
dag met uitgaven).
- **Google Ads**: `account_name`, `campaign`, `campaign_id`, `advertising_channel_type`,
  `ad_group_name`, `ad_final_urls`, `ad_responsive_search_ad_headlines`,
  `ad_demand_gen_multi_asset_ad_headlines`, `budget_amount`, `spend`, `impressions`, `clicks`, `date`.
  `ad_final_urls` is leeg bij Performance Max en DSA.
- **Meta Ads** (`facebook`): `account_name`, `campaign`, `campaign_id`, `campaign_objective`,
  `adset_name`, `ad_name`, `website_destination_url`, `url_tags`, `body`, `title`,
  `campaign_lifetime_budget`, `campaign_stop_time`, `spend`, `impressions`, `link_clicks`, `date`.
- **LinkedIn Ads** (`linkedin`): `account_name`, `campaign_group_name`, `campaign`, `campaign_id`,
  `campaign_objective_type`, `creative_name`, `landing_page`, `campaign_total_budget_amount`,
  `campaign_end_date`, `spend`, `impressions`, `clicks`, `date`.

Haal eerst alleen de laatste 7 dagen op om te zien wat live is; haal daarna de 90 dagen alleen op
voor de campagnes die live zijn (filter op campagne), om de startdatum en de uitgaven tot nu toe te
bepalen.

## Stap 3 — Onderwerpen en campagnepagina's
1. **Groepeer per bedrijf de live advertenties per campagneonderwerp.** Lees campagnenaam,
   advertentieset, advertentienaam, koppen en teksten en de bestemmings-URL. "Demand Gen | Acties -
   Audi A2 e-tron - 2026" en een Meta-campagne "Actie - A2 e-tron" naar dezelfde pagina zijn één
   onderwerp.
2. **Zoek de campagnepagina.** Normaliseer URL's (protocol, `www.`, query, hash en slash aan het
   eind eraf). Leiden de advertenties naar een algemene pagina of ontbreekt de URL, zoek dan in
   GA4 een landingspagina die bij het onderwerp past en in dezelfde periode betaald verkeer kreeg:
   `landing_page` × `session_source_medium` × `sessions` op de property van het bedrijf, laatste 14
   dagen. Vind je er geen: voorstel met `twijfel`.
3. **GA4 per campagnepagina** (laatste 14 dagen): sessies als landingspagina per
   `session_default_channel_group`, en `landing_page` × `event_name` × `event_count` voor de
   lead-events die de semantic layer noemt.
4. **Social media over hetzelfde onderwerp.** Zoek organische posts van het bedrijf (Facebook,
   Instagram, LinkedIn organisch; velden via `get_fields`, laatste 60 dagen) die over hetzelfde
   onderwerp gaan, ook als ze niet naar de pagina linken. Neem ze op in `bewijs.posts` en in
   `kanalen` (bijv. "Instagram organisch").

## Stap 4 — De voorzet voor de briefing
Per voorstel een object:

| Veld | Hoe |
|---|---|
| `naam` | Kort en herkenbaar, zoals het team hem zou noemen: "Audi A2 e-tron", "Porsche x Cervélo", "Boxtel Actieweekend". |
| `bedrijven` | Precies één bedrijf, zoals in de semantic layer gespeld. |
| `merk`, `modellen` | Uit URL, koppen en campagnenaam. Leeg als het niet duidelijk is. `merk` = automerk ("Audi"). |
| `startdatum` | Eerste dag met uitgaven naar dit onderwerp binnen de 90 dagen (`JJJJ-MM-DD`). Ligt die op dag 90: zeg in `bewijs.kanttekeningen` dat hij mogelijk eerder begon. |
| `einddatum` | Alleen als het platform er een levert (`campaign_stop_time`, `campaign_end_date`) en hij na vandaag ligt. Anders leeg. |
| `budget` | Alleen een looptijdbudget (`campaign_lifetime_budget`, `campaign_total_budget_amount`). Een dagbudget of Google `budget_amount` is geen totaalbudget: laat `budget` leeg en noem het in de omschrijving. Nooit schatten. |
| `doel` | Een voorstel uit het campagnedoel op het platform en de lead-events op de pagina, bijv. "Proefritaanvragen via de actiepagina (voorstel, graag nalopen)". |
| `omschrijving` | Twee tot vier zinnen: waar de campagne over gaat, welke kanalen, welke platformcampagnes, wat er tot nu toe is uitgegeven, of er social posts zijn. |
| `campagnepaginas` | De volledige URL('s) zonder query, bijv. `https://www.udenhout.nl/acties/a2-e-tron`. Leeg zonder eigen pagina. |
| `onderwerp` | Verplicht zonder pagina: een korte, vaste naam in kleine letters ("pgz lease actie"). Gebruik bij een volgende ronde dezelfde naam als het open of genegeerde voorstel van toen (zie stap 1). |
| `zekerheid`, `reden` | `zeker` / `waarschijnlijk` / `twijfel`; bij twijfel altijd een reden van één zin. |
| `kanalen` | Bijv. `["Google Ads", "Meta Ads", "Instagram organisch"]`. |
| `uitgaven_tot_nu` | Som van de mediakosten van alle platforms sinds de startdatum. |
| `laatste_uitgave_op` | Laatste dag met uitgaven. |
| `bewijs` | `{ "platformCampagnes": [{ "platform", "campagne", "uitgaven", "laatsteUitgave" }], "ga4": { "sessies", "leadEvents", "periode", "toelichting" }, "posts": [{ "kanaal", "datum", "tekst", "url" }], "kanttekeningen": [] }` |

Getallen als getal, datums als `JJJJ-MM-DD`. De tekst van een post: hoogstens 120 tekens.

## Stap 5 — Wegschrijven
Schrijf de lijst eerst naar een bestand in je scratchpad en controleer hem met `node -e`
(`JSON.parse`; elk voorstel precies één bedrijf; zonder pagina een `onderwerp`; bij `twijfel` een
`reden`). Schrijf de hele ronde in één keer weg:
```sql
select dataloket.marketing_analyse_voorstellen_bewaar(
  p_voorstellen  => $json$ [ … ] $json$::jsonb,
  p_bedrijven    => array['Van den Udenhout', 'Porsche Centrum Brabant', …],  -- waarin je hebt gezocht
  p_terugmelding => $txt$ korte samenvatting van de ronde $txt$,
  p_model        => '<model-id waarop je draait>'
);
```
- De functie slaat een voorstel over als er al een campagne van dat bedrijf met dezelfde pagina
  is, werkt een bestaand open voorstel bij, laat een genegeerd of toegevoegd voorstel staan en zet
  open voorstellen van de doorzochte bedrijven die je niet meer meestuurt op **verlopen**. Zoek je
  maar in een deel van de bedrijven, geef dan alleen die op in `p_bedrijven`.
- Het antwoord noemt hoeveel er nieuw, bijgewerkt, overgeslagen en verlopen zijn.

## Stap 6 — Terugmelden
Per bedrijf: de voorstellen (naam, pagina, kanalen, live sinds, uitgegeven, zekerheid), wat je
bewust níet voorstelde en waarom (in een paar regels, niet elke brandingcampagne apart), wat er al
op de lijst stond, en het antwoord van de functie. Doe voorstellen voor het kopje
Campagnevoorstellen in de semantic layer als je iets tegenkwam dat de volgende ronde helpt; pas de
semantic layer nooit zelf aan. De voorstellen staan in het dashboard onder Campagnes → Marketing
analyse, in de balk bovenaan.
