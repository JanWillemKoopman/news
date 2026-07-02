# Strategie & Optimalisaties: Het RSVP-Vliegwiel

Dit document vertaalt de platformfilosofie (gratis B2C-kern → viraal RSVP-vliegwiel →
premium fotomuur → B2B intent data in 2027) naar een concrete, geprioriteerde
optimalisatielijst voor deze codebase. Het is het operationele kompas naast
`DESIGN_PHILOSOPHY.md`: dat document bepaalt *hoe* iets eruitziet, dit document
bepaalt *wat* we bouwen en *waarom*.

---

## De strategie in één alinea

Alles tot aan de trouwdag is en blijft gratis: planner, budget, gasten, website,
RSVP. De trouwwebsite met RSVP is onze acquisitiemotor — elk bruidspaar brengt
~100 gasten naar het platform, en een deel daarvan plant zelf een bruiloft. De
RSVP-flow wordt daarom ingericht om die intentie te vangen en direct te
converteren naar een nieuw gratis account. Geld verdienen we op de feestdag zelf
(Live Fotomuur, €49–€69, eenmalig), exact op de grens waar onze infrakosten
beginnen (media/bandbreedte). Ondertussen bouwen we stil de gestructureerde
vraagdata (regio, budget, datum, categorie) op die in 2027 als B2B
"intent data"-product aan leveranciers verkocht wordt.

**Leidend principe:** we verdienen geen geld aan de stress van het plannen, we
verdienen geld aan het succes van het feest.

---

## Huidige stand vs. filosofie (gap-analyse)

Wat er al staat:
- Publieke trouwwebsite + RSVP-flow met token (`app/rsvp/[token]`, `components/rsvp/PublicRsvp.tsx`)
- Fotomuur (gastenmuur, presentatiemuur, beheer) — maar **zonder betaalmuur**
- Leveranciers + ontdekken-flow (passieve assets, conform 2026-plan)
- AI-endpoints per feature, cron-reminders, admin-analytics, bulk-import gasten

De drie grootste gaten:
1. **Geen betaalinfrastructuur.** Er is geen checkout (geen Stripe/Mollie). De
   enige geldkraan uit de filosofie kan letterlijk nog niet open.
2. **De RSVP-bedankpagina is een dood einde.** Een gast krijgt "Bedankt! Je
   reactie is opgeslagen." en vertrekt. Geen intentievraag, geen CTA, geen
   signup-pad. Het vliegwiel bestaat dus nog niet.
3. **Geen attributie.** Nieuwe accounts zijn niet te herleiden tot de bruiloft
   die ze aanbracht — de K-factor (dé kernmetric) is nu onmeetbaar.

---

## Optimalisaties

Legenda — **Prioriteit:** P0 = randvoorwaarde/nu, P1 = H2 2026, P2 = daarna.
**Effort:** S (dagen), M (1–2 weken), L (weken+). **Impact:** op het vliegwiel
en/of de omzet.

### Pijler 1 — B2C: de "no-brainer" conversie

