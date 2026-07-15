"""Concrete Supabase-backed implementations of the worker ports.

Connects with the **service_role** key (worker-only, bypasses RLS). This module is only
imported in the deployed worker; the ``supabase`` dependency is in the ``runtime`` extra
and is not needed to run the unit tests. Nothing here reads secrets from anywhere but the
environment — never hard-code keys.
"""

from __future__ import annotations

import os

from mmm_worker.ports import JobStore, Storage

_SCHEMA = os.environ.get("MMM_DB_SCHEMA", "mmm")


def make_client():
    """Create a Supabase client from environment variables (service_role)."""
    from supabase import create_client

    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]  # secret; provided via Modal Secret
    return create_client(url, key)


class SupabaseJobStore(JobStore):
    def __init__(self, client, schema: str = _SCHEMA):
        self._client = client
        self._schema = schema

    def _table(self, name: str):
        return self._client.schema(self._schema).table(name)

    def get_job(self, job_id: str) -> dict:
        return self._table("jobs").select("*").eq("id", job_id).single().execute().data

    def mark_running(self, job_id: str) -> None:
        self._table("jobs").update(
            {"status": "running", "started_at": "now()"}
        ).eq("id", job_id).execute()

    def mark_succeeded(self, job_id: str) -> None:
        self._table("jobs").update(
            {"status": "succeeded", "finished_at": "now()"}
        ).eq("id", job_id).execute()

    def mark_failed(self, job_id: str, error: str) -> None:
        self._table("jobs").update(
            {"status": "failed", "finished_at": "now()", "error": error}
        ).eq("id", job_id).execute()

    def save_model_run(
        self, project_id, job_id, summary, quality, inference_data_path
    ) -> str:
        row = (
            self._table("model_runs")
            .insert(
                {
                    "project_id": project_id,
                    "job_id": job_id,
                    "summary": summary,
                    "quality": quality,
                    "inference_data_path": inference_data_path,
                }
            )
            .execute()
        )
        return row.data[0]["id"]


class SupabaseStorage(Storage):
    def __init__(self, client, bucket: str):
        self._bucket = client.storage.from_(bucket)

    def download(self, path: str) -> bytes:
        return self._bucket.download(path)

    def upload(self, path: str, data: bytes, content_type: str) -> None:
        self._bucket.upload(
            path, data, {"content-type": content_type, "upsert": "true"}
        )
