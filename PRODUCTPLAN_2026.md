# Productplan 2026 — Van werkend product naar lanceerbaar merk

## Wedding Planner · Roadmap juli 2026 – Q1 2027

| | |
|---|---|
| **Rol document** | Product-ownerplan: strategie, thema's/projecten, prioriteit, effort en impact |
| **Peildatum** | Juli 2026 |
| **Lanceerdoel** | Publieke lancering **november 2026**, gericht op de verlovingspiek december 2026 – februari 2027 |
| **Markt** | Nederland |
| **Team** | Kernontwikkelaar + AI-tooling, met inhuurbudget (design, QA, juridisch, content) |
| **Basis** | `FUNCTIONEEL_TECHNISCH_ONTWERP.md` (as-is blauwdruk van de huidige app) |

---

## 1. Waar staan we, en wat is de opgave

De app is functioneel opvallend compleet: negen samenhangende modules, een echte multi-tenant architectuur met RLS, live samenwerking, publieke gastflows (website, RSVP, cadeaulijst, fotomuur) en een AI-laag met caching en kostenbeheersing. Dat is méér dan de meeste concurrenten in de Nederlandse markt bieden.

Wat er **niet** is, is alles wat van een product een bedrijf maakt:

1. **Geen verdienmodel** — geen plans, geen betaalintegratie, geen feature-gating.
2. **Geen kwaliteitsvangnet** — nul geautomatiseerde tests, geen CI-pijplijn, geen staging-omgeving; elke wijziging kan stilletjes een gastflow of RLS-grens breken.
3. **Geen bewezen vertrouwen** — juridisch fundament (AVG, AI-transparantie, e-maildeliverability, databronrechten van de leveranciersdirectory) is niet lanceerklaar.
4. **Geen gevalideerde funnel** — we weten niet waar echte bruidsparen afhaken, want er zijn nog geen echte bruidsparen in aantallen.
5. **Geen go-to-market** — geen marketingsite, geen SEO-positie, geen beta-community.

De opgave voor H2 2026 is dus **niet meer features bouwen**, maar het bestaande productwaardig, verkoopbaar en verdedigbaar maken — en het op het juiste moment in de markt zetten. De verlovingspiek (december–februari, ~40% van alle aanzoeken) is hét instroommoment; wie in november live en vindbaar is, vangt een jaar aan instroom.

### Leidende principes voor alle keuzes hieronder

- **De gastervaring is het groeikanaal.** Elke bruiloft exposeert de app aan 80–150 gasten via website, RSVP, cadeaulijst en fotomuur. Die flows moeten vlekkeloos zijn — zij zijn marketing.
- **Betaalmoment = uitnodigingsmoment.** Bruidsparen betalen niet voor een takenlijst; ze betalen op het moment dat er iets "echts" naar gasten gaat. Het verdienmodel moet daarop aansluiten.
- **Eén bruiloft is eenmalig.** Geen abonnementsretentie najagen die er niet is; optimaliseren voor conversie per cohort en mond-tot-mond.
- **Klein team → wreed prioriteren.** Alles wat niet bijdraagt aan (a) lanceerbaarheid, (b) conversie of (c) vertrouwen, schuift naar 2027.

---

## 2. Verdienmodel-advies

**Advies: freemium met een eenmalige premium-upgrade per bruiloft, geen abonnement.**

| Tier | Prijs | Inhoud |
|---|---|---|
| **Gratis** | €0 | Volledige planningskern: taken, budget, draaiboek, tafels, leveranciers + Ontdekken, gastenlijst tot ±40 gasten, trouwwebsite in conceptmodus (preview, niet gepubliceerd), beperkt AI-tegoed (proeverij) |
| **Premium** (eenmalig, per bruiloft) | **€69** (introprijs beta: €49) | Onbeperkte gasten + RSVP-verzending, publicatie trouwwebsite op eigen slug, cadeaulijst incl. bijdragen, fotomuur, onbeperkte AI-coach/planner, samen-plannen met onbeperkt aantal leden |

**Waarom dit model:**

