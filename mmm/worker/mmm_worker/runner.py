"""Orchestrate one fit job: download sources -> align -> fit -> persist.

This is the whole point of the async worker: a fit can take minutes, so it runs here on
Modal without any request-path time limit. The function is pure of Supabase/Modal — it
talks only to the :mod:`mmm_worker.ports` interfaces — so it is unit-tested with fakes.

The split the architecture asks for is enforced here: the small aggregated ``summary``
JSON goes to Postgres (via ``save_model_run``); the heavy raw ``InferenceData`` is
uploaded to Storage as a compressed ``.nc`` and only referenced by path.
"""

from __future__ import annotations

import os
import tempfile

from mmm_core import build_master_dataset

from mmm_worker.jobspec import parse_job_config
from mmm_worker.ports import JobStore, Storage
from mmm_worker.tables import read_table


def _default_netcdf_bytes(idata) -> bytes:
    """Serialize ArviZ InferenceData to netCDF bytes via a temp file."""
    fd, path = tempfile.mkstemp(suffix=".nc")
    os.close(fd)
    try:
        idata.to_netcdf(path)
        with open(path, "rb") as fh:
            return fh.read()
    finally:
        os.unlink(path)


def _quality_to_json(report) -> dict:
    return {
        "issues": [
            {
                "code": i.code,
                "severity": i.severity.value,
                "message": i.message,
                "source": i.source,
                "details": i.details,
            }
            for i in report
        ]
    }


def run_job(
    jobstore: JobStore,
    storage: Storage,
    job_id: str,
    *,
    fit_fn=None,
    netcdf_bytes=_default_netcdf_bytes,
    artifact_prefix: str = "runs",
) -> dict:
    """Run one fit job end-to-end. Returns a small status dict; never raises for
    handled failures (data-quality errors, fit errors) — the job row is marked failed
    and the reason returned."""
    if fit_fn is None:
        # Imported lazily so the heavy model stack is only required when actually fitting.
        from mmm_core.model.fit import fit_model as fit_fn  # type: ignore

    job = jobstore.get_job(job_id)
    project_id = job["project_id"]
    jobstore.mark_running(job_id)

    try:
        spec = parse_job_config(job["config"])
    except Exception as exc:  # malformed config is a permanent failure
        jobstore.mark_failed(job_id, f"invalid job config: {exc}")
        return {"status": "failed", "reason": "invalid_config", "error": str(exc)}

    try:
        frames = []
        for ref in spec.sources:
            raw = storage.download(ref.storage_path)
            frames.append((ref.spec, read_table(ref.storage_path, raw)))

        build = build_master_dataset(
            frames, event_dummies=list(spec.event_dummies), features=list(spec.features)
        )
        quality = _quality_to_json(build.report)

        if build.report.has_errors:
            reason = "; ".join(i.message for i in build.report.errors)
            jobstore.mark_failed(job_id, f"data quality errors: {reason}")
            return {"status": "failed", "reason": "data_quality", "quality": quality}

        summary, idata = fit_fn(build.data, spec.model, **spec.sample)

        # Heavy trace -> Storage; small summary -> Postgres.
        artifact_path: str | None = None
        try:
            data = netcdf_bytes(idata)
            artifact_path = f"{artifact_prefix}/{project_id}/{job_id}.nc"
            storage.upload(artifact_path, data, "application/x-netcdf")
        except Exception:
            artifact_path = None  # a missing trace must not lose the usable summary

        run_id = jobstore.save_model_run(
            project_id=project_id,
            job_id=job_id,
            summary=summary.to_json_dict(),
            quality=quality,
            inference_data_path=artifact_path,
        )
        jobstore.mark_succeeded(job_id)
        return {
            "status": "succeeded",
            "model_run_id": run_id,
            "inference_data_path": artifact_path,
        }

    except Exception as exc:
        jobstore.mark_failed(job_id, f"{type(exc).__name__}: {exc}")
        return {"status": "failed", "reason": "exception", "error": str(exc)}
