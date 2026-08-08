# bestecamerakeuze.nl

Affiliate-site voor fotocamera's. Losstaand Next.js 15-project binnen deze repo — eigen
`package.json`, eigen build, geen gedeelde code met de mmm-wizard app in de root. Dat is
ook noodzakelijk: de root draait Next 14 + Tailwind 3, dit project Next 15 + Tailwind 4.

**Stack:** Next.js 15 (App Router) · React 19 · Tailwind CSS v4 · TypeScript · Supabase

## Draaien

```bash
cd bestecamerakeuze
npm install
npm run dev            # http://localhost:3002
```

De site werkt **direct**, zonder Supabase-configuratie: `lib/products.ts` valt dan terug
op `data/demo_cameras.csv`. Dat maakt de demo zelfstandig draaibaar en betekent ook dat
een storing in Supabase de site niet plat legt.

Verificatie:

```bash
npm run typecheck
npm run build
```

## Data

### CSV

`data/demo_cameras.csv` bevat tien camera's met alle productvelden. Kolommen: `id`,
`title`, `brand`, `category`, `price`, `old_price`, `rating`, `review_count`,
`image_url`, `affiliate_url`, `description`, `specs` (JSON-string), `pros` en `cons`
(pijp-gescheiden).

> **Let op — wat is echt en wat is demo.** De specificaties (megapixels, sensortype,
> videoresolutie, gewicht) komen uit de gepubliceerde fabrieksspecificaties en kloppen.
> **Prijzen, `rating` en `review_count` zijn verzonnen demo-waarden** en moeten uit de
> echte Coolblue-feed komen voordat de site live gaat. Ook de afbeeldingen zijn
> placeholders (placehold.co), geen echte productfoto's.

### Import naar Supabase

```bash
cp .env.local.example .env.local     # vul SUPABASE_SERVICE_ROLE_KEY aan
npm run import-csv
```

`scripts/import-csv.ts` leest de CSV, splitst `pros`/`cons` op de pijp, parseert `specs`
naar JSON en doet een upsert op `id` — meermaals draaien is veilig en werkt gewijzigde
prijzen bij. De service_role key is nodig omdat RLS op de tabel alleen SELECT toestaat.

### Schema

`camerakeuze.products` in het gedeelde Supabase-project van deze repo. De migratie staat
in `../supabase/migrations/0021_camerakeuze_products.sql` (één chronologische lijst voor
de hele repo) en is al toegepast.

**Openstaande handmatige stap:** voeg `camerakeuze` toe aan Project Settings → API →
Exposed schemas in het Supabase-dashboard. Zonder dat serveert PostgREST het schema niet
en blijft de site op de CSV-fallback draaien.

## Pagina's

| Route | Rendering | Inhoud |
| --- | --- | --- |
| `/` | dynamisch | Hero, zoeken, filters op merk/type/budget, sortering, productgrid |
| `/camera/[id]` | statisch (SSG) | Detailweergave met review, plus- en minpunten, specs, sticky koopblok |
| `/vergelijk` | dynamisch | Matrix voor 2–3 camera's, met markering van laagste prijs en beste score |

Filters op de homepage draaien client-side op de al geladen dataset — bij tien producten
is dat direct, en de categorie-links in de header vullen de filters voor via de URL
(`/?brand=Sony`). Bij een groeiende catalogus moet dat naar server-side filtering.

## Reviews

`lib/reviews.ts` bevat de redactionele beoordelingen, bewust gescheiden van de feed: de
CSV verandert dagelijks mee met prijs en voorraad, het oordeel alleen als wij het
herschrijven.

De teksten zijn gebaseerd op de gepubliceerde fabrieksspecificaties en op punten die in
gepubliceerde reviews consistent terugkomen. Ze zijn **niet** samengesteld uit live
review-data en de camera's zijn niet zelf getest — dat staat ook als disclosure onder
elke review op de site.

## Affiliate

- Alle uitgaande links krijgen `rel="sponsored nofollow noopener noreferrer"` en
  `target="_blank"` (`components/AffiliateButton.tsx`), conform Google's richtlijn voor
  betaalde links.
- De commissie-vermelding staat in de footer en bij elke CTA. Die transparantie is in
  Nederland verplicht onder de Wet oneerlijke handelspraktijken.
- Oranje is in het hele ontwerp gereserveerd voor de affiliate-CTA, zodat de
  belangrijkste actie op elke pagina de enige oranje vlek is.

## Bekende punten

- `npm audit` meldt drie high-severity issues in transitieve dependencies van Next 15
  zelf (postcss, sharp). Oplossen vereist Next 16, wat buiten de gevraagde stack valt.
- Productafbeeldingen zijn placeholders; `next.config.ts` staat `image.coolblue.nl` al
  toe voor zodra de echte feed gekoppeld wordt.
