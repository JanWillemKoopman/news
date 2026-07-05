# Trouwwebsite 2.0 — Productroadmap

> Vervolg op de featurebeschrijving in [`trouwwebsite.md`](./trouwwebsite.md). Dit document
> beschrijft waar we naartoe bouwen en in welke volgorde. Benchmark: premium aanbieders zoals
> Riley & Grey — designer-kwaliteit websites die stellen écht naar eigen smaak kunnen inrichten.

## Waarom

De huidige trouwwebsite is functioneel maar basaal: één vaste scrollpagina, tien vaste secties
die je alleen aan/uit kunt zetten en kunt herordenen, zes hardgecodeerde templates, en per sectie
slechts uitlijning, achtergrondkleur en een foto. Vergeleken met premium aanbieders voelt dat
beperkt: geen eigen blokken toevoegen, geen meerdere pagina's, geen echte designcontrole, geen
RSVP op de site zelf.

De kern van het probleem is architectureel: **een template is code** (zes losse React-componenten)
en **content zit in vaste kolommen**. Elke nieuwe customisatie-optie vergt daardoor zes keer
template-werk plus een databasekolom plus een RPC-wijziging. Dat plafond halen we weg met twee
architectuurwissels:

1. **Theme-engine** — een thema wordt *data* (design tokens: typografie, volledig kleurenpalet,
   vormentaal, ornamenten, dichtheid) in plaats van code. De zes bestaande templates worden
   presets bovenop één renderer; daarna is elk token individueel door het stel te overriden.
2. **Blokken-model** — pagina's bevatten een geordende lijst vrije blokken
   (`{ id, type, props, layout }`) in plaats van vaste secties. Meerdere instanties van hetzelfde
   type, per blok layoutvarianten, achtergronden en breedtes.

## Richtingskeuzes (vastgesteld)

- Trouwwebsites worden **multi-page** (zoals Riley & Grey), met automatische navigatie.
- **RSVP komt op de website zelf** (gast zoekt zichzelf op); persoonlijke RSVP-links blijven werken.
- **Wachtwoordbescherming** van de hele site en **meertaligheid (NL/EN)** horen bij deze roadmap.
- **Eigen domeinnaam** (janenlisa.nl) is expliciet een láter hoofdstuk, buiten deze roadmap.

---

## Fase 1 — Fundament: theme-engine + blokkenmodel + nieuwe editor

*Doel: de architectuurwissel, zonder functionaliteitsverlies voor bestaande sites.*

- Nieuw datamodel: `theme` (jsonb) op `website_content`; nieuwe tabel `website_pages` met een
  `blocks`-jsonb per pagina; RPC `get_public_website_v2`.
- Eén renderer (`components/website/v2/`): `ThemeStyle` (design tokens → CSS-variabelen),
  `BlockRenderer`, `PublicWebsiteV2`. De zes templates worden theme-presets met visuele
  pariteit (niet pixel-perfect).
- Bloktypes bij start: hero, tekst, tekst+foto, programma (draaiboek-koppeling of vrije tekst),
  aftelling, galerij, FAQ, cadeaulijst-verwijzing, contact, scheiding.
- Nieuwe editor: blokkenlijst + blok-inspector links, **live preview** rechts
  (desktop/mobiel-toggle); theme-paneel met preset-kiezer en overrides.
- Migratiepad: idempotente converter zet bestaande content om naar een Home-pagina met blokken
  bij het openen van de editor; de publieke route probeert v2 en valt terug op het oude pad
  voor niet-geconverteerde sites. **Geen breaking change voor live sites.**

## Fase 2 — Designvrijheid ✅ gebouwd

*Doel: het verschil maken ten opzichte van "invullen" — écht kunnen ontwerpen.*

- Extra bloktypes: citaat/quote, tijdlijn ("ons verhaal"), weddingparty/personen met foto,
  locatie (adres + Google Maps-embed), video-embed (YouTube/Vimeo), foto+tekst met een derde
  positie ("boven").
- Hero-varianten: fullscreen foto, split-layout (foto naast tekst), puur typografisch
  (gigantische type, geen of vervaagde foto).
