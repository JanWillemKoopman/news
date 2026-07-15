"""End-to-end: fit the model on synthetic data and check it recovers ground truth.

Marked ``slow`` (runs a real NUTS fit, ~30s) and needs the ``[model]`` extra:

    uv run pytest -m slow

This is the proof the build plan asks for — the statistical core scored against a
dataset whose true contributions we know, not against itself.
"""

from __future__ import annotations

import warnings

import numpy as np
import pytest

pytest.importorskip("pymc")
pytest.importorskip("numpyro")

import numpy as np  # noqa: E402

from mmm_core.model import (  # noqa: E402
    AdstockType,
    ChannelConfig,
    ChannelDGP,
    ChannelType,
    LikelihoodType,
    ModelConfig,
    SaturationType,
    simulate_mmm,
)
from mmm_core.model.build import build_model  # noqa: E402
from mmm_core.model.fit import fit_model  # noqa: E402


@pytest.fixture(scope="module")
def fitted():
    warnings.filterwarnings("ignore")
    ds = simulate_mmm(
        [
            ChannelDGP("search", half_life=1.0, half_saturation=90.0, beta=2500.0),
            ChannelDGP("video", half_life=5.0, half_saturation=220.0, beta=1800.0, slope=1.4),
        ],
        n_weeks=104,
        noise_sd=120.0,
        seed=7,
    )
    cfg = ModelConfig(
        kpi="kpi",
        channels=(
            ChannelConfig("search", ChannelType.INTENT),
            ChannelConfig("video", ChannelType.BRAND),
        ),
    )
    summary, idata = fit_model(ds.data, cfg, draws=500, tune=500, chains=2, seed=0)
    built = build_model(ds.data, cfg)  # cheap: builds the graph, no sampling
    return ds, summary, built, idata


@pytest.mark.slow
def test_model_fits_well(fitted):
    _, summary, _, _ = fitted
    d = summary.diagnostics
    assert d.r2 > 0.7
    assert d.decomposition_ok
    assert d.max_r_hat < 1.1


@pytest.mark.slow
def test_true_contribution_share_within_credible_interval(fitted):
    ds, summary, _, _ = fitted
    true_shares = ds.true_contribution_share()
    for ch in summary.channels:
        ci = ch.contribution_share
        assert ci.p3 <= true_shares[ch.name] <= ci.p97, (
            f"{ch.name}: true {true_shares[ch.name]:.3f} not in "
            f"[{ci.p3:.3f}, {ci.p97:.3f}]"
        )


@pytest.mark.slow
def test_true_adstock_half_life_within_credible_interval(fitted):
    ds, summary, _, _ = fitted
    truth = {c.name: c.half_life for c in ds.channels}
    for ch in summary.channels:
        ci = ch.adstock_half_life_weeks
        assert ci.p3 <= truth[ch.name] <= ci.p97


@pytest.mark.slow
def test_predictive_coverage_is_reasonable(fitted):
    _, summary, _, _ = fitted
    # a 94% predictive interval should cover most weeks (not far below nominal).
    assert 0.80 <= summary.diagnostics.interval_coverage_94 <= 1.0


@pytest.mark.slow
def test_summary_is_json_serializable(fitted):
    import json

    _, summary, _, _ = fitted
    blob = json.dumps(summary.to_json_dict())
    assert '"contribution_share"' in blob
    assert '"adstock_half_life_weeks"' in blob


@pytest.fixture(scope="module")
def fitted_full_toolbox():
    """A fit that exercises every new capability at once: delayed adstock, logistic
    saturation, a Student-T likelihood and a control column."""
    warnings.filterwarnings("ignore")
    ds = simulate_mmm(
        [
            ChannelDGP("search", half_life=1.0, half_saturation=90.0, beta=2500.0),
            ChannelDGP("tv", half_life=5.0, half_saturation=220.0, beta=1800.0, slope=1.4),
        ],
        n_weeks=90,
        noise_sd=120.0,
        seed=11,
    )
    data = ds.data.copy()
    rng = np.random.default_rng(3)
    data["price"] = 10.0 + rng.normal(0.0, 0.5, len(data))
    cfg = ModelConfig(
        kpi="kpi",
        channels=(
            ChannelConfig("search", ChannelType.INTENT, saturation=SaturationType.LOGISTIC),
            ChannelConfig("tv", ChannelType.BRAND, adstock=AdstockType.DELAYED),
        ),
        control_columns=("price",),
        likelihood=LikelihoodType.STUDENT_T,
        student_t_nu=5.0,
    )
    summary, idata = fit_model(data, cfg, draws=400, tune=400, chains=2, seed=0)
    built = build_model(data, cfg)
    return ds, summary, built, idata


@pytest.mark.slow
def test_full_toolbox_variant_is_internally_consistent(fitted_full_toolbox):
    import json

    _, summary, built, idata = fitted_full_toolbox
    d = summary.diagnostics
    assert d.decomposition_ok            # baseline + channels reconstruct the fit
    assert d.max_r_hat < 1.1             # converged
    assert d.r2 > 0.7                    # explains the data
    assert np.isfinite(summary.channels[0].saturation_point.p50)  # logistic sat-point finite
    json.dumps(summary.to_json_dict())   # summary stays JSON-serializable

    # response/optimize must also work end-to-end for the mixed-saturation posterior.
    from mmm_core.optimize import extract_channel_responses, optimize_budget, response_curve

    responses = extract_channel_responses(built, idata)
    curve = response_curve(responses[0], n_points=15)
    mids = [p.contribution.p50 for p in curve]
    assert all(b >= a - 1e-6 for a, b in zip(mids, mids[1:]))
    alloc = optimize_budget(responses, total_budget=sum(r.hist_max_weekly_spend for r in responses))
    assert alloc.predicted_contribution.p50 > 0


@pytest.mark.slow
def test_response_curves_and_optimization_from_real_posterior(fitted):
    from mmm_core.optimize import (
        extract_channel_responses,
        optimize_budget,
        response_curve,
    )

    _, _, built, idata = fitted
    responses = extract_channel_responses(built, idata)
    assert {r.name for r in responses} == {"search", "video"}

    # a real posterior yields a monotone, uncertainty-bearing response curve.
    curve = response_curve(responses[0], n_points=20)
    mids = [p.contribution.p50 for p in curve]
    assert all(b >= a - 1e-6 for a, b in zip(mids, mids[1:]))
    assert curve[-1].contribution.p97 > curve[-1].contribution.p3  # visible uncertainty

    total_hist = sum(r.hist_max_weekly_spend for r in responses)
    alloc = optimize_budget(responses, total_budget=total_hist)
    assert sum(alloc.per_channel.values()) == pytest.approx(total_hist, rel=1e-2)
    assert alloc.predicted_contribution.p50 > 0
