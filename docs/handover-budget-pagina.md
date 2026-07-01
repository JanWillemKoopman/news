# Handover: /bruiloft/budget

**Doel van dit document**: overdracht van de huidige status van de budgetpagina aan een externe expert die deze pagina gaat optimaliseren. Dit document is bedoeld voor de nieuwe eigenaar, de softwareontwikelaar én de UX-expert, en beschrijft wat er nu bestaat, hoe het werkt, en waar de bekende beperkingen zitten.

---

## 1. Overzicht

De budgetpagina (`/bruiloft/budget`) is het onderdeel van de Wedding Planner app waarmee bruidsparen hun totale trouwbudget verdelen over categorieën, kosten bijhouden (geschat / geoffreerd / betaald), betaaltermijnen beheren, en AI-advies krijgen over hun uitgavenpatroon. Het is een van de meer volwassen, feature-rijke modules in de app: alle basis CRUD-workflows werken, inclusief permissies (bewerken vs. alleen-lezen), realtime sync, export en AI-analyse.

De pagina is functioneel compleet maar heeft nog geen echte data-visualisatie (grafieken) en enkele UX-verbeterpunten (zie sectie 6).

---

## 2. Functionaliteiten (gebruikersperspectief)

### 2.1 Budgetoverzicht (samenvatting bovenaan)
- Cirkeldiagram dat toont hoeveel procent van het totale budget al betaald is.
- Kerncijfers: totaal betaald, totaal budget, verwachte uitgaven, resterend budget.
- Waarschuwing (amber) wanneer het budget overschreden dreigt te worden.
- Responsive: op desktop staan de 3 statistieken naast elkaar, op mobiel eronder gestapeld.

### 2.2 Budgetlijst met filtering (accordion)
- Zoekbalk om categorieën op naam te filteren.
- Statusbadges per categorie: Betaald (groen), Boven schatting (amber), Nog te plannen (blauw/grijs), In uitvoering (primaire kleur).
- Filter-dropdown met 4 tabs: Alle, Aandacht, Nog te plannen, Betaald — elk met een teller.
- "Alles uit/inklappen" knop.
- Elke categorierij toont: naam, subtitel (bv. aantal gasten voor catering, aantal items), statusbadge, voortgangsbalk (verborgen op mobiel), begroot bedrag.
- Uitgeklapte item-details: omschrijving, gekoppelde leverancier, 4 bedragen (geschat / offerteprijs / betaald / resterend), lijst van betaaltermijnen met aan/uit-knop per termijn, bewerken/verwijderen-knoppen.

### 2.3 Budgetitem toevoegen/bewerken (formulier in modal)
- Verplichte omschrijving + categorie-dropdown.
- Geschat bedrag.
- Uitklapbare sectie "Meer details": offerteprijs, betaald bedrag, waarschuwing als offerte hoger is dan schatting, koppeling aan leverancier, beheer van betaaltermijnen (toevoegen/verwijderen, met datum en bedrag).
- Validatie op verplichte velden en negatieve bedragen.
- Waarschuwt bij sluiten als er onopgeslagen wijzigingen zijn.
- "Ongedaan maken" na het verwijderen van een betaaltermijn (toast met undo-actie).

### 2.4 Budget automatisch verdelen ("Verdeel budget")
- Toont alle 11 standaardcategorieën met voorgestelde bedragen op basis van in Nederland gebruikelijke verdeelpercentages (bijv. Catering 25%, Locatie 20%, Kleding 10%, Fotografie 10%, enz.).
- Checkboxes om te kiezen welke categorieën worden toegevoegd (standaard alleen categorieën die nog geen items hebben).
- Bedragen per categorie zijn aanpasbaar vóór het toevoegen.

### 2.5 AI-budgetadvies
- Knop "Analyseer mijn budget" (desktop: los zichtbaar, mobiel: in overflowmenu) start een AI-analyse via Gemini.
- Toont: samenvatting, aandachtspunten (waarschuwing/tip/positief), algemeen advies.
- Resultaten worden gecachet (max. 4 uur geldig, minimaal 30 minuten tussen herhaalde analyses) om AI-kosten te beperken; valt terug op gecachet resultaat als de AI niet beschikbaar is.
- Los daarvan: een contextuele "AI-inzicht"-kaart op de pagina zelf die automatisch het meest urgente advies toont, met sluitknop.

