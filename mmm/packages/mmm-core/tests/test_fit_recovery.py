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

from mmm_core.model import (  # noqa: E402
    ChannelConfig,
    ChannelDGP,
    ChannelType,
    ModelConfig,
    simulate_mmm,
)
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
    return ds, summary


@pytest.mark.slow
def test_model_fits_well(fitted):
    _, summary = fitted
    d = summary.diagnostics
    assert d.r2 > 0.7
    assert d.decomposition_ok
    assert d.max_r_hat < 1.1


@pytest.mark.slow
def test_true_contribution_share_within_credible_interval(fitted):
    ds, summary = fitted
    true_shares = ds.true_contribution_share()
    for ch in summary.channels:
        ci = ch.contribution_share
        assert ci.p3 <= true_shares[ch.name] <= ci.p97, (
            f"{ch.name}: true {true_shares[ch.name]:.3f} not in "
            f"[{ci.p3:.3f}, {ci.p97:.3f}]"
        )


@pytest.mark.slow
def test_true_adstock_half_life_within_credible_interval(fitted):
    ds, summary = fitted
    truth = {c.name: c.half_life for c in ds.channels}
    for ch in summary.channels:
        ci = ch.adstock_half_life_weeks
        assert ci.p3 <= truth[ch.name] <= ci.p97


@pytest.mark.slow
def test_predictive_coverage_is_reasonable(fitted):
    _, summary = fitted
    # a 94% predictive interval should cover most weeks (not far below nominal).
    assert 0.80 <= summary.diagnostics.interval_coverage_94 <= 1.0


@pytest.mark.slow
def test_summary_is_json_serializable(fitted):
    import json

    _, summary = fitted
    blob = json.dumps(summary.to_json_dict())
    assert '"contribution_share"' in blob
    assert '"adstock_half_life_weeks"' in blob
