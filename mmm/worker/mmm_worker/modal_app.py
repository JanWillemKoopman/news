"""Modal application: run the fit off the request path, with no time pressure.

Deploy (locally, with your own Modal token — never committed):

    modal deploy mmm_worker/modal_app.py

Secrets come from a Modal Secret named ``mmm-supabase`` holding:
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MMM_RAW_BUCKET, MMM_ARTIFACTS_BUCKET

Flow:
    * ``enqueue`` (web endpoint) — the Next.js backend POSTs a job_id after inserting a
      'queued' job; we spawn ``run_fit`` and return immediately.
    * ``run_fit`` — the long-running fit (timeout 1h). Reads sources from Storage, runs
      mmm-core, writes the summary to Postgres and the .nc trace to Storage.
    * ``poll_queue`` (every minute) — safety net that picks up any 'queued' jobs that
      were never enqueued (e.g. a dropped web call).
"""

from __future__ import annotations

import os
import pathlib

import modal

# mmm-core is a local package (mmm/packages/mmm-core), never published to PyPI, so it
# cannot be `pip install`-ed by name. We copy its source into the build context and
# install it from that local path instead — this needs no local pip/editable install on
# the machine running `modal deploy`, just the source tree from the git clone.
_HERE = pathlib.Path(__file__).parent
_MMM_CORE_DIR = (_HERE.parent.parent / "packages" / "mmm-core").resolve()

image = (
    modal.Image.debian_slim(python_version="3.11")
    .add_local_dir(str(_MMM_CORE_DIR), remote_path="/root/mmm-core", copy=True)
    .run_commands("pip install '/root/mmm-core[model]'")
    .pip_install("supabase>=2.6", "pandas>=2.1", "openpyxl>=3.1")
    .add_local_python_source("mmm_worker")
)

app = modal.App("mmm-worker")

_SECRET = modal.Secret.from_name("mmm-supabase")


def _run(job_id: str) -> dict:
    from mmm_worker.runner import run_job
    from mmm_worker.supabase_backends import (
        SupabaseJobStore,
        SupabaseStorage,
        make_client,
    )

    client = make_client()
    jobstore = SupabaseJobStore(client)
    storage = SupabaseStorage(client, os.environ.get("MMM_RAW_BUCKET", "mmm-raw-data"))
    # Uploads (the .nc trace) go to the artifacts bucket; downloads (raw data) to raw.
    artifacts = SupabaseStorage(client, os.environ.get("MMM_ARTIFACTS_BUCKET", "mmm-artifacts"))

    # Compose a storage that downloads from raw and uploads to artifacts.
    class _Split:
        def download(self, path):
            return storage.download(path)

        def upload(self, path, data, content_type):
            return artifacts.upload(path, data, content_type)

    return run_job(jobstore, _Split(), job_id)


@app.function(image=image, secrets=[_SECRET], timeout=3600)
def run_fit(job_id: str) -> dict:
    return _run(job_id)


@app.function(image=image, secrets=[_SECRET])
@modal.fastapi_endpoint(method="POST")
def enqueue(job_id: str):
    call = run_fit.spawn(job_id)
    return {"spawned": True, "call_id": call.object_id}


@app.function(image=image, secrets=[_SECRET], schedule=modal.Period(minutes=1))
def poll_queue() -> int:
    """Pick up any stray 'queued' jobs and spawn a fit for each."""
    from mmm_worker.supabase_backends import _SCHEMA, make_client

    client = make_client()
    rows = (
        client.schema(_SCHEMA)
        .table("jobs")
        .select("id")
        .eq("status", "queued")
        .order("created_at")
        .limit(10)
        .execute()
    )
    for row in rows.data or []:
        run_fit.spawn(row["id"])
    return len(rows.data or [])
