# HRM analyse (werving) — onderzoek naar de data in Windsor

Onderzoek van 25 november 2026, als basis voor de analyse opzet **HRM analyse** in Campagnes →
Marketing analyse (migratie 0053). Alle bedrijven van de groep. Bronnen: Windsor live (Meta Ads,
Google Ads, LinkedIn Ads, GA4, Facebook en LinkedIn organisch). Bedragen en aantallen staan bewust
niet in dit bestand; die staan in de analyses zelf in het dashboard.

## 1. Wat er is

### Betaalde werving
- **Meta Ads** is verreweg het grootste kanaal: tientallen wervingscampagnes in vijf accounts, bijna
  allemaal met doel leads (leadformulier in Facebook en Instagram). Het leadformulier levert het
  grootste deel van de leads; de pixel op de website een klein deel (alleen Van den Udenhout).
- **Google Ads**: vier zoekcampagnes ("T | Vacature - Monteur", "T | Vacature - Schade" bij Van den
  Udenhout, "T | Vacatures - Techniek" bij Porsche Brabant en Maastricht). Google telt daar bijna geen
  conversies, terwijl GA4 wel sollicitaties aan de VDU-campagnes toeschrijft.
- **LinkedIn Ads**: in 2026 geen wervingscampagnes.

Herkennen van een wervingscampagne op de naam: bevat "Vacature", "Werving", "Meeloopdag" of begint
met "LL14--". Let op: "3. Acties - Werkplaatscampagne - 2026" (Porsche) is after sales, geen werving.

### Accounts en bedrijven
- Meta "Van den Udenhout" draait ook de werving van Instra en Caromi (te herkennen aan de campagnenaam).
- Meta "Porsche Groep Zuid" draait werving voor Porsche Centrum Brabant én PGZ breed; het eigen
  Meta-account van PGZ draaide geen werving.
- Porsche Centrum Maastricht, VELOO en Bentley Maastricht werven via hun eigen Meta-account.

### Patronen
- Het grootste deel van het Meta-wervingsbudget valt op vrijdag, zaterdag en zondag; doordeweeks is er
  weinig bereik.
- De kosten per lead liggen sinds de zomer duidelijk hoger dan in het voorjaar.

### Sollicitaties op de websites (GA4)
| Website | Event | Vanaf |
|---|---|---|
| udenhout.nl | `generate_lead_vacature` | 10 juni 2026 |
| udenhout.nl | `snelsolliciteren_verzonden` / `generate_lead_snelsolliciteren` | 2025 t/m april 2026 |
| pgz.nl | `generate_lead_vacature` | 27 mei 2026 |
| pgz.nl | `job_application` (+ `_click_mailto`, `_click_tel`) | 2025 t/m januari 2026 |
| porschecentrumbrabant.nl, porschecentrummaastricht.nl, bentley-maastricht.nl, veloo.nl | geen sollicitatie-event | alleen klikken op e-mail en telefoon |

Herkomst van de sollicitaties op udenhout.nl: vooral Google, zowel organisch als via Google Ads. De
merkcampagne "T | Branding VDU" brengt de meeste sollicitaties van alle Google-campagnes, meer dan de
vacaturecampagnes. Daarna direct, Google Bedrijfsprofiel, Bing en Meta Ads; vacaturesites leveren weinig.

