import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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
