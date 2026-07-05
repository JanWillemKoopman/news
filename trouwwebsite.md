# Trouwwebsite — Handover Document

> ⚠️ **Update (website v3):** dit document beschrijft de oorspronkelijke
> opzet (vaste secties + zes hardgecodeerde templates). Inmiddels is fase 1
> van **Trouwwebsite 2.0** gebouwd: een theme-engine (design-tokens) en een
> blokkenmodel met nieuwe editor en live preview. Zie
> [`trouwwebsite-roadmap.md`](./trouwwebsite-roadmap.md) voor de roadmap en
> de nieuwe architectuur (`lib/bruiloft/websiteTheme.ts`,
> `lib/bruiloft/websiteBlocks.ts`, `components/website/v2/`,
> migratie `0049_website_v3_blocks.sql`). Het hieronder beschreven oude
> model blijft bestaan als legacy-pad voor nog niet geconverteerde sites.

Dit document beschrijft de trouwwebsite-feature van de Wedding Planner app in
twee lagen: eerst wat de gebruiker (het bruidspaar) ervaart, daarna hoe dat
technisch is opgebouwd. Bedoeld als opstappunt voor een developer die deze
feature verder gaat bouwen.

---

## Deel 1 — Vanuit de gebruiker

### Wat is het?

Elk bruidspaar kan vanuit hun account (`/bruiloft/website`) een eigen
publieke trouwwebsite samenstellen en publiceren op een adres van de vorm
`https://<domein>/trouwen/<hun-gekozen-slug>`. Die pagina is voor iedereen
zonder login te bezoeken — hij is bedoeld om te delen met de bruiloftsgasten.

### Wat kun je instellen?

