# Planning 2026 — Epics, tickets & toelichting

## Wedding Planner · Uitvoeringsplanning juli 2026 – maart 2027

| | |
|---|---|
| **Doel document** | Eén uitvoerbare planning op basis van `PRODUCTPLAN_2026.md`: epics en tickets in tijdsvolgorde, klaar om in een team-/ticketsysteem te zetten |
| **Per epic** | Periode en afhankelijkheden · tickets met acceptatiecriteria · **toelichting per ticket in gewone taal** (voor niet-technische teamleden) · een kant-en-klare **Claude Code-prompt** om de tickets uit te werken |
| **Werkwijze** | Eén epic = één feature branch + PR-reeks. Tickets gemarkeerd met 👤 zijn menswerk (jurist, designer, marketing) — Claude Code levert daar voorbereidend materiaal |
| **Harde deadline** | Publieke lancering **november 2026** (verlovingspiek dec–feb). Bij uitloop schuiven P1-epics, nooit de lanceerdatum |

**Legenda prioriteit/effort:** P0 = lanceerblokkerend · P1 = vóór/rond lancering · P2 = Q1 2027 · Effort: S = < 1 persoonsweek · M = 1–3 weken · L = 3–6 weken.

## Woordenlijst voor niet-technische lezers

| Term | Betekenis in gewone taal |
|---|---|
| **De sloten op de database (RLS)** | Regels ín de database zelf die bepalen wie welke gegevens mag zien of wijzigen. Zelfs als de app een fout bevat, houden deze sloten indringers tegen. |
| **Controlestraat (CI/CD)** | Een automatische keuring die bij élke code-wijziging draait: tests, controles, foutchecks. Pas als alles groen is, mag de wijziging live. |
| **Oefenomgeving (staging)** | Een exacte kopie van de app met nepgegevens, waar we alles eerst testen voordat het naar echte gebruikers gaat. |
| **Gastflows** | De vier pagina's die bruiloftsgásten zien zonder in te loggen: trouwwebsite, RSVP-pagina, cadeaulijst en fotomuur. |
| **Cron** | Een automatische taak die elke dag (of elk uur) vanzelf draait, zoals het versturen van herinneringsmails. |
| **Entitlements** | De lijst met rechten per abonnement: wat mag een gratis gebruiker, wat mag premium. |
| **E2e-test** | Een robot-browser die de app bedient zoals een echte gebruiker en controleert of alles klopt. |
| **Ticket met 👤** | Werk voor een méns (jurist, ontwerper, marketeer, DNS-beheer) — niet voor de computer of Claude Code. |

---

## Tijdlijn-overzicht

```
                        jul   aug   sep   okt   nov   dec   Q1'27
FASE 1 Fundament
 E01 FUND  Tests & CI/CD ███████
 E02 DATA  Hygiëne/herstel █████
 E03 RECHT Bronrechten/merk ████▒▒                      (▒ = doorloop extern)
FASE 2 Verdienmodel & vertrouwen
 E04 BILL  Entitlements/billing   ████████
 E05 AVG   AVG & AI-transp.       ██████▒▒
 E06 MAIL  Deliverability         ██████
 E07 FUNL  Funnel/dashboards        ██████
FASE 3 Beta-klaar
 E08 GAST  Gastervaring                 ████████
 E09 AIKO  AI-tegoeden                  ████
 E10 BETA  Onboarding & beta              ██████──────── (beta loopt door)
FASE 4 Professionaliseren
 E11 LIFE  Lifecycle-mails                     ██████
 E12 CYCL  Datalevenscyclus                    ██████
 E13 SEC   Security/pentest                    ██████
 E14 SITE  Marketingsite/SEO                   ████████
 E15 DAG   Trouwdag-modus                        ██████
FASE 5 Lancering
 E16 SUPP  Support & operatie                       ██████
 E17 DIR   Directory-kwaliteit                      ██████
 E18 EVAL  AI-evals                                   ██████
 E19 LNCH  Lancering                                  ████ ← 🚀 nov
FASE 6 Groei
 E20 GROEI Q1-groeipakket                                        █████████
```

Parallelliteit is gepland op: 1 kernontwikkelaar + Claude Code, designer (sep–okt), jurist (jul–sep), content/marketing (okt–dec), pentester (okt).

---

# FASE 1 — Fundament (juli 2026)

---

## E01 · FUND — Testfundament & CI/CD

**Periode:** juli · **Prio:** P0 · **Effort:** L+M+M · **Afhankelijkheden:** geen — start eerst
**Uit productplan:** A1 (tests kritieke paden), A2 (RLS-regressietests), A3 (CI/CD + staging)

> **Waarom dit epic (in gewone taal):** er is nu géén enkel automatisch vangnet. Elke aanpassing kan ongemerkt iets kapotmaken — bijvoorbeeld de RSVP-pagina op de trouwdag van een klant. Dit epic bouwt dat vangnet, zodat al het latere werk veilig en snel kan.

| Ticket | Titel | Omschrijving & acceptatie |
|---|---|---|
| FUND-1 | Vitest-setup + unit tests pure logica | Vitest configureren (`npm test` bestaat daarna). Dekkende tests voor `lib/bruiloft/derived.ts`, `reminders.ts`, `seating.ts`, `timeblocks.ts`, `csv.ts` en `mappers.ts` (row↔domein round-trip). **Acceptatie:** alle randgevallen uit de code-commentaren getest (overboeking tafels, gemiste cron-dag, lege tijden draaiboek). |
| FUND-2 | Playwright-setup + RSVP-gastflow e2e | Playwright met seed-data tegen lokale/staging-omgeving. Flow: RSVP-link openen → bevestigen/afmelden → dieetwensen → status zichtbaar voor paar. Incl. foutpaden: verlopen/ingetrokken token. |
| FUND-3 | E2e: website, cadeaulijst, fotomuur | Publieke website op slug (gepubliceerd/niet-gepubliceerd), cadeau reserveren + annuleren via token, fondsbijdrage pending→confirmed, fotomuur-upload met/zonder moderatie. |
| FUND-4 | RLS-regressiesuite | SQL/pgTAP-suite die per rol (owner, planner, helper, viewer, anon, platform_admin) toetst wat lees-/schrijfbaar is per tabel, incl. kruis-tenant-guards, `prevent_last_owner_removal` en de output-whitelists van alle publieke RPC's. **Acceptatie:** suite faalt aantoonbaar als een policy wordt verruimd. |
| FUND-5 | GitHub Actions-pijplijn | Op elke PR: `tsc --noEmit`, `next lint`, Vitest, RLS-suite; Playwright op label/nightly. Merge naar main geblokkeerd zonder groen. |
| FUND-6 | Staging-omgeving + seed-script | Aparte Supabase-staging (branch of tweede project) + Vercel-preview-koppeling; seed-script met 3 realistische demo-bruiloften (incl. gasten, RSVP-statussen, registry, fotomuur) voor e2e en demo's. |

### In gewone taal, per ticket

**FUND-1 — Automatische tests op de rekenlogica.** De app rekent van alles uit: budgettotalen, wie op welke stoel zit, wanneer een herinnering moet worden verstuurd. Als daar een fout in sluipt, kloppen bedragen of herinneringen stilletjes niet meer. We schrijven testjes die deze berekeningen honderden keren met verschillende voorbeelden narekenen; vanaf dan draait die controle automatisch bij elke wijziging — gaat er iets mis, dan krijgt de ontwikkelaar direct een rood signaal, vóórdat een gebruiker het merkt.

**FUND-2 — Automatische test van de RSVP-pagina.** De RSVP-pagina is de belangrijkste belofte van het product: gasten moeten altijd kunnen bevestigen of afmelden. Een robot-browser doet precies wat een echte gast doet — link openen, bevestigen, dieetwensen invullen — en controleert of alles klopt. Ook de vervelende gevallen worden nagespeeld, zoals een verlopen uitnodigingslink.

**FUND-3 — Automatische test van website, cadeaulijst en fotomuur.** Hetzelfde als FUND-2, maar voor de andere drie gastenpagina's: de trouwwebsite bekijken, een cadeau reserveren (en annuleren), geld bijdragen aan een pot, en een foto uploaden — inclusief situaties als "dit cadeau is al gereserveerd".

**FUND-4 — Test op de sloten van de database.** De app bewaart gevoelige gegevens (adressen van gasten, budgetten). De sloten op de database bepalen dat bijvoorbeeld een "helper" wel de takenlijst ziet maar niet het budget, en dat een buitenstaander niets ziet. Als iemand die sloten per ongeluk verruimt, hebben we een privacylek. Een testreeks probeert voor elk type gebruiker toegang te krijgen tot álle soorten gegevens, en slaat alarm zodra iets toegankelijk is dat dat niet hoort te zijn.

**FUND-5 — De automatische controlestraat.** Alle bovenstaande tests moeten vanzelf draaien, niet alleen als iemand eraan denkt. Elke voorgestelde wijziging wordt automatisch gekeurd en mag pas samengevoegd worden als alles groen is. Zo kan ook ingehuurde hulp veilig meewerken.

