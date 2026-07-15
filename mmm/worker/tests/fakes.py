"""In-memory fakes for the worker ports, plus a stub fit function.

These let us test the whole orchestration (status transitions, storage split, error
handling) without Supabase, Modal or a real PyMC fit.
"""

from __future__ import annotations

from dataclasses import dataclass, field


class FakeJobStore:
    def __init__(self, job: dict):
        self.job = job
        self.status = job.get("status", "queued")
        self.error: str | None = None
        self.runs: list[dict] = []

    def get_job(self, job_id: str) -> dict:
        return self.job

    def mark_running(self, job_id: str) -> None:
        self.status = "running"

    def mark_succeeded(self, job_id: str) -> None:
        self.status = "succeeded"

    def mark_failed(self, job_id: str, error: str) -> None:
        self.status = "failed"
        self.error = error

    def save_model_run(self, project_id, job_id, summary, quality, inference_data_path) -> str:
        self.runs.append(
            {
                "project_id": project_id,
                "job_id": job_id,
                "summary": summary,
                "quality": quality,
                "inference_data_path": inference_data_path,
            }
        )
        return "run-1"


class FakeStorage:
    def __init__(self, files: dict[str, bytes]):
        self.files = dict(files)
        self.uploads: dict[str, bytes] = {}

    def download(self, path: str) -> bytes:
        return self.files[path]

    def upload(self, path: str, data: bytes, content_type: str) -> None:
        self.uploads[path] = data


@dataclass
class StubSummary:
    payload: dict = field(default_factory=lambda: {"channels": [], "kpi": "revenue"})

    def to_json_dict(self) -> dict:
        return self.payload


def make_stub_fit(summary=None):
    """Return a fit_fn(data, model, **kw) that records its call and returns a stub."""
    calls = []

    def fit_fn(data, model, **kwargs):
        calls.append(
            {"n_rows": len(data), "columns": list(data.columns), "model": model, "kwargs": kwargs}
        )
        return (summary or StubSummary()), object()  # (summary, fake idata)

    fit_fn.calls = calls
    return fit_fn