1. **Past bij het koopmoment.** De gratis laag laat het paar maandenlang plannen en investeren in het product (data-lock-in is organisch). De betaalmuur valt precies op het moment van hoogste urgentie én zichtbaarste waarde: uitnodigingen versturen en de website live zetten. Dat is een natuurlijk, uitlegbaar en fair moment.
2. **Eenmalig verslaat abonnement in deze categorie.** Een bruiloft duurt gemiddeld 12–14 maanden van verloving tot trouwdag; een abonnement voelt als een meter die tikt en veroorzaakt opzeg-gedoe. Eén bedrag "voor jullie hele bruiloft" is psychologisch sterker en operationeel simpeler (geen dunning, geen churn-management).
3. **Realistische businesscase.** Nederland kent ±65.000–70.000 huwelijken per jaar. Bij 2.000 premium-bruiloften in jaar één (±3% marktaandeel van nieuwe instroom) is dat ±€130.000 omzet — haalbaar doel voor een klein team, met leveranciersinkomsten als tweede poot vanaf 2027.
4. **Leveranciers als tweede verdienpoot, maar níét in 2026.** De Ontdekken-module + `vendor_contact_requests` leggen nu al vast welke leads we leveranciers bezorgen. Dat is de basis voor betaalde vermeldingen/leads in 2027 — maar pas als het volume bewijsbaar is. In 2026 alleen: meten en de directory kwalitatief maken.

**Betaalprovider: Mollie** (NL-standaard, iDEAL first-class, eenvoudige one-off payments, geen PSD2-complicaties omdat wij nooit gasttegoeden aanraken — cadeaubijdragen blijven rechtstreeks gast → bruidspaar).

---

## 3. Thema's en projecten

Legenda:
- **Prioriteit**: P0 = lanceerblokkerend · P1 = moet vóór/rond lancering · P2 = na lancering (Q1 2027) · P3 = 2027-kandidaat
- **Effort**: S = < 1 persoonsweek · M = 1–3 weken · L = 3–6 weken · XL = > 6 weken
- **Impact**: effect op lanceerbaarheid, conversie of vertrouwen, met korte motivering

---

### Thema A — Kwaliteitsfundament & engineering-hygiëne

*Doel: elke wijziging kan met vertrouwen live; de gastflows en beveiligingsgrenzen zijn aantoonbaar beschermd.*

Dit thema is de verzekeringspolis onder alles. Zonder vangnet wordt elke week vóór lancering riskanter, dus dit start **eerst**.

| # | Project | Wat | Prio | Effort | Impact |
|---|---|---|---|---|---|
| A1 | **Testfundament kritieke paden** | Vitest voor pure logica (`derived.ts`, `reminders.ts`, `seating.ts`, `timeblocks.ts`, mappers) + Playwright-suites voor de vier gastflows (RSVP, website, cadeaulijst-reservering/bijdrage, fotomuur-upload) en de betaal-/upgradeflow zodra die bestaat. Doel: geen 100% dekking, wél 100% van wat geld of gastvertrouwen raakt. | **P0** | L | **Hoog** — de gastflows zijn het groeikanaal; een kapotte RSVP-pagina op andermans trouwdag is onherstelbare reputatieschade |
| A2 | **RLS-regressietests** | Geautomatiseerde suite (pgTAP of SQL-fixtures in CI) die per rol (owner/planner/helper/viewer/anon/platform_admin) verifieert wat wel/niet lees- en schrijfbaar is, incl. de kruis-tenant-guards en publieke RPC-whitelists. | **P0** | M | **Hoog** — de rechten-matrix is het meest kwetsbare én meest onzichtbare onderdeel; een lek hier is een AVG-incident |
| A3 | **CI/CD + staging** | GitHub Actions: `tsc`, `next lint`, unit- en e2e-tests op elke PR; aparte Supabase-staging (branching) + Vercel-preview met seed-data; productie-deploys alleen via groene pijplijn. | **P0** | M | **Hoog** — randvoorwaarde om met ingehuurde hulp parallel te kunnen werken |
| A4 | **Migratie-hygiëne** | De migratiemap bevat botsende nummers (2× `0021`, 2× `0028`, 2× `0041`, 2× `0044`) en `schema.sql` loopt achter (dekt t/m 0008). Eén canonieke, genummerde keten herstellen, `schema.sql` genereren i.p.v. handmatig bijhouden, migratie-lint in CI. | **P1** | S | Middel — voorkomt drift tussen omgevingen precies wanneer we staging introduceren |
| A5 | **Backups & herstelplan** | Supabase PITR aanzetten, maandelijkse hersteltest naar staging, gedocumenteerde RTO/RPO, runbook voor "bruiloft per ongeluk verwijderd" (soft-delete/prullenbak van 30 dagen voor `weddings`). | **P0** | S–M | **Hoog** — dit product bewaart onvervangbare, emotionele data; één verloren gastenlijst is een existentieel incident |
| A6 | **Performancebudget** | Lighthouse-budget voor de publieke pagina's (website/RSVP/cadeaulijst < 2s LCP op 4G — gasten openen die op hun telefoon), beeldoptimalisatie (`next/image` + resize bij upload), bundelanalyse van de ingelogde app. | P1 | M | Middel — publieke pagina's zijn ook het SEO-gezicht |

