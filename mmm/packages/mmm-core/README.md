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
| Bayesiaans model (PyMC + numpyro) | `mmm_core.model` (gepland) | ⬜ |
| Attributie + response curves + budgetoptimalisatie | `mmm_core.attribution` (gepland) | ⬜ |
| Diagnostiek (R-hat, ESS, divergenties, coverage) | `mmm_core.diagnostics` (gepland) | ⬜ |

## Ontwikkelen

```bash
cd mmm/packages/mmm-core
uv sync --extra dev          # installeert numpy/pandas + pytest (niet de zware model-stack)
uv run pytest                # draait de testsuite
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
