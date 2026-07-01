# Wedding Planner App - CLAUDE.md

## Project Overview

**Wedding Planner** is a modern, user-friendly application built with **Next.js**, **React**, **Tailwind CSS**, and **Supabase**. The app helps couples and wedding planners organize their special day through intuitive features like task management, gift registries, RSVP tracking, and wedding websites.

### Core Features
- **Takenlijst** (Task Management): Collaborative task planning with AI suggestions
- **Cadeaulijst** (Gift Registry): Beautiful registry management system
- **RSVP Tracking**: Guest management and confirmation
- **Wedding Website**: Customizable public wedding sites
- **Real-time Collaboration**: Live updates using Supabase Realtime

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
