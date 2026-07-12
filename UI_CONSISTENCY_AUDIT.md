# UI-consistentie-audit — knoppen, zoekbalken, filters, invoervelden, fonts

Datum: 2026-07-09 · Getoetst aan `DESIGN_PHILOSOPHY.md` (één accentkleur,
patroonhergebruik, hover/focus-states op elk interactief element).

Elke bevinding hieronder heeft een nummer; de nummers vormen samen de
uitvoeringslijst voor de volgende stap. Volgorde binnen elk blok = aanbevolen
prioriteit.

---

## A. Kleur- en token-fundament (eerst doen — alles hieronder bouwt hierop)

### 1. Drie nét verschillende definities van "rose/primary"
- `tailwind.config.ts` → `rose-600` = `#ad5173` ≈ hsl(338 36% 50%)
- `app/globals.css` `.wedding` → `--primary: 338 33% 49%` (≈ `#a75573`)
- `app/globals.css` `:root` → `--primary: 339 39% 50%` (en `--ring: 339 39% 50%`)

Componenten gebruiken ze door elkaar voor hetzelfde doel:
`Button`/`FloatingAddButton` → `bg-rose-600`, `FilterKnop`/filterbadges →
`bg-primary`, "Wis filters"-links → `text-rose-600`. Visueel drie subtiel
verschillende rozes voor één betekenis.

**Actie:** één bron kiezen. Zet `--primary` (in `:root` én `.wedding`) exact op
rose-600 en gebruik in componenten consequent de token:

```css
--primary: 338 36% 50%;        /* = rose-600 #ad5173 */
--primary-hover: 337 43% 60%;  /* = rose-500 #c46f8a */
```

Daarna in code: `bg-rose-600` → `bg-primary`, `hover:bg-rose-500` →
`hover:bg-primary-hover`, `text-rose-600/700` (interactief) → `text-primary`.
De letterlijke `rose-*`-schaal blijft alleen voor tinten die de token niet
dekt (`bg-rose-500/10`, `border-rose-300`).

