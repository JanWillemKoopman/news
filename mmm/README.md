# MMM — Media Mix Model Wizard

Een tool waarmee technische bouwers via chat een Bayesiaans marketing-attributie­model
(Media Mix Model) opzetten voor klantbedrijven, waarna de klant een afgeschermd
dashboard met de resultaten ziet. Dit product leeft **naast** de wedding-planner in
dezelfde repo, volledig gescheiden onder deze `mmm/`-map.

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

1. **Statistische kern eerst** (`packages/mmm-core`) — los van alle UI, met tests tegen
   synthetische data. **← we zitten hier.**
2. Job-queue end-to-end (Modal leest uit Supabase Storage, fit, schrijft resultaat terug).
3. Rollen + Row Level Security in Supabase.
4. Wizard + chatpaneel (bouwersrol).
5. Klantdashboard (afgeschermd, altijd met zichtbare onzekerheidsmarges).
6. Generaliseren naar uiteenlopende databronnen (kolom-mapping als eigen stap,
   kanaaltype i.p.v. kanaalnaam raden). Testen met ≥2 echt verschillende bedrijven.

## Mappen

- `packages/mmm-core/` — de bevroren statistische kernbibliotheek (Python, `uv`).
  Begin hier. Zie `packages/mmm-core/README.md`.

Volgende mappen komen er bij latere stappen bij (`worker/` voor Modal, `app/` voor de
Next.js-wizard, `supabase/` voor migraties/RLS).
