"""Build-time guards: these construct the PyMC graph (needs the model extra) but never
sample, so they run fast. They pin the robustness checks that stop a corrupt dataset
from silently producing a garbage fit.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

pytest.importorskip("pymc")

from mmm_core.model import ChannelConfig, ChannelType, ModelConfig  # noqa: E402
from mmm_core.model.build import build_model  # noqa: E402


def _frame(n=30):
    idx = pd.date_range("2022-01-03", periods=n, freq="7D", name="week_start")
    rng = np.random.default_rng(0)
    return pd.DataFrame(
        {"kpi": 1000 + rng.normal(0, 10, n), "google": rng.uniform(10, 100, n)}, index=idx
    )


def _cfg(**kw):
    return ModelConfig(kpi="kpi", channels=(ChannelConfig("google", ChannelType.INTENT),), **kw)


def test_control_column_with_nan_raises_before_sampling():
    df = _frame()
    df["price"] = 9.99
    df.iloc[5, df.columns.get_loc("price")] = np.nan
    with pytest.raises(ValueError, match="control column 'price' contains"):
        build_model(df, _cfg(control_columns=("price",)))


def test_kpi_with_nan_raises():
    df = _frame()
    df.iloc[3, df.columns.get_loc("kpi")] = np.nan
    with pytest.raises(ValueError, match="KPI column contains"):
        build_model(df, _cfg())


def test_channel_spend_with_nan_raises():
    df = _frame()
    df.iloc[3, df.columns.get_loc("google")] = np.nan
    with pytest.raises(ValueError, match="channel spend column contains"):
        build_model(df, _cfg())


def test_missing_control_column_raises_keyerror():
    with pytest.raises(KeyError):
        build_model(_frame(), _cfg(control_columns=("nonexistent",)))


def test_clean_control_builds_without_error():
    df = _frame()
    df["price"] = 9.99
    built = build_model(df, _cfg(control_columns=("price",)))
    assert "control_price" in built.model.named_vars
