import numpy as np
import pytest

from mmm_core.optimize import (
    ChannelResponse,
    average_roas,
    marginal_roas,
    optimize_budget,
    predict_total_contribution,
    response_curve,
)


def _channel(name, beta=0.4, half_sat=0.3, slope=1.0, x_max=1000.0, y_max=50000.0,
             hist_max=800.0, n=400, spread=0.02, seed=0):
    """A channel with tight posterior samples around fixed parameters (concave, slope=1)."""
    rng = np.random.default_rng(seed)
    return ChannelResponse(
        name=name,
        beta=rng.normal(beta, beta * spread, n),
        half_saturation=rng.normal(half_sat, half_sat * spread, n),
        slope=rng.normal(slope, slope * spread, n),
        x_max=x_max,
        y_max=y_max,
        hist_max_weekly_spend=hist_max,
    )


def test_response_curve_is_monotonic_and_flags_extrapolation():
    ch = _channel("search")
    curve = response_curve(ch, n_points=30, cap_factor=1.2)
    mids = [p.contribution.p50 for p in curve]
    assert all(b >= a - 1e-9 for a, b in zip(mids, mids[1:]))  # non-decreasing
    assert curve[0].contribution.p50 == pytest.approx(0.0, abs=1e-6)  # zero spend -> ~0
    # points beyond the historical max are flagged as extrapolated.
    assert any(p.extrapolated for p in curve)
    assert all(not p.extrapolated for p in curve if p.weekly_spend <= ch.hist_max_weekly_spend)


def test_marginal_roas_is_positive_and_below_average_for_concave_channel():
    ch = _channel("search", slope=1.0)
    spend = 400.0
    m = marginal_roas(ch, spend)
    a = average_roas(ch, spend)
    assert m.p50 > 0
    # diminishing returns: the next euro returns less than the average euro so far.
    assert m.p50 < a.p50


def test_marginal_roas_decreases_with_spend():
    ch = _channel("search", slope=1.0)
    low = marginal_roas(ch, 200.0).p50
    high = marginal_roas(ch, 700.0).p50
    assert high < low


def test_optimize_allocates_more_to_the_more_efficient_channel():
    # same shape, but 'strong' has a higher ceiling -> should receive more budget.
    strong = _channel("strong", beta=0.6, hist_max=800.0, seed=1)
    weak = _channel("weak", beta=0.2, hist_max=800.0, seed=2)
    alloc = optimize_budget([strong, weak], total_budget=600.0)
    assert alloc.per_channel["strong"] > alloc.per_channel["weak"]
    assert sum(alloc.per_channel.values()) == pytest.approx(600.0, rel=1e-3)


def test_optimize_respects_safety_caps():
    a = _channel("a", hist_max=100.0, seed=1)
    b = _channel("b", hist_max=100.0, seed=2)
    # budget exceeds the sum of both caps (100*1.2*2 = 240); allocation clamps to caps.
    alloc = optimize_budget([a, b], total_budget=1000.0, cap_factor=1.2)
    assert alloc.per_channel["a"] <= 120.0 + 1e-6
    assert alloc.per_channel["b"] <= 120.0 + 1e-6
    assert alloc.total_budget == pytest.approx(240.0)
    assert set(alloc.capped_channels) == {"a", "b"}


def test_predict_total_contribution_has_interval():
    ch = _channel("search")
    iv = predict_total_contribution([ch], {"search": 400.0})
    assert iv.p3 <= iv.p50 <= iv.p97


def test_predicted_revenue_grows_with_budget():
    strong = _channel("strong", beta=0.6, seed=1)
    weak = _channel("weak", beta=0.2, seed=2)
    small = optimize_budget([strong, weak], total_budget=300.0)
    large = optimize_budget([strong, weak], total_budget=900.0)
    assert large.predicted_contribution.p50 > small.predicted_contribution.p50


def test_negative_budget_raises():
    ch = _channel("x")
    with pytest.raises(ValueError):
        optimize_budget([ch], total_budget=0.0)
