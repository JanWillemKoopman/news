"""Parse a job's ``config`` JSON into mmm-core objects.

This is the contract between the wizard (which writes the job) and the worker (which
runs it). Keeping it in one place means the frontend and worker agree on exactly one
shape. Example config:

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
      "sample": {"draws": 1000, "tune": 1000, "chains": 4}
    }
"""

from __future__ import annotations

from dataclasses import dataclass

from mmm_core import ColumnSpec, Role, SourceSpec
from mmm_core.model import ChannelConfig, ChannelType, ModelConfig

_ALLOWED_SAMPLE_KEYS = {"draws", "tune", "chains", "target_accept", "seed"}


@dataclass(frozen=True)
class SourceRef:
    spec: SourceSpec
    storage_path: str


@dataclass(frozen=True)
class JobSpec:
    sources: list[SourceRef]
    model: ModelConfig
    sample: dict


def _require(d: dict, key: str, ctx: str):
    if key not in d:
        raise ValueError(f"job config: missing {key!r} in {ctx}")
    return d[key]


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

    m = _require(config, "model", "config")
    channels = tuple(
        ChannelConfig(
            name=_require(c, "name", "channel"),
            channel_type=ChannelType(c.get("channel_type", "generic")),
            l_max=int(c.get("l_max", 12)),
            expected_half_life=c.get("expected_half_life"),
        )
        for c in _require(m, "channels", "model")
    )
    model = ModelConfig(
        kpi=_require(m, "kpi", "model"),
        channels=channels,
        control_columns=tuple(m.get("control_columns", ())),
        add_trend=bool(m.get("add_trend", True)),
        seasonality_periods=m.get("seasonality_periods", 52.0),
        n_fourier_modes=int(m.get("n_fourier_modes", 2)),
    )

    sample = {k: v for k, v in config.get("sample", {}).items() if k in _ALLOWED_SAMPLE_KEYS}
    return JobSpec(sources=sources, model=model, sample=sample)
