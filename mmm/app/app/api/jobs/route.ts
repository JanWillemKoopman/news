import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Must match `max_containers` on `run_fit` in mmm/worker/mmm_worker/modal_app.py — this
// check is what actually produces a message for the user; max_containers on Modal is
// the infrastructure-level backstop that holds even if this check is ever bypassed
// (e.g. a job inserted directly, or a race between two near-simultaneous requests).
const MAX_CONCURRENT_JOBS = 2;

// Create a fit job (status 'queued') and best-effort nudge the Modal worker. If the
// enqueue call fails or isn't configured, the worker's poll_queue fallback picks it up.
export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer?.isBuilder) {
    return NextResponse.json({ error: "geen toegang" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.project_id || !body?.config) {
    return NextResponse.json({ error: "project_id en config zijn verplicht" }, { status: 400 });
  }

  const supabase = createClient();

  // 'queued' counts too, not just 'running': a queued job is about to consume a slot
  // (enqueue/poll_queue promotes it within seconds to a minute), so treating only
  // 'running' as occupied would let a burst of requests slip through the gap.
  const { count: inFlight } = await supabase
    .schema("mmm")
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .in("status", ["queued", "running"]);

  if ((inFlight ?? 0) >= MAX_CONCURRENT_JOBS) {
    return NextResponse.json(
      {
        error: `Er draaien (of wachten) al ${MAX_CONCURRENT_JOBS} fits. Wacht tot er een klaar is voordat je een nieuwe start.`,
      },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .schema("mmm")
    .from("jobs")
    .insert({ project_id: body.project_id, config: body.config, created_by: viewer.id })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const enqueueUrl = process.env.MMM_MODAL_ENQUEUE_URL;
  if (enqueueUrl) {
    try {
      await fetch(enqueueUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: data.id }),
      });
    } catch {
      // Non-fatal: poll_queue on Modal will still pick up the queued job.
    }
  }

  return NextResponse.json({ job_id: data.id });
}