**FUND-6 — Oefenomgeving met nepbruiloften.** Je wilt nooit testen op de echte omgeving met echte klanten. We zetten een tweede, identieke omgeving op met drie realistische nepbruiloften (inclusief gasten, cadeaulijst en foto's). Daar testen we alles eerst, en het is meteen handig voor demo's.

### Claude Code-prompt (E01)

```text
Je werkt in de wedding-planner-repo. Lees eerst CLAUDE.md, FUNCTIONEEL_TECHNISCH_ONTWERP.md
(§2.3 datamodel, §2.4 rechtenmodel, §4.4 publieke paden) en PLANNING_2026_EPICS.md → epic E01.

Opdracht: werk de tickets FUND-1 t/m FUND-6 in volgorde uit, één ticket per commit-reeks/PR.

Context & eisen:
- Er is nu GEEN testinfrastructuur (npm test bestaat niet). Introduceer Vitest voor unit tests
  en Playwright voor e2e; voeg npm-scripts "test", "test:unit", "test:e2e" toe.
- FUND-1: test de pure logica in lib/bruiloft/ (derived, reminders, seating, timeblocks, csv,
  mappers). Lees de code-commentaren: elk beschreven randgeval (overboeking, gemiste cron-dag,
  betaaltermijn-mijlpalen, effectiefGeoffreerd-voorrang van geboekte vendor) krijgt een test.
- FUND-2/3: gebruik de vooraf geïnstalleerde Chromium (PLAYWRIGHT_BROWSERS_PATH staat al);
  draai NOOIT "playwright install". Bouw een seed-helper die via de service-role testdata
  aanmaakt en opruimt. Test de vier gastflows incl. foutpaden (verlopen token, al gereserveerd
  cadeau, inactieve fotomuur).
- FUND-4: schrijf de RLS-suite als SQL-bestanden die in CI tegen een verse database draaien
  (supabase db reset + migraties). Toets per rol × tabel × operatie en de RPC-whitelists
  (get_public_wedding mag NOOIT adressen/notities/gastenlijst lekken).
- FUND-5: GitHub Actions-workflow; cache node_modules; tsc/lint/unit verplicht, e2e nightly.
- FUND-6: seed-script in scripts/ met 3 demo-bruiloften in verschillende planningsfases.
- Verifieer elke stap met tsc --noEmit en next lint. Wijzig GEEN productcode behalve waar
  strikt nodig voor testbaarheid (en licht dat toe in de PR-beschrijving).
- Commit per ticket met "FUND-x: <titel>" en werk op branch epic/e01-fund.
```

---

## E02 · DATA — Migratie-hygiëne & herstelbaarheid

**Periode:** juli · **Prio:** P0/P1 · **Effort:** S–M · **Afhankelijkheden:** E01 (CI om tegen te draaien)
**Uit productplan:** A4 (migratie-hygiëne), A5 (backups & soft-delete)

> **Waarom dit epic (in gewone taal):** de app bewaart onvervangbare, emotionele gegevens. Eén verloren gastenlijst is een ramp. Dit epic zorgt dat er niets écht kwijt kan raken — en ruimt technische slordigheden op die later problemen geven.

| Ticket | Titel | Omschrijving & acceptatie |
|---|---|---|
| DATA-1 | Migratieketen herstellen | Botsende nummers (2× 0021/0028/0041/0044) hernummeren tot één canonieke keten; volgorde-afhankelijkheden verifiëren; migratie-lint in CI die dubbele prefixen blokkeert. |
| DATA-2 | `schema.sql` genereren | Script dat `supabase/schema.sql` genereert uit de migratieketen (nu dekt het handmatige bestand slechts t/m 0008); CI-check dat het bestand actueel is. |
| DATA-3 | PITR + hersteltest-runbook 👤 | Point-in-time-recovery aanzetten op productie; gedocumenteerde maandelijkse hersteltest naar staging; RTO/RPO vastleggen in `docs/runbooks/`. (Deels Supabase-dashboardwerk.) |
| DATA-4 | Soft-delete bruiloften (prullenbak 30 dagen) | `deleted_at` op `weddings` + alle RLS-policies en queries filteren; verwijderen wordt markeren; definitieve opschoning na 30 dagen via cron; herstel-RPC voor support. **Acceptatie:** RLS-suite (FUND-4) uitgebreid met soft-delete-gedrag. |
| DATA-5 | Herstel-UI in admin | Platform-admin ziet verwijderde bruiloften en kan herstellen via gelogde support-RPC (read-only-principe blijft: herstel is een expliciete definer-actie met audit-log). |

### In gewone taal, per ticket

**DATA-1 — Dubbele versienummers in de database-geschiedenis herstellen.** Elke wijziging aan de database-structuur krijgt een volgnummer, als bladzijden in een logboek. Er blijken nu dubbele nummers te bestaan (twee keer "bladzijde 21", enz.). Dat kan tot verwarring en fouten leiden zodra we met meerdere omgevingen werken. We hernummeren het logboek netjes en bouwen een automatische controle in die dubbele nummers voortaan tegenhoudt — voorzichtig, zodat bestaande omgevingen er niets van merken.

**DATA-2 — Het totaaloverzicht van de database automatisch bijhouden.** Er hoort één document te zijn dat de complete, actuele structuur van de database beschrijft. Dat wordt nu met de hand bijgehouden en loopt flink achter. Een scriptje genereert dit overzicht voortaan automatisch, en de controlestraat checkt of het actueel is.

**DATA-3 — Reservekopieën + hersteloefening 👤.** Als de database crasht of iemand een grote fout maakt, moeten we terug kunnen naar "vijf minuten geleden". We zetten continue reservekopieën aan en — minstens zo belangrijk — we oefenen maandelijks écht een herstel op de oefenomgeving. Een reservekopie die je nooit getest hebt, is geen reservekopie.

**DATA-4 — Prullenbak voor bruiloften (30 dagen).** Nu is een verwijderde bruiloft direct en definitief weg — inclusief gastenlijst, foto's en cadeaus. Eén verkeerde klik is onherstelbaar. "Verwijderen" wordt voortaan "in de prullenbak zetten": de bruiloft is dan onzichtbaar (ook voor gasten), maar kan 30 dagen lang worden teruggehaald. Daarna wordt hij pas echt gewist.

**DATA-5 — Herstelknop voor de klantenservice.** Als een bruidspaar in paniek belt ("we hebben alles per ongeluk verwijderd!"), moet support kunnen helpen. In het beheerscherm komt een herstelknop; elke herstelactie wordt vastgelegd (wie, wanneer, waarom) zodat er nooit stiekem in klantgegevens gewerkt kan worden.

### Claude Code-prompt (E02)

```text
Je werkt in de wedding-planner-repo. Lees CLAUDE.md, FUNCTIONEEL_TECHNISCH_ONTWERP.md (§2.3.3
integriteitsregels, §3.15 admin) en PLANNING_2026_EPICS.md → epic E02. Epic E01 is af: er is
CI met een RLS-regressiesuite — houd die groen.

Opdracht: werk DATA-1, DATA-2, DATA-4 en DATA-5 uit (DATA-3 is grotendeels menswerk; lever
daarvoor alleen het runbook-sjabloon in docs/runbooks/herstel.md).

Eisen:
- DATA-1: hernummer de dubbele migraties (2× 0021, 0028, 0041, 0044) tot een canonieke keten.
  LET OP: bestaande omgevingen hebben deze bestanden mogelijk al toegepast onder hun oude naam
  — onderzoek eerst hoe supabase migratiestatus bijhoudt en kies een aanpak die bestaande
  omgevingen niet breekt (documenteer de gekozen aanpak). Voeg een lint-script toe dat dubbele
  prefixen in CI blokkeert.
- DATA-2: script (scripts/generate-schema.mjs of supabase CLI) dat schema.sql genereert;
  CI-stap die faalt als schema.sql niet overeenkomt met de migraties.
- DATA-4: soft-delete via deleted_at op weddings. Pas ALLE relevante RLS-policies aan
  (select-policies filteren deleted_at is null voor gewone leden), de store-init, de
  wedding-keuzelijst en de publieke RPC's (een soft-deleted bruiloft is publiek onzichtbaar:
  website, RSVP, registry, fotomuur geven 'niet gevonden'). Cron-opschoning na 30 dagen in
  /api/cron/ (hergebruik het CRON_SECRET-patroon van reminders).
- DATA-5: support-RPC restore_wedding(p_wedding) als SECURITY DEFINER, alleen platform_admin,
  met audit-regel in een nieuwe support_actions-tabel; klein admin-scherm onder /admin.
- Breid de RLS-suite en unit tests uit voor al het nieuwe gedrag. UI-teksten in het Nederlands,
  conform DESIGN_PHILOSOPHY.md. Branch epic/e02-data, commits "DATA-x: <titel>".
```

---

## E03 · RECHT — Databronrechten & merk

**Periode:** juli (uitzoeken) → doorloop augustus · **Prio:** P0 · **Effort:** S–M + extern
**Uit productplan:** C4 (databronrechten directory), H5 (merk & naam)

> **Waarom dit epic (in gewone taal):** twee zaken die alles kunnen ophouden. (1) De leveranciersgids in de app is gevuld met gegevens uit externe bronnen — we moeten zéker weten dat we die commercieel mogen gebruiken, anders riskeren we een juridische sommatie in de lanceerweek. (2) De app heeft nog geen naam en merk, en zonder naam geen domein, geen e-mailadres, geen marketingsite.

| Ticket | Titel | Omschrijving & acceptatie |
|---|---|---|
| RECHT-1 | Inventarisatie databronnen directory | Feitenrapport: welke bronnen zitten in `suppliers` (veld `bron`) en `tpw_businesses`, hoeveel rijen per bron, welke velden, wanneer geïmporteerd (scripts/import-suppliers.mjs analyseren). Basis voor juridisch advies. |
| RECHT-2 | 👤 Juridische beoordeling bronnen | Jurist beoordeelt licentie-/databankrechten per bron; uitkomst = per bron: houden / overeenkomst sluiten / vervangen. **Go/no-go vóór 15 augustus.** |
| RECHT-3 | Terugvalplan directory | Technisch plan + schatting voor het scenario "bron X moet eruit": verwijderscript per bron, impact op gekoppelde `vendors` (herkomstvelden ontkoppelen, data behouden). |
| RECHT-4 | 👤 Naam, domein, huisstijl | Definitieve productnaam, domeinregistratie, logo/kleuren (designbudget). **Blokkeert E06 (maildomein) en E14 (site).** |
| RECHT-5 | Rebrand in codebase | Na RECHT-4: appnaam, metadata, manifest, e-mailafzender, URL's; repo hernoemen. |

### In gewone taal, per ticket

**RECHT-1 — Feitenoverzicht: waar komt de leveranciersgids vandaan?** Voordat een jurist kan oordelen, moet precies op papier staan wélke gegevens we uit wélke bronnen hebben overgenomen, hoeveel, en waar ze in de app gebruikt worden. We doorzoeken de import-geschiedenis en maken een feitelijk rapport — nog zonder oordeel.

**RECHT-2 — Juridisch oordeel over de bronnen 👤.** Een jurist beoordeelt per bron: mogen we dit houden, moeten we een afspraak maken met de eigenaar, of moet het eruit? Deadline **15 augustus** — de uitkomst bepaalt hoeveel werk epic E17 (de gids opschonen) wordt.

**RECHT-3 — Plan B voor de gids.** Stel dat een bron eruit moet — dan willen we vooraf weten wat dat betekent en het in één beweging kunnen doen. We schrijven een draaiboek en bouwen een "oefenknop" die precies laat zien wat verwijderen zou raken, zónder iets echt te verwijderen. Belangrijk: leveranciers die bruidsparen zelf aan hun eigen lijstje hebben toegevoegd blijven altijd staan.

**RECHT-4 — Naam, domein en huisstijl kiezen 👤.** Het product heet intern nog "wedding-planner" en de code-opslagplaats heet zelfs "news". Zonder definitieve naam kunnen het e-maildomein (E06) en de marketingsite (E14) niet starten. Naamkeuze, domeinregistratie en logo/huisstijl door een ontwerper — een beslissing van de eigenaar, deze zomer.

**RECHT-5 — De nieuwe naam overal doorvoeren.** Zodra de naam er is, moet die overal consequent staan: in de app, in e-mails, op het icoontje op je telefoon. Een zorgvuldige zoek-en-vervang door de hele app, zónder te rommelen aan technische onderdelen die van de oude werknaam afhangen.

### Claude Code-prompt (E03)

```text
Je werkt in de wedding-planner-repo. Lees PLANNING_2026_EPICS.md → epic E03.

Opdracht: werk RECHT-1, RECHT-3 en (zodra de naam bekend is) RECHT-5 uit. RECHT-2 en RECHT-4
zijn menswerk — lever daarvoor onderbouwing, geen besluiten.

- RECHT-1: analyseer scripts/import-suppliers.mjs, de migraties 0021_suppliers.sql en
  0042_tpw_business_link.sql en (via een read-only query-script) de bron-verdeling in de
  suppliers-tabel. Schrijf docs/databronnen-inventarisatie.md: per bron de herkomst, omvang,
  velden, importdatum en waar de data in het product zichtbaar is (Ontdekken, AI-ranking,
  AI-context leveranciersAanbod). Feitelijk, zonder juridische conclusies.
- RECHT-3: schrijf docs/directory-terugvalplan.md + een DRY-RUN-script
  scripts/remove-supplier-source.mjs --bron=<naam> --dry-run dat rapporteert wat verwijderen
  zou raken: suppliers-rijen, vendors met supplier_id/tpw_business_id-herkomst (die worden
  ontkoppeld, NIET verwijderd — het zijn eigen data van bruidsparen), AI-caches die verversen.
  Zonder --apply wijzigt het script niets.
- RECHT-5 (pas na expliciete naam-input in de prompt): vervang de werknaam consistent in
  package.json, app/layout.tsx-metadata, manifest.ts, e-mailtemplates (FROM_ADDRESS-label),
  README en publieke teksten. Raak GEEN database-identifiers of env-var-namen aan.
- Branch epic/e03-recht, commits "RECHT-x: <titel>".
```

---

# FASE 2 — Verdienmodel & vertrouwen (augustus 2026)

---

## E04 · BILL — Entitlements & billing

**Periode:** augustus · **Prio:** P0 · **Effort:** M+M–L+M · **Afhankelijkheden:** E01 (tests), E02 (schema-hygiëne)
**Uit productplan:** B1 (entitlement-model), B2 (Mollie), B3 (upgrade-momenten), B4 (pricing)

> **Waarom dit epic (in gewone taal):** er kan nu geen cent verdiend worden. Dit epic bouwt het gekozen model: gratis plannen, eenmalig €69 betalen op het moment dat de uitnodigingen de deur uit gaan.

| Ticket | Titel | Omschrijving & acceptatie |
|---|---|---|
| BILL-1 | Plan-/entitlement-datamodel | `plan` op `weddings` (free/premium) + `payments`-tabel (Mollie-id, status, bedrag, btw, audit); entitlement-helper server-side (RLS/RPC) én client-side gespiegeld (zoals de rechten-matrix). Limieten centraal gedefinieerd: max 40 gasten, geen publicatie, geen registry/fotomuur, AI-tegoed. |
| BILL-2 | Server-side gates | Afdwingen in de database/API: gast #41 insert weigeren op free, `website_gepubliceerd` niet aan te zetten, registry/fotomuur niet activeerbaar, RSVP-e-mailroute geblokkeerd. **Acceptatie:** RLS-/API-tests bewijzen dat de client de muur niet kan omzeilen. |
| BILL-3 | Mollie-integratie | Checkout (iDEAL/kaart) voor eenmalige betaling per bruiloft; idempotente webhook-verwerking; plan-activatie; refund-pad; factuur-PDF met btw. |
| BILL-4 | Upgrade-modal & -momenten | Eén consistente upgrade-modal, getoond op: gastenlimiet, publicatieknop, registry aanzetten, fotomuur aanzetten, RSVP-verzending, AI-tegoed op. Waardepropositie + prijs + iDEAL-knop. |
| BILL-5 | Pricingpagina + beta-tarief | Publieke prijzenpagina; kortingscode-mechaniek (beta-paren €49, levenslang). |
| BILL-6 | Betaal-e2e-tests | Playwright-flow met Mollie-testmodus: upgrade → betalen → premium actief → factuur; webhook-replay is idempotent. |

### In gewone taal, per ticket

**BILL-1 — Het onderscheid gratis/premium inbouwen.** De app moet per bruiloft weten: is dit gratis of premium, en wat mag er dan? (Gratis: tot 40 gasten, website alleen als voorbeeld; premium: alles.) We voegen dit "etiket" toe aan elke bruiloft, plus één centrale lijst met wat elk niveau mag — beheerd op één plek, zodat er nooit verwarring ontstaat over wat waar geldt.

**BILL-2 — De grenzen ook echt afdwingen.** Een slimme gebruiker moet de betaalmuur niet kunnen omzeilen door trucjes in de browser. De grenzen worden daarom niet alleen in de schermen ingebouwd, maar ook in de database en de server zelf ("de 41e gast wordt geweigerd, punt"). De tests bewijzen dat omzeilen onmogelijk is; foutmeldingen zijn vriendelijk en verwijzen naar de upgrade.

**BILL-3 — iDEAL-betalingen via Mollie.** Nederlanders betalen met iDEAL; Mollie is daarvoor de standaard-betaaldienst. We koppelen de app aan Mollie: afrekenen, automatische verwerking van de betaalbevestiging (ook als die dubbel binnenkomt — dan mag er niet twee keer geactiveerd of afgeschreven worden), terugbetalen bij problemen, en een nette factuur met btw.

**BILL-4 — Het upgrade-scherm op de juiste momenten.** De conversie wordt gewonnen of verloren op het moment dat we vragen om te betalen. Dat moet één herkenbaar, eerlijk scherm zijn — geen tien verschillende pop-ups en geen trucjes zoals nep-aftellers. Eén upgrade-venster dat verschijnt op zes logische momenten (bijv. bij gast nummer 41, of bij het aanzetten van de website), met heldere uitleg en een iDEAL-knop.

**BILL-5 — Prijzenpagina + beta-korting.** Bezoekers moeten vooraf kunnen zien wat het kost, en beta-testers hebben we korting beloofd (€49, levenslang). Een openbare prijzenpagina en een kortingscode-systeem dat aan de kassa wordt verrekend.

**BILL-6 — De betaalstraat automatisch testen.** Juist bij geld mag níets misgaan. De robot-browser doorloopt de hele betaling in de testomgeving van Mollie: upgraden → betalen → premium actief → factuur klopt. Ook een dubbel binnenkomende betaalbevestiging wordt getest.

### Claude Code-prompt (E04)

```text
Je werkt in de wedding-planner-repo. Lees CLAUDE.md, FUNCTIONEEL_TECHNISCH_ONTWERP.md (§2.4
rechtenmodel — het entitlement-patroon moet hierop lijken: server autoritatief, client
gespiegeld voor UX) en PLANNING_2026_EPICS.md → epic E04 + het verdienmodel in
PRODUCTPLAN_2026.md §2.

Opdracht: BILL-1 t/m BILL-6 in volgorde, branch epic/e04-bill.

Eisen:
- BILL-1: migratie voor weddings.plan ('free' default, 'premium') en een payments-tabel
  (wedding_id, provider 'mollie', provider_payment_id uniek, status, bedrag_cents, btw_cents,
  kortingscode, created_at; RLS: leden lezen eigen betalingen, insert/update alleen server).
  Centraliseer limieten in lib/bruiloft/entitlements.ts met een PermissionMap-achtig patroon.
- BILL-2: afdwingen op de server. Gastenlimiet als BEFORE INSERT-trigger op guests (telt per
  wedding bij plan='free'); publicatie/registry/fotomuur-activatie via RLS with check of een
  definer-RPC; de RSVP-mailroute (/api/email/rsvp) checkt het plan. Foutmeldingen zijn nette
  NL-teksten die de client kan tonen.
- BILL-3: Mollie via de officiële @mollie/api-client, alleen server-side. Route
  /api/billing/checkout (maakt payment + redirect-URL) en /api/billing/webhook (verifieert,
  idempotent op provider_payment_id, activeert plan). Factuur als PDF-route met btw-regel
  (21%); factuurnummering opeenvolgend en gejournaliseerd.
- BILL-4: één UpgradeModal-component in components/bruiloft/ui/, aangeroepen vanaf de zes
  genoemde momenten. Volg DESIGN_PHILOSOPHY.md: één accentkleur, zinnen boven badge-lijstjes,
  geen agressieve dark patterns (geen nep-aftellers).
- BILL-5: kortingscodes-tabel + toepassing in checkout; pricingpagina onder de publieke site.
- BILL-6: Playwright met Mollie-testmodus (env MOLLIE_API_KEY_TEST); test ook webhook-replay.
- Secrets alleen via env; documenteer nieuwe vars in .env.example. Breid de RLS-suite uit.
  Vraag mij expliciet om de Mollie-testsleutel i.p.v. er één te verzinnen.
```

---

## E05 · AVG — AVG-fundament & AI-transparantie

**Periode:** augustus → jurist-doorloop september · **Prio:** P0 · **Effort:** M (veel extern)
**Uit productplan:** C1 (AVG), C3 (AI Act-transparantie)

> **Waarom dit epic (in gewone taal):** we bewaren gevoelige gegevens van mensen die zélf geen account hebben — de gasten. Dieetwensen kunnen zelfs iets zeggen over gezondheid of geloof. Dat moet juridisch waterdicht zijn vóór lancering. Goed geregeld is dit ook een verkoopargument: "jullie gasten, veilig geregeld."

| Ticket | Titel | Omschrijving & acceptatie |
|---|---|---|
| AVG-1 | Verwerkingsregister (concept) | Register van verwerkingen per gegevenscategorie (incl. gastgegevens als gegevens van derden; dieetwensen expliciet als potentieel bijzonder gegeven), bewaartermijnen, subverwerkers (Supabase, Vercel, Resend, Google, Mollie, Sentry). |
| AVG-2 | Privacyverklaring & voorwaarden (concept) | Herschreven `/privacy` en `/voorwaarden` incl. rolverdeling (platform = verwerker voor gastgegevens), AI-gebruik, cadeaulijst-geldstromen. 👤 jurist toetst. |
| AVG-3 | 👤 DPA's + juridische toetsing | Verwerkersovereenkomsten met alle subverwerkers afsluiten; concepten uit AVG-1/2 laten toetsen. |
| AVG-4 | AI-transparantie in product | AI-output consistent gelabeld ("Gegenereerd met AI"), uitlegpagina (welke data naar Gemini gaat, wat bewaard wordt), AI-opt-out-schakelaar per bruiloft die alle AI-endpoints uitzet. |
| AVG-5 | Datalek- & verzoekprocedure | Runbooks: datalek (72u-melding), inzage-/verwijderverzoek (ook van een gást, niet-gebruiker); koppeling aan de export/verwijderfuncties uit E12. |

### In gewone taal, per ticket

**AVG-1 — Overzicht van alle persoonsgegevens (concept).** De wet vereist dat we precies kunnen laten zien welke persoonsgegevens we bewaren, van wie, waarom en hoe lang. We lopen de hele database langs en maken dat overzicht, met speciale aandacht voor gastgegevens. Dit concept gaat daarna naar de jurist.

**AVG-2 — Privacyverklaring en voorwaarden herschrijven (concept).** De huidige teksten dekken niet wat de app werkelijk doet (AI-gebruik, betalingen, gastgegevens die het bruidspaar invoert). Onjuiste voorwaarden zijn erger dan geen voorwaarden. We herschrijven beide pagina's zodat ze kloppen met de werkelijkheid, en markeren elk punt waar de jurist het laatste woord heeft.

**AVG-3 — Contracten met onze leveranciers + juridische toets 👤.** Wij gebruiken zelf diensten die gegevens verwerken (database-hosting, e-mailverzending, AI, betalingen). De wet eist schriftelijke afspraken met elk van hen. De jurist sluit deze "verwerkersovereenkomsten" af en keurt de concepten uit AVG-1 en AVG-2.

**AVG-4 — Eerlijk zijn over AI in de app.** Nieuwe Europese regels (en gewoon fatsoen) vereisen dat gebruikers weten wanneer ze AI-advies zien en welke gegevens daarvoor gebruikt worden. Elk AI-advies krijgt een zichtbaar label, er komt een uitlegpagina in gewone taal, en bruidsparen kunnen AI voor hun bruiloft helemaal uitzetten met één schakelaar.

**AVG-5 — Draaiboeken voor als het misgaat.** Bij een datalek moeten we binnen 72 uur kunnen melden; als iemand vraagt "wat weten jullie over mij?" (dat mag ook een gást zijn, geen gebruiker!) moeten we snel en correct antwoorden. Stap-voor-stap-draaiboeken die iedereen in het team kan volgen, ook onder stress.

### Claude Code-prompt (E05)

```text
Je werkt in de wedding-planner-repo. Lees FUNCTIONEEL_TECHNISCH_ONTWERP.md volledig (vooral
§2.3 datamodel en §4.4 publieke paden — je moet exact weten welke persoonsgegevens waar
staan) en PLANNING_2026_EPICS.md → epic E05.

Opdracht: AVG-1, AVG-2 (concepten), AVG-4 en AVG-5. AVG-3 is menswerk.

Eisen:
- AVG-1: schrijf docs/avg/verwerkingsregister.md op basis van het WERKELIJKE datamodel:
  loop alle tabellen langs en benoem per tabel de persoonsgegevens, betrokkene (gebruiker,
  gast=derde, leverancier), grondslag-suggestie, bewaartermijn-voorstel en subverwerkers.
  Markeer dieetwensen (guests.dieetwensen) expliciet als potentieel bijzonder persoonsgegeven.
  Dit is een concept voor de jurist — schrijf feitelijk en volledig, geen juridisch advies.
- AVG-2: herschrijf app/privacy/page.tsx en app/voorwaarden/page.tsx als volwaardige,
  leesbare NL-teksten die kloppen met de werkelijkheid van de app (AI via Google Gemini,
  e-mail via Resend, betalingen via Mollie zodra E04 live is, cadeaubijdragen rechtstreeks
  gast→bruidspaar, gastgegevens ingevoerd door het bruidspaar). Markeer plekken die de jurist
  moet bevestigen met een duidelijk <!-- JURIST --> comment.
- AVG-4: maak een AiLabel-component en gebruik die bij ALLE AI-output (zoek alle plekken die
  /api/ai/* aanroepen). Voeg weddings.ai_enabled (default true) toe; elke /api/ai/*-route
  weigert netjes als het uitstaat; schakelaar in de "Onze gegevens"-instellingen; uitlegpagina
  /bruiloft/ai-uitleg over welke gegevens in de prompt gaan (baseer dit op aiContext.ts).
- AVG-5: docs/runbooks/datalek.md en docs/runbooks/avg-verzoek.md, incl. het pad voor een
  verzoek van een GAST (die geen account heeft): hoe identificeren we de juiste rij, wat
  verwijderen we, wat melden we aan het bruidspaar.
- Geen recht-praatjes verzinnen: waar je onzeker bent, markeer je het voor de jurist.
  Branch epic/e05-avg.
```

---

## E06 · MAIL — E-maildeliverability & compliance

**Periode:** augustus · **Prio:** P0 · **Afhankelijkheden:** RECHT-4 (domein) voor de domeinstap; rest kan eerder
**Uit productplan:** C5

> **Waarom dit epic (in gewone taal):** als de RSVP-uitnodiging in de spammap belandt, faalt de kernbelofte van het product. E-mailbezorging is een vak apart en moet vóór de beta op orde zijn.

| Ticket | Titel | Omschrijving & acceptatie |
|---|---|---|
| MAIL-1 | 👤 Verzenddomein + SPF/DKIM/DMARC | Eigen domein in Resend, DNS-records, DMARC eerst `p=quarantine` → later `reject`; monitoring van DMARC-rapporten. |
| MAIL-2 | Bounce-/klachtverwerking | Resend-webhooks verwerken: hard bounce of complaint → status op de gast ("e-mail onbestelbaar") zichtbaar voor het paar + verzending naar dat adres blokkeren; zelfde voor ledeninvites. |
| MAIL-3 | Afmeldbeheer | Afmeldlink in alle niet-transactionele mail; voorkeurenpagina per gebruiker; suppressielijst server-side afgedwongen. |
| MAIL-4 | Template-audit | Alle Resend-templates langs één lat: afzendernaam, huisstijl (na RECHT-4), NL-toon, plain-text-variant, footer met adres + afmelding. |

### In gewone taal, per ticket

**MAIL-1 — Eigen verzenddomein met echtheidskenmerken 👤.** E-mailproviders (Gmail, Outlook) vertrouwen alleen mail van afzenders die technisch bewijzen wie ze zijn. We versturen voortaan vanaf ons eigen domein en zetten de drie standaard-echtheidskenmerken (digitale handtekeningen) correct aan. Dit is instelwerk bij de domeinbeheerder, met een stappenplan.

**MAIL-2 — Weten wanneer een e-mail niet aankomt.** Nu versturen we mail "de wereld in" zonder te weten of hij aankomt. Een bruidspaar denkt dat oma is uitgenodigd, maar haar adres bevatte een typefout. De bezorgdienst meldt ons voortaan automatisch elke geweigerde mail; de gast krijgt in de gastenlijst een discrete markering "e-mail onbestelbaar", zodat het paar het adres kan corrigeren. Naar kapotte adressen sturen we niet opnieuw (dat schaadt onze verzendreputatie).

**MAIL-3 — Nette afmeldmogelijkheid.** Wettelijk verplicht én netjes: iedereen moet zich kunnen afmelden voor niet-noodzakelijke mail (tips, herinneringen), zonder dat bijvoorbeeld de betaalbevestiging dan ook wegblijft. Onderscheid tussen "moet-mail" en "mag-mail", een afmeldlink onderin elke mag-mail, en een voorkeurenpagina waar je per soort kiest.

**MAIL-4 — Alle e-mails langs één meetlat.** De e-mails zijn door de tijd heen ontstaan en ogen verschillend. Gasten zien deze mails ook — het is ons visitekaartje. Eén gezamenlijk sjabloon (logo, nette ondertekening, afmeldlink waar vereist) waar alle bestaande mails in worden gezet.

### Claude Code-prompt (E06)

```text
Je werkt in de wedding-planner-repo. Lees FUNCTIONEEL_TECHNISCH_ONTWERP.md §4.5 (e-mail-
stromen) en PLANNING_2026_EPICS.md → epic E06. MAIL-1 is DNS-menswerk; lever daarvoor alleen
docs/runbooks/email-domein.md met de exacte records en verificatiestappen.

Opdracht: MAIL-2 t/m MAIL-4, branch epic/e06-mail.

Eisen:
- MAIL-2: nieuwe route /api/email/webhook voor Resend-events (verifieer de webhook-signature).
  Maak een email_suppressions-tabel (email, reden bounce/complaint, bron, created_at; RLS:
  alleen server). Bij hard bounce/complaint: suppressie-rij + guests.email_status-veld
  ('onbestelbaar') zetten waar het een gast betreft. Toon dit in de gastenlijst-UI met een
  discrete statusregel (DESIGN_PHILOSOPHY: geen extra kleurensysteem — rose = vraagt aandacht).
  ALLE verzendpaden (rsvp, invite, reminders, registry, lifecycle) checken de suppressielijst
  vóór verzending via één gedeelde helper in lib/email/.
- MAIL-3: onderscheid transactioneel (RSVP-bevestiging, factuur — geen afmelding nodig) van
  niet-transactioneel (herinneringen, straks lifecycle). Bouw een tokenized afmeldlink
  (geen login vereist) die profiles.email_herinneringen respecteert en uitbreidt naar een
  voorkeurenmodel met categorieën; pagina /email-voorkeuren/[token].
- MAIL-4: refactor lib/email/templates naar één basis-layout (logo-slot, footer met
  bedrijfsgegevens-placeholder en afmeldlink waar vereist) + plain-text-varianten. Verander de
  inhoudelijke teksten niet wezenlijk; het gaat om consistentie.
- Unit tests voor de suppressie-helper en webhook-idempotentie. Documenteer nieuwe env-vars.
```

---

## E07 · FUNL — Funnel-instrumentatie & dashboards

**Periode:** augustus–september · **Prio:** P0 · **Afhankelijkheden:** geen hard, vóór beta-start af
**Uit productplan:** D1 (funnel), B5 (financieel dashboard)

> **Waarom dit epic (in gewone taal):** zonder metingen is elk gesprek over verbeteringen een mening. We willen per week zien: hoeveel mensen registreren, hoeveel maken de eerste stappen af, hoeveel betalen — en waar het lek zit.

| Ticket | Titel | Omschrijving & acceptatie |
|---|---|---|
| FUNL-1 | Event-taxonomie | Vastgelegde eventnamen + properties voor de funnel: registratie → setup afgerond → eerste taak afgevinkt → eerste gast → eerste RSVP-verzending → eerste RSVP-bevestiging (aha) → upgrade-modal gezien → betaald. Gedocumenteerd, versioneerbaar. |
| FUNL-2 | Instrumentatie in product | Events verzenden via bestaand `analytics_events`-kanaal op alle taxonomie-momenten; server-side waar het kan (betaling, RSVP-bevestiging), client-side waar het moet. |
| FUNL-3 | Funnel-dashboard in admin | `/admin/gebruik` uitbreiden: funnel per weekcohort, conversiepercentages tussen stappen, actieve bruiloften. |
| FUNL-4 | Financieel dashboard | Omzet, betalingen, conversie gratis→premium per cohort, AI-kosten per bruiloft (uit `logAiUsage`) naast elkaar; unit economics per bruiloft. |

### In gewone taal, per ticket

**FUNL-1 — Afspreken wát we meten.** Meten begint met definities: wat telt als "gestart"? Wat is het magische moment (onze aanname: de eerste gast die "ik kom!" terugstuurt)? Een korte, vaste lijst meetmomenten van registratie tot betaling, op papier, zodat iedereen dezelfde taal spreekt.

**FUNL-2 — De meetpunten inbouwen.** De app moet die momenten registreren. Belangrijk: we meten gedrag, géén persoonsgegevens — bewust privacyvriendelijker dan de gebruikelijke externe meetdiensten (ook een verkoopargument). Op elk afgesproken moment stuurt de app een anoniem seintje naar ons eigen meetsysteem, dat al in de basis bestaat.

**FUNL-3 — Het trechteroverzicht voor onszelf.** De cijfers moeten in één oogopslag leesbaar zijn: van 100 registraties vorige week maakten er 60 de start af, 25 verstuurden uitnodigingen, 9 betaalden. Een intern dashboard met deze trechter per week, zodat we elke beta-week kunnen zien of aanpassingen effect hebben.

**FUNL-4 — Het geld-dashboard.** Omzet, conversie en kosten (vooral AI-kosten) horen naast elkaar: verdienen we per bruiloft meer dan die ons kost? Een tweede intern dashboard met omzet per week, betalingen en AI-kosten per bruiloft.

### Claude Code-prompt (E07)

```text
Je werkt in de wedding-planner-repo. Lees FUNCTIONEEL_TECHNISCH_ONTWERP.md §3.15 (admin,
analytics_events bestaat al) en PLANNING_2026_EPICS.md → epic E07. E04 (payments) is gereed.

Opdracht: FUNL-1 t/m FUNL-4, branch epic/e07-funl.

Eisen:
- FUNL-1: definieer de taxonomie in lib/analytics/events.ts als typed constanten (event_type +
  properties-schema per event) en documenteer in docs/analytics-taxonomie.md. Gebruik de
  funnel-stappen uit het epic; voeg geen events toe zonder duidelijke beslissing die erop
  gebaseerd wordt.
- FUNL-2: één track()-helper (client via /api/admin/log-event, server direct). Instrumenteer:
  signup-voltooiing, setup-wizard afgerond, eerste taak klaar, eerste gast, RSVP-verzending,
  RSVP-bevestiging binnen (server-side in submit_rsvp-verwerking of de route eromheen),
  upgrade-modal-vertoning incl. trigger-context, checkout gestart, betaling geslaagd
  (server-side in de Mollie-webhook). GEEN persoonsgegevens in properties (alleen ids/counts)
  — dit is ons privacyvriendelijke alternatief voor externe analytics.
- FUNL-3: /admin/gebruik uitbreiden met een funnelweergave per weekcohort (registratieweek),
  conversie tussen opeenvolgende stappen en een 30-dagen-actief-teller. Gebruik recharts
  (zit al in de deps) en volg de dataviz-richtlijnen van het project.
- FUNL-4: /admin/financien: omzet per week, betalingen-tabel, conversie per cohort, en
  AI-kosten per bruiloft/maand uit de bestaande ai-usage-logging naast de omzet.
- Alle admin-queries via platform_admin-RLS of definer-RPC's met admin-check; geen service-role
  in page-code. Unit tests voor cohort-/funnel-berekeningen (pure functies, testbaar).
```

---

# FASE 3 — Beta-klaar (september 2026)

---

## E08 · GAST — Gastervaring op lanceerkwaliteit

**Periode:** september (designer aan boord) · **Prio:** P0 · **Effort:** L
**Uit productplan:** E1 (kwaliteitsronde), E3 (RSVP-hardening), E2 (toegankelijkheid, deels)

> **Waarom dit epic (in gewone taal):** elke bruiloft toont onze app aan 80–150 gasten. Die pagina's zíjn onze marketing — en elke gast is een mogelijk toekomstig bruidspaar. "Werkt" moet "voelt professioneel" worden.

| Ticket | Titel | Omschrijving & acceptatie |
|---|---|---|
| GAST-1 | 👤 Design-audit publieke flows | Designer beoordeelt website, RSVP, cadeaulijst, fotomuur en e-mails; levert concrete bevindingenlijst per scherm. |
| GAST-2 | Implementatie audit-bevindingen | Bevindingen uit GAST-1 doorvoeren; consistentie in thema's, typografie, foutteksten, lege staten, bevestigingsschermen. |
| GAST-3 | RSVP-hardening | Nette flows voor: verlopen/ingetrokken token, wijzigen-ná-indienen, bevestigingsmail naar gast; werkt op oude/lage-end telefoons (progressive enhancement, minimale JS op het formulier). |
| GAST-4 | Toegankelijkheid gastflows | WCAG 2.1 AA op de vier flows: contrast per thema afgedwongen, toetsenbordnavigatie, labels/aria op formulieren en upload. |
| GAST-5 | Performance publieke pagina's | LCP < 2s op 4G: beeldoptimalisatie bij upload (resize/compressie), `next/image`, font-subsetting van de zes koplettertypes, Lighthouse-budget in CI. |

### In gewone taal, per ticket

**GAST-1 — Ontwerp-doorlichting door een professional 👤.** Een ervaren ontwerper ziet wat wij niet meer zien. De ontwerper loopt alle gastenpagina's en e-mails door en levert een concrete lijst verbeterpunten per scherm.

**GAST-2 — De verbeterpunten doorvoeren.** De lijst uit GAST-1 moet ook echt gebeuren: punt voor punt doorvoeren, met de huisstijlregels van het project als leidraad, en na elke wijziging controleren dat de automatische gasttests nog slagen.

**GAST-3 — De RSVP-pagina tegen alles bestand maken.** Dit is de meest kritieke pagina en gasten gebruiken hem op alle denkbare (ook oude) telefoons. Vier verbeteringen: een verlopen link toont een warme uitleg in plaats van een kale foutpagina; gasten kunnen hun antwoord later wijzigen en zien wat ze eerder invulden; de gast krijgt een bevestigingsmailtje; en het formulier werkt ook op trage verbindingen en oude toestellen.

**GAST-4 — Toegankelijk voor iedereen.** Bruiloftsgasten zijn 8 tot 88 jaar; sommigen zien slecht of gebruiken een voorleeshulp. We toetsen de gastenpagina's aan de internationale toegankelijkheidsrichtlijnen: voldoende kleurcontrast bij álle thema's, bediening zonder muis, correcte labels voor voorleessoftware. Deze toets wordt onderdeel van de automatische keuring.

**GAST-5 — Snelheid op mobiel.** Gasten openen de link op hun telefoon, vaak op matig bereik; een pagina die 6 seconden laadt voelt kapot. Foto's worden bij het uploaden automatisch verkleind, lettertypes en afbeeldingen slimmer geladen, en er komt een automatische snelheidsbewaking die alarm slaat als een pagina te traag wordt.

### Claude Code-prompt (E08)

```text
Je werkt in de wedding-planner-repo. Lees DESIGN_PHILOSOPHY.md (verplicht), FUNCTIONEEL_
TECHNISCH_ONTWERP.md §3.5/3.9/3.10/3.11 en §4.4, en PLANNING_2026_EPICS.md → epic E08.
GAST-1 is menswerk; de bevindingenlijst wordt als input aangeleverd in docs/design-audit.md.

Opdracht: GAST-2 t/m GAST-5, branch epic/e08-gast. Werk bevinding-voor-bevinding en houd de
e2e-tests uit E01 groen — dit zijn precies de flows die niet mogen breken.

Eisen:
- GAST-2: voer docs/design-audit.md uit. Hergebruik bestaande ui-bouwstenen; introduceer geen
  nieuwe visuele idiomen. Elke wijziging mobiel-first controleren.
- GAST-3: /rsvp/[token]-verbeteringen: (a) verlopen/ingetrokken token → warme NL-uitleg met
  "neem contact op met het bruidspaar", geen kale 404; (b) na indienen kan de gast terugkomen
  en wijzigen (submit_rsvp ondersteunt dit al — maak de UI-staat expliciet: "jullie hebben
  bevestigd op <datum>, wijzigen kan tot <trouwdatum>"); (c) bevestigingsmail naar de gast als
  die een e-mailadres heeft (via de suppressie-bewuste mailhelper uit E06); (d) het formulier
  werkt als klassiek formulier met progressive enhancement.
- GAST-4: audit met axe (voeg @axe-core/playwright toe aan de e2e-suite als CI-check op de
  vier publieke flows). Afdwingen van tekstcontrast per thema: bouw een contrast-check in de
  thema-configuratie (de tekstKleur licht/donker-override bestaat al — maak de automatische
  keuze correct o.b.v. achtergrond).
- GAST-5: afbeeldingen bij upload server-side verkleinen (sharp) naar max-varianten; publieke
  pagina's via next/image; Lighthouse-CI-budget (LCP<2s, CLS<0.1) op de vier flows in de
  nightly pipeline.
- Vraag GEEN visuele Playwright-verificatie zonder toestemming (zie CLAUDE.md) — bied hem aan
  na afronding van GAST-2.
```

---

## E09 · AIKO — AI-tegoeden & kostenrem

**Periode:** september · **Prio:** P0 · **Afhankelijkheden:** E04 (entitlements)
**Uit productplan:** G2

> **Waarom dit epic (in gewone taal):** AI-advies kost per gebruik echt geld. Zonder rem kan een piek aan gratis gebruikers (precies wat we hopen in december!) een onverwacht hoge rekening geven. En als de AI-leverancier een storing heeft, mag de app niet kapot ogen.

| Ticket | Titel | Omschrijving & acceptatie |
|---|---|---|
| AIKO-1 | Tegoed-model | AI-tegoed per plan (free: proeverij, bv. 10 zware calls; premium: fair-use-plafond); verbruiksregistratie per bruiloft op bestaande usage-logging. |
| AIKO-2 | Afdwingen in alle AI-routes | Elke `/api/ai/*`-route checkt tegoed vóór de Gemini-call (cache-hits tellen niet); nette NL-melding + upgrade-verwijzing bij op. |
| AIKO-3 | Circuit-breaker & degradatie | Bij Gemini-storing of kostenpiek: automatische terugval op cache + de deterministische urgentie-engine; gebruiker ziet "advies van <datum>" i.p.v. een spinner of error. |
| AIKO-4 | Kostenbewaking | AI-kosten per bruiloft en totaal in `/admin/ai`; alert (e-mail naar platform-admin) bij dag-drempeloverschrijding. |

### In gewone taal, per ticket

**AIKO-1 — AI-tegoed per abonnement.** Gratis gebruikers krijgen een proeverij (genoeg om de waarde te ervaren), premium ruim voldoende met een vangrail tegen extreem gebruik. Een tellersysteem per bruiloft per maand; slim detail: adviezen die uit ons geheugen komen (eerder gegenereerd) tellen niet mee — alleen échte nieuwe AI-aanvragen kosten tegoed.

**AIKO-2 — Het tegoed overal netjes afdwingen.** Alle negen AI-functies moeten dezelfde regels volgen: één gezamenlijke "poortwachter" vóór elke AI-functie. Is het tegoed op, dan volgt een vriendelijke uitleg met een upgrade-knop — geen foutmelding.

**AIKO-3 — Een vangnet bij AI-storingen.** Als de AI-dienst plat ligt, moet de gebruiker daar zo min mogelijk van merken: de app toont automatisch het laatst bekende advies met "advies van [datum] — vernieuwen lukt nu even niet", en valt terug op de ingebouwde, niet-AI-planningslogica. Er komt ook een noodknop waarmee wij AI in één keer overal kunnen pauzeren.

**AIKO-4 — Kostenbewaking met alarm.** We willen nooit door de maandafrekening verrast worden. Het interne dashboard toont AI-kosten per dag en per bruiloft (wie zijn de grootverbruikers?), en bij overschrijding van een dagbudget krijgt de beheerder automatisch een mail.

### Claude Code-prompt (E09)

```text
Je werkt in de wedding-planner-repo. Lees FUNCTIONEEL_TECHNISCH_ONTWERP.md §3.14 (AI-laag:
alle endpoints, caches, fingerprint-mechanisme, logAiUsage) en PLANNING_2026_EPICS.md → E09.
E04 is gereed: lib/bruiloft/entitlements.ts bestaat.

Opdracht: AIKO-1 t/m AIKO-4, branch epic/e09-aiko.

Eisen:
- AIKO-1: definieer tegoeden in entitlements.ts (free: klein maandtegoed; premium: ruim
  fair-use-plafond als vangrail). Verbruik telt alleen bij echte model-calls; cache-hits en
  de deterministische fallback zijn gratis. Registreer verbruik per wedding per maand
  (uitbreiding op de bestaande ai-usage-tabellen, geen parallelle boekhouding).
- AIKO-2: bouw één withAiBudget()-wrapper in lib/ai/ en pas die toe op ALLE /api/ai/*-routes
  (inventariseer ze allemaal; vergeet prewarm en feedback niet — feedback is gratis).
  Bij tegoed-op: HTTP 402-achtig antwoord met NL-boodschap en upgradeCta-veld; hergebruik de
  bestaande rateLimitMessage-stijl. De UpgradeModal (E04) vangt dit client-side af.
- AIKO-3: wrapper vangt Gemini-fouten/timeouts: retourneer de laatste cache-inhoud met een
  staleAt-timestamp; de UI toont "Advies van <datum> — vernieuwen lukt nu niet". Voeg een
  kill-switch env-var toe (AI_DISABLED=1) die alle routes op cache/fallback zet.
- AIKO-4: /admin/ai uitbreiden met kosten per bruiloft (top-verbruikers), totaal per dag en
  een dagelijkse drempelcheck in de bestaande cron-route die de platform-admin mailt bij
  overschrijding (drempel via env).
- Unit tests voor de wrapper (tegoed, storing, kill-switch) met een gemockte Gemini-client.
```

---

## E10 · BETA — Onboarding-revisie & beta-programma

**Periode:** september → beta loopt door t/m lancering · **Prio:** P0
**Uit productplan:** D2 (onboarding), D4 (feedback), H1 (beta)

> **Waarom dit epic (in gewone taal):** wat een gebruiker in de eerste 10 minuten ervaart, voorspelt of hij blijft. En de beta met 30–50 echte bruidsparen is onze enige kans om vóór de lancering met echte ogen te kijken.

| Ticket | Titel | Omschrijving & acceptatie |
|---|---|---|
| BETA-1 | Onboarding-revisie | Setup-wizard herijken op time-to-value: binnen 10 min een gevulde takenlijst, richtbudget en eerste AI-advies; slimme defaults; meetbaar via FUNL-events. |
| BETA-2 | Eerste-week-checklist | Dashboardkaart "jullie eerste week" (5 stappen) die de funnel-stappen van D1 stuurt; verdwijnt na voltooiing. |
| BETA-3 | Feedback-widget & NPS | Lichtgewicht in-app feedback (bestaand bug-kanaal hergebruiken) + NPS-prompt op sleutelmomenten (na eerste RSVP-golf); zichtbaar in admin. |
| BETA-4 | Beta-toegangsmechaniek | Beta-vlag + kortingscode-koppeling (E04); beta-badge in de app; beta-paren herkenbaar in admin. |
| BETA-5 | 👤 Werving & begeleiding beta-paren | 30–50 paren werven (communities/Instagram/netwerk), onboarden, wekelijkse feedbackcyclus op de funneldata. |

### In gewone taal, per ticket

**BETA-1 — De eerste 10 minuten opnieuw ontwerpen.** Doel: binnen 10 minuten na registratie heeft een paar een gevulde takenlijst, een budgetverdeling en een eerste AI-advies — het "wow, dit scheelt ons wérk"-gevoel. De startvragen worden korter, handige keuzes staan standaard aan in plaats van uit, en alles wat niet direct nodig is verhuist naar later. Elke stap wordt gemeten zodat we zien waar mensen afhaken.

**BETA-2 — Het "eerste week"-lijstje.** Nieuwe gebruikers hebben een duwtje nodig: wat doe ik nu? Een rustige kaart op het startscherm met vijf eerste stappen die vanzelf afvinken en daarna verdwijnen.

**BETA-3 — Feedback vragen op het juiste moment.** We willen horen wat gebruikers vinden — maar niet zeuren. Een feedbackknop in het menu, plus één slimme vraag ("zou je ons aanraden?") op een blij moment: vlak nadat de eerste golf gasten heeft bevestigd. Maximaal één keer per maand, en wie wegklikt heeft drie maanden rust.

**BETA-4 — Beta-toegang technisch regelen.** Beta-paren moeten herkenbaar zijn (voor ons) en hun beloofde levenslange korting krijgen: een beta-kenmerk per bruiloft, gekoppeld aan de kortingscode, en een filter in ons beheerscherm.

**BETA-5 — Beta-paren werven en begeleiden 👤.** 30–50 échte paren, het liefst met een trouwdatum in 2027 (dan zitten ze middenin de planning). Werven via trouwcommunities, Instagram en het eigen netwerk; heldere deal (gratis premium of levenslang beta-tarief in ruil voor feedback); wekelijks feedbackgesprek gekoppeld aan de meetcijfers.

### Claude Code-prompt (E10)

```text
Je werkt in de wedding-planner-repo. Lees DESIGN_PHILOSOPHY.md, FUNCTIONEEL_TECHNISCH_
ONTWERP.md §3.1 (onboarding/setup zoals die nu is) en PLANNING_2026_EPICS.md → E10.
E07 (events) en E04 (kortingscodes) zijn gereed. BETA-5 is menswerk.

Opdracht: BETA-1 t/m BETA-4, branch epic/e10-beta.

Eisen:
- BETA-1: herzie de setup-flow met als expliciet doel: binnen 10 minuten (a) sjabloontaken
  aan, (b) richtbudget-verdeling gevuld vanuit totaalbudget, (c) eerste AI-advies zichtbaar.
  Zet de sjabloon-opties default AAN (opt-out i.p.v. opt-in), vraag alleen het hoognodige in
  de wizard en verplaats de rest naar de "Onze gegevens"-modal. Meet elke wizardstap met de
  FUNL-taxonomie (stap-events toevoegen aan de taxonomie-doc).
- BETA-2: dashboardkaart met 5 stappen (gegevens compleet → eerste taak afgevinkt → eerste
  gast toegevoegd → website-preview bekeken → AI-coach geopend), afgeleid uit bestáánde data
  (geen aparte voortgangsadministratie waar het uit de store afleidbaar is). Eén taak per
  scherm-principe respecteren: de kaart is een rustige statusregel, geen kermis.
- BETA-3: feedback-knop in het accountmenu + contextprompt na de eerste RSVP-bevestigingsgolf
  (>25% van uitgenodigde gasten bevestigd): één NPS-vraag + vrij veld, wegschrijven naar een
  feedback-tabel (RLS: eigen insert, admin select), tonen in /admin onder een feedback-tab.
  Maximaal één prompt per bruiloft per 30 dagen; wegklikken = 90 dagen stil.
- BETA-4: beta_program-veld op weddings (via kortingscode geactiveerd), klein "beta"-label in
  de app-footer, filter in /admin/bruiloften, en koppeling aan het levenslange beta-tarief.
- E2e-test voor de nieuwe wizard-flow. Alle teksten warm en kort, in het Nederlands.
```

---

# FASE 4 — Professionaliseren (oktober 2026)

---

## E11 · LIFE — Lifecycle-e-mails

**Periode:** oktober · **Prio:** P1 · **Afhankelijkheden:** E06 (suppressie/afmelding), E07 (events)
**Uit productplan:** D3

> **Waarom dit epic (in gewone taal):** een bruiloft plan je in golven — na een drukke week volgen soms wekenlange stiltes. E-mail is het middel om mensen op het juiste moment terug te halen, zonder spammerig te worden.

| Ticket | Titel | Omschrijving & acceptatie |
|---|---|---|
| LIFE-1 | Orkestratie-basis | Uitbreiding van het cron-patroon: lifecycle-mails met idempotentie per (bruiloft, mailtype), respecteert suppressie + voorkeuren. |
| LIFE-2 | Welkomstreeks | Dag 0 (welkom + eerste stappen), dag 2 (takenlijst-tip), dag 7 (AI-coach + samen-plannen-uitnodiging). |
| LIFE-3 | Reactivatie & mijlpalen | 14 dagen inactief; 100 dagen te gaan; week vóór de bruiloft (draaiboek-check + fotomuur-reminder). |
| LIFE-4 | Post-wedding-mail | Week ná de trouwdag: fotomuur-download, bedankje, review-/verwijzingsvraag (opmaat naar E20). |

### In gewone taal, per ticket

**LIFE-1 — Het verzendsysteem.** Deze mails moeten betrouwbaar en precies één keer verstuurd worden — nooit twee keer dezelfde "welkom!"-mail. We bouwen voort op het bestaande dagelijkse herinneringssysteem, met een administratie die dubbele verzending uitsluit en afmeldingen respecteert.

**LIFE-2 — De welkomstreeks.** De eerste week beslist of iemand blijft. Drie korte mails: dag 0 (welkom + eerste stappen), dag 2 (één concrete tip), dag 7 (nodig je partner uit om samen te plannen). Elke mail heeft één doel en één knop.

**LIFE-3 — Terughaal- en mijlpaalmails.** Wie twee weken niets doet, is misschien vergeten dat we bestaan; en bepaalde momenten verdienen aandacht. Een vriendelijke reactivatiemail na 14 dagen stilte (nooit vaker dan eens per twee maanden), een "nog 100 dagen!"-mail, en in de week vóór de bruiloft een praktische mail (draaiboek-check + fotomuur-tip). Als de trouwdatum wijzigt, verschuiven de mails netjes mee.

**LIFE-4 — De mail ná de trouwdag.** Een week na de bruiloft is hét moment voor een goede laatste indruk: download jullie foto's, bedankt, en — als het gepast voelt — de vraag om ons aan verloofde vrienden aan te raden.

### Claude Code-prompt (E11)

```text
Je werkt in de wedding-planner-repo. Lees FUNCTIONEEL_TECHNISCH_ONTWERP.md §3.13 (het
bestaande reminder-cron-patroon met reminder_log-idempotentie — kopieer die aanpak) en
PLANNING_2026_EPICS.md → E11. E06-helpers (suppressie, afmeldcategorieën) zijn gereed.

Opdracht: LIFE-1 t/m LIFE-4, branch epic/e11-life.

Eisen:
- LIFE-1: nieuwe cron-route /api/cron/lifecycle (zelfde CRON_SECRET-patroon) + lifecycle_log-
  tabel met unique(wedding_id, mail_type, user_id) naar analogie van reminder_log. Pure
  selectielogica in lib/bruiloft/lifecycle.ts (welke bruiloft krijgt vandaag welke mail),
  los testbaar zonder IO — zelfde stijl als reminders.ts. Alle verzending via de
  suppressie-bewuste helper; categorie 'lifecycle' respecteert de afmeldvoorkeuren.
- LIFE-2/3/4: implementeer de mailtypes als data (triggervoorwaarde + template), niet als
  losse code-paden: welkom_d0/d2/d7 (o.b.v. profiel-leeftijd + setup-status), reactivatie_14d
  (geen activity-events in 14 dagen, max 1× per 60 dagen), mijlpaal_100d en week_voor
  (o.b.v. trouwdatum), post_wedding_7d. Templates in de E06-basislayout, kort en warm NL,
  elke mail één doel en één knop.
- Randgevallen expliciet testen: trouwdatum gewijzigd (mijlpalen verschuiven, niet dubbel),
  meerdere leden per bruiloft (welkomstreeks per gebruiker, mijlpalen per bruiloft aan alle
  leden), soft-deleted bruiloften krijgen niets.
- Unit tests voor de volledige selectielogica met tijdreizen (vaste 'vandaag'-parameter).
```

---

## E12 · CYCL — Datalevenscyclus & export

**Periode:** oktober · **Prio:** P1 · **Afhankelijkheden:** E05 (beleidskeuzes), E02 (soft-delete-patroon)
**Uit productplan:** C2

> **Waarom dit epic (in gewone taal):** gegevens eeuwig bewaren is een privacyrisico en juridisch niet toegestaan. Tegelijk zijn de herinneringen van het paar kostbaar. Dit epic regelt een respectvolle afbouw — met altijd eerst een export.

| Ticket | Titel | Omschrijving & acceptatie |
|---|---|---|
| CYCL-1 | Retentiebeleid technisch vastleggen | Config: x maanden na trouwdatum → RSVP-tokens bevriezen + fotomuur-upload dicht; n maanden → anonimiseren/verwijderen na aankondiging. |
| CYCL-2 | Bevriezing na de trouwdag | Cron die publieke ingangen (RSVP, fotomuur-upload) sluit volgens beleid; gastpagina toont nette afsluittekst. |
| CYCL-3 | Aankondiging + opschoning | Mailflow "jullie data wordt over 30 dagen gearchiveerd — download alles"; daarna anonimisering/verwijdering met audit. |
| CYCL-4 | Volledige data-export (ZIP) | Eén knop: ZIP met CSV's (gasten, taken, budget, leveranciers, draaiboek, cadeaulijst) + alle foto's; ook bruikbaar voor AVG-inzageverzoeken. |

### In gewone taal, per ticket

**CYCL-1 — De bewaartermijnen vastleggen.** Er moet een helder beleid zijn: hoelang na de trouwdatum blijven de gastenpagina's open, wanneer archiveren we. De termijnen (afgestemd met de jurist) worden op één centrale plek in de app vastgelegd, zodat alle vervolgstappen dezelfde regels volgen.

**CYCL-2 — Gastenpagina's sluiten na de bruiloft.** Maanden na de bruiloft hoeven RSVP-formulieren en foto-upload niet meer open te staan — elk open kanaal is een risico. De automatische dagtaak sluit ze op het afgesproken moment; gasten die de link later openen zien een feestelijke afsluittekst ("deze bruiloft is geweest 🎉"), geen foutmelding.

**CYCL-3 — Aankondigen en dan pas opruimen.** Nooit zomaar iets weggooien: het paar krijgt ruim vooraf een mail "over 30 dagen archiveren we jullie gegevens — download hier alles." Daarna worden gastgegevens geanonimiseerd (namen en contactgegevens gewist) en foto's verwijderd; de eigen samenvatting van het paar (aantallen, totalen) blijft. Elke opruimactie wordt gejournaliseerd.

**CYCL-4 — Alles-in-één-download.** Het paar moet met één knop álles kunnen meenemen: gastenlijst, taken, budget, draaiboek, cadeaulijst én alle foto's — ook wettelijk nodig als iemand zijn gegevens opvraagt. Een downloadknop die een net ZIP-bestand samenstelt met leesbare bestanden per onderdeel.

### Claude Code-prompt (E12)

```text
Je werkt in de wedding-planner-repo. Lees FUNCTIONEEL_TECHNISCH_ONTWERP.md (§2.3 datamodel,
§4.7 storage) en PLANNING_2026_EPICS.md → E12. De beleidstermijnen staan in docs/avg/ (E05);
gebruik die als config-defaults en maak ze via env/constants aanpasbaar.

Opdracht: CYCL-1 t/m CYCL-4, branch epic/e12-cycl.

Eisen:
- CYCL-1: centraliseer het beleid in lib/bruiloft/retentie.ts (pure functies: gegeven
  trouwdatum + vandaag → fase 'actief' | 'bevroren' | 'aangekondigd' | 'op te schonen').
- CYCL-2: cron-stap die per fase handelt. Bevriezen = guests.rsvp_token_revoked-mechanisme
  hergebruiken? NEE — dat is per gast en betekent 'ingetrokken'. Voeg een wedding-niveau
  publieke-toegang-status toe die de publieke RPC's (get_public_wedding, get_photo_wall,
  upload-route) respecteren met een nette afsluittekst ("deze bruiloft is geweest 🎉,
  bekijk de foto's" waar downloads nog aan staan).
- CYCL-3: aankondigingsmail via de lifecycle-orkestratie (E11) met export-link; opschoning
  anonimiseert gastgegevens (namen → 'Gast', contactvelden leeg, dieetwensen leeg) en
  verwijdert fotomuur-storage-objecten; wedding-aggregaten (aantallen, budgettotalen) mogen
  blijven voor de eigen historie van het paar. Elke opschoning gejournaliseerd.
- CYCL-4: route /api/export die server-side (streaming) een ZIP bouwt: CSV per module
  (hergebruik lib/bruiloft/csv.ts, breid uit waar nodig) + storage-foto's van deze bruiloft.
  Alleen voor owners; rate-limited; e2e-test die de ZIP-inhoud verifieert.
- Wees hier extra voorzichtig: alles wat verwijdert eerst als dry-run bouwen + testen op
  seed-data. Destructieve stappen loggen vóór uitvoeren.
```

---

## E13 · SEC — Security-hardening & pentest

**Periode:** oktober (pentest extern inplannen: begin oktober) · **Prio:** P1
**Uit productplan:** C6

> **Waarom dit epic (in gewone taal):** één datalek rond iemands bruiloft en het merk is dood. Voor de lancering laten we daarom ook een externe specialist proberen in te breken.

| Ticket | Titel | Omschrijving & acceptatie |
|---|---|---|
| SEC-1 | Advisors & scanning in CI | Supabase security/performance-advisors als CI-stap; Dependabot/npm-audit-beleid; secret-scanning. |
| SEC-2 | Disclosurebeleid | `security.txt`, responsible-disclosurepagina, contactkanaal. |
| SEC-3 | Interne pre-pentest-audit | Zelf-audit op de bekende risicoklassen: IDOR op publieke routes, token-entropie/vergelijkingen, storage-policies, rate-limit-dekking op álle publieke endpoints, headers (CSP e.a.). |
| SEC-4 | 👤 Externe pentest + fixes | Pentest (scope: publieke RPC's, tokens, storage, billing) + verwerken bevindingen. **Acceptatie: geen open kritieke/hoge bevindingen vóór lancering.** |

### In gewone taal, per ticket

**SEC-1 — Automatische veiligheidscontroles.** Veel lekken ontstaan door verouderde bouwstenen of per ongeluk gepubliceerde wachtwoorden. De controlestraat checkt voortaan automatisch op bekende kwetsbaarheden in gebruikte software, op uitgelekte sleutels in de code, en op onveilige database-instellingen.

**SEC-2 — Een adres voor melders.** Welwillende hackers die een lek vinden, moeten ons makkelijk en veilig kunnen bereiken (in plaats van het op internet te zetten). Een standaard meldadres en een pagina met spelregels: meld het ons, we reageren snel, we vervolgen je niet.

**SEC-3 — Eerst zelf inbreken.** Vóór de dure externe test halen we zelf het laaghangend fruit weg: een systematische zelfcontrole langs de bekende zwakke plekken. Kun je met een geraden webadres andermans gegevens zien? Zijn de geheime links echt onraadbaar? Kan iemand een schadelijk bestand uploaden dat zich als foto voordoet? Alles wat we vinden wordt direct gerepareerd en vastgelegd.

**SEC-4 — Externe inbraaktest 👤.** Een frisse, professionele aanvaller vindt wat wij missen. Een gespecialiseerd bureau test in oktober de afgesproken onderdelen op de oefenomgeving. Harde eis: geen openstaande ernstige bevindingen bij lancering.

### Claude Code-prompt (E13)

```text
Je werkt in de wedding-planner-repo. Lees FUNCTIONEEL_TECHNISCH_ONTWERP.md §4.3/4.4/4.6
(autorisatie, publieke paden, rate limiting) en PLANNING_2026_EPICS.md → E13.
SEC-4 is extern; bereid het voor met een scope-document.

Opdracht: SEC-1 t/m SEC-3 + pentest-scopedocument, branch epic/e13-sec.

Eisen:
- SEC-1: CI-stappen voor npm audit (fail op high/critical met allowlist-bestand), secret-scan
  en een advisors-check-script. Dependabot-config voor npm + GitHub Actions.
- SEC-2: public/.well-known/security.txt + pagina /security met disclosurebeleid (NL/EN).
- SEC-3: voer een systematische zelf-audit uit en documenteer per bevinding: risico, bewijs,
  fix. Controleer minimaal: (a) élke /api/-route op auth-check en rate-limit-dekking
  (inventariseer welke routes increment_rate_limit NIET gebruiken); (b) alle token-checks op
  timing-safe vergelijking en entropie; (c) storage-policies op path-traversal in de
  wedding-id-prefix; (d) security headers in next.config.mjs (CSP report-only om te beginnen,
  X-Frame-Options, Referrer-Policy); (e) de registry- en foto-uploadroutes op misbruik
  (grote bestanden, content-type-spoofing — valideer magic bytes, niet alleen MIME);
  (f) Mollie-webhook-verificatie. Fix wat je vindt; leg risico-acceptaties vast.
- Scopedocument docs/pentest-scope.md: architectuurschets, endpoints, testaccounts-plan,
  spelregels (staging, geen productiedata).
- Elke fix met test. Geen bevinding stilletjes wegmasseren: alles in het auditverslag
  docs/security-zelfaudit.md.
```

---

## E14 · SITE — Marketingsite & SEO

**Periode:** oktober → content loopt door · **Prio:** P0 · **Afhankelijkheden:** RECHT-4 (merk), E04 (pricing)
**Uit productplan:** H2

> **Waarom dit epic (in gewone taal):** op lanceerdag moeten we vindbaar zijn. Zoekmachinepositie bouw je maanden van tevoren op — in oktober planten is in het verlovingsseizoen (en zeker in dat van 2027) oogsten.

| Ticket | Titel | Omschrijving & acceptatie |
|---|---|---|
| SITE-1 | Site-architectuur & basispagina's | Publieke marketing-shell binnen de app: home (propositie), prijzen, privacy-belofte, over, contact; gescheiden van de ingelogde app-layout. |
| SITE-2 | Interactieve SEO-tools | 3 teaser-tools op topzoektermen: bruiloft-checklistgenerator, trouwbudget-rekentool, draaiboek-voorbeeld — invullen → direct resultaat → "sla op met een gratis account". |
| SITE-3 | SEO-contentpagina's | 8–12 artikelen op de instroomtermen (deels 👤 contentproductie); CMS-loos als MDX in de repo. |
| SITE-4 | Technische SEO | Sitemap, metadata/OG-beelden, schema.org (Product/FAQ/HowTo), interne linkstructuur, Search Console-aansluiting. |

### In gewone taal, per ticket

**SITE-1 — De etalage.** Er is nu geen pagina die aan een vreemde uitlegt wat dit product is en kost. Een openbare mini-site: startpagina met de kernbelofte, prijzenpagina, privacy-belofte, over ons en contact — los van de app zelf, snel en strak.

**SITE-2 — Gratis proeftools die bezoekers binnenhalen.** Mensen zoeken op "bruiloft checklist" of "wat kost een bruiloft" — en wij hébben die antwoorden al in de app zitten. Drie mini-versies van echte functies, gratis en zonder account: vul je trouwdatum in → krijg direct je checklist; vul je budget in → zie de verdeling. Wie het resultaat wil bewaren, maakt een account — en neemt zijn ingevulde gegevens mee. De beste advertentie is het product zelf.

**SITE-3 — Hulpartikelen die vindbaar maken.** 8–12 gedegen artikelen over de vragen waar verloofde stellen op zoeken; goede inhoud klimt vanzelf in Google. De eerste vier schrijven we zelf, de rest komt van een ingehuurde tekstschrijver; de proeftools staan in de artikelen verwerkt.

**SITE-4 — Technische vindbaarheid.** Google moet de site technisch perfect kunnen lezen: de standaard-bouwstenen voor zoekmachines (plattegrond van de site, nette omschrijvingen, voorbeeldweergaven bij delen op social media). Belangrijk privacydetail: de trouwwebsites van bruidsparen zelf worden standaard NIET vindbaar gemaakt in Google — dat is aan het paar.

### Claude Code-prompt (E14)

```text
Je werkt in de wedding-planner-repo. Lees DESIGN_PHILOSOPHY.md, PRODUCTPLAN_2026.md §2
(propositie/prijzen) en PLANNING_2026_EPICS.md → E14. Het merk (naam/logo/kleuren) is
aangeleverd in docs/merk/. Artikelteksten komen deels extern; bouw het raamwerk + eerste
versies.

Opdracht: SITE-1 t/m SITE-4, branch epic/e14-site.

Eisen:
- SITE-1: aparte (marketing)-routegroep met eigen layout (geen app-chrome), statisch
  gerenderd. Home vertelt de kernpropositie langs de gastervaring (website, RSVP, cadeaulijst,
  fotomuur) + AI-coach; prijzenpagina hergebruikt de E04-pricingdata (één bron).
- SITE-2: de drie tools zijn ECHTE mini-versies van bestaande logica — hergebruik
  templateTasks (checklistgenerator op basis van trouwdatum), STANDAARD_VERDELING
  (budget-rekentool) en een draaiboek-sjabloon. Resultaat direct zichtbaar zonder account;
  de opslaan-knop start registratie met de ingevulde data als seed (doorgeven via de
  bestaande setup-flow). Elk toolgebruik = FUNL-event.
- SITE-3: MDX-opzet onder (marketing)/gids/[slug] met frontmatter (title, description,
  publishedAt); schrijf de eerste 4 artikelen zelf op de termen 'bruiloft checklist',
  'kosten bruiloft gemiddeld', 'trouwbudget verdelen', 'draaiboek bruiloft' — feitelijk,
  behulpzaam, met de tools uit SITE-2 embedded; markeer plekken voor redactie.
- SITE-4: app/sitemap.ts, per-pagina metadata + OG-image-route, schema.org via JSON-LD
  (FAQPage op de gidsartikelen met FAQ, Product op prijzen), robots.ts. Publieke
  trouwwebsites (/trouwen/*) UITSLUITEN van indexering-op-verzoek: respecteer een
  noindex-instelling per bruiloft (voeg die toe aan de website-instellingen, default noindex —
  privacy eerst).
- Lighthouse-budget geldt ook hier (E08-pipeline hergebruiken).
```

---

## E15 · DAG — Trouwdag-modus

**Periode:** oktober–november · **Prio:** P1
**Uit productplan:** E4

> **Waarom dit epic (in gewone taal):** op de trouwdag zelf is de app het meest zichtbaar én is de omgeving het zwakst: feestlocaties hebben notoir slechte wifi. Een zwart fotoscherm om 21:00 op een bruiloft is ons ergste scenario.

| Ticket | Titel | Omschrijving & acceptatie |
|---|---|---|
| DAG-1 | Offline draaiboek | PWA-caching van het draaiboek (venue-wifi is slecht): eenmaal geladen blijft het werken; duidelijke "offline"-indicator. |
| DAG-2 | Fotomuur-scherm hardening | `/foto/[slug]/scherm`: auto-reconnect bij verbroken realtime, geen zwart scherm, memory-stabiel bij urenlang draaien, nette QR-overlay. |
| DAG-3 | Upload-robuustheid | Uploads met retry bij wankele verbinding; wachtrij-indicatie op de telefoon van de gast. |

### In gewone taal, per ticket

**DAG-1 — Draaiboek werkt ook zonder bereik.** De ceremoniemeester moet het dagschema kunnen raadplegen, ook in een kelder zonder bereik. Het draaiboek wordt na de eerste keer openen op het toestel zelf bewaard, zodat het blijft werken zonder verbinding — met een klein signaaltje "je kijkt offline".

**DAG-2 — Het fotoscherm mag nooit zwart worden.** De fotomuur draait urenlang op een scherm op de feestlocatie; als de verbinding hapert, moet hij zichzelf herstellen — niemand zit achter die laptop. Het scherm verbindt automatisch opnieuw, haalt periodiek zelf de nieuwste foto's op als vangnet, gaat zuinig om met geheugen (zodat hij ook na 6 uur soepel draait) en toont permanent de QR-code waarmee gasten uploaden. We testen dit met een urenlange duurtest met opzettelijke storingen.

**DAG-3 — Uploaden op wankele wifi.** Gasten uploaden foto's op overbelaste feest-wifi; nu kan een upload dan stilletjes mislukken. De telefoon probeert het automatisch opnieuw, toont per foto de voortgang, en kan meerdere foto's in een rijtje zetten die één voor één worden verstuurd zodra er bereik is. Dubbel aangekomen foto's worden herkend en niet twee keer getoond.

### Claude Code-prompt (E15)

```text
Je werkt in de wedding-planner-repo. Lees FUNCTIONEEL_TECHNISCH_ONTWERP.md §3.8/§3.11 en
PLANNING_2026_EPICS.md → E15. Er is al een PWA-manifest; er is nog geen service worker.

Opdracht: DAG-1 t/m DAG-3, branch epic/e15-dag.

Eisen:
- DAG-1: minimale service worker (geen zware PWA-frameworks) die specifiek de
  draaiboek-route + benodigde assets cachet met een stale-while-revalidate-strategie.
  Offline-indicator als rustige statusregel. Cache-invalidatie bij nieuwe deploy.
- DAG-2: het scherm draait uren op een laptop/tv op locatie. Bouw: (a) reconnect-logica op
  het realtime-kanaal met exponential backoff + periodieke volledige refetch als vangnet;
  (b) een watchdog die bij >5 min zonder events én zonder verbinding een herverbinding
  forceert; (c) begrensde in-memory fotolijst (window van laatste N foto's) tegen
  geheugengroei; (d) QR-code permanent zichtbaar in een hoek (qrcode-dep bestaat).
  Test met een lange-duur-e2e (gesimuleerde verbindingsonderbrekingen).
- DAG-3: uploadroute-client met retry (3×, backoff), voortgang per foto en een lokale
  wachtrij zodat een gast 5 foto's kan selecteren op slechte wifi. Server accepteert
  idempotente her-uploads (dedup op checksum binnen dezelfde bruiloft+uur).
- Alles mobiel-first testen; de gastflows-e2e moet groen blijven.
```

---

# FASE 5 — Lancering (november 2026)

---

## E16 · SUPP — Support & operatie

**Periode:** oktober–november · **Prio:** P1
**Uit productplan:** I1 (helpcentrum), I2 (supporttooling), I3 (statuspagina/monitoring)

> **Waarom dit epic (in gewone taal):** honderden bruidsparen ondersteunen met een klein team kan alleen als de meeste vragen zichzelf beantwoorden en de rest snel en veilig af te handelen is.

| Ticket | Titel | Omschrijving & acceptatie |
|---|---|---|
| SUPP-1 | Helpcentrum | 20–30 artikelen (voorspelbare vragen + beta-vragen), doorzoekbaar, contextueel gelinkt vanuit de relevante schermen. |
| SUPP-2 | Support-acties in admin | Gelogde support-RPC's: RSVP-link opnieuw sturen, invite verlengen, betaling opzoeken/refund (Mollie), bruiloft herstellen (E02). Admin blijft read-only op tenantdata; acties via expliciete definer-RPC's met audit. |
| SUPP-3 | Statuspagina & synthetische monitoring | Externe statuspagina; synthetische check op de publieke flows (RSVP-pagina laadt, RPC antwoordt) elke 5 min; alerting. |
| SUPP-4 | 👤 Incident-/weekendafspraken | Escalatieproces trouwdagen (zaterdagen in het seizoen), responstijden, wie is bereikbaar. |

### In gewone taal, per ticket

**SUPP-1 — Het helpcentrum.** Bruidsparen plannen 's avonds en willen direct antwoord; elke vraag die een artikel beantwoordt, is teamtijd bespaard. 20–30 korte hulpartikelen over de voorspelbare vragen ("RSVP-link kwijt", "hoe werkt de fotomuur op de dag zelf"), doorzoekbaar en op logische plekken in de app direct gelinkt.

**SUPP-2 — Veilige hulpknoppen voor support.** Support moet kunnen helpen ("stuur die RSVP-link opnieuw", "betaal terug") zónder vrij toegang tot klantgegevens. Een klein aantal specifieke hulpacties in het beheerscherm; elke actie vereist een reden en wordt gelogd: wie deed wat, wanneer, waarom. Meer kan support niet — en dat is bewust.

**SUPP-3 — Automatische bewaking + statuspagina.** Wíj willen als eerste weten dat iets stuk is — niet via een boze mail. Elke vijf minuten controleert een robot of de gastenpagina's echt werken (niet alleen "staat de server aan", maar "kan een gast daadwerkelijk de RSVP-pagina laden"); bij falen direct alarm. Daarnaast een openbare statuspagina waar iedereen ziet of alles draait.

**SUPP-4 — Weekendafspraken in het trouwseizoen 👤.** Bruiloften zijn op zaterdag; onze ernstigste storingen dus ook. Een afsprakenlijst (geen bouwwerk): wie is bereikbaar op zaterdagen in het seizoen, binnen hoeveel tijd reageren we, wie mag wat besluiten.

### Claude Code-prompt (E16)

```text
Je werkt in de wedding-planner-repo. Lees FUNCTIONEEL_TECHNISCH_ONTWERP.md §3.15 en
PLANNING_2026_EPICS.md → E16. SUPP-4 is menswerk (lever een sjabloon-runbook).

Opdracht: SUPP-1 t/m SUPP-3, branch epic/e16-supp.

Eisen:
- SUPP-1: helpcentrum als MDX onder /help met categorieën en zoekfunctie (client-side index
  volstaat). Schrijf de eerste 20 artikelen zelf op basis van hoe de app WERKELIJK werkt
  (RSVP-link kwijt/opnieuw sturen, gast wijzigen na RSVP, cadeaulijst-wachtwoord, fotomuur op
  de dag, leden & rechten, betaling & factuur, data-export, account verwijderen). Voeg een
  HelpLink-component toe en plaats contextuele links op de 10 logische plekken.
- SUPP-2: support_actions-audittabel (bestaat sinds E02 — uitbreiden) + definer-RPC's:
  resend_rsvp(guest), extend_invite(invite), en een refund-flow die via de Mollie-API loopt
  (server-route, niet direct SQL). Elke actie: wie/wat/wanneer/waarom (verplicht
  reden-veld). Admin-UI: zoek bruiloft → acties-paneel. Platform-admin krijgt hiermee GEEN
  generieke schrijfrechten — alleen deze expliciete acties.
- SUPP-3: /api/health-endpoint (checkt DB-RPC, storage, Resend-config; geen geheimen in
  respons) + docs voor een externe uptime-dienst; synthetische Playwright-check
  (RSVP-pagina met testtoken op staging) in een 5-min-scheduled workflow met alert naar
  e-mail/webhook bij falen.
- Sjabloon docs/runbooks/incident-trouwdag.md voor SUPP-4.
```

---

## E17 · DIR — Directory-datakwaliteit

**Periode:** november · **Prio:** P1 · **Afhankelijkheden:** RECHT-2-uitkomst
**Uit productplan:** F1

> **Waarom dit epic (in gewone taal):** de gids met trouwlocaties, fotografen en cateraars is een belangrijke reden om voor ons te kiezen — mits de gegevens kloppen. Een gids vol dode links en verouderde prijzen is erger dan geen gids.

| Ticket | Titel | Omschrijving & acceptatie |
|---|---|---|
| DIR-1 | Bronnen consolideren | `suppliers` en `tpw_businesses` naar één doorzoekbaar model met herkomstvelden (of een unificerende view), dubbelen gededupliceerd. |
| DIR-2 | Dekkingsrapportage | Admin-rapport: dekking per categorie × provincie; identificeer de gaten in locatie/fotograaf/catering. |
| DIR-3 | Kwaliteitscontrole | Dode-website-check (batch), ontbrekende kernvelden markeren, verouderde rijen depriorieteren in zoek/AI-ranking. |
| DIR-4 | 👤 Gaten vullen | Acquisitie/redactie op de belangrijkste gaten uit DIR-2. |

### In gewone taal, per ticket

**DIR-1 — Twee bronnen samenvoegen tot één gids.** De gegevens komen nu uit twee losse verzamelingen, met overlap (dezelfde fotograaf twee keer, met verschillende gegevens). We voegen ze samen tot één gids en ontdubbelen slim: bij twijfel beslist een mens, niet de computer. Wat bruidsparen al aan hun eigen lijstje koppelden, blijft gewoon werken.

**DIR-2 — Weten waar de gaten zitten.** "Hoe goed is onze gids?" moet een meetbaar antwoord hebben: een intern overzicht per categorie en provincie — hoeveel vermeldingen, hoe compleet, en waar missen we aanbod (bijvoorbeeld: weinig trouwlocaties in Zeeland).

**DIR-3 — Verouderde vermeldingen laten zakken.** Een leverancier met een opgeheven website moet niet bovenaan staan. Een automatische periodieke controle bezoekt alle websites in de gids; vermeldingen die niet meer bereikbaar zijn of belangrijke gegevens missen, zakken in de resultaten en komen op een controlelijst. We verwijderen níets automatisch — dat blijft mensenwerk.

**DIR-4 — De grootste gaten vullen 👤.** Het overzicht uit DIR-2 laat zien waar aanvulling het hardst nodig is: redactie-/acquisitiewerk, te beginnen bij locaties, fotografen en catering.

### Claude Code-prompt (E17)

```text
Je werkt in de wedding-planner-repo. Lees FUNCTIONEEL_TECHNISCH_ONTWERP.md §3.6 (leveranciers
& ontdekken, beide bronnen) en PLANNING_2026_EPICS.md → E17. De juridische uitkomst per bron
staat in docs/databronnen-inventarisatie.md (E03) — respecteer welke bronnen mogen blijven.

Opdracht: DIR-1 t/m DIR-3, branch epic/e17-dir.

Eisen:
- DIR-1: ontwerp eerst (kort document in de PR): één gezamenlijk zoekmodel over beide
  tabellen — kies tussen een materialized view of migratie van tpw_businesses-rijen naar
  suppliers met bron='tpw'. Behoud de bestaande vendors-koppelingen (supplier_id én
  tpw_business_id blijven geldig). Dedupliceer op genormaliseerde naam+plaats met een
  match-score; twijfelgevallen naar een review-lijst i.p.v. automatisch samenvoegen.
- DIR-2: admin-scherm /admin/directory: matrix categorie × provincie met aantallen,
  percentage rijen met volledige kernvelden (contact, plaats, prijsindicatie), en een
  gatenlijst gesorteerd op zoekvolume-proxy (gebruik de zoek-events uit FUNL als die er zijn).
- DIR-3: batch-script (cron-baar, rate-limited, nette user-agent) dat websites op
  bereikbaarheid checkt en een kwaliteitsscore per rij bijhoudt; de zoekfunctie en de
  AI-ranking (leveranciers-rank) wegen die score mee zodat dode vermeldingen zakken.
  Geen automatische verwijdering — alleen depriorisering + reviewlijst.
- Test de zoek- en Ontdekken-flows na consolidatie (e2e) en houd de AI-context
  (leveranciersAanbod) werkend.
```

---

## E18 · EVAL — AI-evals & kwaliteitsbewaking

**Periode:** november–december · **Prio:** P1
**Uit productplan:** G1, G3

> **Waarom dit epic (in gewone taal):** één keer een onzinnig advies ("boek je trouwlocatie twee weken van tevoren") en de gebruiker vertrouwt geen énkel AI-advies meer. Kwaliteit mag geen kwestie van steekproefjes zijn.

| Ticket | Titel | Omschrijving & acceptatie |
|---|---|---|
| EVAL-1 | Evaluatieset | 20–30 realistische bruiloftprofielen (verschillende fases, budgetten, regio's) als fixtures. |
| EVAL-2 | Eval-harness | Per AI-feature geautomatiseerd scoren op: formaat-validiteit, NL-taal, feitelijke consistentie met de context (bv. adviseert niets dat al geboekt is), benchmark-consistentie (termijnen kloppen met de urgentie-engine). |
| EVAL-3 | CI-koppeling | Evals draaien bij elke promptwijziging in `lib/bruiloft/ai/` en bij modelversie-updates; rapport in de PR. |
| EVAL-4 | Feedbackloop | Slecht beoordeelde output (bestaande feedbackduim) automatisch als eval-kandidaat; wekelijks overzicht in `/admin/ai`. |

### In gewone taal, per ticket

**EVAL-1 — Een vaste set proefbruiloften.** Om adviezen objectief te beoordelen heb je vaste testgevallen nodig: 20–30 verzonnen maar realistische bruiloften, gespreid over alle situaties — net verloofd of bijna trouwen, klein of groot budget, alles geregeld of nog niets.

**EVAL-2 — De automatische keurmeester.** Elk advies moet langs een meetlat: klopt de opbouw, is het correct Nederlands, en vooral — spreekt het de feiten niet tegen? (Niet adviseren om een DJ te zoeken als die al geboekt is; geen bedragen boven het budget.) Een programma laat de AI voor alle proefbruiloften advies maken en scoort automatisch op deze punten.

**EVAL-3 — Keuring bij elke aanpassing.** AI-adviezen veranderen als wij de instructies aanpassen of de AI-leverancier zijn model bijwerkt — soms ongemerkt ten kwade. De keurmeester draait voortaan automatisch bij elke relevante wijziging; wordt de score duidelijk slechter, dan wordt de wijziging tegengehouden.

**EVAL-4 — Leren van duimpjes-omlaag.** Gebruikers kunnen adviezen al beoordelen; dat signaal moet ergens heen. Een wekelijks overzicht van slecht beoordeelde adviezen voor ons team, met een knop om zo'n geval (geanonimiseerd) toe te voegen aan de proefset — zodat dezelfde fout er voortaan bij de keuring uitrolt.

### Claude Code-prompt (E18)

```text
Je werkt in de wedding-planner-repo. Lees FUNCTIONEEL_TECHNISCH_ONTWERP.md §3.14 en de map
lib/bruiloft/ai/ volledig (prompts, benchmarks, urgentie-engine) en PLANNING_2026_EPICS.md
→ E18.

Opdracht: EVAL-1 t/m EVAL-4, branch epic/e18-eval.

Eisen:
- EVAL-1: fixtures in lib/bruiloft/ai/evals/profielen/ als AIWeddingContext-objecten:
  spreid over fase (14/9/6/3/1 maanden, laatste week), budget (8k–60k), regio en
  voortgang (niets geregeld ↔ bijna alles). Genereer ze deterministisch uit een schema.
- EVAL-2: harness met twee lagen: (a) goedkope deterministische checks — JSON-schema van de
  output, taal-heuristiek, en CONSISTENTIECHECKS tegen de input (adviseer niet wat al
  'geboekt' is; genoemde bedragen vallen binnen het budget; urgentie-uitspraken matchen de
  fase uit de urgentie-engine); (b) optionele LLM-as-judge-laag voor toon/bruikbaarheid
  (achter een vlag, want die kost geld). Score per feature per profiel → JSON-rapport.
- EVAL-3: CI-job die de deterministische laag draait wanneer lib/bruiloft/ai/** wijzigt;
  markdown-samenvatting als PR-comment-artifact. Baseline-scores vastleggen; regressie
  (>10% daling) laat de job falen.
- EVAL-4: duim-omlaag-feedback (bestaat) krijgt een wekelijkse digest in /admin/ai; een
  admin-knop "maak eval-kandidaat" die de betreffende context (geanonimiseerd: namen/
  plaatsen vervangen) als fixture-voorstel wegschrijft.
- Draai de volledige eval éénmalig en lever het nulmeting-rapport mee in de PR.
```

---

## E19 · LNCH — Lancering

**Periode:** november · **Prio:** P0 · **Afhankelijkheden:** alle P0-epics
**Uit productplan:** H3 + lanceer-gereedheid

> **Waarom dit epic (in gewone taal):** een lancering is een project, geen knop. Alles komt hier samen, met een formeel go/no-go-moment.

| Ticket | Titel | Omschrijving & acceptatie |
|---|---|---|
| LNCH-1 | Launch-checklist & go/no-go | Eén checklist over alle epics: pentest schoon, AVG rond, deliverability op groen, e2e groen, monitoring live, supportkanaal bemand. Go/no-go-moment 1 week vóór lancering. |
| LNCH-2 | Feature-freeze-regime | Vanaf lanceerweek t/m half januari alleen fixes; hotfix-procedure gedocumenteerd. |
| LNCH-3 | 👤 Campagne-uitvoering | PR/trouwmedia, Instagram/Pinterest, beta-testimonials, betaald budget "net verloofd" dec–jan. |
| LNCH-4 | Lanceer-telemetrie | Live-dashboard lanceerweek: registraties, funnel, errors, AI-kosten, uptime op één scherm. |

### In gewone taal, per ticket

**LNCH-1 — De lanceerchecklist met go/no-go.** Eén lijst met álle harde voorwaarden: inbraaktest schoon, privacy rond, e-mails komen aan, tests groen, bewaking actief, support bemand. Per punt staat erbij hoe we het controleren; een script checkt de technische punten automatisch. Eén week vóór lancering nemen we het formele besluit: gaan of uitstellen.

**LNCH-2 — Bouwstop rond de piek.** De decemberpiek is niet het moment voor experimenten; stabiliteit gaat dan boven alles. Vanaf de lanceerweek tot half januari alleen nog foutreparaties, met een vaste spoedprocedure voor als er toch écht iets moet.

**LNCH-3 — De campagne 👤.** De lancering moet gezien worden: persbenadering van trouwmedia en -blogs, Instagram/Pinterest (bruiloftplanning is visueel), verhalen van beta-paren als bewijs, en een bescheiden advertentiebudget gericht op net-verloofde stellen in december–januari.

**LNCH-4 — Eén scherm voor de lanceerweek.** In de lanceerweek wil je in één oogopslag zien: registraties, afhaakpunten, fouten, AI-kosten, alles-draait-status. Eén intern dashboard dat de bestaande metingen samenbrengt — niets nieuws, alles bij elkaar.

### Claude Code-prompt (E19)

```text
Je werkt in de wedding-planner-repo. Lees PLANNING_2026_EPICS.md → E19 en PRODUCTPLAN_2026.md
§5–8. LNCH-3 is menswerk.

Opdracht: LNCH-1, LNCH-2 (documentatie + tooling) en LNCH-4, branch epic/e19-lnch.

Eisen:
- LNCH-1: docs/launch-checklist.md, opgebouwd uit de acceptatiecriteria van alle P0-epics in
  dit document — per punt: hoe te verifiëren (commando, dashboard of verantwoordelijke) en
  status. Voeg een scripts/launch-check.mjs toe dat de automatisch verifieerbare punten
  daadwerkelijk checkt (tests groen, health-endpoint, env-vars aanwezig, DMARC-record
  resolvet, sitemap bereikbaar) en een rapport print.
- LNCH-2: docs/runbooks/hotfix.md (branch-van-main, verplichte checks, wie mag deployen) en
  een CI-guard: label 'hotfix' vereist voor merges in de freeze-periode (config via één
  duidelijk aan/uit-bestand).
- LNCH-4: /admin/lanceerweek: één scherm met registraties per uur, funnelconversie vandaag,
  Sentry-foutenteller (via de bestaande error_logs), AI-kosten vandaag, en de laatste
  synthetische-check-status. Alleen bestaande databronnen combineren; niets nieuws
  instrumenteren.
- Houd het klein: dit epic is orkestratie, geen nieuwbouw.
```

---

# FASE 6 — Groei (december 2026 – maart 2027)

---

## E20 · GROEI — Q1-groeipakket

**Periode:** december (na freeze-start alleen voorbereiding) – maart · **Prio:** P2
**Uit productplan:** H4 (referral), D5 (post-wedding), E5 (cadeaulijst-afronding), F2 (claimflow), G3-rest, B6 (leveranciersverkenning)

> **Waarom dit epic (in gewone taal):** na de lancering verschuift de focus van bouwen naar groeien: de piek-instroom omzetten in betalende, enthousiaste paren die ons doorvertellen — en de basis leggen voor de tweede inkomstenbron (leveranciers) in 2027.

| Ticket | Titel | Omschrijving & acceptatie |
|---|---|---|
| GROEI-1 | Referral-mechanisme | Premium-paar krijgt deelbare kortingslink voor verloofde vrienden; attributie in de funnel. |
| GROEI-2 | Post-wedding-ervaring | Afsluitscherm na de trouwdag, fotomuur-ZIP-download (hergebruik E12-export), bedank- en reviewmoment. |
| GROEI-3 | Cadeaulijst-afronding | Ontvangst-bevestigingsherinnering aan het paar, gaststatus "bijdrage ontvangen", bedankjes-overzicht. |
| GROEI-4 | Leveranciers-claimflow (lite) | Leverancier claimt vermelding (e-mailverificatie op domein/adres), kan gegevens actualiseren; reviewwachtrij in admin. |
| GROEI-5 | 👤 Leveranciersinterviews & monetisatie-propositie | 10 interviews op basis van leadvolume-data → go/no-go leveranciersmodel H2 2027. |

### In gewone taal, per ticket

**GROEI-1 — Vrienden-korting.** Onze klanten kénnen de volgende klanten: op elke bruiloft lopen verloofde stellen rond. Elk premium-paar krijgt een persoonlijke kortingslink om door te geven; we meten hoeveel nieuwe paren zo binnenkomen, en beperken misbruik (de code werkt een beperkt aantal keer, alleen voor nieuwe accounts).

**GROEI-2 — Een mooi einde.** Na de trouwdag moet de app niet blijven zeuren over taken — de bruiloft is geweest. De laatste indruk bepaalt wat het paar aan anderen vertelt: na de trouwdatum verschijnt een rustig afsluitscherm — download jullie foto's, dankjewel, en (op het blijste moment dat er is) de vrienden-kortingslink en de vraag om een beoordeling.

**GROEI-3 — De cadeaulijst helemaal afmaken.** Gasten die geld bijdroegen willen weten dat het is aangekomen; het paar vergeet bevestigen weleens; en bedankkaartjes schrijven is een klus waar wij bij kunnen helpen. Een vriendelijke herinnering aan het paar ("3 bijdragen wachten op jullie bevestiging"), een bevestiging voor de gast ("jouw bijdrage is ontvangen 🎉"), en een afvinklijst: wie gaf wat, wie heeft al een bedankje gehad.

**GROEI-4 — Leveranciers kunnen hun eigen vermelding claimen.** De goedkoopste manier om de gids actueel te houden is leveranciers hun eigen gegevens laten bijwerken — en het bouwt de relatie op waar in 2027 het leveranciers-verdienmodel op rust. Een fotograaf claimt zijn vermelding (we controleren via zijn zakelijke e-mailadres dat hij het echt is), werkt daarna contactgegevens, prijzen en foto bij; alles gaat langs onze controlewachtrij. Geclaimde vermeldingen krijgen een "geverifieerd"-kenmerk en tellen zwaarder mee in de zoekresultaten.

**GROEI-5 — Verkennen: willen leveranciers betalen? 👤.** Het plan is om vanaf 2027 aan leveranciers te verdienen (vindbaarheid, doorverwijzingen). Maar eerst: bewijs. We weten inmiddels precies hoeveel aanvragen we elke leverancier bezorgen; met die cijfers voeren we tien gesprekken en beslissen daarna onderbouwd: doorpakken of niet.

### Claude Code-prompt (E20)

```text
Je werkt in de wedding-planner-repo. Lees FUNCTIONEEL_TECHNISCH_ONTWERP.md §3.6/3.10/3.11,
PLANNING_2026_EPICS.md → E20 en de conversiedata-inzichten die als input worden aangeleverd.
GROEI-5 is menswerk. Werk de tickets als LOSSE branches/PR's (epic/groei-1 t/m -4) zodat ze
onafhankelijk live kunnen — we zitten deels in de freeze-periode.

Eisen per ticket:
- GROEI-1: referral_codes gekoppeld aan premium-weddings; kortingslink → E04-kortingsmechaniek;
  attributie-event in de FUNL-taxonomie; deelmoment op het post-wedding-scherm én in het
  accountmenu. Fraudegrens: code max N keer, alleen nieuwe accounts.
- GROEI-2: afsluitscherm dat automatisch verschijnt na de trouwdatum (rustig, warm, één
  scherm): foto's downloaden (E12-ZIP), bedankt, referral-link, reviewvraag. Vervangt de
  planningsnudges — na de bruiloft geen taken-prompts meer.
- GROEI-3: lifecycle-mail (E11-orkestratie) "3 bijdragen wachten op jullie bevestiging";
  gastpagina toont na bevestiging door het paar "jouw bijdrage is ontvangen 🎉" (statusveld
  bestaat: confirmed_at); overzichtstab 'bedankjes' bij de cadeaulijst met per gast wat
  die gaf/bijdroeg, afvinkbaar 'bedankje gestuurd'.
- GROEI-4: claim-flow: leverancier vraagt claim aan op een vermelding (e-mail moet matchen
  met het domein van de vermelding, anders handmatige review), verificatie via tokenmail,
  daarna een minimaal bewerkscherm (contact, prijsindicatie, omschrijving, foto) met
  moderatiewachtrij in /admin/directory. Geclaimde vermeldingen krijgen een 'geverifieerd'-
  kwaliteitsboost in zoek/ranking (E17-score).
- Alle nieuwe flows met e2e-test; FUNL-events op de nieuwe conversiemomenten.
```

---

# Bijlagen

## A. Volgorde-afhankelijkheden (kritiek pad)

```
E01 FUND ─► E02 DATA ─► (alles daarna bouwt op CI + soft-delete)
E03 RECHT-4 (merk) ─► E06 MAIL-1 (domein) ─► E14 SITE
E04 BILL ─► E09 AIKO (tegoeden) ─► E10 BETA (beta-tarief)
E04 BILL + E06 MAIL + E07 FUNL + E08 GAST ─► beta-start (sept)
E05 AVG + E13 SEC + E16 SUPP ─► E19 LNCH (go/no-go)
E03 RECHT-2 (bronnen-uitkomst) ─► E17 DIR
E11 LIFE + E12 CYCL ─► E20 GROEI-2/3
```

## B. Werkafspraken voor het team

1. **Eén epic = één epic-branch** (`epic/exx-naam`), tickets als PR's daarop of rechtstreeks naar main als het epic klein is; altijd via de CI van E01.
2. **Claude Code-prompts**: kopieer de prompt van het epic, voeg actuele input toe waar de prompt daarom vraagt (bv. design-auditbestand, merknaam, Mollie-testsleutel) en laat per ticket committen. Review blijft mensenwerk: elke PR wordt gelezen vóór merge.
3. **Tickets met 👤 zijn niet aan Claude Code te delegeren** — plan die bij de juiste persoon (jurist, designer, marketing, DNS-beheer) en bewaak de doorlooptijd: extern werk is het vaakst het kritieke pad.
4. **Definition of done per ticket**: acceptatiecriterium gehaald · `tsc`/lint/tests groen · NL-teksten conform `DESIGN_PHILOSOPHY.md` · nieuwe env-vars in `.env.example` · geen open TODO's zonder ticketverwijzing.
5. **Bij uitloop**: P1-tickets schuiven, de lanceerdatum (november) en de P0-keten niet — besluit daarover ligt bij de product owner, niet bij de uitvoerder.
6. **Voor niet-technische teamleden**: de blokken "In gewone taal, per ticket" zijn jullie naslagwerk bij stand-ups en planningsgesprekken. Als de gewone-taal-uitleg ergens anders klinkt dan de technische ticketomschrijving, is de technische omschrijving leidend.
