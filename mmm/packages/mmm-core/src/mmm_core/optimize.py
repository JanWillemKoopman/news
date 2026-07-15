"""Response curves, marginal ROAS and budget optimisation.

These are the "Toekomst & Planning" outputs: given the fitted posterior, what does each
channel return at a given weekly spend, what does the *next* euro return (mROAS), and how
should a budget be split to maximise the KPI.

Key simplification: at **steady state** (a constant weekly spend), geometric adstock with
normalised weights is the identity (constant in → constant out), so the steady-state
response is just ``beta * hill(spend)``. That makes the curves clean functions of spend.

Safety rule from the build plan: never extrapolate a channel beyond a small margin above
its **historically tested** maximum weekly spend without flagging it. Points past that
cap are marked ``extrapolated=True``; the optimiser caps allocations there by default.

Everything here is pure numpy/scipy over posterior sample arrays, so it is testable
without running a fit — construct the samples directly.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

# Numerical offset mirroring the model's Hill (mmm_core.model.build._HILL_EPS).
_HILL_EPS = 1e-6
# Default safety margin above the historically tested maximum weekly spend.
_DEFAULT_CAP_FACTOR = 1.2


@dataclass
class ChannelResponse:
    """Posterior response parameters for one channel, in real spend/KPI units.

    Attributes are posterior sample arrays of shape ``(n_samples,)`` unless noted.

    Args:
        name: Channel name.
        beta: Channel ceiling (scaled-KPI units), posterior samples.
        half_saturation: Half-saturation on *scaled* spend in ``(0, 1]``, posterior.
        slope: Hill slope, posterior.
        x_max: Spend scaler (the max weekly spend used to scale the channel at fit time).
        y_max: KPI scaler.
        hist_max_weekly_spend: Highest weekly spend actually observed for this channel.
    """

    name: str
    beta: np.ndarray
    half_saturation: np.ndarray
    slope: np.ndarray
    x_max: float
    y_max: float
    hist_max_weekly_spend: float

    def _hill(self, u: float) -> np.ndarray:
        return (u + _HILL_EPS) ** self.slope / (
            self.half_saturation ** self.slope + (u + _HILL_EPS) ** self.slope
        )

    def contribution_samples(self, weekly_spend: float) -> np.ndarray:
        """Steady-state KPI contribution at a constant ``weekly_spend`` (posterior samples).

        The tiny ``_HILL_EPS`` pedestal (present only for gradient stability during the
        fit) is subtracted here so the reported curve is exactly 0 at zero spend.
        """
        if weekly_spend < 0:
            raise ValueError("weekly_spend must be non-negative")
        u = weekly_spend / self.x_max
        return self.beta * (self._hill(u) - self._hill(0.0)) * self.y_max

    def cap(self, cap_factor: float = _DEFAULT_CAP_FACTOR) -> float:
        return self.hist_max_weekly_spend * cap_factor


@dataclass
class Interval:
    p3: float
    p50: float
    p97: float

    @staticmethod
    def of(samples: np.ndarray) -> "Interval":
        lo, mid, hi = np.percentile(samples, [3, 50, 97])
        return Interval(float(lo), float(mid), float(hi))


@dataclass
class ResponsePoint:
    weekly_spend: float
    contribution: Interval
    extrapolated: bool


def response_curve(
    channel: ChannelResponse,
    *,
    n_points: int = 40,
    cap_factor: float = _DEFAULT_CAP_FACTOR,
) -> list[ResponsePoint]:
    """Steady-state response curve from 0 up to ``cap_factor`` × historical max spend."""
    top = channel.cap(cap_factor)
    grid = np.linspace(0.0, top, n_points)
    points = []
    for x in grid:
        points.append(
            ResponsePoint(
                weekly_spend=float(x),
                contribution=Interval.of(channel.contribution_samples(float(x))),
                extrapolated=bool(x > channel.hist_max_weekly_spend),
            )
        )
    return points


def marginal_roas(channel: ChannelResponse, at_weekly_spend: float, *, h: float | None = None) -> Interval:
    """Marginal ROAS: the KPI return on the next euro at ``at_weekly_spend`` (posterior)."""
    if h is None:
        h = max(channel.x_max * 1e-4, 1e-6)
    lo = max(at_weekly_spend - h, 0.0)
    hi = at_weekly_spend + h
    d = (channel.contribution_samples(hi) - channel.contribution_samples(lo)) / (hi - lo)
    return Interval.of(d)


def average_roas(channel: ChannelResponse, at_weekly_spend: float) -> Interval:
    """Average ROAS at a spend level: total contribution / spend (posterior)."""
    if at_weekly_spend <= 0:
        raise ValueError("average ROAS is undefined at zero spend")
    return Interval.of(channel.contribution_samples(at_weekly_spend) / at_weekly_spend)


@dataclass
class Allocation:
    per_channel: dict[str, float]
    total_budget: float
    predicted_contribution: Interval   # total KPI from marketing at this allocation
    capped_channels: list[str]         # channels pushed to their safety cap


def predict_total_contribution(
    channels: list[ChannelResponse], allocation: dict[str, float]
) -> Interval:
    """Posterior total marketing contribution for a given per-channel weekly allocation."""
    by_name = {c.name: c for c in channels}
    total = None
    for name, spend in allocation.items():
        samples = by_name[name].contribution_samples(spend)
        total = samples if total is None else total + samples
    return Interval.of(total)


def optimize_budget(
    channels: list[ChannelResponse],
    total_budget: float,
    *,
    cap_factor: float = _DEFAULT_CAP_FACTOR,
) -> Allocation:
    """Split ``total_budget`` across channels to maximise the (median) steady-state KPI.

    Optimises on the posterior-median response curves (subject to each channel's safety
    cap), then evaluates the resulting allocation across the full posterior to attach a
    credible interval to the predicted contribution.
    """
    from scipy.optimize import minimize

    if total_budget <= 0:
        raise ValueError("total_budget must be > 0")

    caps = np.array([c.cap(cap_factor) for c in channels])
    # Median parameters give a smooth deterministic objective for the optimiser.
    med = [
        (np.median(c.beta), np.median(c.half_saturation), np.median(c.slope), c.x_max, c.y_max)
        for c in channels
    ]

    def contrib_median(x, params):
        beta, hs, slope, x_max, y_max = params
        u = x / x_max
        g = (u + _HILL_EPS) ** slope / (hs ** slope + (u + _HILL_EPS) ** slope)
        return beta * g * y_max

    def neg_total(x):
        return -sum(contrib_median(xi, p) for xi, p in zip(x, med))

    n = len(channels)
    feasible_total = min(total_budget, float(caps.sum()))
    x0 = np.full(n, feasible_total / n)
    bounds = [(0.0, cap) for cap in caps]
    constraints = [{"type": "eq", "fun": lambda x: np.sum(x) - feasible_total}]

    res = minimize(neg_total, x0, method="SLSQP", bounds=bounds, constraints=constraints)
    alloc = {c.name: float(max(xi, 0.0)) for c, xi in zip(channels, res.x)}

    capped = [c.name for c, xi in zip(channels, res.x) if xi >= c.cap(cap_factor) - 1e-6]
    predicted = predict_total_contribution(channels, alloc)
    return Allocation(
        per_channel=alloc,
        total_budget=float(feasible_total),
        predicted_contribution=predicted,
        capped_channels=capped,
    )


def extract_channel_responses(built, idata) -> list[ChannelResponse]:
    """Build :class:`ChannelResponse` objects from a fitted model + InferenceData."""
    y_max = float(built.scalers["y_max"])
    x_max = np.asarray(built.scalers["x_max"], dtype=float)
    responses = []
    for i, ch in enumerate(built.config.channels):
        def flat(var):
            return idata.posterior[var].stack(sample=("chain", "draw")).to_numpy()

        responses.append(
            ChannelResponse(
                name=ch.name,
                beta=flat(f"beta_{ch.name}"),
                half_saturation=flat(f"halfsat_{ch.name}"),
                slope=flat(f"slope_{ch.name}"),
                x_max=float(x_max[i]),
                y_max=y_max,
                hist_max_weekly_spend=float(built.spend[:, i].max()),
            )
        )
    return responses
