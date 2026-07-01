# Wedding Planner App - CLAUDE.md

## Project Overview

**Wedding Planner** is a modern, user-friendly application built with **Next.js**, **React**, **Tailwind CSS**, and **Supabase**. The app helps couples and wedding planners organize their special day through intuitive features like task management, gift registries, RSVP tracking, and wedding websites.

### Core Features
- **Takenlijst** (Task Management): Collaborative task planning with AI suggestions
- **Cadeaulijst** (Gift Registry): Beautiful registry management system
- **RSVP Tracking**: Guest management and confirmation
- **Wedding Website**: Customizable public wedding sites
- **Real-time Collaboration**: Live updates using Supabase Realtime

### Codebase-oriëntatie
- **`app/bruiloft/<feature>/page.tsx`** — pagina's, één map per feature (budget,
  taken, gasten, leveranciers, tafels, draaiboek, website, cadeaulijst, ...).
- **`components/bruiloft/<feature>/`** — UI-componenten per feature;
  **`components/bruiloft/ui/`** bevat de gedeelde bouwstenen (`Card`,
  `Button`, `PageHeader`, `StatusBadge`, `OverflowMenu`, `EmptyState`, ...) —
  begin hier bij hergebruik, zie ook `DESIGN_PHILOSOPHY.md`.
- **`lib/bruiloft/`** — domeinlogica: `types.ts` (databasetypes),
  `derived.ts` (afgeleide berekeningen zoals budgettotalen), `permissions.ts`,
  `aiContext.ts` (context voor AI-endpoints), `ai/` (prompts/benchmarks per
  AI-feature).
- **`store/bruiloftStore.ts`** — enige Zustand-store, alle pagina's lezen
  hieruit.
- **`app/api/`** — route handlers, o.a. `ai/` (Gemini-endpoints per feature),
  `cron/reminders` (dagelijkse herinneringen), `registry/` (cadeaulijst).
- **`supabase/migrations/`** — schemawijzigingen; `supabase/schema.sql` is de
  samengevoegde huidige stand.
- **Commando's**: `npm run dev` / `build` / `lint`. Geen testscript aanwezig
  (`npm test` bestaat niet) — verificatie loopt via `tsc --noEmit`, `next
  lint` en handmatige/Playwright-controle, niet via een testsuite.
- **Lokale env**: `.env.example` kopiëren naar `.env.local` (Supabase-URL/
  keys, Resend, Gemini, Sentry, cron-secret) — zonder deze env-vars faalt
  `next build` bij het prerenderen van pagina's die Supabase aanroepen.

---

## Design Filosofie (VERPLICHT LEESWERK)

⚠️ De volledige, actuele designfilosofie staat in **[`DESIGN_PHILOSOPHY.md`](./DESIGN_PHILOSOPHY.md)** in de root van dit
project. Dat document vervangt de oude Riley & Grey-multikleuren-designsystemen
die hier eerder stonden (die zijn verwijderd omdat ze verouderd waren en
tegenstrijdig met de huidige richting).

**Lees en pas `DESIGN_PHILOSOPHY.md` toe bij elke wijziging aan de UI.** In het
kort:
- Eén betekenisvolle accentkleur (rose = "vraagt aandacht"), verder neutraal
  grijs — geen groen/amber/blauw/rood-statussystemen naast elkaar.
- Eén taak per scherm; extra functionaliteit zit één klik dieper, niet op het
  eerste scherm.
- Zinnen boven opsommingen van badges; geen dezelfde informatie in meerdere
  UI-elementen tegelijk herhalen.
- Herbruik bestaande patronen (kaart, header, statusregel, lege staat) i.p.v.
  telkens een nieuw visueel idioom te verzinnen.
- Witruimte is het instrument voor hiërarchie, niet kleur of randen.

Technische basisregels die nog steeds gelden:
- Gebruik Tailwind design-tokens (`bg-card`, `text-muted-foreground`, de
  `rose`/`rhino`-schaal) — geen ad-hoc hex-codes of pixel-hacks.
- Elk interactief element heeft hover/focus/disabled(/loading)-states.
- Elke feature heeft een nette empty state, error state en loading state.
- Mobile-first: test altijd op smalle schermen; laat knoppen/kaarten niet
  wrappen naar een rommelige tweede regel — gebruik een "meer"-menu i.p.v.
  losse knoppen naast elkaar te stapelen.

---

## Werkwijze: selectieve verificatie (VRAAG EERST)

Twee verificatie-opties zijn beschikbaar maar bewust **niet automatisch**,
omdat ze extra tokens kosten. Gebruik ze alleen na expliciete toestemming:

- **Visuele Playwright-verificatie** (screenshot maken en aftoetsen aan
  `DESIGN_PHILOSOPHY.md`): kost al snel duizenden extra tokens per ronde
  (elke screenshot ~300-1.500 tokens). Stel dit pas voor bij UI-wijzigingen
  waar het risico op een visuele misser reëel is (bv. layout-herstructurering
  over meerdere pagina's), en vraag dan expliciet: *"Wil je dat ik dit met
  een screenshot verifieer voordat we verdergaan?"* — ga hier niet stilzwijgend
  toe over.
- **Definition of Done-checklist** (tsc schoon → geen kleur/patroon-afwijking
  t.o.v. `DESIGN_PHILOSOPHY.md` → getest op mobiele breedte → Vercel-preview
  gecheckt): geen verplichte stappen bij elke kleine fix. Bied 'm aan bij
  grotere wijzigingen ("Zal ik dit langs de Definition of Done-checklist
  lopen voor we mergen?") en laat de gebruiker beslissen.

Bied deze opties dus **proactief aan wanneer het relevant lijkt**, maar voer
ze pas uit na een bevestiging — nooit automatisch.

### Ontwikkelomgeving
Een `SessionStart`-hook (`.claude/hooks/session-start.sh`) installeert stil
de npm-dependencies in cloud-sessies, zodat `tsc`/`next lint`/`next build`
direct werken i.p.v. blind te moeten vertrouwen op de Vercel-build.

---