### 2. `text-2xl` is globaal geherdefinieerd naar 1rem (16px)
`tailwind.config.ts:12-14`: `fontSize: { '2xl': '1rem' }`. Daardoor is
`text-2xl` (16px) kléiner dan `text-xl` (20px). Concreet stuk:
`app/bruiloft/page.tsx:59` gebruikt `text-xl sm:text-2xl md:text-3xl` — de
tekst **krimpt** op de sm-breakpoint. 32 bestanden gebruiken `text-2xl`
(stat-getallen op tafels-, website-, account-pagina's) en krijgen stilzwijgend
16px i.p.v. de verwachte 24px.

**Actie:** override verwijderen; de weinige plekken die bewust 16px wilden op
`text-base` zetten. Daarna de 32 `text-2xl`-plekken visueel nalopen (worden
groter — meestal juist de bedoeling van de auteur).

### 3. Dode `dark:`-klassen terwijl het thema licht-only is
`globals.css` zegt expliciet: één licht thema, geen dark-mode. Toch staan er
`dark:`-varianten in o.a. `StatusBadge.tsx:13-14`, `BudgetSummary.tsx:127-128`,
`BulkImportDialog.tsx:408,450`, `FloorPlan.tsx:696`, `DropdownFilter.tsx:57,92`.
Met `darkMode: ['class']` gaan die onbedoeld "aan" zodra ergens een
`.dark`-class verschijnt.

**Actie:** alle `dark:`-klassen binnen `app/bruiloft` + `components/bruiloft`
verwijderen (de publieke website-thema's onder `components/website` uitgezonderd).

### 4. Groen/amber-statuskleuren buiten de afgesproken uitzondering
De filosofie staat één uitzondering toe: de `success`-tone van `StatusBadge`
(emerald-tint). Daarbuiten leven eigen groen/amber-systemen:
- `cadeaulijst/RegistryOverzicht.tsx:80-82,199-200` — groene totaalkaart + amber "in behandeling"
- `budget/BudgetSummary.tsx:127-153` — amber/groen gekleurde bedragen
- `WeddingCreate.tsx:275-276,432` — groene succesbanner en groene badge
- `gasten/BulkImportDialog.tsx:408,450` — amber waarschuwingsbox + amber badge
- `cadeaulijst/RegistryDeelModal.tsx:48,64,71` — amber banner, groene copy-check
- `taken/SubtakenList.tsx:71,137` — emerald checkboxen
- `taken/AvatarStack.tsx:11-12` — amber/emerald avatarkleuren
- `tafels/FloorPlan.tsx:642-696` — emerald drag-states
- `leveranciers/DropdownFilter.tsx:57,92` — emerald vinkjes
- `ui/Toast.tsx:81-84` — success = emerald, error = `text-red-600` (i.p.v. `destructive`-token)
- auth-formulieren (`LoginForm.tsx:78`, `SignupPageForm`, `ForgotPasswordForm`) — groene/rode meldingsboxen

Bovendien wisselt zelfs de "toegestane" groentint: `green-600/700/800` op de
ene plek, `emerald-500/600/700` op de andere.

**Actie:** per plek beslissen: neutraal grijs (meestal), rose ("vraagt
aandacht"), of de bestaande StatusBadge-success-tone. Waar groen bewust
blijft (bv. copy-bevestiging): overal dezelfde emerald-tint als
`StatusBadge` (`emerald-*`), nooit `green-*`. Toast-error op
`text-destructive` zetten.

---

## B. Knoppen

### 5. Twee Button-componenten; één is dood
`components/ui/button.tsx` en `components/ui/badge.tsx` (shadcn-varianten)
worden **nergens** geïmporteerd; het canonieke `components/bruiloft/ui/Button.tsx`
is de echte. Dode dubbelgangers nodigen uit tot verkeerde imports.

**Actie:** `components/ui/button.tsx` en `components/ui/badge.tsx` verwijderen.

### 6. Handgebouwde outline-knoppen naast `Button variant="outline"` — twee idiomen
De toolbars bouwen hun eigen outline-knop: `rounded-lg border-input
hover:bg-muted` (o.a. `BudgetList.tsx:197-206` "Uitklappen",
`TakenFilters.tsx:127-144`, `GastenFilters.tsx:125-142`,
`MijnLijstFilters.tsx:53-70`, `DropdownFilter.tsx:44-68`). `Button
variant="outline"` gebruikt `rounded-md` + `hover:bg-accent` (roze-vleug).
Resultaat: twee hoekradii (6px vs 4px — zie #7) én twee hoverkleuren voor
"dezelfde" knop.

**Actie:** één keuze maken (advies: `hover:bg-muted`, neutraal, past bij
filosofie "kleur alleen als signaal") en in `Button` vastleggen; toolbars
stapsgewijs naar `<Button variant="outline">` migreren (of naar de nieuwe
`FilterDropdown`, zie #12).

### 7. Radius klopt niet met de bedoeling
In `.wedding` is `--radius: 0.375rem` → `rounded-lg` = 6px, `rounded-md` =
4px. Het commentaar in `Button.tsx:9` claimt "rounded-md (6px)", maar de knop
rendert 4px; de handgemaakte toolbarknoppen (`rounded-lg`) renderen wél 6px.
`Card` gebruikt daarnaast het niet-getokeniseerde `rounded-xl` (12px) en
`Modal` `rounded-2xl` (16px).

**Actie:** beslissen wat "knopradius" is (advies: 6px, conform Riley & Grey)
en `Button`/`Input`/`Select` op dezelfde radius-token zetten als de toolbars.
Simpelste route: `--radius: 0.5rem` zodat `rounded-md` = 6px, óf overal in
knopcomponenten `rounded-lg` gebruiken. Card/Modal mogen groter blijven, maar
leg dat vast (bv. kaart = `rounded-xl`, sheet = `rounded-2xl`) i.p.v. per
component te kiezen.

### 8. Auth-formulieren hebben een eigen primaire knop
`components/auth/LoginForm.tsx:122` (en Signup/Reset/Forgot-varianten):
handgeschreven `bg-primary font-medium hover:bg-primary/90`, zonder de
loading-spinner, hover-scale en focusring van `Button` (`font-semibold`,
`hover:bg-rose-500 hover:scale-[1.02]`). Twee primaire-knop-identiteiten in
één product.

**Actie:** auth-formulieren op `<Button loading={pending}>` zetten (het
`loading`-prop bestaat al precies hiervoor).

### 9. Icon-knoppen zonder focus-state
De losse `<button>`-elementen (±173 stuks in de bruiloft-app) missen vrijwel
allemaal `focus-visible`-styling: alle X-wisknoppen in zoekbalken,
`FilterKnop`, `ColumnToggle`, de view-switcher, `DropdownFilter`,
Toast-sluitknop. Strijdig met de basisregel "elk interactief element heeft
hover/focus/disabled-states".

**Actie:** één focus-idioom afspreken (advies: dat van `Button`:
`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`)
en meenemen in de gedeelde componenten uit #11/#12 — dan lost het gros
vanzelf op.

---

## C. Zoekbalken

### 10. Eén zoekbalk wijkt af (budget) en het patroon is 7× gekopieerd
Zeven zoekbalken delen hetzelfde recept (relative wrapper + `Search`-icoon +
`pl-9`): `TakenFilters.tsx:77-93`, `GastenFilters.tsx:86-103`,
`DraaiboekControls.tsx:25-42`, `app/bruiloft/leveranciers/page.tsx:214-222`,
`tafels/FloorPlan.tsx:526-534`, `ontdekken/FilterKolom.tsx:47-56`,
`budget/BudgetList.tsx:178-195`. De budget-variant is een rauwe `<input>` met
afwijkende stijl: `rounded-lg` i.p.v. `rounded-md`, `focus:` i.p.v.
`focus-visible:`, geen `placeholder:text-muted-foreground`.

**Actie:** gedeeld `SearchInput`-component in `components/bruiloft/ui/`:

```tsx
// components/bruiloft/ui/SearchInput.tsx
interface SearchInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange'> {
  value: string
  onValueChange: (v: string) => void
  wisLabel?: string // aria-label van de X-knop
}

export function SearchInput({ value, onValueChange, wisLabel = 'Zoekopdracht wissen', className, ...props }: SearchInputProps) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => onValueChange(e.target.value)} className={cn('pl-9 pr-9', className)} {...props} />
      {value && (
        <button type="button" aria-label={wisLabel} onClick={() => onValueChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
```

Alle zeven plekken hierop overzetten (FloorPlan met `className="h-8 text-sm"`).

### 11. Kleine verschillen tussen de zoekbalken
- **Placeholder-tekst:** mix van drie punten (`"Zoek in taken..."`,
  `"Zoek categorie..."`, `"Zoek in draaiboek..."`) en het echte
  beletselteken (`"Zoek leverancier…"`, `"Zoek op naam…"`, `"Zoek gast…"`).
- **Wisknop (X):** aanwezig bij taken/gasten/draaiboek/budget, ontbreekt bij
  leveranciers en tafels; aria-label ontbreekt in `TakenFilters` en
  `BudgetList`, en waar hij wél bestaat verschilt de tekst
  ("Zoekopdracht wissen" vs "Zoekveld wissen").
- **aria-label op het veld:** leveranciers/tafels wel, de rest niet.

**Actie:** conventie vastleggen (echte `…`; wisknop altijd; label
"Zoekopdracht wissen") — komt gratis mee met `SearchInput` uit #10.

---

## D. Filters

### 12. `FilterKnop` is letterlijk gedupliceerd en er bestaan drie dropdown-filteridiomen
- `TakenFilters.tsx:278-344` en `GastenFilters.tsx:208-274` bevatten een
  **identieke** ~70-regels `FilterKnop` (actieve staat:
  `border-primary/60 bg-primary/10 text-primary`).
- `leveranciers/DropdownFilter.tsx` is functioneel hetzelfde maar met andere
  actieve staat (`border-foreground/20 bg-muted`) en een count-badge
  (`bg-foreground text-background`).
- `budget/BudgetList.tsx:207-259` bouwt datzelfde dropdown-filter nogmaals
  inline, in de DropdownFilter-stijl.

Drie visuele antwoorden op dezelfde vraag ("filter met dropdown"), waarvan
twee met tegengestelde actief-kleuren (roze vs grijs).

**Actie:** één `FilterDropdown` in `components/bruiloft/ui/` (props: opties,
waarde, optioneel count per optie, optioneel vinkje). Kies één actieve staat —
advies: de neutrale grijze (`bg-muted`), want een gekozen filter "vraagt geen
aandacht" in de zin van de rose-regel; het aantal-badge communiceert de
actieve toestand al. TakenFilters, GastenFilters, DropdownFilter en BudgetList
erop overzetten en de duplicaten verwijderen.

### 13. Het mobiele filterpaneel is 3× gekopieerd en 1× anders opgelost
`TakenFilters.tsx:126-232`, `GastenFilters.tsx:124-201` en
`MijnLijstFilters.tsx` herhalen hetzelfde blok (SlidersHorizontal-knop +
telbadge + verankerd paneel met `Select`-velden); `ontdekken/FilterKolom.tsx`
gebruikt voor precies dezelfde situatie een `Modal`.

**Actie:** één `FilterPanel`-component (knop + paneel, children = velden) en
één keuze voor mobiel (verankerd paneel óf Modal/bottomsheet — advies:
bottomsheet via de bestaande `Modal`, die heeft al het sheet-gedrag en
focus-management).

### 14. Outside-click-logica 6× gedupliceerd, met een gedragsverschil
Dezelfde `useEffect` + `ref` + document-listener staat in TakenFilters (2×),
GastenFilters (2×), MijnLijstFilters, DropdownFilter en BudgetList — vijf op
`mousedown`, GastenFilters op `pointerdown`.

**Actie:** verdwijnt vanzelf als #12/#13 op Radix Popover/DropdownMenu worden
gebouwd (zoals `OverflowMenu` al doet — patroonhergebruik!). Zo niet: één
`useOutsideClick`-hook in `lib/`.

### 15. "Wis filters" gebruikt de accentkleur voor een neutrale actie
`text-rose-600 hover:text-rose-700` op een opruim-actie
(`TakenFilters.tsx:117`, `GastenFilters.tsx:115,152`,
`MijnLijstFilters.tsx:80`) — rose betekent "vraagt aandacht", dit is een
secundaire actie. Bovendien wisselt het X-icoon van maat (h-3 vs h-4).

**Actie:** `text-muted-foreground hover:text-foreground` + vaste iconmaat;
onderdeel maken van `FilterPanel` (#13).

### 16. View-switcher dupliceert het ColumnToggle-idioom
`TakenFilters.tsx:243-270` (Lijst/Kalender) is een handmatige kopie van de
classes van `ui/ColumnToggle.tsx` (zelfde `rounded-lg border p-1` +
`bg-muted-foreground/80`-actieve pill).

**Actie:** `ColumnToggle` generaliseren tot `SegmentedControl` (icon + label
per optie) en beide erop laten draaien.

---

## E. Invoervelden

### 17. Checkboxen: drie verschijningsvormen
- `FilterKolom.tsx:60-65`: native checkbox met `accent-primary`
- `SubtakenList.tsx:71,137`: zelfgebouwde ronde checkbox in **emerald**
- overige formulieren: browser-default

**Actie:** één `Checkbox`-component (advies: native input + `accent-primary`,
klein en zonder JS); SubtakenList-groen vervangt door primary of neutraal
(zie #4).

### 18. `DateRoller` gebruikt rauwe `<select>`-elementen
`taken/DateRoller.tsx:52-74` stylet drie selects handmatig, terwijl
`bruiloft/ui`-`Select` bestaat. Elders (gasten-pagina) is juist een custom
dropdown gebouwd "omdat iOS Safari de tekst niet…" — twee work-arounds naast
elkaar voor hetzelfde element.

**Actie:** DateRoller op `Select` zetten; als de iOS-reden zwaarder weegt, dat
patroon dan óók als gedeeld component vastleggen.

### 19. Twee focus-idiomen: outline vs ring
`Button` gebruikt `focus-visible:outline-2 outline-offset-2`; `Input`/`Select`
gebruiken `focus-visible:ring-2 ring-offset-2`. Functioneel gelijkwaardig,
maar de ringdikte/kleurbron verschilt subtiel (`outline-rose-600` vs
`ring-ring`, en `--ring` wijkt af van `--primary`, zie #1).

**Actie:** na #1 is `ring`=`primary`; dan is dit acceptabel. Wil je één
idioom: kies ring (werkt beter met radius) en pas `Button` aan.

---

## F. Typografie & fonts

### 20. `font-sans` verwijst naar een fontnaam die niet bestaat
`tailwind.config.ts:16`: `sans: ['Inter', ...]`, maar `next/font` genereert
een gehashte familienaam; Inter werkt nu alleen doordat `inter.className` op
`<body>` staat (`app/layout.tsx:7`). Elk toekomstig expliciet
`font-sans`-gebruik valt stil terug op system-ui.

**Actie:** Inter met CSS-variabele laden, zoals bij serif al gebeurt:

```tsx
// app/layout.tsx
const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
// <body className={`${inter.variable} font-sans`}>
```
```ts
// tailwind.config.ts
sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
```

### 21. Cormorant Garamond wordt op 5 plekken apart geconfigureerd
`app/bruiloft/layout.tsx`, `app/(auth)/layout.tsx`, `app/(signup)/layout.tsx`,
`app/not-found.tsx`, `app/uitnodiging/[token]/page.tsx` — nu identiek
(zelfde weights/variable), maar vijf kopieën drijven onvermijdelijk uiteen.

**Actie:** één `lib/fonts.ts` die `inter` en `cormorant` exporteert; layouts
importeren daaruit.

---

## G. Genummerde uitvoeringslijst (volgorde van doorvoeren)

1. **Tokens gelijktrekken**: `--primary`/`--ring` in `:root` en `.wedding` exact op rose-600 zetten; daarna `bg-rose-600`→`bg-primary` e.d. in componenten. *(#1)*
2. **`fontSize: { '2xl': '1rem' }` verwijderen** uit `tailwind.config.ts` en de 32 `text-2xl`-plekken nalopen. *(#2)*
3. **Inter via `--font-sans`** laden + tailwind erop wijzen; fonts centraliseren in `lib/fonts.ts`. *(#20, #21)*
4. **Dode componenten verwijderen**: `components/ui/button.tsx`, `components/ui/badge.tsx`. *(#5)*
5. **`dark:`-klassen strippen** uit de bruiloft-app. *(#3)*
6. **`SearchInput`-component** bouwen en de 7 zoekbalken migreren (incl. placeholder-/wisknop-conventie). *(#10, #11)*
7. **`FilterDropdown`-component** bouwen (één actieve staat) en TakenFilters, GastenFilters, DropdownFilter en BudgetList migreren; gedupliceerde `FilterKnop` verwijderen. *(#12)*
8. **`FilterPanel` (mobiel)** als gedeeld component; MijnLijstFilters/FilterKolom aansluiten; "Wis filters" neutraal grijs. *(#13, #14, #15)*
9. **`SegmentedControl`** uit ColumnToggle generaliseren; view-switcher taken erop. *(#16)*
10. **Radiusbeleid vastleggen** (knop = 6px) en `Button`/`Input`/`Select`/toolbars op dezelfde token. *(#6, #7)*
11. **Auth-formulieren op `<Button loading>`** zetten. *(#8)*
12. **Focus-visible-idioom** doorvoeren op alle losse icon-knoppen (grotendeels gratis via 6-9). *(#9, #19)*
13. **Groen/amber saneren** per component (RegistryOverzicht, BudgetSummary, WeddingCreate, BulkImportDialog, RegistryDeelModal, SubtakenList, AvatarStack, FloorPlan, DropdownFilter, Toast, auth-meldingen): neutraal, rose, of de StatusBadge-emerald — nooit `green-*`. *(#4)*
14. **`Checkbox`-component** + DateRoller op `Select`. *(#17, #18)*

Punten 1–5 zijn kleine, veilige refactors met groot bereik; 6–9 zijn de
component-consolidaties; 10–14 zijn de visuele opschoning die daarna nog
overblijft.