**Publiceren.** Bovenaan de editor staat een aan/uit-schakelaar ("Website is
live" / "Website is verborgen") plus de publieke URL, met kopieer- en
open-knop. Zolang de schakelaar uit staat, bestaat de pagina wel (en is hij
te bekijken in de editor-preview) maar geeft de publieke URL een 404.

**Ontwerp.** Een couple kiest uit 6 kant-en-klare templates/thema's, elk met
een eigen sfeer en stijlvoorbeeld:

| Template | Sfeer |
|---|---|
| The Atelier (klassiek) | Tijdloos, ornamenteel, gecentreerd |
| The Editor (modern) | Asymmetrisch split-hero, editoriaal |
| Le Jardin (romantisch) | Warm blush, botanisch, vloeiende script |
| Het Landgoed (rustiek) | Linnen achtergronden, warm organisch |
| Studio (minimalistisch) | Gigantische typografie, verder kaal |
| De Tuin (botanisch) | Weelderig groen, masonry-fotogalerij |

Bij het kiezen van een template wordt automatisch een bijpassende
accentkleur en koplettertype voorgesteld, maar beide zijn los aan te passen
(kleurenkiezer + presets, 6 lettertype-opties). Er is ook een schakelaar voor
een vast navigatiemenu bovenaan de pagina (standaard uit — bezoekers scrollen
gewoon door de secties).

**Website-adres (slug).** Bij het eerste bezoek wordt automatisch een
kandidaat-slug voorgesteld op basis van beide voornamen (bijv.
`jan-en-ellemiek`), met een beschikbaarheidscheck en fallback-nummering als
die bezet is. Het stel kan dit zelf overschrijven; er is live validatie op
formaat (kleine letters/cijfers/koppeltekens, 3-50 tekens) en beschikbaarheid.

**Secties.** De pagina is opgebouwd uit een vaste lijst secties die je stuk
voor stuk kunt in-/uitschakelen, herbenoemen, van volgorde wisselen (drag &
drop) en individueel stylen (uitlijning, achtergrondkleur, eigen
sectie-afbeelding):

- **Home** — welkomsttekst + headerfoto (altijd aanwezig, niet verbergbaar)
- **Aftelling** — live countdown-timer naar de trouwdatum (of een losse
  datum); staat standaard uit
- **Programma** — dagindeling; ofwel automatisch gevuld vanuit het
  Draaiboek (de items die zijn gemarkeerd als zichtbaar voor gasten), ofwel
  vrije tekst als het stel dat liever zelf schrijft
- **Dresscode**, **Overnachten**, **Route**, **Contact** — vrije tekstvelden
- **Cadeaulijst** — verwijst door naar de aparte cadeaulijst-pagina wanneer
  die feature aanstaat, anders gewoon vrije tekst
- **FAQ** — zelf samen te stellen vraag/antwoord-accordeon
- **Foto's** — een fotogalerij (los van de sectie-afbeeldingen)

Een sectie verschijnt op de publieke site alleen als hij zowel "zichtbaar"
staat áls daadwerkelijk inhoud heeft (een lege dresscode-sectie wordt niet
getoond, ook niet als hij aanstaat).

**RSVP.** Dit loopt niet via de trouwwebsite zelf. In de editor (onder de
Home-sectie) genereert het stel persoonlijke RSVP-links per gast
(`/rsvp/<token>`), die los worden verstuurd (WhatsApp, mail). De
trouwwebsite en de RSVP-flow zijn dus twee gescheiden paden naar dezelfde
gegevens.

**Live voorbeeld.** Rechtsboven de editor staat een knop naar de live
publieke pagina; wijzigingen worden automatisch (na een korte debounce)
opgeslagen en zijn direct zichtbaar zodra je de publieke URL ververst.

### Wat de gast ziet

De publieke pagina toont, afhankelijk van het gekozen thema, een hero met
namen/datum/locatie, gevolgd door de aangezette secties in de gekozen
volgorde. Als de cadeaulijst-feature aanstaat, krijgt de gast een knop naar
`/trouwen/<slug>/cadeaulijst` — een losse pagina (eventueel met
wachtwoord) waar cadeaus/geldbijdrages gereserveerd of bijgedragen kunnen
worden.

---

## Deel 2 — Technisch

### Bestandsoverzicht

```
app/bruiloft/website/page.tsx                    editor-pagina (achter login)
app/bruiloft/website/components/
  WebsiteStatusCard.tsx                           publiceer-toggle + URL + sectie-telling
  OntwerpInstellingen.tsx                          template/kleur/font/nav/slug (collapsible)
  SectieAccordionLijst.tsx                          per-sectie accordion: content + layout-instellingen
  RsvpSectie.tsx                                    RSVP-linkjes genereren/kopiëren per gast
  FotoUpload.tsx                                    generieke drag&drop single-image upload
  editors/HomeEditor.tsx, TekstEditor.tsx,
          FaqEditor.tsx, FotoGalerijEditor.tsx      content-editors per sectietype
  useDebounceOpslaan.ts                             debounce-hook voor auto-save
  PaginaSidebar.tsx, PreviewPanel.tsx                ⚠ niet gebruikt door page.tsx (zie hieronder)

components/website/PublicWebsite.tsx               6 templates + sectie-rendering (client component)
components/website/PublicCadeaulijstPage.tsx        publieke cadeaulijst-pagina
components/website/PublicRegistrySection.tsx        registry-item rendering binnen die pagina

app/trouwen/[slug]/page.tsx                        publieke route: haalt data op via RPC, geen auth
app/trouwen/[slug]/cadeaulijst/page.tsx            publieke cadeaulijst-route
app/trouwen/layout.tsx                              layout voor het publieke /trouwen-segment
app/rsvp/[token]/page.tsx                           gescheiden RSVP-flow (leest via get_public_wedding RPC)

lib/bruiloft/types.ts                              WebsiteContent / SectieConfig / FaqItem / GallerijFoto
lib/bruiloft/supabaseRepository.ts                  CRUD naar website_content / website_fotos
lib/supabase/storage.ts                              upload/delete naar de wedding-media-bucket
store/bruiloftStore.ts                                saveWebsiteContent / uploadSectieFoto / websiteFotos

supabase/migrations/0010_website_v2.sql              basistabel-uitbreiding, RPC's, storage-bucket + policies
supabase/migrations/0033_public_schedule_eindtijd.sql eindtijd toegevoegd aan publieke schedule-JSON
```

### Let op: dode/ongebruikte code

`PaginaSidebar.tsx` en `PreviewPanel.tsx` zijn **niet** meer aangesloten op
`page.tsx` — de huidige editor gebruikt `SectieAccordionLijst` als enige
UI-patroon (geen sidebar-navigatie, geen los preview-paneel; live voorbeeld
gaat via een externe link). Beide bestanden importeren nog wel het type
`SectieSleutel` vanuit `PaginaSidebar.tsx`, dus dat bestand is niet dood,
maar de component zelf wordt nergens gerenderd. Voordat je hierop verder
bouwt: check of dit bewust "in de wacht" staat of opgeruimd kan worden.

### Datamodel

Eén rij per bruiloft in `website_content` (1:1 met `weddings`, via
`wedding_id`), aangevuld met een losse tabel `website_fotos` voor de
galerij (1:N). Kern van `website_content` (zie
`supabase/migrations/0010_website_v2.sql`):

| Kolom | Type | Betekenis |
|---|---|---|
| `slug` | text, unique | publieke URL-segment; `null` = nog niet gekozen |
| `website_gepubliceerd` | boolean | publish-toggle |
| `thema` | text | een van 6 vaste waarden (`WeddingThema`) |
| `kleur_accent` | text | hex-kleur |
| `kop_lettertype` | text | een van 6 vaste waarden (`WeddingLettertype`) |
| `header_foto_url`, `header_overlay` | text/numeric | hero-afbeelding + donkerte-overlay |
| `secties_config` | jsonb | `Record<sectieKey, SectieConfig>` — zichtbaarheid, naam, volgorde, uitlijning, achtergrondkleur, eigen foto, vrije tekst (programma), countdown-datum |
| `faq`, `gallerij` | jsonb | arrays van `FaqItem` / `GallerijFoto` |
| `welkomsttekst`, `dresscode`, `cadeaulijst`, `hotels`, `routebeschrijving`, `contact` | text | vrije tekstvelden per sectie |

`SectieConfig` (`lib/bruiloft/types.ts:320`) is de generieke per-sectie
layout-envelope; `_nav` is een speciale, niet-in-de-sectielijst sleutel die
alleen `zichtbaar` gebruikt om het navigatiemenu te tonen/verbergen.

TypeScript en database-kolomnamen wijken bewust af (camelCase vs snake_case);
de mapping zit in `lib/bruiloft/mappers.ts`
(`websiteContentFromRow` / `websiteContentToRow`).

### Opslaan: patch + debounce + upsert

De editor werkt met **partial patches**: elke wijziging (tekstveld, kleur,
sectie-toggle, …) roept `saveWebsiteContent(patch: Partial<WebsiteContentInput>)`
aan. Tekst/kleur-invoer loopt door `useDebounceOpslaan` (700ms, zie
`useDebounceOpslaan.ts` en de `SaveStatus`-indicator in `page.tsx`); knoppen
(thema kiezen, sectie tonen/verbergen) slaan direct op.

`saveWebsiteContent` in `supabaseRepository.ts:385` doet een **upsert** op
`wedding_id` — er wordt dus nooit met `.update()` gewerkt, wat betekent dat
de allereerste patch (bij het openen van de pagina, zie de `initAttempted`
effect in `page.tsx:34`) meteen de rij aanmaakt met kolom-defaults uit de
migratie.

Slug-wijzigingen lopen apart via `check_slug_available` (RPC,
`security definer`, want een ingelogde gebruiker mag geen rijen van andere
bruiloften lezen) met een eigen 600ms-debounce en optimistic UI-states
(`idle/checking/beschikbaar/bezet/ongeldig/leeg`) in `OntwerpInstellingen.tsx`.

### Foto's: twee verschillende opslagpaden

Beide gaan naar dezelfde Supabase Storage-bucket `wedding-media`
(`lib/supabase/storage.ts`, pad `<weddingId>/<subfolder>/<naam>`,
publieke read-policy, 10MB-limiet, alleen jpeg/png/webp/gif):

1. **Header- en sectie-foto's** — losse velden in `website_content`
   (`headerFotoUrl`, of `sectiesConfig[key].fotoUrl`). Upload overschrijft
   gewoon het veld via `saveWebsiteContent`; er is geen aparte
   opruimlogica voor de oude bestanden in de bucket (potentiële orphan
   files bij vervangen/verwijderen van een sectie-foto — `onVerwijderFoto`
   zet alleen `fotoUrl: undefined`, het bestand zelf blijft in Storage
   staan).
2. **Galerij** — losse rijen in `website_fotos`, elk met eigen `volgorde`.
   Verwijderen (`deleteWebsiteFoto`) verwijdert wél zowel de databaserij als
   het Storage-object (`store/bruiloftStore.ts:1180`).

### Publieke rendering: RPC + puur presentational component

De publieke route (`app/trouwen/[slug]/page.tsx`) is een server component
zonder auth. Hij haalt data op via twee paden:

- `supabase.rpc('get_public_website', { p_slug })` — een
  `security definer`-functie (`0010_website_v2.sql:99`) die **alleen**
  content teruggeeft als `website_gepubliceerd = true`; anders `null` →
  `notFound()`. Dit is de enige plek waar de publish-toggle wordt
  gehandhaafd — er is geen RLS-policy op `website_content` voor `anon`,
  het loopt bewust via deze ene RPC (zie ook de opmerking in
  `0027_launch_hardening.sql:89`).
- Een losse (best-effort, `try/catch`) query naar `registry_settings` om te
  weten of de cadeaulijst-knop getoond moet worden en of er een wachtwoord
  voor nodig is — dit gebruikt de **admin/service-role client**
  (`createRawAdminClient`), dus dit stukje omzeilt RLS volledig
  server-side. Let hierop bij het uitbreiden: alles wat je hier toevoegt
  aan de admin-query is potentieel voor iedereen (ook niet-ingelogd)
  zichtbaar.

De RPC retourneert precies de vorm van `PublicWebsiteData`
(`components/website/PublicWebsite.tsx:26`) — als je een veld toevoegt aan
`website_content`, moet je het **zowel** in de RPC's `jsonb_build_object`
**als** in het TypeScript-type toevoegen; er is geen automatische
kolom-naar-JSON-mapping voor deze RPC (in tegenstelling tot de reguliere
CRUD-laag die via `mappers.ts` loopt).

`PublicWebsite` zelf is een pure, stateless-per-render client component: hij
krijgt `data` (+ optioneel `registry`/`slug`) binnen, bouwt een array van
sectie-definities (elk met `id`, `label`, `icoon`, render-functie), filtert
op zichtbaarheid/aanwezigheid van inhoud, sorteert op `volgorde`, en geeft
die array door aan de renderer die bij `content.thema` hoort
(`TEMPLATES`-lookup, regel 928). Elke template-functie
(`KlassiekTemplate`, `ModernTemplate`, …) is een op zichzelf staand stuk
markup/CSS — er is bewust geen gedeeld "layout systeem" tussen templates,
alleen gedeelde content-renderers (`renderGalerij`, `FaqAccordion`,
`CountdownBlok`) en gedeelde kleurlogica (`hexNaarHsl` zet de gekozen
accentkleur om naar een CSS-variabele `--primary` in HSL, zodat templates
`hsl(var(--primary)/0.35)`-achtige opacity-varianten kunnen gebruiken).

Dezelfde `PublicWebsite`-component wordt hergebruikt in `PreviewPanel.tsx`
(momenteel ongebruikt, zie boven) — dat was dus bedoeld als het live-preview
mechanisme in-app, los van de "open in nieuw tabblad"-knop die er nu is.

### Programma-sectie: twee databronnen

De "Programma"-sectie is de enige sectie die conditioneel uit een andere
feature put: als `sectiesConfig.programma.inhoud` leeg is, valt hij terug op
`schedule` — items uit het Draaiboek (`schedule_items`) waar
`betrokkenen ? 'gasten'` waar is (jsonb `?`-operator: bevat de gast-rol).
Dat filter zit in de RPC zelf (`0010_website_v2.sql:138-150`, uitgebreid met
`eindtijd` in `0033_public_schedule_eindtijd.sql`), niet in de
frontend-component. Wil je bijvoorbeeld ook locatie-coördinaten of een
andere Draaiboek-rol doorgeven aan de publieke site, dan begin je bij deze
RPC-query, niet bij `PublicWebsite.tsx`.

### Cadeaulijst: losse feature, losse route, gedeelde branding

De cadeaulijst is een eigen module (`registry_settings` /
`registry_items` / migraties `0012`, `0017`, `0026`, `0034`) met een eigen
publieke RPC `get_public_registry` en eigen pagina
(`app/trouwen/[slug]/cadeaulijst/page.tsx`). De trouwwebsite-sectie
"Cadeaulijst" toont alleen een doorverwijzing (of, als de registry-feature
uit staat, de vrije tekst uit `website_content.cadeaulijst`). Thema/kleur/
lettertype worden wel gedeeld (de registry-RPC geeft dezelfde
`thema`/`kleur_accent`/`kop_lettertype` terug) zodat de cadeaulijst-pagina
er hetzelfde uitziet als de rest van de site, maar inhoudelijk zijn het twee
gescheiden databases/RPC's — een wijziging in het ene systeem raakt het
andere niet automatisch.

### Rechten

`website` is één van de vaste modules in `lib/bruiloft/permissions.ts`
(`none`/`view`/`edit` per rol: eigenaar/planner/helper/kijker). Dit is
uitsluitend **UX-gating** aan de clientkant (welke knoppen/tabs je ziet);
de echte grens is Row-Level-Security op `website_content` en
`website_fotos` (policies `wf_select/insert/update/delete` in
`0010_website_v2.sql`, gebaseerd op `can_view`/`can_edit` SQL-functies).
De publieke route gebruikt geen van beide — die loopt volledig via de
`security definer`-RPC's, wat betekent dat een bug in die RPC (bijv. het
weglaten van de `website_gepubliceerd`-check) direct een privacylek zou
zijn, ongeacht RLS.

