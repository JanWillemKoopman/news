# MMM — Media Mix Model Wizard

Een tool waarmee technische bouwers via chat een Bayesiaans marketing-attributie­model
(Media Mix Model) opzetten voor klantbedrijven, waarna de klant een afgeschermd
dashboard met de resultaten ziet.

## Architectuur (doel)

```
Next.js (Vercel)  <-->  Supabase (Postgres + Storage + Realtime + RLS)  <-->  Modal (Python worker)
       |                                                                          |
       └──────────────────────  Claude API (redenering)  ───────────────────────┘
```

**Kernprincipe: de statistiek is bevroren, geteste code.** De zware wiskunde
(data-opbouw, adstock/Hill-saturatie, attributie, response curves) zit in een vaste
Python-package met unit-tests en bekende testdatasets. Claude *parametriseert* die kern
per klant (priors, uitsluitperiodes, dummy's) — het schrijft de kernwiskunde niet elke
keer opnieuw. Elke uitkomst wordt gevalideerd met een sanity check voordat we 'm
vertrouwen.

## Twee rollen, strikt gescheiden

- **Bouwer** (ik/collega's): volledige wizard, chatpaneel, ruwe data, modelconfiguratie,
  ziet ook onafgeronde tussenversies.
- **Klant**: alleen het afgeronde dashboard van het eigen project, ná een expliciete
  "publiceer"-stap. Nooit chat, nooit ruwe data, nooit inzicht in andere klanten.

## Bouwvolgorde

1. ✅ **Statistische kern** (`packages/mmm-core`) — compleet en getest tegen ground truth.
   Inmiddels een volledige *gereedschapskist*: meerdere adstock- (geometric/delayed) en
   saturatievormen (Hill/logistic), instelbaar ruismodel (normal/student_t), volledig
   instelbare priors, feature-engineering & cleaning (`mmm_core.features`), out-of-sample
   voorspelling (`mmm_core.model.predict`) en evaluatie (`mmm_core.evaluation`:
   cross-validatie, placebo, prior-predictive, modelvergelijking). Alle defaults
   reproduceren het originele model; elke uitbreiding is per klant opt-in via de config.
2. ✅ **Job-queue end-to-end** (`worker/` op Modal + `supabase/` schema) — worker-code en
   migratie klaar; migratie nog toe te passen op de database.
3. ✅ **Rollen + Row Level Security** in Supabase — in `supabase/migrations/0001_mmm_init.sql`
   (builder vs. client, strikt gescheiden).
4. 🟡 **Wizard (bouwersrol)** — skelet klaar in `app/` (project → data → model → fit →
   resultaten → publiceren). Het **chatpaneel** (`app/api/chat`) is een MMM-architect met
   twee rollen: hij beoordeelt de data en stelt een modelconfiguratie voor (Claude
   Sonnet 5), én — zodra er een fit is gedraaid — leest hij de resultaten terug
   (kwaliteitspoort, diagnostiek, bijdragen), legt ze uit, en stelt een verbeterde config
   voor of diagnosticeert een mislukte fit (Claude Opus, gekozen op basis van context in
   `lib/anthropic/fitContext.ts`). Mens-in-de-lus: hij stelt voor, de bouwer klikt. Werkt
   zodra `ANTHROPIC_API_KEY` in Vercel staat; nog niet end-to-end live getest.
5. 🟡 **Klantdashboard** — afgeschermde read-only weergave in `app/dashboard/[projectId]`,
   altijd met zichtbare onzekerheidsmarges (gedeelde `SummaryView`).
6. ⬜ Generaliseren naar uiteenlopende databronnen (kolom-mapping als eigen stap,
   kanaaltype i.p.v. kanaalnaam raden). Testen met ≥2 echt verschillende bedrijven.

## Mappen

- `app/`, `components/`, `lib/`, `store/` — de Next.js-wizard (frontend).
- `packages/mmm-core/` — de bevroren statistische kernbibliotheek (Python, `uv`).
  Begin hier. Zie `packages/mmm-core/README.md`.
- `worker/` — de asynchrone Modal-worker die de fit off-request draait. Zie
  `worker/README.md`.
- `supabase/migrations/` — schema + Row Level Security (MMM in een eigen `mmm`-schema,
  geïsoleerd van de overige tabellen in het project).
- `MMM_PYTHON.env.example` — benodigde environment variables voor de Python-kant
  (secrets nooit committen).
- `.env.local.example` — benodigde environment variables voor de Next.js-app.
