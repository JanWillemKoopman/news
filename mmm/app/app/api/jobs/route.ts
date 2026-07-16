import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MAX_CONCURRENT_JOBS, hasJobCapacity, nudgeModalEnqueue } from "@/lib/jobs";

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

  if (!(await hasJobCapacity(supabase))) {
    return NextResponse.json(
      {
        error: `Er draaien (of wachten) al ${MAX_CONCURRENT_JOBS} taken (fits/voorbereidingen). Wacht tot er een klaar is voordat je een nieuwe start.`,
      },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .schema("mmm")
    .from("jobs")
    .insert({ project_id: body.project_id, type: "fit", dataset_id: body.dataset_id ?? null, config: body.config, created_by: viewer.id })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await nudgeModalEnqueue(data.id);
  return NextResponse.json({ job_id: data.id });
}