### Vacaturepagina's
- udenhout.nl `/vacatures` (met subpagina's als `/vacatures/waarom-werken-bij`, `/vacatures/stage` en
  landingspagina's voor alternatieve doelgroepen), porschecentrumbrabant.nl en porschecentrummaastricht.nl
  `/over-ons-contact/vacatures` en `/werken-bij-porsche`, pgz.nl `/vacatures`, bentley-maastricht.nl
  `/contact/vacatures`, veloo.nl `/pages/vacatures`.
- De vacaturepagina's van Porsche Centrum Brabant trekken veel bezoek, maar daar wordt geen sollicitatie gemeten.
- Een losse vacature heeft op udenhout.nl geen eigen `page_path`: het sollicitatie-event valt op `/vacatures`.

### Organisch
- Vacatureposts op Facebook en LinkedIn, vooral van Van den Udenhout; minder dan vier per maand voor
  de hele groep. LinkedIn heeft per bedrijf ook de weergaven van de carrièrepagina.
- Instagram gaf bij het ophalen twee keer een time-out.

## 2. Gaten en risico's
1. **Website-sollicitaties udenhout.nl pas vanaf juni 2026.** Voor januari t/m mei is er geen
   betrouwbaar cijfer. Een reeks vanaf 1 januari kan dus niet.
2. **pgz.nl heeft een gat van februari t/m april 2026** (oude events gestopt, nieuwe pas eind mei).
3. **De Porsche-sites, Bentley en VELOO meten geen sollicitaties.**
4. **Google Ads telt geen sollicitaties als conversie bij Van den Udenhout**, terwijl GA4 ze wel aan de
   vacaturecampagnes toeschrijft.
5. **Meta-account "Porsche Groep Zuid"** staat in de semantic layer bij Porsche Centrum Brabant
   (controleren), maar de wervingscampagnes daarin zijn deels PGZ breed.
6. **Instra en Caromi** werven via het Meta-account van Van den Udenhout.
7. **Een Meta-lead is geen sollicitatie.** Wat HR ermee doet staat niet in Windsor; er is geen ATS gekoppeld.
8. **Merkzoekwoorden leveren de meeste sollicitaties.** Dat is geen wervingsbudget maar wel
   wervingsresultaat; apart tonen.
9. Wekelijkse Meta-pulls met `week_iso` liepen vast; per dag ophalen en zelf per ISO-week optellen werkt.

## 3. Opzet van het dashboard
Opzet **HRM analyse** (sinds 27 november 2026 **HRM campagne**, zie §5), formulier `rapportage`, alle
bedrijven, planning Wekelijks, periode "1 januari t/m gisteren". Zes stappen: Investering, Leads via social media, Sollicitaties op de
website, Vacaturepagina's, Campagnes en Employer branding. Wat er per stap in hoort en hoe er geoordeeld
wordt, staat in de prompt van de opzet (migratie 0053); hoe je de data leest in het blok Werving van de
semantic layer (`werving` in `lib/marketingAnalyse/standaardSemantiek.ts`).

**Dimensies**: ISO-week (ma t/m zo), bedrijf (account plus campagnenaam), platform, functiegroep
(uit de campagnenaam), campagnedoel, soort lead (formulier of website), bron/medium van de sollicitatie.

## 4. Besluiten van de eigenaar (25 november 2026)
1. Uitgaven en social leads lopen vanaf 1 januari 2026. De sollicitaties op de website lopen vanaf
   het moment dat het event bestaat, met een regel dat er daarvoor niet gemeten werd.
2. De werving in het Meta-account "Porsche Groep Zuid" (293327521823561) krijgt een eigen regel
   "Porsche Groep Zuid" (PCB en PGZ samen). Niet per campagne verdelen.
3. Bij Porsche Centrum Brabant, Porsche Centrum Maastricht, Bentley Maastricht en VELOO staat bij
   sollicitaties "niet gemeten", geen nul. Daar alleen Meta-leads en sessies op de vacaturepagina.
4. Eén wekelijkse HRM analyse voor de hele groep, met elk cijfer uitgesplitst per bedrijf.
5. Bedragen en aantallen staan niet in de repository, alleen in het dashboard.

## 5. HRM campagne: maandrapport (besluiten van de eigenaar, 27 november 2026)
Migratie 0054, prompt versie 2.
1. De opzet en de analyse heten **HRM campagne** (de analyse heette "HRM analyse werving").
2. Het is een **maandrapport**, planning Maandelijks: het wordt elke maand verstuurd. De periode loopt
   van 1 januari 2026 t/m de afgelopen (laatste volle) maand, de **focusmaand**.
3. Elke vergelijking gaat tegen **de maand vóór de focusmaand**, niet meer tegen de laatste vier weken.
   Per kerncijfer staat de vorige maand eronder met het verschil in procenten (het dashboard rekent dat
   uit: `vergelijkingVerschil` in `lib/marketingAnalyse/rekenen.ts`).
4. De lezer moet drie dingen zien: hoe het op jaarbasis staat, hoe de afgelopen maand presteerde, en
   hoe die maand was tegen de maand ervoor. Een eerste stap **Maandoverzicht** zet dat naast elkaar.
5. In **Leads via social media** komen eerst **Leads per maand** en **Kosten per lead per maand**, en
   daaronder dezelfde twee grafieken per week. Ook uitgaven en sollicitaties krijgen een maand- en een
   weekgrafiek.
6. Steeds apart voor **Van den Udenhout** en **PGZ** (Porsche, Bentley). Aanname bij de indeling, nog
   te bevestigen: Van den Udenhout = Van den Udenhout, Instra, Caromi en VELOO; PGZ = Porsche Groep
   Zuid (het gedeelde Meta-account van Porsche Centrum Brabant en PGZ), Porsche Centrum Maastricht, PGZ
   en Bentley Maastricht.
