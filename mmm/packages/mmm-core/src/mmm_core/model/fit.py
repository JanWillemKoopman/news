"""Fit the MMM and summarize it into the JSON the client dashboard reads.

This is the boundary the architecture cares about: the heavy ArviZ ``InferenceData``
(raw posterior) is meant for Storage as a compressed ``.nc``; the *summary* produced
here — contribution shares, cost-per-unit, adstock half-life and saturation point, each
with a credible interval, plus convergence diagnostics — is the small JSON that goes to
Postgres for fast dashboard rendering.

Uncertainty is never optional: every channel figure is reported as (p3, p50, p97).
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field

import numpy as np
import pandas as pd

from mmm_core.model.build import BuiltModel, build_model
from mmm_core.model.config import ModelConfig
from mmm_core.model.validation import check_decomposition_adds_up, interval_coverage
from mmm_core.transforms import half_life_from_alpha

# Credible-interval percentiles reported for every quantity.
_P_LOW, _P_MID, _P_HIGH = 3.0, 50.0, 97.0


@dataclass
class Interval:
    """A point estimate with a credible interval."""

    p3: float
    p50: float
    p97: float

    @staticmethod
    def from_samples(samples: np.ndarray) -> "Interval":
        lo, mid, hi = np.percentile(samples, [_P_LOW, _P_MID, _P_HIGH])
        return Interval(float(lo), float(mid), float(hi))


@dataclass
class ChannelResult:
    name: str
    absolute_contribution: Interval   # KPI units attributed to the channel (summed)
    contribution_share: Interval      # fraction of total KPI
    roas: Interval                    # contribution per unit spend
    adstock_half_life_weeks: Interval
    saturation_point: Interval        # weekly spend at half-saturation, original units
    total_spend: float


@dataclass
class Diagnostics:
    max_r_hat: float
    min_ess_bulk: float
    n_divergences: int
    r2: float
    mape: float
    interval_coverage_94: float       # share of weeks whose actual KPI falls in the 94% PI
    decomposition_ok: bool


@dataclass
class FitSummary:
    kpi: str
    n_weeks: int
    window: tuple[str, str]
    baseline_contribution: Interval   # KPI explained without marketing
    channels: list[ChannelResult]
    diagnostics: Diagnostics
    draws: int
    chains: int

    def to_json_dict(self) -> dict:
        """A plain, JSON-serializable dict (what the worker writes to Postgres)."""
        return _to_plain(asdict(self))


def _to_plain(obj):
    if isinstance(obj, dict):
        return {k: _to_plain(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_to_plain(v) for v in obj]
    if isinstance(obj, (np.floating, np.integer)):
        return obj.item()
    return obj


def _flat(idata, name: str) -> np.ndarray:
    """Flatten a posterior variable's chain/draw dims to a single sample axis (last)."""
    da = idata.posterior[name]
    return da.stack(sample=("chain", "draw")).to_numpy()


