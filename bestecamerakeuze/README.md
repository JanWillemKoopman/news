# Campagnedashboard

Live dashboard dat campagnedata toont uit een publiek Google Sheet (tabblad "Campagnes").
Losstaand Next.js 15-project binnen deze repo — eigen `package.json`, eigen build, geen
gedeelde code met de mmm-wizard app in de root.

Draait op dezelfde plek (Vercel-project, domein, root directory) als de vorige
bestecamerakeuze-site, die deze functionaliteit volledig vervangt.

**Stack:** Next.js 15 (App Router) · React 19 · Tailwind CSS v4 · TypeScript

## Draaien

```bash
cd bestecamerakeuze
npm install
npm run dev            # http://localhost:3002
```

Verificatie:

```bash
npm run typecheck
npm run build
```

## Data

`lib/sheet.ts` haalt het tabblad "Campagnes" op via de publieke gviz-CSV-export van
Google Sheets (`.../gviz/tq?tqx=out:csv&sheet=Campagnes`) — geen API-key nodig omdat de
sheet op "Anyone with the link can view" staat. De pagina is `force-dynamic`
(`app/page.tsx`): elk bezoek haalt de actuele data live op, er wordt niets gecachet of
gegenereerd tijdens de build.

De sheet-ID staat als fallback in `lib/sheet.ts` en is overschrijfbaar via de
env-variabele `GOOGLE_SHEET_ID`, mocht het dashboard ooit naar een andere spreadsheet
moeten wijzen.

**Bedragen en aantallen** in de sheet staan in NL-notatie (`€ 3.000`, `20,00`); zie
`parseNumberNL` in `lib/sheet.ts`.

## Dashboard

`components/CampaignDashboard.tsx` (client component) is de pagina-orkestrator: KPI-rij,
zoek-/filterbalk, sortering en de campagnekaarten-grid. Elke campagne is een kaart
(`components/CampaignCard.tsx`) met:

- Campagnenaam, merk-badge en status-badge (groen "Open", grijs "Gesloten").
- Looptijd (start–einddatum).
- Drie voortgangsbalken (`components/ProgressBar.tsx`): Budget (uitgaven/budget),
  Orders (order totaal/doel orders), Leads (leads/doel leads) — elk met het percentage
  achter de waarde.

Bovenaan staan vier KPI-kaarten (`components/KpiCard.tsx`) met totalen over de
*gefilterde* selectie: totaal budget, totale uitgaven, behaalde orders en aantal actieve
(open) campagnes.

Percentages komen uit `ratio`/`formatPercent` in `lib/format.ts` en vallen terug op enkel
de hoofdwaarde zodra teller of noemer ontbreekt. Een voortgangsbalk clamped visueel op
100%, maar het percentage in de tekst toont het werkelijke (eventueel hogere) getal.

## Filters, zoeken en sorteren

`components/CampaignDashboard.tsx` filtert client-side op Status, Merk, Ordersoort en
Klantgroep (kolom "Klantgroep orders (indien van toepassing)" in de sheet, afgekort in de
UI) via de generieke multi-select `components/FilterDropdown.tsx`. Filteropties worden
afgeleid uit de data zelf, dus nieuwe waarden in de sheet verschijnen automatisch. Daarnaast
een zoekveld op campagnenaam en een sorteerkeuze (naam, budget hoog→laag, einddatum
vroeg→laat).

## Merkidentiteit

Huisstijl in `app/globals.css`: donkerblauw (`--color-brand`) als merkkleur, zachtgrijze
pagina (`--color-page: #f8f9fa`) met witte "floating cards" (`--radius-card: 12px`,
`--shadow-card`). Lettertype is Inter (`next/font/google`, zie `app/layout.tsx`). Ik kon
de exacte udenhout.nl-huisstijl niet raadplegen (dat domein is in deze sandbox
geblokkeerd) — de kleuren zijn een redelijke aanname op basis van het bestaande palet in
dit project; pas `--color-brand`/`--color-open`/`--color-closed` in `app/globals.css` aan
als dit afwijkt van de echte merkkleuren.

## Laadstatus

`app/loading.tsx` toont skeleton-placeholders (KPI-rij, filterbalk, kaartengrid) terwijl
`getCampagnes()` in `app/page.tsx` de sheet ophaalt — automatisch via Next.js' `loading`
conventie, geen extra state nodig.

## Bekende punten

- Geen Supabase meer nodig: de vorige camerakeuze-site gebruikte het `camerakeuze`-schema
  in het gedeelde Supabase-project van deze repo, maar dit dashboard leest rechtstreeks
  en live uit de sheet. Het schema zelf is niet aangepast/verwijderd.
- De kolommen "Order totaal" en "Orders campagne" in de sheet lijken voor elke campagne
  dezelfde waarde te bevatten (een totaal i.p.v. een per-campagne cijfer). Zolang dat zo
  is, kan het "Orders"-percentage op een kaart en de KPI "Behaalde orders" onrealistisch
  hoog uitvallen. Dit is een datakwestie in de sheet, geen bug in het dashboard.