### 2.6 Exporteren
- CSV-export van het volledige budget (categorie, omschrijving, geschat, offerteprijs, betaald, resterend), met Nederlandse notatie (komma als decimaalteken, puntkomma-gescheiden). Knop is uitgeschakeld als er geen items zijn.

### 2.7 Lege staat, permissies en overige UX
- Duidelijke lege staat met uitleg en twee call-to-actions ("Vul een richtverdeling in" / "Zelf toevoegen") — alleen zichtbaar voor gebruikers met bewerkrechten.
- Alleen-lezen gebruikers zien geen bewerk/verwijder-acties en geen FAB "Budgetitem toevoegen".
- Loading skeleton bij het laden van de pagina.
- Bevestigingsdialoog bij verwijderen van een item.
- Toast-meldingen bij elke actie (succes/fout).
- Info-knop met FAQ-content specifiek voor budget.

### 2.8 Koppelingen met andere onderdelen
- **Leveranciers**: een budgetitem kan gekoppeld worden aan een leverancier; als die leverancier "geboekt" is, wordt de offerteprijs automatisch overgenomen (eenrichtingsverkeer: leverancier → budget, niet andersom).
- **Taken**: een taak kan gekoppeld worden aan een budgetitem; bij verwijderen van het budgetitem wordt die koppeling losgemaakt.
- **Gasten**: bij de categorie Catering wordt het aantal bevestigde daggasten als referentie getoond.
- **Dashboard**: budgetstatus wordt samengevat op het hoofddashboard.

---

## 3. Technische structuur (voor de ontwikkelaar)

### 3.1 Belangrijkste bestanden
| Onderdeel | Bestand |
|---|---|
| Pagina | `app/bruiloft/budget/page.tsx` |
| Loading skeleton | `app/bruiloft/budget/loading.tsx` |
| Samenvatting | `components/bruiloft/budget/BudgetSummary.tsx` |
| Lijst/accordion | `components/bruiloft/budget/BudgetList.tsx` |
| Item-formulier | `components/bruiloft/budget/BudgetItemForm.tsx` |
| Verdeel-modal | `components/bruiloft/budget/BudgetDistributeModal.tsx` |
| AI-advies modal | `components/bruiloft/budget/AIBudgetAdvies.tsx` |
| Berekeningen | `lib/bruiloft/derived.ts` |
| Types | `lib/bruiloft/types.ts` |
| Categorieën/constants | `lib/bruiloft/options.ts` |
| Template-items bij nieuwe bruiloft | `lib/bruiloft/templateBudgetItems.ts` |
| Repository-interface | `lib/bruiloft/repository.ts` |
| Supabase-implementatie | `lib/bruiloft/supabaseRepository.ts` |
| DB-mappers | `lib/bruiloft/mappers.ts` |
| CSV-export | `lib/bruiloft/csv.ts` |
| AI-context builder | `lib/bruiloft/aiContext.ts` |
| Zustand store | `store/bruiloftStore.ts` |
| AI-endpoint | `app/api/ai/budget/route.ts` |
| FAQ-content | `components/bruiloft/faqContent.tsx` |

### 3.2 Datamodel
```ts
BudgetItem {
  id, weddingId
  categorie: BudgetCategorie   // 11 vaste categorieën
  omschrijving: string
  geschatBedrag: number
  geoffreerdBedrag: number
  betaaldBedrag: number
  vendorId?: ID                // optionele koppeling aan leverancier
  betaaltermijnen: PaymentTerm[]
}

PaymentTerm {
  id, bedrag: number, vervaldatum: ISODate, betaald: boolean
}
```
Categorieën: locatie, catering, kleding, fotografie en video, muziek, bloemen en decoratie, vervoer, taart, uitnodigingen en drukwerk, ringen, overig.

Databasetabel: `budget_items` in Supabase (met `betaaltermijnen` als JSONB-array), realtime sync via Supabase Realtime.