### Bekende aandachtspunten voor vervolgwerk

- **Geen server-side revalidatie/caching-strategie** expliciet ingesteld op
  `app/trouwen/[slug]/page.tsx` — elke request roept de RPC opnieuw aan
  (geen `revalidate`/`fetch cache` config zichtbaar in dit bestand).
- **Orphan files** in de `wedding-media`-bucket bij het vervangen/
  verwijderen van header- of sectie-foto's (zie hierboven) — er is geen
  cleanup-cronjob voor.
- **`PaginaSidebar`/`PreviewPanel`** — dode code of bewust "on hold";
  verifiëren voor je ze aanpast of verwijdert.
- **Geen AI-ondersteuning** op deze feature (in tegenstelling tot bv.
  Takenlijst/Budget) — alle tekst wordt handmatig ingevuld, er is geen
  endpoint onder `app/api/ai/` dat welkomsttekst/FAQ/etc. genereert.
- Nieuwe velden aan `website_content` toevoegen raakt **drie plekken**:
  de migratie/kolom, `lib/bruiloft/types.ts` + `mappers.ts` (voor de
  ingelogde CRUD-kant), én de `get_public_website`-RPC-body (voor de
  publieke kant) — vergeet je de RPC, dan verschijnt het veld nooit op de
  live site ook al staat het correct in de editor.
