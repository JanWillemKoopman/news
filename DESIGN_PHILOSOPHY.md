# Design Filosofie — Wedding Planner

Dit is de leidende designfilosofie voor deze app. Elke UI-wijziging — nieuwe
feature, refactor, of losse bugfix met visuele impact — wordt hieraan
getoetst. Bij twijfel tussen "meer functionaliteit" en "eenvoud", wint
eenvoud aan de oppervlakte; de functionaliteit hoort één klik dieper te
zitten, niet op het eerste scherm.

## Kernprincipe: "Progressive Simplicity"

Complexiteit mag bestaan in de app — nooit in het scherm. Elke pagina toont
maar één laag diepte tegelijk: het overzicht is altijd stupid simpel, de
functionaliteit zit één klik dieper, nooit ervoor.

### 1. Één taak per scherm, één blik per beslissing
De gebruiker moet nooit hoeven na te denken over *waar* iets staat of *wat*
belangrijk is. Elk scherm beantwoordt precies één vraag ("hoe sta ik ervoor
met budget?", "wat moet ik deze week doen?"). Alles wat die vraag niet
direct dient, verdwijnt achter een klik, een accordion, of een tweede
scherm. Rijkdom aan features uit zich in diepte, niet in breedte op het
eerste scherm.

### 2. Eén kleur met betekenis, de rest is rust
Kleur is een signaal, geen decoratie. De basis is neutraal (wit, grijs,
foreground/muted) — praktisch alles wordt in die schaal getoond. Er is
precies één accentkleur (rose) die één ding betekent: "dit vraagt nu je
aandacht." Zodra kleur overal wordt ingezet, betekent kleur nergens meer
iets. Status-systemen met groen/amber/blauw/rood naast elkaar worden
vermeden; status wordt uitgedrukt in tekst en typografie, niet in een
regenboog aan badges.

### 3. Tekst boven badges, zinnen boven opsommingen
Waar mogelijk vertelt de app één samenhangende zin in plaats van drie losse
UI-elementen die hetzelfde zeggen (een badge, een progressbalk-bijschrift,
én een status-tekst). Minder elementen die met elkaar wedijveren om
aandacht = minder cognitieve belasting, ook al is de onderliggende data even
rijk.

### 4. Witruimte is functioneel, niet decoratief
Ruimte tussen elementen is het instrument waarmee we hiërarchie
communiceren — niet lijnen, niet kleur, niet vet. Als twee dingen bij elkaar
horen, staan ze dicht bij elkaar; als ze niet bij elkaar horen, staat er
ruimte of een dunne lijn tussen. Genereuze marges zijn wat een interface
"premium" laat aanvoelen — krapte voelt altijd goedkoop.

### 5. Elke feature heeft een "AI-laag" en een "mens-laag"
Veel functionaliteit betekent veel outputs (adviezen, benchmarks, taken). AI
vertaalt ruwe data naar één samenvattende zin en een korte lijst concrete
acties — nooit naar een muur van analyse. De gebruiker leest een verhaal,
geen rapport. Wie dieper wil, klikt door; wie snel wil weten "sta ik oke?",
leest één regel.

### 6. Consistentie is de enige manier om schaalbaar simpel te blijven
Elk patroon (kaart, statusregel, actieknop, header, lege staat) wordt
letterlijk hergebruikt op elke pagina. Een nieuwe feature introduceert nooit
een nieuw visueel idioom — hij hergebruikt een bestaand patroon, of stelt
een aanpassing van dat patroon voor die dan overal wordt doorgevoerd. Zo
blijft de app, ook met tientallen features, herkenbaar en voorspelbaar: wat
je op de budgetpagina leert, werkt ook op de takenpagina.

### 7. Elke interactie bevestigt zichzelf
Niets verandert zonder dat de gebruiker het ziet: subtiele overgangen,
duidelijke hover/focus-states, en directe feedback (toast, checkmark) bij
elke actie. Vertrouwen ontstaat uit voorspelbaarheid, niet uit verrassingen
— en vertrouwen is wat "premium" onderscheidt van "goedkoop".

## Praktische toetsingsregels

Gebruik deze vragen bij elke UI-beslissing:

1. **Kleur**: gebruik ik hier een kleur die al ergens anders in de app iets
   anders betekent? Is dit element echt "vraagt aandacht" (rose), of kan het
   gewoon neutraal grijs?
2. **Aantal elementen**: staan hier twee of meer UI-elementen die dezelfde
   informatie op een andere manier herhalen? Kan dat samengevoegd worden tot
   één zin of één element?
3. **Patroonhergebruik**: bestaat er al een vergelijkbaar patroon elders in
   de app (kaart, header, statusregel, lege staat)? Gebruik dat patroon,
   introduceer geen nieuw idioom voor hetzelfde probleem.
4. **Aantal knoppen/acties in een header of toolbar**: is er precies één
   primaire actie? Alles daarnaast hoort achter een "meer"-knop
   (`OverflowMenu`), niet als losse knop ernaast.
5. **Witruimte**: voelt dit cramped? Zo ja, eerst meer ruimte proberen voor
   een oplossing wordt gezocht in kleur, randen of decoratie.
6. **Mobiel eerst**: is dit getest op een smal scherm? Knoppen/kaarten die
   op desktop naast elkaar passen mogen op mobiel nooit wrappen naar een
   rommelige tweede regel — verplaats naar een meer-menu i.p.v. laten
   wrappen.

## Referentie-implementaties

Voor principe #6 (hergebruik patronen): dit zijn de canonieke bestanden per
patroon. Nieuwe features passen deze toe of breiden ze uit — vind niet
opnieuw uit.

| Patroon | Bestand |
|---|---|
| Kaart (basisbouwsteen) | `components/bruiloft/ui/Card.tsx` |
| Statuslabel (rose = aandacht, verder neutraal) | `components/bruiloft/ui/StatusBadge.tsx` |
| Paginaheader (primaire actie + meer-menu + info) | `components/bruiloft/PageHeader.tsx` |
| "Meer"-menu voor secundaire acties | `components/bruiloft/ui/OverflowMenu.tsx` |
| Lege staat | `components/bruiloft/ui/EmptyState.tsx` |
| Toast/directe feedback na een actie | `components/bruiloft/ui/Toast.tsx` |
| Statusregel die tekst + voortgang combineert i.p.v. losse badges | `components/bruiloft/budget/BudgetList.tsx` (`CategorieRij`) |
| AI-laag: verhalende samenvatting i.p.v. opsomming | `components/bruiloft/budget/AIBudgetAdvies.tsx` |
| AI-laag: contextueel, per-sectie advieskaartje | `components/bruiloft/ai/AIInsightCard.tsx` |

## In één zin

*Stupid simpel aan de oppervlakte, onbeperkt rijk één klik dieper, en
overal hetzelfde rustige, kleurbewuste visuele idioom — zodat meer
functionaliteit de app nooit ingewikkelder laat aanvoelen, alleen
waardevoller.*
