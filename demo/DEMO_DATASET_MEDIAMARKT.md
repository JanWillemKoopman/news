# Demo-dataset: MediaMarkt Nederland — verkoop van flatscreens

**Bestand:** `demo/mediamarkt_demo_dataset.csv` · **Generator:** `demo/generate_demo_dataset.py`
(deterministisch, seed 2026 — opnieuw draaien geeft exact dezelfde data)

Synthetische maar realistische wekelijkse dataset voor trainingen met de MMM Wizard.
De KPI is opgebouwd uit een **bekende ground truth**, dus de trainer weet wat het model
"hoort" te vinden — en elke stap van de app heeft iets te ontdekken.

## Inhoud

- **Periode:** 2023-01-02 t/m 2025-12-29, 157 ISO-weken (maandag-datums) + 1 bewuste duplicaatrij = 158 rijen
- **KPI:** `flatscreen_verkopen` — verkochte flatscreens per week (±6.800–27.500)
- **8 spend-kanalen:** `tv_spend`, `radio_spend` (flights, offline), `search_generic_spend`,
  `search_brand_spend`, `meta_spend`, `youtube_spend`, `tiktok_spend` (start pas in week 70),
  `email_verzendingen` (niet-monetair volume)
- **3 controls:** `gemiddelde_prijs` (dalende trend, promo-dips), `promo_korting_pct`,
  `consumenten_vertrouwen` (bevat 3 NaN's)

## Ingebouwde leerpunten per wizard-stap

| App-onderdeel | Wat de cursist ontdekt |
|---|---|
| Stap 1 – upload/profiel | Kolom-classificatie herkent rollen; profiel meldt de NaN's en de uitschieters |
| Stap 2 – EDA | `meta_spend` en `youtube_spend` correleren ~0,90 → multicollineariteit bespreken |
| Stap 3 – data prep | Duplicaatrij (week 2024-04-01) in het kwaliteitsrapport; fill-strategie kiezen voor `consumenten_vertrouwen`; event-dummy's voor Black Friday en de storing |
| Stap 3 – diepe inspectie | Storing-uitschieter week **2024-03-04** (−45%); EK-piek mei/juni 2024; tiktok-launch |
| Stap 4 – config | `delayed` adstock voor tv/radio (hogere `l_max`), `geometric` voor digitaal; `search_brand` = `intent`, meta/tiktok = `brand`; controls aanvinken; evt. `student_t` vanwege de storing |
| Stap 6 – resultaten | ROAS-volgorde en saturatie vergelijken met de ground truth hieronder; onzekerheid bij meta vs. youtube is breed (collineair) — precies het leermoment |

## Ground truth (wat het model hoort terug te vinden)

KPI = baseline (7.500 + groeitrend) + jaarseizoen (Q4-piek) + kanaalbijdragen + controls + events + ruis.

| Kanaal | Adstock (echt) | Max. bijdrage/week | Half-saturatie |
|---|---|---|---|
| tv | delayed, piek na ~2 wk | 3.400 | €95k adstocked |
| radio | delayed, piek na ~1 wk | 900 | €26k |
| search_generic | geometric α=0,25 | 3.000 | €42k |
| search_brand | geometric α=0,15 | 1.700 | €13k |
| meta | geometric α=0,4 | 1.500 | €24k |
| youtube | geometric α=0,5 | 700 | €16k |
| tiktok | geometric α=0,35 | 500 | €11k |
| email | geometric α=0,2 | 800 | 220k verzendingen |

Controls: prijs −9 verkopen per euro prijsstijging; korting +95 per procentpunt;
vertrouwen +28 per indexpunt. Events: Black Friday +5.200, sinterklaas/kerst +2.200,
EK-koopweken (20 mei–17 juni 2024) +2.800.

## Zakelijke context om aan de architect te geven (rollenspel)

> "MediaMarkt NL verkoopt flatscreens; piek rond Black Friday en de feestdagen. Vóór het
> EK voetbal 2024 draaiden we extra tv en search. TV en radio lopen in flights met lange
> nawerking. TikTok is pas medio 2024 gestart. Begin maart 2024 lag de webshop een week
> grotendeels plat. We voeren rond acties forse kortingen en de gemiddelde prijs daalt
> structureel."
