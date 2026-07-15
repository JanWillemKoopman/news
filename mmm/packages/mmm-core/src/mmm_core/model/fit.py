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
from mmm_core.model.config import (
    AdstockType,
    ChannelConfig,
    LikelihoodType,
    ModelConfig,
    SaturationType,
)
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
class QualityGate:
    """An automatic verdict on whether a fit is trustworthy enough to show a client.

    ``verdict`` is ``"pass"`` / ``"warn"`` / ``"fail"``. ``reasons`` are human-readable
    (Dutch) explanations for anything that is not clean; ``checks`` is the per-check
    boolean map. A ``fail`` means do not publish without investigating.
    """

    verdict: str
    reasons: list[str]
    checks: dict[str, bool]


# Gate thresholds — deliberately explicit so the bar is auditable, not hidden in code.
_RHAT_FAIL, _RHAT_WARN = 1.1, 1.05
_DIVERGENCE_FAIL_FRAC = 0.02      # >2% of samples diverging is a hard fail
_ESS_WARN = 400.0
_COVERAGE_TOL = 0.1
_R2_WARN = 0.3
_CV_MAPE_WARN = 0.25


def _quality_gate(
    d: "Diagnostics",
    n_samples: int,
    *,
    placebo_ok: bool | None = None,
    cv_mape: float | None = None,
) -> "QualityGate":
    """Turn diagnostics (+ optional placebo/CV results) into a pass/warn/fail verdict."""
    checks: dict[str, bool] = {}
    fails: list[str] = []
    warns: list[str] = []

    checks["converged_r_hat"] = d.max_r_hat <= _RHAT_FAIL
    if d.max_r_hat > _RHAT_FAIL:
        fails.append(f"model niet geconvergeerd (max R-hat {d.max_r_hat:.3f} > {_RHAT_FAIL})")
    elif d.max_r_hat > _RHAT_WARN:
        warns.append(f"convergentie krap (max R-hat {d.max_r_hat:.3f})")

    div_frac = d.n_divergences / max(n_samples, 1)
    checks["few_divergences"] = div_frac <= _DIVERGENCE_FAIL_FRAC
    if div_frac > _DIVERGENCE_FAIL_FRAC:
        fails.append(f"te veel divergenties ({d.n_divergences}, {div_frac:.1%} van de samples)")
    elif d.n_divergences > 0:
        warns.append(f"{d.n_divergences} divergentie(s) — resultaat met voorzichtigheid lezen")

    checks["decomposition_adds_up"] = d.decomposition_ok
    if not d.decomposition_ok:
        fails.append("decompositie telt niet op tot het totaal")

    checks["enough_ess"] = d.min_ess_bulk >= _ESS_WARN
    if d.min_ess_bulk < _ESS_WARN:
        warns.append(f"lage effectieve steekproef (min ESS {d.min_ess_bulk:.0f})")

    checks["coverage_ok"] = abs(d.interval_coverage_94 - 0.94) <= _COVERAGE_TOL
    if not checks["coverage_ok"]:
        warns.append(f"onzekerheidsdekking wijkt af ({d.interval_coverage_94:.0%} i.p.v. 94%)")

    checks["explains_data"] = d.r2 >= _R2_WARN
    if d.r2 < _R2_WARN:
        warns.append(f"model verklaart weinig (R² {d.r2:.2f})")

    if placebo_ok is not None:
        checks["placebo_clean"] = placebo_ok
        if not placebo_ok:
            fails.append("placebo-test gezakt: een random kanaal krijgt een te grote bijdrage")

    if cv_mape is not None:
        checks["cross_validation_ok"] = cv_mape <= _CV_MAPE_WARN
        if cv_mape > _CV_MAPE_WARN:
            warns.append(f"zwakke generalisatie (out-of-sample MAPE {cv_mape:.0%})")

    verdict = "fail" if fails else ("warn" if warns else "pass")
    return QualityGate(verdict=verdict, reasons=fails + warns, checks=checks)


@dataclass
class CurvePoint:
    weekly_spend: float
    contribution: Interval            # steady-state KPI contribution at this spend
    extrapolated: bool                # beyond the historically-tested max spend


@dataclass
class ResponseCurve:
    name: str
    current_weekly_spend: float       # average weekly spend over the window
    marginal_roas_at_current: Interval  # return on the next euro at current spend
    points: list[CurvePoint]


@dataclass
class OptimalAllocation:
    """Best split of the *current* total weekly budget across channels (steady state)."""

    total_weekly_budget: float
    per_channel: dict[str, float]
    predicted_contribution: Interval
    capped_channels: list[str]


@dataclass
class FrontierPoint:
    total_weekly_budget: float
    predicted_contribution: Interval   # marketing KPI at the optimal split of this budget


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
    quality_gate: QualityGate | None = None
    response_curves: list[ResponseCurve] = field(default_factory=list)
    optimal_allocation: OptimalAllocation | None = None
    efficiency_frontier: list[FrontierPoint] = field(default_factory=list)

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


