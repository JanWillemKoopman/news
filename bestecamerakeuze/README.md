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

`data/demo_cameras.csv` bevat achttien camera's met alle productvelden. Kolommen: `id`,
`title`, `brand`, `category`, `price`, `old_price`, `rating`, `review_count`,
`image_url`, `affiliate_url`, `description`, `specs` (JSON-string), `pros` en `cons`
(pijp-gescheiden), plus de vlog-kolommen `flip_screen`, `screen_type`, `stabilisation`,
`mic_input`, `headphone_out`, `max_clip_minutes`, `unlimited_recording`,
`overheating_reported`, `weight_g`, `autofocus_type`, `log_profiles` (pijp-gescheiden) en
`battery_video_minutes`.

> **Let op — wat is echt en wat is demo.** De specificaties (megapixels, sensortype,
> videoresolutie, gewicht) en alle vlog-kolommen komen uit de gepubliceerde
> fabrieksspecificaties en kloppen. **Prijzen, `rating` en `review_count` van CAM-001 t/m
> CAM-010 zijn verzonnen demo-waarden** en moeten uit de echte Coolblue-feed komen voordat
> de site live gaat. De acht camera's die er voor de vlogpagina bij kwamen (CAM-011 t/m
> CAM-018) hebben bewust **géén** prijs en géén beoordeling: liever een leeg veld dan een
> verzonnen bedrag. `price` is daarom nullable en de UI toont dan "Actuele prijs bij de
> winkel" in plaats van € 0,00.

Een leeg vakje in een vlog-kolom betekent **niet geverifieerd**, niet "nee". We vullen een
veld alleen als het op de officiële productpagina van de fabrikant staat. De UI toont dat
verschil: "—" grijs voor onbekend, "Nee" rood voor een echt ontbrekende functie.

### Productfoto's

`public/products/placeholder.jpg` — één gedeelde demo-afbeelding (1200×1200,
huisstijlkleuren) die voor alle achttien producten als `image_url` dient. Geen foto's per
model: dit is een demo-omgeving en een echte foto per camera zou suggereren dat die al
geverifieerd is. Zodra de Coolblue-feed gekoppeld wordt, vervangen de echte productfoto's
van hun CDN dit bestand — `next.config.ts` staat `image.coolblue.nl` daarvoor al toe.

### Import naar Supabase

```bash
cp .env.local.example .env.local     # vul SUPABASE_SERVICE_ROLE_KEY aan
npm run import-csv
```

`scripts/import-csv.ts` leest de CSV, splitst `pros`/`cons` op de pijp, parseert `specs`
naar JSON en doet een upsert op `id` — meermaals draaien is veilig en werkt gewijzigde
prijzen bij. De service_role key is nodig omdat RLS op de tabel alleen SELECT toestaat.

### Schema

`camerakeuze.products` in het gedeelde Supabase-project van deze repo. De migraties staan
in `../supabase/migrations/` (één chronologische lijst voor de hele repo):

| Migratie | Inhoud |
| --- | --- |
| `0021_camerakeuze_products.sql` | schema, tabel, RLS, indexen |
| `0022_camerakeuze_vlog_specs.sql` | twaalf vlog-kolommen, index op `weight_g`, `price` nullable |

Beide zijn toegepast.

**Openstaande handmatige stap:** voeg `camerakeuze` toe aan Project Settings → API →
Exposed schemas in het Supabase-dashboard. Zonder dat serveert PostgREST het schema niet
en blijft de site op de CSV-fallback draaien.

## Pagina's

| Route | Rendering | Inhoud |
| --- | --- | --- |
| `/` | dynamisch | Hero, zoeken, filters op merk/type/budget, sortering, productgrid |
| `/camera/[id]` | statisch (SSG) | Detailweergave met review, plus- en minpunten, specs, sticky koopblok |
| `/vergelijk` | dynamisch | Matrix voor 2–3 camera's, met markering van laagste prijs en beste score |
| `/vlogcameras` | statisch, `revalidate 3600` | Koopgids: keuzehulp, genummerde top 10, vlog-vergelijkingstabel, criteria, FAQ, JSON-LD |

De gidspagina `/vlogcameras` is de zwaartepunt-pagina van de site. Redactionele inhoud
staat in `lib/vlog.ts` (rangschikking, keuzehulp, criteria, FAQ) en de gebundelde
oordelen van andere reviewsites in `lib/external-reviews.ts` — met bron-URL, licentievrij
citaat en de datum waarop wij de pagina gelezen hebben. Een cijfer komt daar alleen in als
die site er daadwerkelijk een publiceert; het gemiddelde middelt uitsluitend die bronnen
en vermeldt hoeveel het er zijn.

Filters op de homepage draaien client-side op de al geladen dataset — bij achttien
producten is dat direct, en de categorie-links in de header vullen de filters voor via de
URL (`/?brand=Sony`). Bij een groeiende catalogus moet dat naar server-side filtering.
Producten zonder prijs vallen buiten elk budgetfilter behalve "alle prijzen": ze in een
prijsklasse stoppen zou een prijs suggereren die we niet hebben.

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
- Eén gedeelde placeholder-afbeelding voor alle producten in plaats van foto's per model;
  zie "Productfoto's" hierboven. `next.config.ts` staat `image.coolblue.nl` al toe voor
  zodra de winkelfeed gekoppeld wordt en er wel echte productfoto's per model komen.
- Niet elke vlog-spec is te vinden op een fabrikantpagina. Wat we niet konden staven
  hebben we leeggelaten; in de vergelijkingstabel op `/vlogcameras` is dat een grijs
  streepje. Grootste gaten: GoPro publiceert gewicht en schermformaten niet op de
  productpagina, en Sony noemt S-Log3/S-Cinetone alleen bij de ZV-E10 II expliciet.
- `overheating_reported` is als enige veld géén fabrieksspec — fabrikanten publiceren dit
  nooit. Het komt uit reviews waarin het gemeten is, met de meting en de bron in
  `lib/external-reviews.ts`.
