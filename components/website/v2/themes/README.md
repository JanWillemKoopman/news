# Trouwwebsite-thema's — zes structurele archetypes

Dit document is het ontwerpvoorstel én de levende documentatie voor de zes
thema-renderers. Vóór deze redesign waren de zes thema's alleen
token-presets (kleur, lettertype, hoekradius) op één gedeelde renderer —
waardoor alle sites structureel identiek aanvoelden. Nu is elk thema een
**eigen renderer** met eigen layoutstructuur, eigen componentgedrag en een
eigen bewegingstaal. `theme.preset` bepaalt welke renderer wordt gebruikt;
de tokens (kleuren, lettertype, hoeken, ornament) blijven daarbinnen
individueel aanpasbaar.

**Toets**: haal alle kleur weg en je moet nog steeds direct zien welk thema
het is — puur op layout en componentvorm.

## Architectuur

```
components/website/v2/
  PublicWebsiteV2.tsx   ← orkestrator: data, zichtbaarheid, nav-items,
                          nummering; kiest de renderer via theme.preset
  themes/
    types.ts            ← ThemeRenderer-contract (Nav/Hero/Section/Content/Footer)
    shared.tsx          ← headless logica: countdown-tik, RSVP-flow (zelfde
                          API-contract), reveal-on-scroll, video-embed,
                          blok-layout-overrides, lightbox
    atelier.tsx         ← klassiek      → "The Atelier"
    editor.tsx          ← modern        → "The Editor"
    jardin.tsx          ← romantisch    → "Le Jardin"
    landgoed.tsx        ← rustiek       → "Het Landgoed"
    studio.tsx          ← minimalistisch→ "Studio"
    tuin.tsx            ← botanisch     → "De Tuin"
```

Elke renderer implementeert **alle** bloktypes (hero ×3 varianten, tekst,
tekst+foto, citaat, tijdlijn, bruidsgevolg, locatie, video, rsvp,
programma, countdown, galerij, faq, cadeaulijst, contact, scheiding) plus
navigatie en een afsluitende footer. De modulaire builder laat blokken in
elke volgorde combineren; secties gebruiken daarom een vast verticaal
ritme per thema en pariteit-gebaseerde achtergrondwisselingen (op
bloknummer, niet op bloktype), zodat elke volgorde klopt.

Gedeelde regels voor álle thema's:

- **Mobile-first**: elk raster/split-screen stapelt onder 768px naar één
  nette kolom; getest op 390px.
- **Touch targets**: RSVP-knoppen en inputs zijn minimaal 48px hoog.
- **Blok-instellingen** (uitlijning, breedte, eigen achtergrondkleur/-foto,
  kopfoto, tekstkleur) worden overal gerespecteerd via `shared.tsx`.
- **`prefers-reduced-motion`** wordt app-breed al afgevangen
  (globals.css); alle animatie eindigt bovendien in de zichtbare
  eindtoestand.
- **RSVP-API-contract** (`/api/rsvp/zoek`, `/api/rsvp/bevestig`) staat in
  één plek (`useRsvpFormulier` in shared.tsx) — thema's leveren alleen
  markup.
- De **editor-preview** (iframe) toont reveals direct (het hele document
  is daar "in beeld") en opent geen lightbox.

## De zes archetypes

### 1. The Atelier (`klassiek`) — de gedrukte uitnodiging
Letterpress-trouwkaart als website. Alles gecentreerd en **ingelijst**:
een dubbele haarlijn-passe-partout om de hero, monogram-medaillon met
initialen, kickers in gespatieerde kleinkapitalen.
- **Hero**: lijst-in-lijst kader, medaillon, namen groot, datum in
  kleinkapitaal met ornamentpunten.
- **Countdown**: klokkolommen gescheiden door verticale haarlijnen.
- **Tijdlijn**: centrale ruggengraat-lijn, om-en-om links/rechts op
  desktop (mobiel één kolom), ruitvormige knopen.
- **RSVP**: antwoordkaartje — onderstreepte invoervelden (geen boxen),
  omrande kleinkapitaal-knop.
- **Galerij**: symmetrisch raster met passe-partout (witte mat + haarlijn).
- **Programma**: menukaart — gecentreerd, ornamenten tussen de gangen.
- **Personen**: ovale portretten.
- **Beweging**: statig — 900–1100ms, `cubic-bezier(.23,.9,.32,1)`, zachte
  opkomst + lijnen die zich uittekenen; knoppen vullen langzaam met inkt.

### 2. The Editor (`modern`) — het magazine
Editorial print. Links uitgelijnd, asymmetrisch, **genummerde katernen**
(`Nº 01`), dikke regels boven secties, marquee-strip in de hero.
- **Hero**: typografische masthead — gestapelde namen op volle breedte,
  byline-regel (datum · plaats), scrollende marquee; fotovariant legt de
  kop óver een verschoven foto.
- **Countdown**: enorme tabellaire cijfers op een basislijn, cijfers
  wisselen met een snap-animatie.