- Blok-achtergronden met volledige foto + donkerte-overlay (naast de bestaande kopfoto);
  blokbreedtes (smal/breed/volledig, edge-to-edge voor achtergrondfoto's).
- Theme-customizer: volledig palet (achtergrond, kaart, tekst, subtekst, naast accent),
  hoeken/sectiestijl/ornament los instelbaar, uitgebreide fontbibliotheek via `next/font`
  (6 extra: Italiana, Marcellus, Libre Baskerville, Josefin Sans, Bodoni Moda, Parisienne —
  `WeddingLettertype` in `lib/bruiloft/types.ts` uitgebreid, gedeeld met de cadeaulijst-pagina
  die dezelfde CSS-variabelen uit `app/trouwen/layout.tsx` gebruikt).
- Preview in een `<iframe>` (`app/bruiloft/website/components/LivePreview.tsx`): eigen
  document met gekloonde stylesheets + een React-portal, zodat Tailwind-breakpoints
  reageren op de virtuele schermbreedte (1440/390px) i.p.v. de paneelbreedte van de editor —
  ook de mobiel-modus toont nu de echte mobiele layout, niet de desktop-layout verkleind.

## Fase 3 — Gastervaring ✅ gebouwd

*Doel: de website wordt het middelpunt voor gasten, niet alleen een visitekaartje.*

- **Multi-page**: pagina's aanmaken/hernoemen/herordenen/verbergen via
  `app/bruiloft/website/components/PaginaSwitcher.tsx`; publieke route
  `app/trouwen/[slug]/[[...pagina]]/page.tsx` (optionele catch-all — `[]` = home,
  `['pagina-slug']` = subpagina); navigatie in `PublicWebsiteV2.tsx` linkt tussen pagina's
  zodra er meer dan één is (anchor-navigatie binnen één pagina blijft de status quo).
- **RSVP-blok**: gast zoekt zichzelf op (voornaam + achternaam) en bevestigt direct op de
  site, via twee rate-limited routes (`app/api/rsvp/zoek`, `app/api/rsvp/bevestig` — 10
  pogingen/15 min per IP+slug, patroon van `checkRateLimit`) en twee nieuwe
  `security definer`-RPC's (`find_guest_by_name`, `submit_rsvp_by_name`,
  `0051_rsvp_self_lookup.sql`) die nooit een `rsvp_token` naar de browser sturen. Bij 0 of
  >1 gelijknamige matches: neutrale melding (geen enumeratie, geen giswerk). Persoonlijke
  `/rsvp/[token]`-links blijven ongewijzigd naast dit blok bestaan.
- **Site-breed wachtwoord**: een échte server-side grens (niet het sessionStorage-patroon
  van de cadeaulijst) — `website_content.site_password`/`site_password_enabled`
  (`0050_site_password.sql`), een lichte metadata-RPC (`get_trouwwebsite_lock_meta`, alleen
  namen + thema, nooit inhoud) die vóór elke render bepaalt of het wachtwoordscherm
  (`components/website/SiteWachtwoordGate.tsx`) of de echte site getoond wordt, een
  HMAC-ondertekende httpOnly-cookie (`lib/crypto/siteUnlockCookie.ts`, nieuwe env-var
  `SITE_PASSWORD_SECRET`) en een eigen instel-route (`app/api/trouwen/settings`, hashing
  via het bestaande `lib/crypto/password.ts`) zodat het wachtwoord zelf nooit via de
  directe client-upsert loopt.

**Bekende beperking (geaccepteerd, zelfde risicoklasse als de bestaande
`registry_settings.password`):** `website_content` staat in de Supabase Realtime-publicatie;
Postgres/Supabase kennen geen kolom-niveau-uitsluiting voor realtime, dus het gehashte
`site_password` bereikt in theorie ook wedding-teamleden met website-rechten via de
realtime-stream (nooit het publiek, nooit de plaintext). REST-selects zijn wel al expliciet
verengd (`websiteContentKolommen` in `supabaseRepository.ts`) zodat het normale
laad-/opslagpad de hash niet meer meestuurt.

## Fase 4 — Premium afwerking

*Doel: de details die het premium maken.*

- Meertalig NL/EN: per-veld vertalingen met AI-vertaalhulp (bestaande Gemini-infra onder
  `app/api/ai/`).
- AI-schrijfhulp per tekstblok (welkomsttekst, ons verhaal, FAQ-suggesties — put uit
  `lib/bruiloft/aiContext.ts`); kleurenpalet-extractie uit de headerfoto.
- SEO/OG-verfijning per pagina.
- *Later hoofdstuk (buiten deze roadmap): eigen domeinnaam.*

---

## Technische uitgangspunten

- **Blocks als jsonb op `website_pages`** (niet als losse tabel): atomair herordenen, past bij
  het bestaande `secties_config`-patroon. Heroverwegen zodra per-blok realtime of per-blok
  rechten nodig zijn.
- **Dual-path tijdens de overgang**: oude RPC + oude `PublicWebsite.tsx` blijven staan tot alle
  sites geconverteerd zijn; daarna een opruimmigratie voor de legacy-kolommen.
- De **editor-UI** volgt `DESIGN_PHILOSOPHY.md` (rose-accent, één taak per scherm); de
  gerenderde gastensites zelf zijn het product en vallen daar bewust buiten.
- Verificatie per fase: `tsc --noEmit`, `next lint`, handmatige flow op desktop + mobiel;
  Playwright-screenshots optioneel bij grote UI-stappen.
