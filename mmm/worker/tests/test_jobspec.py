import pytest

from mmm_core import Role
from mmm_core.model import ChannelType
from mmm_worker.jobspec import parse_job_config


def _valid_config():
    return {
        "sources": [
            {"name": "revenue", "storage_path": "rev.csv", "date_column": "week",
             "columns": [{"name": "revenue", "role": "kpi"}]},
            {"name": "google", "storage_path": "g.csv", "date_column": "date",
             "columns": [{"name": "spend", "role": "spend", "output_name": "google_spend"}]},
        ],
        "model": {
            "kpi": "revenue",
            "channels": [{"name": "google_spend", "channel_type": "intent", "l_max": 8}],
            "seasonality_periods": 52, "n_fourier_modes": 2,
        },
        "sample": {"draws": 200, "tune": 200, "chains": 2, "unknown": 99},
    }


def test_parse_valid_config():
    spec = parse_job_config(_valid_config())
    assert [s.storage_path for s in spec.sources] == ["rev.csv", "g.csv"]
    assert spec.sources[1].spec.columns[0].role is Role.SPEND
    assert spec.sources[1].spec.columns[0].resolved_name() == "google_spend"
    assert spec.model.kpi == "revenue"
    assert spec.model.channels[0].channel_type is ChannelType.INTENT
    assert spec.model.channels[0].l_max == 8


def test_sample_kwargs_are_whitelisted():
    spec = parse_job_config(_valid_config())
    assert spec.sample == {"draws": 200, "tune": 200, "chains": 2}


def test_missing_model_raises():
    cfg = _valid_config()
    del cfg["model"]
    with pytest.raises(ValueError):
        parse_job_config(cfg)


def test_no_sources_raises():
    cfg = _valid_config()
    cfg["sources"] = []
    with pytest.raises(ValueError):
        parse_job_config(cfg)


def test_bad_role_raises():
    cfg = _valid_config()
    cfg["sources"][0]["columns"][0]["role"] = "not-a-role"
    with pytest.raises(ValueError):
        parse_job_config(cfg)
