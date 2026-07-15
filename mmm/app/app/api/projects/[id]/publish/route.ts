import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Publish a model run to the client dashboard: mark the run published and flip the
// project to 'published'. Builder-only (enforced by RLS and this guard).
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const viewer = await getViewer();
  if (!viewer?.isBuilder) {
    return NextResponse.json({ error: "geen toegang" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.model_run_id) {
    return NextResponse.json({ error: "model_run_id is verplicht" }, { status: 400 });
  }

  const supabase = createClient();
  const now = new Date().toISOString();

  const { error: runErr } = await supabase
    .schema("mmm")
    .from("model_runs")
    .update({ is_published: true, published_at: now })
    .eq("id", body.model_run_id)
    .eq("project_id", params.id);
  if (runErr) {
    return NextResponse.json({ error: runErr.message }, { status: 400 });
  }

  const { error: projErr } = await supabase
    .schema("mmm")
    .from("projects")
    .update({ status: "published", published_at: now })
    .eq("id", params.id);
  if (projErr) {
    return NextResponse.json({ error: projErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