**Themadoel meetbaar:** vóór 1 oktober 2026 draait elke merge door een pijplijn die de vier gastflows en het rechtenmodel automatisch verifieert.

---

### Thema B — Monetisatie & billing

*Doel: er kan geld verdiend worden, met een upgradeflow die aanvoelt als een logische stap in plaats van een muur.*

| # | Project | Wat | Prio | Effort | Impact |
|---|---|---|---|---|---|
| B1 | **Plan-/entitlement-model** | `wedding_plan` (free/premium) op de wedding + centrale entitlement-laag (server-side afgedwongen in RLS/RPC's en API-routes, client-side gespiegeld zoals de rechten-matrix). Limieten: gastenaantal, publicatie-schakelaar, AI-tegoed. | **P0** | M | **Hoog** — fundament van het verdienmodel; server-side afdwingen voorkomt dat de betaalmuur een sticker is |
| B2 | **Mollie-integratie** | Eenmalige betaling per bruiloft (iDEAL/kaart), webhook-verwerking (idempotent), facturen (btw!), refund-flow, `payments`-tabel met audit-log. | **P0** | M–L | **Hoog** |
| B3 | **Upgrade-momenten in het product** | De betaalmuur op de juiste plekken: RSVP-verzending, website-publicatie, cadeaulijst aanzetten, fotomuur activeren, AI-tegoed op. Eén consistente upgrade-modal met duidelijke waardepropositie, geen tien varianten. | **P0** | M | **Hoog** — conversie wordt hier gewonnen of verloren |
| B4 | **Pricing-pagina + gratis-proef-logica** | Publieke prijzenpagina, "alles proberen, betalen bij versturen"-uitleg, introprijs-mechaniek voor beta-gebruikers (levenslang beta-tarief als dank). | P1 | S | Middel |
| B5 | **Financieel dashboard (intern)** | Omzet, conversie per cohort, AI-kosten per bruiloft naast elkaar in het bestaande admin (`/admin/gebruik` uitbreiden). Unit economics per bruiloft zichtbaar. | P1 | S–M | Middel — stuurinformatie voor de prijs- en AI-beslissingen van Q1 2027 |
| B6 | **Leveranciers-monetisatie (verkenning)** | Geen bouw in 2026. Wel: leadvolume per leverancier meten (bestaat al via `vendor_contact_requests`), 10 leveranciersinterviews in Q4, propositie op papier voor 2027. | P2 | S | Middel — optiewaarde voor de tweede verdienpoot |

**Themadoel meetbaar:** vóór beta-start (september) kan een echt bruidspaar met iDEAL afrekenen; conversiedoel eerste cohort ≥ 8% gratis → premium binnen 60 dagen.

---

### Thema C — Vertrouwen, compliance & juridisch

*Doel: een bruidspaar durft ons de gastenlijst (met adressen, dieetwensen, kinderen) toe te vertrouwen, en wij kunnen dat vertrouwen juridisch waarmaken.*

Dit thema wordt structureel onderschat bij hobby-naar-product-transities. Voor deze app is het extra zwaar: we verwerken **bijzondere persoonsgegevens van niet-gebruikers** (dieetwensen van gasten kunnen gezondheid/religie onthullen) en we draaien op een directory waarvan de databronrechten onduidelijk zijn.

| # | Project | Wat | Prio | Effort | Impact |
|---|---|---|---|---|---|
| C1 | **AVG-fundament** | Verwerkingsregister, verwerkersovereenkomsten (Supabase, Vercel, Resend, Google/Gemini, Mollie, Sentry), herschreven privacyverklaring en voorwaarden (door jurist getoetst — inhuurbudget), grondslag en bewaartermijnen per gegevenscategorie, datalek-procedure. Specifiek: gastgegevens zijn gegevens van *derden* die het bruidspaar invoert — de rolverdeling (wij verwerker, paar verwerkingsverantwoordelijke?) expliciet regelen in de voorwaarden. | **P0** | M (veel extern) | **Hoog** — lanceervoorwaarde; ook een marketingtroef ("jullie gasten, veilig geregeld") |
| C2 | **Datalevenscyclus & exit** | Automatische opschoning: RSVP-tokens en fotomuur x maanden na de trouwdatum bevriezen, bruiloftdata n maanden na de trouwdag anonimiseren/verwijderen (met aankondigingsmail + exportmogelijkheid), volledige data-export (ZIP: CSV's + foto's) voor het bruidspaar. | P1 | M | **Hoog** voor vertrouwen; vereist voor AVG-verzoeken op schaal |
| C3 | **AI-transparantie (AI Act)** | AI-output consequent labelen als AI-gegenereerd, uitlegpagina (welke data gaat naar Gemini, wat wordt bewaard), opt-out per bruiloft voor AI-features, menselijke-maat-disclaimer bij adviezen. Grotendeels UX-werk; de deterministische urgentie-engine helpt hier al. | P1 | S–M | Middel — verplichting én onderscheidend t.o.v. concurrenten die het stilhouden |
| C4 | **Directory-databronrechten uitzoeken** | De `suppliers`/`tpw_businesses`-catalogi zijn geïmporteerd uit externe bronnen. Vóór commerciële lancering: vaststellen wat de licentie-/scrapingstatus is, zo nodig bronnen vervangen door eigen acquisitie (C5→F1) of overeenkomsten sluiten. **Dit is een verborgen lanceerrisico.** | **P0** (uitzoeken) | S (uitzoeken), gevolg onbekend | **Hoog** — een sommatie van een databron in lanceerweek is een realistisch scenario |
| C5 | **E-maildeliverability & compliance** | Eigen verzenddomein met SPF/DKIM/DMARC (p=quarantine→reject), bounce-/klachtverwerking via Resend-webhooks terug het systeem in (RSVP-status "e-mail onbestelbaar" tonen aan het paar), afmeldlink in alle niet-transactionele mail, verzendreputatie-monitoring. | **P0** | M | **Hoog** — als RSVP-uitnodigingen in spam belanden faalt de kernbelofte van het product |
| C6 | **Security-hardening & externe check** | Beperkte externe pentest (inhuur, focus: publieke RPC's, tokens, storage-policies, IDOR), Supabase security-advisors structureel in CI, secret-rotatiebeleid, dependency-scanning (Dependabot), `security.txt` + responsible-disclosurepagina. | P1 | M (deels extern) | **Hoog** — één publiek lek rond een bruiloft is einde merk |

**Themadoel meetbaar:** vóór publieke lancering zijn C1, C4 en C5 volledig afgerond en is de pentest zonder kritieke bevindingen afgesloten.

---

### Thema D — Activatie, retentie & inzicht

*Doel: van "wij denken dat het werkt" naar "wij zien waar paren afhaken en repareren dat".*

| # | Project | Wat | Prio | Effort | Impact |
|---|---|---|---|---|---|
| D1 | **Funnel-instrumentatie** | Het bestaande `analytics_events` uitbouwen tot een gedefinieerde funnel: registratie → setup afgerond → eerste taak afgevinkt → gast toegevoegd → *aha-moment* (hypothese: eerste RSVP-bevestiging binnen) → upgrade. Dashboards in `/admin/gebruik`; geen extern analyticspakket nodig (privacyvoordeel). | **P0** | M | **Hoog** — zonder dit is elk conversiegesprek een mening |
| D2 | **Onboarding-revisie** | De setup-wizard herijken op time-to-value: binnen 10 minuten een gevulde takenlijst, richtbudget en eerste AI-advies. Slimme defaults (sjablonen direct aan), voortgangs-checklist "jullie eerste week" op het dashboard. | P1 | M | **Hoog** — activatie in week 1 voorspelt alles daarna |
| D3 | **Lifecycle-e-mails** | Naast de bestaande deadline-digests: welkomstreeks (dag 0/2/7), reactivatie bij 14 dagen inactiviteit ("jullie takenlijst mist jullie"), mijlpaalmails (100 dagen te gaan, week vóór de bruiloft: draaiboek-check + fotomuur-reminder), post-wedding (foto's downloaden + review vragen). Resend-infra bestaat al. | P1 | M | **Hoog** — bruiloftplanning kent maandenlange stille periodes; e-mail is het terughaalkanaal |
| D4 | **Feedback in het product** | Lichtgewicht NPS/feedbackprompt op sleutelmomenten (na RSVP-golf, na trouwdag), gekoppeld aan het bestaande admin-bugkanaal; beta-gebruikers krijgen een directe lijn. | P1 | S | Middel |
| D5 | **Post-wedding-ervaring** | De laatste indruk professionaliseren: afsluitscherm na de trouwdag, fotomuur-download als ZIP, bedankje, en het natuurlijke review/verwijzingsmoment ("ken je een verloofd stel? geef ze 10% korting"). | P2 | M | Middel — voedt mond-tot-mond, het belangrijkste kanaal in deze markt |

**Themadoel meetbaar:** vanaf beta-start is de volledige funnel zichtbaar per weekcohort; doel bij lancering: ≥ 55% van registraties rondt de setup af, ≥ 30% bereikt het aha-moment.

---

### Thema E — Gastervaring op lanceerkwaliteit

*Doel: alles wat een gast ziet is onberispelijk — want elke gast is een toekomstig bruidspaar of doorverwijzer.*

De gastflows bestaan en werken; dit thema brengt ze van "werkt" naar "voelt professioneel". Bewust géén nieuwe features, wel afwerking met hefboomwerking.

| # | Project | Wat | Prio | Effort | Impact |
|---|---|---|---|---|---|
| E1 | **Kwaliteitsronde vier gastflows** | Met een ingehuurde designer alle publieke pagina's (website, RSVP, cadeaulijst, fotomuur) langs een vaste lat: mobiel-first, laadtijd, typografie/thema-consistentie, foutteksten, lege staten, bevestigingsschermen. Inclusief e-mailtemplates (die zien gasten óók). | **P0** | L (deels extern) | **Hoog** — dit ís het merk voor 100+ mensen per bruiloft |
| E2 | **Toegankelijkheid publieke pagina's** | WCAG 2.1 AA op de gastflows: contrast per thema afdwingen (auto-contrast bestaat deels), toetsenbordnavigatie, schermlezer-labels op RSVP-formulier en upload. Oudere gasten zijn een reëel publiek. | P1 | M | Middel–hoog — bruiloftgasten zijn 8 tot 88 jaar |
| E3 | **RSVP-betrouwbaarheid end-to-end** | Hardening van het belangrijkste pad: duidelijke fouten bij verlopen/ingetrokken tokens, wijzigen-na-indienen-flow, bevestigingsmail naar de gast, "werkt gegarandeerd zonder JavaScript-fratsen op oude telefoons". | **P0** | M | **Hoog** |
| E4 | **Trouwdag-modus** | De bestaande draaiboek + fotomuur samensmeden tot een offline-tolerante trouwdagervaring (PWA-basis bestaat al): draaiboek cachen voor slechte venue-wifi, fotomuur-scherm robuust bij verbroken verbindingen (auto-reconnect, geen zwart scherm op de bruiloft). | P1 | M | Middel–hoog — de trouwdag is het moment van maximale zichtbaarheid én maximaal afbreukrisico |
| E5 | **Cadeaulijst-afronding** | De pending→confirmed-flow voor bijdragen gebruiksvriendelijker: automatische herinnering aan het paar om ontvangst te bevestigen, nette gaststatus ("jouw bijdrage is ontvangen 🎉"), bedankjes-overzicht voor het paar. | P2 | M | Middel |

---

### Thema F — Leveranciersdirectory als troef

*Doel: Ontdekken is de reden dat een NL-bruidspaar ons kiest boven een generieke to-do-app — en de basis onder de 2027-verdienpoot.*

| # | Project | Wat | Prio | Effort | Impact |
|---|---|---|---|---|---|
| F1 | **Datakwaliteit & dekking** | Afhankelijk van uitkomst C4: directory schonen (dubbelen `suppliers`×`tpw_businesses` samenvoegen tot één bron met herkomstvelden), dekking per categorie×provincie meten, gaten vullen in de 3 belangrijkste categorieën (locatie, fotograaf, catering). | P1 | L | **Hoog** — een directory met verouderde of dode vermeldingen is erger dan geen directory |
| F2 | **Leveranciers-claimflow (lite)** | Leveranciers kunnen hun vermelding claimen en actualiseren (gratis in 2026). Levert: actuele data zonder eigen redactie, een leveranciersrelatiebestand, en de mailinglijst voor de 2027-monetisatie. Bewust minimaal: claim + bewerken, geen dashboard. | P2 | M–L | Middel–hoog — goedkoopste weg naar datakwaliteit én toekomstige omzet |
| F3 | **Reviews van eigen gebruikers** | Post-wedding (D5) vragen we het paar hun geboekte leveranciers te beoordelen. Start klein: sterren + één zin, alleen geverifieerde boekingen (koppeling `vendors.status = geboekt` bestaat al). | P3 | M | Middel — uniek verdedigbaar datapunt, maar heeft volume nodig; 2027 |

---

### Thema G — AI-professionalisering

*Doel: AI blijft de onderscheidende laag, maar wordt voorspelbaar in kwaliteit én kosten — en draagt de premium-propositie.*

| # | Project | Wat | Prio | Effort | Impact |
|---|---|---|---|---|---|
| G1 | **Evals & kwaliteitsbewaking** | Vaste evaluatieset per AI-feature (20–30 realistische bruiloftprofielen), geautomatiseerd gescoord op bruikbaarheid/formaat/NL-taal bij elke promptwijziging of modelupdate. De bestaande benchmarks in `lib/bruiloft/ai/` zijn het startpunt. | P1 | M | **Hoog** — AI die één keer onzin adviseert ("boek je locatie 2 weken van tevoren") kost het vertrouwen van álle features |
| G2 | **Kosten- en tegoedbeheer** | AI-tegoed per plan (B1) afdwingen, kosten per bruiloft in het financiële dashboard (B5), circuit-breaker bij Gemini-storingen met nette degradatie (deterministische urgentie-engine als terugvaloptie — die bestaat al). | **P0** (koppeling aan B1) | S–M | **Hoog** — ongelimiteerde gratis AI × marketingpiek = rekening zonder rem |
| G3 | **AI-feedback sluitend maken** | De bestaande feedbackduim (`/api/ai/feedback`) verbinden aan de evals: slecht beoordeelde adviezen automatisch in de evaluatieset, wekelijkse review van feedback in het admin-AI-dashboard. | P2 | S | Middel |
| G4 | **Nieuwe AI-features** | **Bevroren tot na lancering.** De bestaande negen AI-endpoints zijn genoeg propositie; elke nieuwe feature vergroot het kwaliteits- en kostenoppervlak vóór we het bestaande bewaken. | P3 | — | — |

---

### Thema H — Go-to-market & beta

*Doel: op lanceerdag bestaan we al — in zoekresultaten, in trouwcommunities en in de verhalen van 50 beta-paren.*

| # | Project | Wat | Prio | Effort | Impact |
|---|---|---|---|---|---|
| H1 | **Beta-programma (sept–okt)** | 30–50 echte bruidsparen (streven: trouwdatum in 2027, dus midden in hun planning), geworven via trouwcommunities/Instagram/persoonlijk netwerk. Duidelijke deal: gratis premium of beta-tarief levenslang, in ruil voor feedback en (bij succes) een testimonial. Wekelijkse feedbackcyclus op de D1-funnel. | **P0** | M (doorlopend) | **Hoog** — de enige manier om vóór lancering echte-wereldbugs en conversie-inzicht te krijgen |
| H2 | **Marketingsite & SEO-fundament** | Aparte publieke site (kan binnen dezelfde Next.js-app): propositie, prijzen, privacy-belofte, en 8–12 SEO-contentpagina's op de zoektermen waar de instroom zit ("bruiloft checklist", "kosten bruiloft", "trouwbudget verdelen", "draaiboek trouwdag") — deels interactieve teasers van de echte tools (invullen → resultaat → account maken). Contentproductie deels inhuren. | **P0** | L (deels extern) | **Hoog** — SEO-instroom composteert; november planten = vindbaar in de decemberpiek van 2027, maar de teaser-tools converteren al direct |
| H3 | **Lanceercampagne (nov) + verlovingspiek (dec–feb)** | Productlancering: PR richting NL trouwmedia/-blogs, Instagram/Pinterest-aanwezigheid (bruiloftplanning is visueel en Pinterest-gedreven), beta-testimonials, eventueel klein betaald budget op "net verloofd"-segmenten in dec–jan. | **P0** | M (doorlopend, deels extern) | **Hoog** |
| H4 | **Referral-mechanisme** | Simpel: elk premium-paar krijgt een deelbare kortingslink voor verloofde vrienden. Bruiloftgasten zíjn de doelgroep — het kanaal zit in het product ingebouwd. | P2 | S–M | Middel–hoog |
| H5 | **Merk & naam** | Vóór de marketingsite: definitieve naam, domein, logo/huisstijl (designbudget). De repo heet nu "news" en de app "wedding-planner" — er is nog geen merk. | **P0** | S–M (extern) | **Hoog** — blokkeert H2/H3 |

---

### Thema I — Support & operatie

*Doel: één klein team kan honderden bruiloften ondersteunen zonder te verzuipen — juist rond andermans belangrijkste dag.*

| # | Project | Wat | Prio | Effort | Impact |
|---|---|---|---|---|---|
| I1 | **Helpcentrum & selfservice** | 20–30 hulpartikelen op de voorspelbare vragen (RSVP-link kwijt, gast verwijderen, cadeaulijst-wachtwoord, hoe werkt de fotomuur op de dag zelf), doorzoekbaar, gelinkt vanuit de relevante schermen. Schrijfwerk deels uit de beta-vragen laten ontstaan. | P1 | M | **Hoog** — elk supportticket dat een artikel afvangt is teamtijd; bruidsparen mailen 's avonds en verwachten antwoord |
| I2 | **Supporttooling in admin** | Het read-only admin uitbreiden met support-acties onder audit-log: RSVP-token opnieuw versturen, invite verlengen, betaling opzoeken/refunden (Mollie-koppeling), bruiloft herstellen uit soft-delete (A5). Platform-admin blijft read-only op tenantdata; acties lopen via expliciete, gelogde support-RPC's. | P1 | M | Middel–hoog |
| I3 | **Statuspagina & incidentproces** | Externe statuspagina, uptime-monitoring op de publieke flows (synthetische RSVP-check elke 5 min), escalatieafspraak voor trouwdagen (zaterdagen in het seizoen = verhoogde paraatheid), incident-runbooks. | P1 | S | Middel — "is de fotomuur stuk?" op een zaterdag om 21:00 is ons ernstigste scenario |
| I4 | **Weekend-SLA in het seizoen** | Operationele afspraak (geen bouwwerk): wie is bereikbaar op zaterdagen mei–september, wat is de responstijd op trouwdag-incidenten. Vastleggen vóór het seizoen 2027. | P2 | S | Middel |

---

## 4. Wat we bewust NIET doen in 2026

Even belangrijk als de lijst hierboven:

- **Geen native apps** (iOS/Android) — de PWA-basis volstaat; trouwdag-modus (E4) dekt de mobiele kernbehoefte.
- **Geen internationalisering** — alles is diep Nederlands (taal, benchmarks, directory, iDEAL); i18n is een 2027+-beslissing na bewezen NL-model.
- **Geen marketplace-betalingen** (gasten betalen via ons platform aan het paar) — vermijdt PSD2/vergunningstraject; bankoverschrijving + betaallink volstaan.
- **Geen leveranciers-portaal met dashboards** — alleen de claim-lite (F2); monetisatie volgt in 2027 op bewezen leadvolume.
- **Geen nieuwe AI-features** (G4) en **geen nieuwe planningsmodules** — het productoppervlak is groot genoeg; 2026 draait om diepte, niet breedte.
- **Geen tafel-/website-featureuitbouw op verzoek van enkelingen** — featureverzoeken uit de beta gaan naar een 2027-backlog, tenzij ze conversieblokkerend zijn.

---

## 5. Roadmap op tijdlijn

### Q3 2026 (juli–september) — "Fundament & beta-klaar"

| Maand | Zwaartepunt |
|---|---|
| **Juli** | A1–A3 (tests, CI/CD, staging) starten · C4 databronrechten uitzoeken (kan scope veranderen!) · H5 merkbeslissing · B1 entitlement-ontwerp |
| **Augustus** | B1–B3 billing bouwen · C1 AVG-traject met jurist · C5 e-maildomein & deliverability · A4–A5 hygiëne + backups · D1 funnel-instrumentatie |
| **September** | E1/E3 gastflow-kwaliteitsronde (designer aan boord) · **beta-start (H1)** met 30–50 paren · D2 onboarding-revisie op eerste funneldata · G2 AI-tegoeden live |

**Mijlpaal 30 september:** beta draait met werkende betalingen, gemeten funnel en beschermde gastflows.

### Q4 2026 (oktober–december) — "Professionaliseren & lanceren"

| Maand | Zwaartepunt |
|---|---|
| **Oktober** | Beta-feedback verwerken · C6 pentest · C2 datalevenscyclus · D3 lifecycle-mails · H2 marketingsite + SEO-content · I1 helpcentrum · E2/E4 toegankelijkheid + trouwdag-modus |
| **November** | **Publieke lancering** (H3) · I2–I3 supporttooling & statuspagina · F1 directory-schoonmaak · G1 AI-evals |
| **December** | Verlovingspiek: campagne op "net verloofd" · conversie-optimalisatie op D1-data · B5 financieel dashboard · stabiliteit boven alles (feature freeze rond kerst — piekinstroom) |

**Mijlpaal 31 december:** publiek gelanceerd, compliance rond, eerste betalende cohorten binnen, team in "meten en bijsturen"-stand.

### Q1 2027 — "Groei & tweede poot voorbereiden"

- Conversie-iteraties op de piekinstroom (D-thema), H4 referrals, D5 post-wedding.
- F2 leveranciers-claimflow + leveranciersinterviews → go/no-go leveranciersmonetisatie H2 2027.
- E5 cadeaulijst-afronding, G3 AI-feedbackloop.
- Seizoensvoorbereiding trouwseizoen 2027 (I4): de eerste échte trouwdagen van betalende klanten vallen vanaf april–mei.

---

## 6. Samenvattende prioriteitenmatrix

**P0 — zonder dit geen lancering** (in volgorde van starten):

| Project | Effort | Waarom lanceerblokkerend |
|---|---|---|
| A1–A3 Tests, RLS-suite, CI/CD | L+M+M | Vangnet onder al het andere werk |
| C4 Databronrechten directory | S (+ ?) | Verborgen juridisch risico, kan scope veranderen → vroeg uitzoeken |
| H5 Merk & naam | S–M | Blokkeert site, campagne en zelfs domein/e-mail (C5) |
| B1–B3 Entitlements, Mollie, upgradeflow | M+M–L+M | Zonder kassa geen bedrijf |
| A5 Backups & soft-delete | S–M | Onvervangbare data |
| C1 AVG-fundament | M | Wettelijke lanceervoorwaarde |
| C5 E-maildeliverability | M | RSVP in spam = kernbelofte kapot |
| D1 Funnel-instrumentatie | M | Zonder meten geen sturen in de piek |
| E1+E3 Gastflow-kwaliteit + RSVP-hardening | L+M | De gastervaring is het merk |
| G2 AI-kostenrem | S–M | Onbegrensde kosten × piek |
| H1 Beta-programma | M | Enige bron van echte-wereldvalidatie |
| H2 Marketingsite & SEO | L | Vindbaarheid in de piek |
| H3 Lanceercampagne | M | De lancering zelf |

**Ruwe capaciteitstoets:** P0 telt op naar ± 20–26 persoonsweken bouwwerk plus extern werk (jurist, designer, content, pentest). Met één fulltime kernontwikkelaar + AI-hefboom + gericht inhuren is dat haalbaar binnen juli–november, mits P1 pas ná de P0-keten start en de "niet doen"-lijst gerespecteerd wordt. De grootste plannings-risico's zitten in C4 (onbekende uitkomst) en de doorlooptijd van externe partijen (jurist, pentest) — die dus in juli/augustus aftrappen.

---

## 7. Belangrijkste risico's en mitigaties

| # | Risico | Kans | Impact | Mitigatie |
|---|---|---|---|---|
| 1 | **Directory-databronnen blijken niet-licentieerbaar** (C4) | Middel | Hoog | Direct in juli uitzoeken; terugvalplan = directory afslanken tot geverifieerde/geclaimde vermeldingen (F2 naar voren halen) — de app blijft waardevol zonder volledige directory |
| 2 | **Solo-kern = bus-factor 1** | — | Hoog | CI/staging/runbooks (A-thema) maken overdraagbaarheid; inhuurkring vroeg opbouwen zodat er warme reserves zijn |
| 3 | **Seizoensmis**: lancering schuift voorbij de verlovingspiek | Middel | Hoog | De piek is het énige harde anker: bij uitloop schrappen we P1's, nooit de lanceerdatum; kerst-feature-freeze bewaakt stabiliteit tijdens de instroom |
| 4 | **AI-kosten of -kwaliteit ontsporen bij volume** | Middel | Middel | G2 (tegoeden + circuit-breaker) is P0; G1-evals vangen kwaliteitsregressies; deterministische terugvallaag bestaat al |
| 5 | **Trouwdag-incident bij een betalende klant** (fotomuur/RSVP down op zaterdag) | Laag–middel | Zeer hoog | I3 synthetische monitoring, E4 offline-tolerantie, I4 weekend-paraatheid, statuspagina voor eerlijke communicatie |
| 6 | **Vertrouwensschade door datalek** | Laag | Zeer hoog | A2 RLS-regressietests, C6 pentest, C2 dataminimalisatie (minder bewaren = minder lekken) |
| 7 | **Conversie blijft onder de 8%-aanname** | Middel | Middel | Beta meet dit vóór lancering; knoppen: prijs (€49–€89 testen), betaalmuurmoment (B3), gratis-limiet (gastenaantal) — allemaal instelbaar dankzij B1-entitlement-laag |
| 8 | **Concurrent(en) met budget in dezelfde piek** | Middel | Middel | Ons verdedigbare verschil: NL-diepte (directory, benchmarks, iDEAL), gastervaring-suite en AI-coach als samenhangend geheel — daarom E1/F1/G1 op kwaliteit houden i.p.v. feature-race |

---

## 8. Succescriteria eind Q1 2027

| KPI | Doel |
|---|---|
| Actieve bruiloften (≥ 1 actie in 30 dagen) | ≥ 1.000 |
| Setup-voltooiing na registratie | ≥ 55% |
| Aha-moment (eerste RSVP-bevestiging binnen) | ≥ 30% van geactiveerde bruiloften |
| Conversie gratis → premium (60 dagen) | ≥ 8% |
| Omzet cumulatief | ≥ €25.000 (bewijs van model; de grote cohorten trouwen pas later in 2027) |
| NPS bruidsparen | ≥ 45 |
| Uptime publieke gastflows | ≥ 99,9%, geen trouwdag-incidenten |
| AI-kosten per actieve bruiloft | < €0,50/maand |

---

*Dit plan is opgesteld vanuit de product-ownerrol op basis van de as-is architectuur (`FUNCTIONEEL_TECHNISCH_ONTWERP.md`) en de vier strategische keuzes: markt Nederland, klein team met inhuurbudget, lancering Q4 2026 op de verlovingspiek, en het hierboven onderbouwde freemium-met-eenmalige-upgrade-verdienmodel.*