### 3.3 State & data flow
- State management via **Zustand** (`bruiloftStore.ts`): alle acties (`addBudgetItem`, `updateBudgetItem`, `deleteBudgetItem`) gaan via de store → repository → Supabase.
- Permissies via `canEdit(permissions, 'budget')`.
- Berekeningen (totalen, afwijkingen, verdeling-voorstel) zitten centraal in `derived.ts`, niet in de componenten zelf.

---

## 4. AI-integratie
- Endpoint: `POST /api/ai/budget`, gebruikt Gemini 2.5 Flash.
- Rate limit: 10 aanvragen per uur per gebruiker.
- Caching op basis van een "fingerprint" van de budgetdata (voorkomt onnodige herberekeningen), met een minimale cooldown van 30 minuten tussen herhaalde analyses en een maximale cache-geldigheid van 4 uur.
- Gebruikslogging via `logAiUsage()`.

---

## 5. Wat werkt goed (volledig geïmplementeerd)
- CRUD op budgetitems, inclusief validatie en bevestigingen.
- Automatische budgetverdeling op basis van standaardpercentages.
- Filteren/zoeken in de lijst.
- Betaaltermijnen toevoegen/verwijderen/afvinken.
- Koppeling met leveranciers en taken.
- AI-analyse met caching en foutafhandeling.
- CSV-export.
- Lege staat, laadstatus, foutmeldingen — allemaal aanwezig.
- Responsive gedrag (mobiel/tablet/desktop) en permissie-gebaseerde weergave (bewerken vs. alleen-lezen).

---

## 6. Bekende beperkingen / kansen voor optimalisatie

Dit is waarschijnlijk het meest relevante deel voor de expert:

1. **Geen echte grafieken/visualisaties** — alleen een cirkeldiagram voor het totaalpercentage; er is geen uitgavenverloop, geen staafdiagram per categorie, geen trendweergave.
2. **Betaaltermijnen zijn volledig handmatig** — geen automatische status-update op basis van de vervaldatum, geen herinneringen.
3. **Geen bulkacties** — items kunnen niet in bulk bewerkt of verwijderd worden.
4. **Eenrichtings-synchronisatie met leveranciers** — offerte gaat van leverancier naar budget, niet andersom.
5. **Alleen euro, vast Nederlands notatieformaat** — geen andere valuta's.
6. **Geen sjablonen/dupliceren van items** — elk item moet los worden aangemaakt (behalve de automatische verdeling bij start).
7. **AI-analyse is alleen op aanvraag** — geen geplande/periodieke analyse of proactieve meldingen.
8. **Geen budgetwaarschuwingen via e-mail of notificaties** wanneer een categorie de schatting overschrijdt.
9. **Geen historische data / uitgaventrends over tijd.**
10. **Betaaltermijn-invoer is basic** — standaard HTML-datepicker en simpel bedragveld, geen kalenderwidget.

---

## 7. Aanbevelingen voor de volgende stappen
Voor de UX-expert: de grootste kans zit in punt 1 (visualisatie) en 7/8 (proactieve signalering) — dit sluit aan bij de "rustig/eenvoud"-designfilosofie van de app als het goed wordt uitgevoerd (subtiele grafieken, geen overdadige dashboards).
Voor de softwareontwikkelaar: de architectuur (Zustand + repository-pattern + centrale `derived.ts`-berekeningen) is consistent en goed te herbruiken bij uitbreidingen — nieuwe features horen in dezelfde laag-structuur te passen (types → repository → store → component → FAQ).

Bij het toevoegen van nieuwe functionaliteit, volg dit patroon:
1. Type toevoegen in `lib/bruiloft/types.ts`
2. CRUD-logica in `supabaseRepository.ts` + interface in `repository.ts`
3. Koppelen aan de Zustand store (`bruiloftStore.ts`)
4. UI-component bouwen in `components/bruiloft/budget/`
5. FAQ bijwerken in `faqContent.tsx`
6. Berekeningen toevoegen aan `derived.ts` indien nodig
7. Testen met zowel bewerk- als alleen-lezen rechten
