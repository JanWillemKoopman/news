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

`components/CampaignMatrix.tsx` toont de campagnes getransponeerd: elke campagne is een
kolom, de metrics staan eronder als rijen, zodat campagnes makkelijk naast elkaar te
vergelijken zijn. Huidige rijen (in deze volgorde):

1. Startdatum
2. Einddatum
3. Budget
4. Uitgaven
5. Doel orders
6. Order totaal

Dit is een eerste opzet — verdere metrics/dimensies uit de sheet (Doel leads, Merk,
Model, Resultaat, …) komen er later bij. Rijen toevoegen is een kwestie van een item
toevoegen aan de `ROWS`-array in `CampaignMatrix.tsx`.

## Bekende punten

- Geen Supabase meer nodig: de vorige camerakeuze-site gebruikte het `camerakeuze`-schema
  in het gedeelde Supabase-project van deze repo, maar dit dashboard leest rechtstreeks
  en live uit de sheet. Het schema zelf is niet aangepast/verwijderd.
