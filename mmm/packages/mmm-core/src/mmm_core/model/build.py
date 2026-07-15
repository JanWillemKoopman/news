"""Assemble the Bayesian MMM as a PyMC model.

The adstock and Hill transforms are written symbolically in PyTensor here (mirroring the
numpy versions in ``mmm_core.transforms``, which the tests pin), so their parameters are
sampled rather than fixed. Each channel's contribution is registered as a
``Deterministic`` so the fit can extract a decomposition and validate that it adds up.

Everything is fit in a scaled space (each channel's spend by its max, the KPI by its
max) so the priors are scale-free and NUTS is well-conditioned; the scalers are returned
so :mod:`mmm_core.model.fit` can convert results back to real units.

Heavy imports (pymc/pytensor) live in this module only; importing ``mmm_core.model`` does
not require the model extra.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from mmm_core.model.config import ModelConfig
from mmm_core.transforms import alpha_from_half_life

# Small offset so adstocked spend is never exactly 0 inside x**slope, which would make
# the gradient w.r.t. the Hill slope undefined and stall NUTS.
_HILL_EPS = 1e-6
# Concentration of the Beta prior placed on each channel's adstock retention.
_ALPHA_CONCENTRATION = 20.0


@dataclass
class BuiltModel:
    model: object                      # pm.Model
    scalers: dict[str, np.ndarray | float]
    config: ModelConfig
    dates: pd.DatetimeIndex
    spend: np.ndarray                  # (T, n_channels) in original units
    kpi: np.ndarray                    # (T,) in original units


def _fourier_features(t: np.ndarray, period: float, n_modes: int) -> np.ndarray:
    cols = []
    for k in range(1, n_modes + 1):
        cols.append(np.sin(2 * np.pi * k * t / period))
        cols.append(np.cos(2 * np.pi * k * t / period))
    return np.column_stack(cols)


def _pt_geometric_adstock(x, alpha, l_max: int):
    import pytensor.tensor as pt

    weights = alpha ** pt.arange(l_max)
    weights = weights / pt.sum(weights)
    length = x.shape[0]
    acc = weights[0] * x
    for lag in range(1, l_max):
        shifted = pt.concatenate([pt.zeros(lag), x[: length - lag]])
        acc = acc + weights[lag] * shifted
    return acc


def _pt_hill(x, half_saturation, slope):
    xs = (x + _HILL_EPS) ** slope
    ks = half_saturation ** slope
    return xs / (ks + xs)


def build_model(data: pd.DataFrame, config: ModelConfig) -> BuiltModel:
    """Construct the PyMC model for ``config`` over the master dataset ``data``."""
    import pymc as pm
    import pytensor.tensor as pt

    for needed in (config.kpi, *config.channel_names, *config.control_columns):
        if needed not in data.columns:
            raise KeyError(f"column {needed!r} not found in the dataset")

    dates = data.index
    n = len(data)
    if n < 2:
        raise ValueError("need at least two weeks of data")

    kpi = data[config.kpi].to_numpy(dtype=float)
    if not np.isfinite(kpi).all():
        raise ValueError("KPI column contains missing/non-finite values; clean it first")
    y_max = float(kpi.max())
    y_scaled = kpi / y_max

    spend = np.column_stack([data[c.name].to_numpy(dtype=float) for c in config.channels])
    x_max = spend.max(axis=0)
    x_max_safe = np.where(x_max > 0, x_max, 1.0)
    spend_scaled = spend / x_max_safe

    t = np.arange(n, dtype=float)
    t_scaled = t / (n - 1)

    coords = {"date": dates, "channel": list(config.channel_names)}
    with pm.Model(coords=coords) as model:
        intercept = pm.Normal("intercept", mu=float(np.median(y_scaled)), sigma=0.25)
        mu = intercept + pt.zeros(n)

        if config.add_trend:
            trend = pm.Normal("trend", mu=0.0, sigma=0.5)
            mu = mu + trend * t_scaled

        if config.seasonality_periods and config.n_fourier_modes > 0:
            fourier = _fourier_features(t, config.seasonality_periods, config.n_fourier_modes)
            season = pm.Normal("season", mu=0.0, sigma=0.1, shape=fourier.shape[1])
            mu = mu + pt.dot(fourier, season)

        for ctrl in config.control_columns:
            raw = data[ctrl].to_numpy(dtype=float)
            std = raw.std() or 1.0
            ctrl_scaled = (raw - raw.mean()) / std
            coef = pm.Normal(f"control_{ctrl}", mu=0.0, sigma=0.5)
            mu = mu + coef * ctrl_scaled

        for i, channel in enumerate(config.channels):
            alpha_center = alpha_from_half_life(channel.half_life_prior_center())
            alpha = pm.Beta(
                f"alpha_{channel.name}",
                alpha=alpha_center * _ALPHA_CONCENTRATION,
                beta=(1.0 - alpha_center) * _ALPHA_CONCENTRATION,
            )
            half_sat = pm.Beta(f"halfsat_{channel.name}", alpha=2.0, beta=2.0)
            slope = pm.Gamma(f"slope_{channel.name}", alpha=3.0, beta=3.0)
            beta = pm.HalfNormal(f"beta_{channel.name}", sigma=0.5)  # media cannot hurt sales

            x_channel = pt.as_tensor_variable(spend_scaled[:, i])
            adstocked = _pt_geometric_adstock(x_channel, alpha, channel.l_max)
            saturated = _pt_hill(adstocked, half_sat, slope)
            contribution = pm.Deterministic(
                f"contrib_{channel.name}", beta * saturated, dims="date"
            )
            mu = mu + contribution

        pm.Deterministic("mu", mu, dims="date")
        sigma = pm.HalfNormal("sigma", sigma=0.1)
        pm.Normal("y", mu=mu, sigma=sigma, observed=y_scaled, dims="date")

    scalers = {"y_max": y_max, "x_max": x_max_safe, "t": t}
    return BuiltModel(
        model=model, scalers=scalers, config=config, dates=dates, spend=spend, kpi=kpi
    )