- **Tijdlijn**: krantenkolommen — datum links, verhaal rechts, haarlijnen.
- **RSVP**: abonnementsformulier — micro-labels in kapitalen, onderstreepte
  velden, zwarte knop over de volle breedte met pijl; hover inverteert
  direct.
- **Galerij**: gebroken redactioneel raster met `Fig. 01`-bijschriften;
  foto's zwart-wit die op hover **direct** in kleur springen.
- **Personen**: contactvel — vierkante portretten, namen in kapitalen.
- **Beweging**: snappy — 140–220ms, `cubic-bezier(.16,1,.3,1)`,
  verschuivende blokschaduwen op hover, marquee, geen fades langer dan
  250ms.

### 3. Le Jardin (`romantisch`) — de liefdesbrief
Dromerige tuinkamer. **Boogvormen** overal (rondgetopte foto's), zachte
blush-vlakken die per sectie afwisselen, script-accenten, pill-vormen.
- **Hero**: boogfoto in het midden, namen in script die de boog overlappen,
  datum in een pill.
- **Countdown**: zachte cirkels; de secondencirkel "ademt".
- **Tijdlijn**: gestippelde middenlijn met hartknopen, afgeronde kaarten.
- **RSVP**: briefkaart met ronde velden (rounded-full) en een bloeiende
  focus-ring.
- **Galerij**: boog-masonry met trage zoom op hover.
- **Personen**: cirkelportretten met zachte ring.
- **Beweging**: dromerig — 900–1200ms ease-in-out, blur-naar-scherp
  reveals, zwevende ornamenten (6s), focus-states die langzaam opbloeien.

### 4. Het Landgoed (`rustiek`) — het veldjournaal
Warm, geaard, tactiel: linnen texturen, **postzegel/stempel**-motieven,
polaroids, gestikte randen.
- **Hero**: split met linnen tekstpaneel en een schuin gestempelde
  datumbadge.
- **Countdown**: scheurkaartjes — stubs met perforatie-streepjes.
- **Tijdlijn**: journaalpagina — datums in de kantlijn naast een
  marge-lijn, notities rechts.
- **RSVP**: antwoordbriefkaart — gestreepte rand, postzegelvak rechtsboven.
- **Galerij**: polaroids met dikke onderrand en om-en-om lichte rotatie.
- **Personen**: polaroid-portretten.
- **Beweging**: geaard — 420–520ms ease-out, alles schuift subtiel vanaf
  links binnen (als aantekeningen in een journaal), warme lift op hover.

### 5. Studio (`minimalistisch`) — de galeriecatalogus
Radicale typografische terughoudendheid: museumcatalogus. Enorme
witruimte, kleine metatekst, strikte linkse uitlijning, **indexnummers**,
nooit een afgeronde hoek, nooit een kader.
- **Hero**: bijna leeg vel — "Het huwelijk van" klein linksboven, namen
  gigantisch onderaan links, datum rechtsonder.
- **Countdown**: geen widget maar een **zin**: "Nog 142 dagen, 6 uur en
  23 minuten." in grote lichte letters.
- **Tijdlijn**: jaartal groot, tekst klein — louter typografie, geen lijn.
- **RSVP**: labels boven haarlijn-velden; verzenden is een tekstlink met
  groeiende onderstreping (48px raakvlak).
- **Galerij**: één kolom, groot, met indexnummers (01 / 12).
- **FAQ**: geen accordeon — vraag links, antwoord rechts, alles zichtbaar.
- **Beweging**: vrijwel geen — één precisie-fade van 350ms lineair;
  terughoudendheid ís de identiteit.

### 6. De Tuin (`botanisch`) — de serre
Weelderige kas: **bladvormen** (asymmetrische border-radius), rankende
SVG-takken als sectieornamenten, organische asymmetrie.
- **Hero**: foto in bladmask naast de namen, taklijnen in de hoeken.
- **Countdown**: bladvormige tegels die met een vering "opgroeien".
- **Tijdlijn**: slingerende stengel met bladknopen, entries takken af.
- **RSVP**: tuinfeest-kaart met takornament; focus laat een groene
  onderlijn van links "groeien".
- **Galerij**: organisch metselwerk met om-en-om bladhoeken.
- **Personen**: bladgesneden portretten (wisselende richting).
- **Beweging**: organische groei — 550–700ms met veer-easing
  `cubic-bezier(.34,1.56,.64,1)`, schaal 94%→100%, wiegende bladeren.

## Roadmap-notities

- De zes renderers worden statisch gebundeld (de editor-preview wisselt
  presets zonder flits); als de bundelgrootte gaat knellen kan per preset
  worden ge-code-split zodra de preview een laadtoestand krijgt.
- De legacy v1-renderer (`components/website/PublicWebsite.tsx`) is
  bewust ongemoeid: v2 heeft voorrang zodra een site naar blokken is
  geconverteerd.
