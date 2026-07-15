import pandas as pd
import pytest

from fakes import FakeJobStore, FakeStorage, make_stub_fit
from mmm_worker.runner import run_job


def _csv(start, periods, value_col, value):
    dates = pd.date_range(start, periods=periods, freq="D")
    return pd.DataFrame({"date": dates, value_col: value}).to_csv(index=False).encode()


def _job(config, project_id="proj-1", job_id="job-1"):
    return {"id": job_id, "project_id": project_id, "config": config}


def _overlapping_config():
    return {
        "sources": [
            {"name": "revenue", "storage_path": "rev.csv", "date_column": "date",
             "columns": [{"name": "revenue", "role": "kpi"}]},
            {"name": "google", "storage_path": "g.csv", "date_column": "date",
             "columns": [{"name": "spend", "role": "spend", "output_name": "google_spend"}]},
        ],
        "model": {"kpi": "revenue", "channels": [{"name": "google_spend", "channel_type": "intent"}]},
        "sample": {"draws": 100, "tune": 100, "chains": 2, "bogus": 1},
    }


def test_happy_path_persists_summary_and_uploads_trace():
    files = {"rev.csv": _csv("2022-01-03", 84, "revenue", 1000.0),
             "g.csv": _csv("2022-01-03", 84, "spend", 50.0)}
    store = FakeJobStore(_job(_overlapping_config()))
    storage = FakeStorage(files)
    fit = make_stub_fit()

    result = run_job(store, storage, "job-1", fit_fn=fit, netcdf_bytes=lambda idata: b"NETCDF")

    assert result["status"] == "succeeded"
    assert store.status == "succeeded"
    assert len(store.runs) == 1
    assert store.runs[0]["summary"]["kpi"] == "revenue"
    # bogus sample key filtered out before reaching the fit
    assert fit.calls[0]["kwargs"] == {"draws": 100, "tune": 100, "chains": 2}
    # heavy trace uploaded under runs/<project>/<job>.nc
    assert store.runs[0]["inference_data_path"] == "runs/proj-1/job-1.nc"
    assert storage.uploads["runs/proj-1/job-1.nc"] == b"NETCDF"


def test_data_quality_error_fails_job_without_fitting():
    # revenue and spend never overlap -> ingestion reports an error, fit must not run.
    files = {"rev.csv": _csv("2022-01-03", 30, "revenue", 1000.0),
             "g.csv": _csv("2022-06-01", 30, "spend", 50.0)}
    store = FakeJobStore(_job(_overlapping_config()))
    fit = make_stub_fit()

    result = run_job(store, FakeStorage(files), "job-1", fit_fn=fit, netcdf_bytes=lambda i: b"")

    assert result["status"] == "failed"
    assert result["reason"] == "data_quality"
    assert store.status == "failed"
    assert fit.calls == []          # never fitted
    assert store.runs == []


def test_invalid_config_is_permanent_failure():
    bad = _overlapping_config()
    del bad["model"]
    store = FakeJobStore(_job(bad))
    fit = make_stub_fit()

    result = run_job(store, FakeStorage({}), "job-1", fit_fn=fit)

    assert result["status"] == "failed"
    assert result["reason"] == "invalid_config"
    assert fit.calls == []


def test_trace_upload_failure_does_not_lose_summary():
    files = {"rev.csv": _csv("2022-01-03", 84, "revenue", 1000.0),
             "g.csv": _csv("2022-01-03", 84, "spend", 50.0)}
    store = FakeJobStore(_job(_overlapping_config()))

    def boom(idata):
        raise RuntimeError("storage down")

    result = run_job(store, FakeStorage(files), "job-1", fit_fn=make_stub_fit(), netcdf_bytes=boom)

    assert result["status"] == "succeeded"           # summary still saved
    assert store.runs[0]["inference_data_path"] is None