def summarize_fit(built: BuiltModel, idata) -> FitSummary:
    """Turn a fitted model + InferenceData into the dashboard summary."""
    import arviz as az

    config = built.config
    y_max = float(built.scalers["y_max"])
    x_max = np.asarray(built.scalers["x_max"], dtype=float)
    kpi = built.kpi
    kpi_total = float(kpi.sum())

    # --- per-channel attribution (in original KPI / spend units) ---
    channels: list[ChannelResult] = []
    total_channel_contrib_per_sample = None
    for i, ch in enumerate(config.channels):
        contrib = _flat(idata, f"contrib_{ch.name}")          # (date, sample), scaled
        contrib_total = contrib.sum(axis=0) * y_max            # (sample,), KPI units
        total_channel_contrib_per_sample = (
            contrib_total if total_channel_contrib_per_sample is None
            else total_channel_contrib_per_sample + contrib_total
        )
        spend_total = float(built.spend[:, i].sum())

        alpha = _flat(idata, f"alpha_{ch.name}")
        half_life = np.array([half_life_from_alpha(float(a)) for a in np.clip(alpha, 1e-6, 1 - 1e-9)])
        half_sat_spend = _flat(idata, f"halfsat_{ch.name}") * x_max[i]

        channels.append(
            ChannelResult(
                name=ch.name,
                absolute_contribution=Interval.from_samples(contrib_total),
                contribution_share=Interval.from_samples(contrib_total / kpi_total),
                roas=Interval.from_samples(contrib_total / spend_total if spend_total else contrib_total * np.nan),
                adstock_half_life_weeks=Interval.from_samples(half_life),
                saturation_point=Interval.from_samples(half_sat_spend),
                total_spend=spend_total,
            )
        )

    # --- baseline (everything not attributed to marketing) ---
    mu = _flat(idata, "mu")                                     # (date, sample), scaled
    mu_total = mu.sum(axis=0) * y_max
    baseline_total = mu_total - total_channel_contrib_per_sample
    baseline = Interval.from_samples(baseline_total)

    # --- diagnostics ---
    var_names = ["intercept", "sigma"] + [
        f"{p}_{ch.name}" for ch in config.channels for p in ("alpha", "beta", "halfsat", "slope")
    ]
    summ = az.summary(idata, var_names=var_names)
    max_r_hat = float(summ["r_hat"].max())
    min_ess = float(summ["ess_bulk"].min())
    n_div = int(idata.sample_stats["diverging"].to_numpy().sum())

    mu_mean = mu.mean(axis=1) * y_max                           # posterior-mean fit, KPI units
    resid = kpi - mu_mean
    ss_res = float(np.sum(resid ** 2))
    ss_tot = float(np.sum((kpi - kpi.mean()) ** 2)) or 1.0
    r2 = 1.0 - ss_res / ss_tot
    mape = float(np.mean(np.abs(resid) / np.where(kpi != 0, np.abs(kpi), np.nan)))

    # Predictive coverage (the plan's diagnostic): draw from the posterior predictive
    # y ~ Normal(mu, sigma) and check how often the actual KPI lands in the 94% interval.
    sigma = _flat(idata, "sigma")                              # (sample,)
    rng = np.random.default_rng(0)
    y_pred = (mu + sigma[None, :] * rng.standard_normal(mu.shape)) * y_max
    lo = np.percentile(y_pred, 3, axis=1)
    hi = np.percentile(y_pred, 97, axis=1)
    coverage = interval_coverage(kpi, lo, hi)

    components = {ch.name: _flat(idata, f"contrib_{ch.name}").mean(axis=1) for ch in config.channels}
    components["baseline"] = (mu.mean(axis=1) - sum(
        _flat(idata, f"contrib_{ch.name}").mean(axis=1) for ch in config.channels
    ))
    decomp = check_decomposition_adds_up(mu.mean(axis=1), components)

    diagnostics = Diagnostics(
        max_r_hat=max_r_hat,
        min_ess_bulk=min_ess,
        n_divergences=n_div,
        r2=r2,
        mape=mape,
        interval_coverage_94=coverage,
        decomposition_ok=decomp.ok,
    )

    return FitSummary(
        kpi=config.kpi,
        n_weeks=len(built.dates),
        window=(str(built.dates.min().date()), str(built.dates.max().date())),
        baseline_contribution=baseline,
        channels=channels,
        diagnostics=diagnostics,
        draws=int(idata.posterior.sizes["draw"]),
        chains=int(idata.posterior.sizes["chain"]),
    )


def fit_model(
    data: pd.DataFrame,
    config: ModelConfig,
    *,
    draws: int = 1000,
    tune: int = 1000,
    chains: int = 4,
    target_accept: float = 0.9,
    seed: int = 0,
    progressbar: bool = False,
):
    """Build, sample (numpyro NUTS) and summarize the model.

    Returns:
        ``(FitSummary, InferenceData)`` — the summary is the small JSON for Postgres,
        the InferenceData is the raw trace destined for Storage as a ``.nc``.
    """
    import pymc as pm

    built = build_model(data, config)
    with built.model:
        idata = pm.sample(
            draws=draws,
            tune=tune,
            chains=chains,
            target_accept=target_accept,
            nuts_sampler="numpyro",
            random_seed=seed,
            progressbar=progressbar,
        )
    return summarize_fit(built, idata), idata
