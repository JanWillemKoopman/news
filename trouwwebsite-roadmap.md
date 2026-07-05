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

## Fase 2 — Designvrijheid

*Doel: het verschil maken ten opzichte van "invullen" — écht kunnen ontwerpen.*

- Extra bloktypes: citaat/quote, tijdlijn ("ons verhaal"), weddingparty/personen met foto,
  kaart/locatie, video-embed, meerdere foto+tekst-varianten.
- Hero-varianten: fullscreen foto, split-layout, puur typografisch.
- Blok-achtergronden met foto + overlay; blokbreedtes (smal/breed/volledig).
- Theme-customizer: volledig palet (achtergrond, kaart, tekst, gedempt, accent), uitgebreide
  fontbibliotheek via `next/font`, ornament-sets (klassiek, botanisch, minimaal, geen).

## Fase 3 — Gastervaring

*Doel: de website wordt het middelpunt voor gasten, niet alleen een visitekaartje.*

- Multi-page: pagina's aanmaken/hernoemen/herordenen; automatische navigatie;
  route `/trouwen/[slug]/[pagina]`.
- RSVP-blok: gast zoekt zichzelf op (naam of code) en bevestigt direct op de site —
  rate-limited via de bestaande `rate_limits`-infra; persoonlijke links blijven bestaan.
- Site-breed wachtwoord: server-side gate + cookie, naar het patroon van
  `app/api/registry/check-password`.

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
