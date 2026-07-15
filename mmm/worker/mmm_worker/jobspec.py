"""Parse a job's ``config`` JSON into mmm-core objects.

This is the contract between the wizard (which writes the job) and the worker (which
runs it). Keeping it in one place means the frontend and worker agree on exactly one
shape. Minimal example (everything but ``sources`` + ``model`` is optional):

    {
      "sources": [
        {"name": "revenue", "storage_path": "proj/rev.csv", "date_column": "week",
         "columns": [{"name": "revenue", "role": "kpi"}]},
        {"name": "google", "storage_path": "proj/google.csv", "date_column": "date",
         "columns": [{"name": "spend", "role": "spend", "output_name": "google_spend"}]}
      ],
      "model": {
        "kpi": "revenue",
        "channels": [{"name": "google_spend", "channel_type": "intent"}],
        "control_columns": [], "add_trend": true,
        "seasonality_periods": 52, "n_fourier_modes": 2
      },
      "event_dummies": [{"name": "dummy_2025w45", "weeks": [[2025, 45]]}],
      "sample": {"draws": 1000, "tune": 1000, "chains": 4}
    }

The full toolbox is opt-in per field (defaults reproduce the original model):

    * per channel: ``adstock`` ("geometric"|"delayed"), ``saturation`` ("hill"|"logistic"),
      ``l_max``, ``expected_half_life``, and a ``priors`` object (any subset of the
      ChannelPriors fields).
    * per model: ``likelihood`` ("normal"|"student_t"), ``student_t_nu``, and a ``priors``
      object (any subset of the BaselinePriors fields).
    * per control column: ``fill`` ("zero"|"ffill"|"bfill"|"interpolate"|"mean"|"median").
    * ``event_dummies``: 0/1 control columns for named ISO weeks; their names are appended
      to ``model.control_columns`` automatically.
"""

from __future__ import annotations

from dataclasses import dataclass, fields

from mmm_core import ColumnSpec, EventDummySpec, Role, SourceSpec
from mmm_core.model import (
    AdstockType,
    BaselinePriors,
    ChannelConfig,
    ChannelPriors,
    ChannelType,
    LikelihoodType,
    ModelConfig,
    SaturationType,
    TrendType,
)

_ALLOWED_SAMPLE_KEYS = {"draws", "tune", "chains", "target_accept", "seed"}
_CHANNEL_PRIOR_FIELDS = {f.name for f in fields(ChannelPriors)}
_BASELINE_PRIOR_FIELDS = {f.name for f in fields(BaselinePriors)}


@dataclass(frozen=True)
class SourceRef:
    spec: SourceSpec
    storage_path: str


@dataclass(frozen=True)
class JobSpec:
    sources: list[SourceRef]
    model: ModelConfig
    sample: dict
    event_dummies: tuple[EventDummySpec, ...] = ()


def _require(d: dict, key: str, ctx: str):
    if key not in d:
        raise ValueError(f"job config: missing {key!r} in {ctx}")
    return d[key]


def _parse_event_dummies(config: dict) -> tuple[EventDummySpec, ...]:
    specs = []
    for d in config.get("event_dummies", ()):
        weeks = tuple(
            (int(pair[0]), int(pair[1])) for pair in _require(d, "weeks", "event dummy")
        )
        specs.append(EventDummySpec(name=_require(d, "name", "event dummy"), weeks=weeks))
    return tuple(specs)


def _channel_priors(d: dict | None) -> ChannelPriors:
    if not d:
        return ChannelPriors()
    unknown = set(d) - _CHANNEL_PRIOR_FIELDS
    if unknown:
        raise ValueError(f"job config: unknown channel prior field(s) {sorted(unknown)}")
    return ChannelPriors(**{k: float(v) for k, v in d.items()})


def _baseline_priors(d: dict | None) -> BaselinePriors:
    if not d:
        return BaselinePriors()
    unknown = set(d) - _BASELINE_PRIOR_FIELDS
    if unknown:
        raise ValueError(f"job config: unknown model prior field(s) {sorted(unknown)}")
    return BaselinePriors(**{k: float(v) for k, v in d.items()})


def _parse_channel(c: dict) -> ChannelConfig:
    return ChannelConfig(
        name=_require(c, "name", "channel"),
        channel_type=ChannelType(c.get("channel_type", "generic")),
        l_max=int(c.get("l_max", 12)),
        expected_half_life=c.get("expected_half_life"),
        adstock=AdstockType(c.get("adstock", "geometric")),
        saturation=SaturationType(c.get("saturation", "hill")),
        priors=_channel_priors(c.get("priors")),
    )


def parse_job_config(config: dict) -> JobSpec:
    """Validate and parse a job ``config`` dict into a :class:`JobSpec`."""
    raw_sources = _require(config, "sources", "config")
    if not raw_sources:
        raise ValueError("job config: at least one source is required")

    sources: list[SourceRef] = []
    for s in raw_sources:
        cols = tuple(
            ColumnSpec(
                name=_require(c, "name", "source column"),
                role=Role(_require(c, "role", "source column")),
                output_name=c.get("output_name"),
                fill=c.get("fill"),
            )
            for c in _require(s, "columns", "source")
        )
        spec = SourceSpec(
            name=_require(s, "name", "source"),
            columns=cols,
            date_column=s.get("date_column"),
            essential=s.get("essential", True),
        )
        sources.append(SourceRef(spec=spec, storage_path=_require(s, "storage_path", "source")))

    event_dummies = _parse_event_dummies(config)

    m = _require(config, "model", "config")
    channels = tuple(_parse_channel(c) for c in _require(m, "channels", "model"))

    # Declared event dummies become control columns automatically -- the builder
    # names them once (in "event_dummies") rather than also listing them here.
    control_columns = list(m.get("control_columns", ()))
    for spec_dummy in event_dummies:
        if spec_dummy.name not in control_columns:
            control_columns.append(spec_dummy.name)

    model = ModelConfig(
        kpi=_require(m, "kpi", "model"),
        channels=channels,
        control_columns=tuple(control_columns),
        add_trend=bool(m.get("add_trend", True)),
        trend_type=TrendType(m.get("trend_type", "linear")),
        n_changepoints=int(m.get("n_changepoints", 6)),
        seasonality_periods=m.get("seasonality_periods", 52.0),
        n_fourier_modes=int(m.get("n_fourier_modes", 2)),
        likelihood=LikelihoodType(m.get("likelihood", "normal")),
        student_t_nu=float(m.get("student_t_nu", 4.0)),
        priors=_baseline_priors(m.get("priors")),
    )

    sample = {k: v for k, v in config.get("sample", {}).items() if k in _ALLOWED_SAMPLE_KEYS}
    return JobSpec(sources=sources, model=model, sample=sample, event_dummies=event_dummies)