def _channel_param_names(ch: ChannelConfig) -> list[str]:
    """The scalar RV names this channel registers, given its adstock/saturation choice.

    Kept in lock-step with :func:`mmm_core.model.build._adstock_rvs` /
    ``_saturation_rvs`` so diagnostics never ask ArviZ for a variable that isn't there.
    """
    names = [f"beta_{ch.name}", f"alpha_{ch.name}"]
    if ch.adstock is AdstockType.DELAYED:
        names.append(f"theta_{ch.name}")
    if ch.saturation is SaturationType.HILL:
        names += [f"halfsat_{ch.name}", f"slope_{ch.name}"]
    else:  # logistic
        names.append(f"lam_{ch.name}")
    return names


def _saturation_point_samples(idata, ch: ChannelConfig, x_max_i: float) -> np.ndarray:
    """Weekly spend at half the channel's ceiling (original units), per saturation family.

    For Hill this is ``kappa`` directly; for logistic it is ``ln(3)/lam`` — both the
    spend at which the response reaches half its maximum, so they are comparable.
    """
    if ch.saturation is SaturationType.HILL:
        return _flat(idata, f"halfsat_{ch.name}") * x_max_i
    lam = _flat(idata, f"lam_{ch.name}")               # steepness on scaled spend
    return (np.log(3.0) / lam) * x_max_i


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
        half_sat_spend = _saturation_point_samples(idata, ch, x_max[i])

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
    var_names = ["intercept", "sigma"]
    for ch in config.channels:
        var_names += _channel_param_names(ch)
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
    if config.likelihood is LikelihoodType.STUDENT_T:
        noise = rng.standard_t(config.student_t_nu, size=mu.shape)
    else:
        noise = rng.standard_normal(mu.shape)
    y_pred = (mu + sigma[None, :] * noise) * y_max
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

    response_curves, optimal_allocation, efficiency_frontier = _planning_outputs(built, idata)
    n_draws = int(idata.posterior.sizes["draw"])
    n_chains = int(idata.posterior.sizes["chain"])
    quality_gate = _quality_gate(diagnostics, n_draws * n_chains)

    return FitSummary(
        kpi=config.kpi,
        n_weeks=len(built.dates),
        window=(str(built.dates.min().date()), str(built.dates.max().date())),
        baseline_contribution=baseline,
        channels=channels,
        diagnostics=diagnostics,
        draws=n_draws,
        chains=n_chains,
        quality_gate=quality_gate,
        response_curves=response_curves,
        optimal_allocation=optimal_allocation,
        efficiency_frontier=efficiency_frontier,
    )


def _planning_outputs(
    built: BuiltModel, idata
) -> tuple[list[ResponseCurve], "OptimalAllocation | None", list[FrontierPoint]]:
    """Response curves, best reallocation of the current budget, and an efficiency frontier
    around it — all from the one posterior.

    Pure post-processing of the fitted samples — no re-sampling — so it is cheap enough to
    run on every fit. Wrapped defensively: a planning-output failure (e.g. the optimizer
    not converging) must never fail an otherwise-good fit.
    """
    from mmm_core.optimize import (
        Interval as _OI,
        efficiency_frontier as _frontier,
        extract_channel_responses,
        marginal_roas,
        optimize_budget,
        response_curve,
    )

    def _iv(x: _OI) -> Interval:
        return Interval(x.p3, x.p50, x.p97)

    curves: list[ResponseCurve] = []
    allocation: OptimalAllocation | None = None
    frontier: list[FrontierPoint] = []
    try:
        responses = extract_channel_responses(built, idata)
        for i, r in enumerate(responses):
            current = float(built.spend[:, i].mean())
            pts = [
                CurvePoint(p.weekly_spend, _iv(p.contribution), p.extrapolated)
                for p in response_curve(r, n_points=25)
            ]
            curves.append(
                ResponseCurve(
                    name=r.name,
                    current_weekly_spend=current,
                    marginal_roas_at_current=_iv(marginal_roas(r, current)),
                    points=pts,
                )
            )
        total_current = float(sum(built.spend[:, i].mean() for i in range(built.spend.shape[1])))
        if total_current > 0:
            alloc = optimize_budget(responses, total_current)
            allocation = OptimalAllocation(
                total_weekly_budget=alloc.total_budget,
                per_channel=alloc.per_channel,
                predicted_contribution=_iv(alloc.predicted_contribution),
                capped_channels=alloc.capped_channels,
            )
            # Sweep total budget around today's level so the client can see whether
            # spending more (or less) in total is worth it — diminishing returns made visible.
            budgets = [total_current * f for f in (0.5, 0.75, 1.0, 1.25, 1.5, 2.0)]
            frontier = [
                FrontierPoint(total_weekly_budget=p.total_budget, predicted_contribution=_iv(p.predicted_contribution))
                for p in _frontier(responses, budgets)
            ]
    except Exception:
        # planning outputs are a bonus on top of the fit; never let them break it
        return curves, allocation, frontier
    return curves, allocation, frontier


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
