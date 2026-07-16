"""Modal application: run the fit off the request path, with no time pressure.

Deploy (locally, with your own Modal token — never committed):

    modal deploy mmm_worker/modal_app.py

Secrets come from a Modal Secret named ``mmm-supabase`` holding:
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MMM_RAW_BUCKET, MMM_ARTIFACTS_BUCKET

Flow:
    * ``enqueue`` (web endpoint) — the Next.js backend POSTs a job_id after inserting a
      'queued' job; we spawn ``run_fit`` and return immediately.
    * ``run_fit`` — the fit itself, capped at RUN_TIMEOUT_SECONDS and at most
      MAX_CONCURRENT_RUNS containers at once (see below). Reads sources from Storage,
      runs mmm-core, writes the summary to Postgres and the .nc trace to Storage.
    * ``poll_queue`` (every minute) — safety net that picks up any 'queued' jobs that
      were never enqueued (e.g. a dropped web call).

Cost guardrails (deliberately conservative while testing on small datasets):
    * MAX_CONCURRENT_RUNS caps how many fits Modal will ever run at once. Excess
      invocations queue on Modal's side rather than erroring here — the actual
      user-facing rejection ("er draaien al 2 fits") happens earlier, in the wizard's
      /api/jobs route, which checks in-flight job count before creating a job at all.
      This constant is the infrastructure-level backstop for that check, not a
      replacement for it. Keep both in sync if you ever change the limit.
    * RUN_TIMEOUT_SECONDS caps a single fit's maximum runtime. 15 minutes is generous
      headroom for the small test datasets in use now; raise it deliberately (and
      re-check MAX_CONCURRENT_RUNS's cost impact) before fitting larger, real datasets.
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
    .pip_install("supabase>=2.6", "pandas>=2.1", "openpyxl>=3.1", "fastapi[standard]")
    .add_local_python_source("mmm_worker")
)

app = modal.App("mmm-worker")

_SECRET = modal.Secret.from_name("mmm-supabase")

MAX_CONCURRENT_RUNS = 2
RUN_TIMEOUT_SECONDS = 15 * 60


def _run(job_id: str) -> dict:
    from mmm_worker.prepare import run_prepare
    from mmm_worker.runner import run_job
    from mmm_worker.supabase_backends import (
        SupabaseDatasetStore,
        SupabaseJobStore,
        SupabaseStorage,
        make_client,
    )

    client = make_client()
    jobstore = SupabaseJobStore(client)
    storage = SupabaseStorage(client, os.environ.get("MMM_RAW_BUCKET", "mmm-raw-data"))
    # The .nc trace goes to the artifacts bucket; raw source downloads come from raw.
    artifacts = SupabaseStorage(client, os.environ.get("MMM_ARTIFACTS_BUCKET", "mmm-artifacts"))

    # Compose a storage that downloads from raw and uploads to artifacts (for the fit's
    # heavy trace).
    class _Split:
        def download(self, path):
            return storage.download(path)

        def upload(self, path, data, content_type):
            return artifacts.upload(path, data, content_type)

    # One queue, two job types: a fast 'prepare' (merge + quality-check the raw uploads
    # into one master table) and the heavy 'fit'. Dispatch on the job's type.
    job = jobstore.get_job(job_id)
    if job.get("type") == "prepare":
        # 'prepare' downloads raw sources AND writes its merged master file back into the
        # SAME (raw) bucket — the master file becomes an ordinary source for a later fit
        # job, which only ever downloads from the raw bucket. Writing it to artifacts
        # instead would make it invisible to that download.
        return run_prepare(jobstore, SupabaseDatasetStore(client), storage, job_id)
    return run_job(jobstore, _Split(), job_id)


@app.function(
    image=image,
    secrets=[_SECRET],
    timeout=RUN_TIMEOUT_SECONDS,
    max_containers=MAX_CONCURRENT_RUNS,
)
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
