# mmm-core

De **bevroren, geteste statistische kern** van de MMM-wizard. Alle zware wiskunde leeft
hier als vaste code met unit-tests en bekende testdatasets. Claude *parametriseert* deze
kern later per klant (priors, uitsluitperiodes, dummy's) — het herschrijft de wiskunde
niet elke keer opnieuw.

## Status

| Stap | Module | Status |
|------|--------|--------|
| Data-ingestie & kwaliteitschecks (multi-source alignment) | `mmm_core.ingestion` | ✅ |
| Adstock / Hill-saturatie transformaties | `mmm_core.transforms` | ✅ |
| Modelconfig + ground-truth simulator + sanity-checks | `mmm_core.model` (config/simulate/validation) | ✅ |
| Bayesiaans model (PyMC + numpyro) + attributie + diagnostiek | `mmm_core.model` (build/fit) | ✅ |
| Response curves + mROAS + budgetoptimalisatie | `mmm_core.optimize` | ✅ |

De fit levert per kanaal — elk mét credible interval (p3/p50/p97) — absolute
contributie, contribution share, ROAS, adstock-half-life en verzadigingspunt, plus een
baseline en diagnostiek (R-hat, ESS, divergenties, R², MAPE, predictive coverage). De
`FitSummary.to_json_dict()` is precies de geaggregeerde JSON die de Modal-worker straks
naar Postgres schrijft; de ruwe trace gaat als `.nc` naar Storage.

`mmm_core.optimize` levert de "Toekomst & Planning"-statistieken: steady-state response
curves (hard begrensd tot net boven het historisch geteste maximum, extrapolatie
gemarkeerd), marginale ROAS (mROAS) via de helling van de curve, optimale budgetallocatie
(`optimize_budget`, respecteert veiligheidscaps) en voorspelde omzet bij een gegeven
budget — alles met credible interval uit de posterior.

**De statistische kern (stap 1) is hiermee compleet en getest.** Volgende stap in de
bouwvolgorde: de Modal-worker die deze kern async draait vanuit Supabase (stap 2).

## Ontwikkelen

```bash
cd mmm/packages/mmm-core
uv sync --extra dev          # installeert numpy/pandas + pytest (niet de zware model-stack)
uv run pytest                # snelle suite (fit-tests worden overgeslagen)
uv run pytest -m slow        # end-to-end fit tegen ground truth (~30s, vereist [model])
```

De Bayesiaanse stack (PyMC/numpyro/ArviZ) zit bewust in de optionele extra `model` en
wordt alleen geïnstalleerd waar echt gefit wordt (de Modal-worker), zodat het test-loop
van de kern licht en snel blijft:

```bash
uv sync --extra dev --extra model
```

## Ingestie-laag: wat het doet

`build_master_dataset(sources)` voegt meerdere losse uploads samen tot één master-tabel
op ISO-weekniveau:

```python
from mmm_core import ColumnSpec, Role, SourceSpec, build_master_dataset

sources = [
    (SourceSpec("revenue", (ColumnSpec("revenue", Role.KPI),), date_column="week"), kpi_df),
    (SourceSpec("google",  (ColumnSpec("spend", Role.SPEND),), date_column="date"), google_df),
    (SourceSpec("facebook",(ColumnSpec("spend", Role.SPEND),), date_column="datum"), fb_df),
]
result = build_master_dataset(sources)

result.data          # DataFrame op ISO-week (maandag-index), gap-vrij, kolom per variabele
result.window        # (start, eind) van de overlappende analyseperiode
result.report        # QualityReport met info/warning/error-issues
result.column_roles  # {kolomnaam: Role}
```

Kernbeslissingen (bewust, en getest):

- **ISO-week = maandagdatum.** Geen `(iso_jaar, iso_week)`-tuple, dus joins/sortering zijn
  triviaal en de jaargrens-randgevallen verdwijnen.
- **Aggregatie per rol:** KPI en spend worden gesommeerd, controls (bv. prijs) gemiddeld.
- **Window-first imputatie.** Eerst de overlappende analyseperiode bepalen, *dán pas*
  ontbrekende spend-weken met 0 vullen — zodat we nooit nul-spend-weken verzinnen vóór een
  kanaal bestond (dat zou adstock/saturatie vervuilen). Gaten in KPI/controls worden
  gerapporteerd, nooit stilzwijgend ingevuld.
- **Niets wordt stil gemuteerd op een vermoeden.** Dubbele rijen, onparsebare datums,
  bijna-identieke kanalen (correlatie), naam-botsingen en jaareinde-uitschieters komen
  allemaal als gestructureerde issues terug op de `QualityReport`.