| # | Optimalisatie | Prioriteit | Effort | Impact |
|---|---|---|---|---|
| 1 | **Betaalinfrastructuur + fotomuur achter betaalmuur.** Eenmalige betaling (€49–€69, Mollie voor NL/iDEAL) die de fotomuur per bruiloft activeert. Zonder dit is er geen omzet; dit is de enige P0 die geld oplevert. | P0 | L | Hoog |
| 2 | **Fotomuur-upsell op het emotionele piekmoment.** Automatische in-app nudge + e-mail op ±14 dagen vóór de trouwdatum (bestaande cron-reminders uitbreiden): "Jullie planning is rond — maak het feest compleet." Eventueel gratis preview-modus (eerste 10 foto's) als proeverij. | P0 | S | Hoog |
| 3 | **"10 minuten tot een volledig plan"-onboarding.** Vanuit datum + gastenaantal + budget genereert de AI direct een gevuld budget, takenlijst en routekaart (bouwt voort op bestaande AI-planner en template-items). Dit is de belofte waar de RSVP-CTA naar verwijst — die moet waargemaakt worden. | P0 | M | Hoog |
| 4 | **Excel/CSV-import voor budget.** De echte concurrent is de spreadsheet; gasten-import bestaat al, budget-import ontbreekt. Elimineert de laatste overstapdrempel. | P1 | M | Middel |
| 5 | **Sunk-cost zichtbaar maken.** Dashboard/routekaart toont planvoortgang ("jullie plan is 68% compleet, 142 items ingevoerd") — versterkt retentie en maakt de waarde van het "zenuwcentrum" voelbaar. | P2 | S | Middel |
| 6 | **Gratis-vs-premium helder op de landingspagina.** Eén boodschap: alles voor de planning is gratis, alleen feestdag-entertainment (fotomuur) kost geld. Neemt wantrouwen ("waar zit de adder?") weg bij signup. | P1 | S | Middel |

### Pijler 2 — Het RSVP-vliegwiel

| # | Optimalisatie | Prioriteit | Effort | Impact |
|---|---|---|---|---|
| 7 | **Intentievraag in de RSVP-flow.** Verplichte dropdown "Ben je zelf een bruiloft of groot feest aan het plannen?" (Nee / Ja, <12 mnd / Ja, <24 mnd / Ooit) + opslag in de database. De goudmijn-vraag uit de filosofie. | P0 | S | Hoog |
| 8 | **Gepersonaliseerde bedankpagina met dynamische CTA.** Bij "Ja, <12 mnd": CTA om direct een eigen gratis account te starten, met verwijzing naar het bruidspaar als social proof. De bedankpagina verandert van dood einde in conversiepunt. | P0 | M | Hoog |
| 9 | **Bron-attributie op elke signup.** Elke via-RSVP gestarte registratie wordt getagd met de herkomst-bruiloft (uitbreiding admin-analytics). Zonder dit is de K-factor — dé stuurmetric — niet te meten. Bouw dit vóór of gelijktijdig met #7/#8. | P0 | S | Hoog |
| 10 | **Frictieloze signup vanaf de bedankpagina.** Magic link / passwordless, naam en e-mail geprefilled uit de RSVP-invoer. Elke extra stap in deze funnel kost een meetbaar deel van de 5% intentie-gasten. | P1 | M | Hoog |
| 11 | **Template-overname.** "Neem de basisopzet van [bruidspaar] over": kopieer de geanonimiseerde structuur (takentemplate, budgetcategorieën) naar het nieuwe account, zodat het beloofde "in 10 minuten georganiseerd" direct waar is. | P1 | M | Middel |
| 12 | **Deelbaarheid van de trouwwebsite maximaliseren.** Nette OG-tags/social previews per trouwwebsite en een subtiele "Gemaakt met …"-verwijzing met CTA op elke gratis site. Elke gedeelde link is gratis acquisitie, ook buiten de RSVP om. | P1 | S | Hoog |
| 13 | **Nurturing van latere intentie.** Gasten die "Ja, <24 mnd" of "Ooit" kiezen: optioneel e-mailadres achterlaten → lichte drip-campagne via Resend richting het moment dat ze wél gaan plannen. | P2 | M | Middel |

### Pijler 3 — Architectuur & margebescherming

| # | Optimalisatie | Prioriteit | Effort | Impact |
|---|---|---|---|---|
| 14 | **Technische gating van media.** Fotomuur-uploads (storage + bandbreedte) alleen mogelijk voor betaalde bruiloften; hoort onlosmakelijk bij #1. De betaalmuur ligt exact op de grens waar infra geld kost. | P0 | S | Hoog |
| 15 | **Media-pipeline optimaliseren.** Client-side compressie vóór upload, server-side resizing/derivaten voor de presentatiemuur, CDN-transformaties. Beschermt de marge op elke verkochte fotomuur — 100 gasten die ongecomprimeerd uploaden eten de €49 anders op. | P1 | M | Hoog |
| 16 | **Rate limiting en caching op AI-endpoints.** Gemini-calls zijn de duurste "gratis laag"-kosten; per-account limieten en caching van herbruikbare suggesties houden de gratis laag daadwerkelijk bijna-gratis. | P1 | S | Middel |
| 17 | **Kosten-per-bruiloft inzichtelijk.** Admin-analytics uitbreiden met opslag/bandbreedte/AI-kosten per wedding, zodat de aanname "gratis laag kost nagenoeg niets" continu gevalideerd wordt i.p.v. gehoopt. | P2 | M | Laag–Middel |

### Pijler 4 — B2B eindspel: intent data (bouwen in 2026, verkopen in 2027)

| # | Optimalisatie | Prioriteit | Effort | Impact |
|---|---|---|---|---|
| 18 | **Zoekintentie gestructureerd vastleggen.** In de leveranciers/ontdekken-flow elke zoekactie normaliseren naar categorie, regio, budgetrange en trouwdatum. Dit is het product dat in 2027 verkocht wordt; het moet in 2026 al verzameld worden, anders start je 2027 met een lege database. | P1 | M | Hoog (2027) |
| 19 | **Consent- en privacy-fundament (AVG).** Expliciete, granulaire toestemming voor het gebruik van (geaggregeerde) plandata voor leveranciersmatching, vastgelegd vanaf dag 1. Zonder dit is de hele B2B-datastrategie juridisch onverkoopbaar; achteraf repareren is vrijwel onmogelijk. | P0 (zodra #18 live gaat) | S–M | Hoog (risico) |
| 20 | **Intern "marktvraag"-rapport.** Admin-query/dashboard: actieve zoekvraag per regio × categorie × budgetrange ("85 koppels zoeken een fotograaf in Utrecht, €2.000–€3.500, sept 2027"). Dit is de sales-munitie voor de B2B-lancering. | P2 | S | Middel |
| 21 | **Leveranciersprofielen claimbaar maken (lichte versie).** Leveranciers kunnen gratis hun (nu passieve) profiel claimen en verrijken (account, foto's, tarieven). Zo start de 2027-verkoop met een warme, geregistreerde lijst i.p.v. koude acquisitie. Fundament voor de volledige leveranciersportal in Pijler 5 (#25–#29). | P1 (laat H2 2026) | M | Middel |

### Pijler 5 — B2B leveranciersplatform (fundament voor 2027, ná de consumentenfocus van 2026)

Pijler 4 hierboven beschrijft het *verzamelen* van intent-data. Onderstaande
items zijn de vervolgstap: het product dat leveranciers in 2027 daadwerkelijk
kopen (portal, leads, premium-plek in de matching). Ze bouwen voort op #21
en horen bewust ná de kern van H2 2026 — zie de contradictie-check verderop.

| # | Optimalisatie | Prioriteit | Effort | Impact |
|---|---|---|---|---|
| 25 | **Lead-inbox voor leveranciers.** Offerteaanvragen (nu alleen e-mail via `app/api/leveranciers/contact`) ook in-app laten binnenkomen met status (nieuw/beantwoord/afgewezen). Zonder dit is er geen product om in 2027 een abonnement voor te vragen — leads verdwijnen nu buiten het platform. | P2 | M–L | Hoog |
| 26 | **B2B-abonnement & billing (€39/mnd).** Recurring betalingen voor leveranciers, bovenop de checkout-infrastructuur uit #1. Proefperiode + zelfbediening. | P2 | M | Hoog |
| 27 | **Premium-boost in de AI-matching.** De bestaande `ai/leveranciers-rank` krijgt een premium-tier: betalende leveranciers worden als top-aanbeveling gepusht bij matchende zoekopdrachten. Dit is letterlijk "de AI opent de poort" uit de filosofie — de kernbelofte van het B2B-aanbod. | P2 | M | Hoog |
| 28 | **Beschikbaarheidskalender per leverancier.** Leverancier geeft aan welke datums vrij zijn; verhoogt leadkwaliteit (geen aanvragen voor bezette data) en daarmee de prijs die ervoor gevraagd kan worden. | P2 | M | Middel |
| 29 | **Reviews van leveranciers door bruidsparen.** Ontbreekt nog in het domeinmodel. Verhoogt vertrouwen in aanbevelingen én verrijkt de matchingdata voor #27. | P2 | M | Middel |

### Aanvullingen op Pijler 2 en 3 (RSVP-detail en mediapipeline)

| # | Optimalisatie | Prioriteit | Effort | Impact |
|---|---|---|---|---|
| 22 | **Verzoeknummer/DJ-vraag in de RSVP-flow.** Gasten kunnen bij het invullen van hun RSVP een muziekverzoek achterlaten; komt terecht in het draaiboek van het bruidspaar. Kleine toevoeging uit de filosofie die de "feest"-belofte van de RSVP-flow invult. | P2 | S | Laag–Middel |
| 23 | **Herinnering naar gasten die nog niet gereageerd hebben.** Eén-klik bulkherinnering (e-mail) vanuit de gastenlijst voor open RSVP's. Verhoogt het aantal ingevulde RSVP's — en dus de omvang van de vliegwiel-input — direct. | P1 | S–M | Middel |
| 24 | **Video-ondersteuning + compressie in de fotomuur-pipeline.** Nu alleen foto's; uitbreiden met (client-side gecomprimeerde) video verhoogt de waarde van de premium fotomuur, maar verzwaart de bandbreedtekosten extra — hoort samen met #15 ontwikkeld te worden, niet los. | P2 | M | Middel |

---

## Contradictie-check t.o.v. de leidende strategie

Expliciet getoetst: leidt deze aanvulling tot iets dat ingaat tegen de
afspraken hierboven (gratis kern tot de trouwdag, geld op de feestdag,
2026 = consument monopoliseren, 2027 = B2B verzilveren, K-factor als enige
stuurmetric)? Conclusie: **geen directe tegenspraak.** Twee spanningen zijn
gevonden en opgelost door de bestaande strategie leidend te houden, niet door
die aan te passen:

1. **Timing van het leveranciersplatform.** Los bekeken zou de volledige
   B2B-portal (lead-inbox, billing, premium-boost — #25–#29) eerder moeten
   starten dan "P2 daarna" om in 2027 daadwerkelijk verkoopbaar te zijn. Dat
   is opgelost door alleen de lichte claimflow (#21) naar voren te halen
   (P1, laat H2 2026) zodat er bij de start van 2027 al een warme,
   geregistreerde leverancierslijst staat — zonder dat de zware portal-bouw
   (#25–#29) de consumentenfocus van H2 2026 verdringt. Dit volgt de eigen
   conclusie van de filosofie ("gebruik 2026 om de consumentenmarkt te
   monopoliseren") en wijkt er dus niet vanaf; #21 is de enige prioriteit die
   is aangepast (was P2, is nu P1-laat).
2. **Geen wijziging aan Pijler 1–4 of de KPI.** Alle overige nieuwe items
   (#22, #23, #24) zijn uitbreidingen ván bestaande P0/P1-items, geen nieuwe
   geldstromen of afwijkende volgorde. De K-factor blijft de enige
   wekelijkse stuurmetric; er is geen aanleiding gevonden om dat te
   heroverwegen.

---

## Volgorde van uitvoering

1. **Nu (P0):** #7 + #9 + #8 (vliegwiel aan en meetbaar) parallel aan #1 + #14
   (geldkraan open), daarna #2 (upsell-moment) en #3 (de belofte waarmaken).
   #19 gaat mee zodra intentiedata wordt opgeslagen.
2. **H2 2026 (P1):** funnel-frictie weg (#10, #11, #12), RSVP-volume verhogen
   (#23), marge beschermen (#15, #16), overstapdrempel weg (#4), de
   2027-dataset opbouwen (#18), en de lichte leverancier-claimflow starten
   (#21, verplaatst van P2).
3. **Daarna (P2):** retentie- en B2B-voorbereiding (#5, #13, #17, #20), plus
   het volledige leveranciersplatform en losse toevoegingen (#22, #24, #25,
   #26, #27, #28, #29).

---

## Dé wekelijkse KPI voor H2 2026

**De viral coefficient (K-factor) van het RSVP-vliegwiel: het aantal nieuwe
geactiveerde bruidsparen per bestaande bruiloft, via de RSVP-flow.**

Concreet gedefinieerd:

> K = (nieuwe accounts met bron-attributie "RSVP" die binnen 7 dagen
> *geactiveerd* zijn) ÷ (aantal bruiloften met een actieve RSVP die week)
>
> waarbij "geactiveerd" = trouwdatum ingevuld + minstens één module (budget,
> taken of gasten) gevuld.

Waarom deze en niet omzet of aantal signups:
- **Omzet (fotomuur) is een lagging indicator** — die volgt pas 6–12 maanden na
  signup. Sturen op omzet in H2 2026 is sturen in de achteruitkijkspiegel.
- **Ruwe signups zeggen niets over het vliegwiel** — die kunnen ook uit
  marketing komen. Alleen K bewijst dat het platform zichzelf laat groeien en
  dure acquisitie overbodig maakt, wat de kern van de hele filosofie is.
- **K is actionable per funnelstap.** De wekelijkse review kijkt naar de
  deelconversies: gasten die RSVP invullen → % "Ja, <12 mnd" → % CTA-klik →
  % signup → % activatie. Elke zwakke schakel wijst direct een optimalisatie
  uit de lijst hierboven aan.

Vuistregel voor het doel: bij ~100 gasten per bruiloft en ~5% met trouwplannen
is het theoretische plafond K ≈ 5. Elke waarde **structureel boven de 1** maakt
de groei zelfvoedend (elk bruidspaar brengt meer dan één nieuw bruidspaar aan);
in H2 2026 is **K ≥ 0,5 met een stijgende weektrend** het realistische bewijs
dat het vliegwiel aanslaat. Ondersteunende guardrail-metric: kosten per gratis
bruiloft (uit #17), zodat groei de marge niet stilletjes opeet.
