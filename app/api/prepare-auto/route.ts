import { NextResponse } from "next/server";
import { withJsonErrors } from "@/lib/apiRoute";
import Anthropic from "@anthropic-ai/sdk";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildRequest } from "@/lib/anthropic/architect";
import { formatDatasetContextBlock } from "@/lib/anthropic/datasetContext";
import { MAX_CONCURRENT_JOBS, hasJobCapacity, nudgeModalEnqueue } from "@/lib/jobs";
import type {
  ArchitectFitContext,
} from "@/lib/anthropic/fitContext";
import type {
  DataInspection,
  Dataset,
  PrepareRecipe,
  ProjectContext,
  SourceFile,
} from "@/lib/types";

// Agentic auto-refine for the data-preparation stage (point 3). Closes the loop that today
// costs a human round per trivial fix: the architect proposes a merge recipe, the merge
// runs, its quality report is fed back to the architect as a REAL tool_result, and it
// corrects the recipe — repeating until the report is clean or an iteration cap is hit.
// Human-in-the-loop is preserved: this produces a prepared (not approved) dataset; the
// builder still reviews and clicks approve. It just spends the trivial iterations (wrong
// date format, forgotten fill, wrong column role) without a person in the loop each time.
//
// Runs the loop server-side with a bounded poll of the async prepare job. Kept modest
// (few iterations, capped waits) so it fits inside the function's time budget; the regular
// chat flow remains the path for anything that needs discussion.
export const maxDuration = 300;

const MAX_ITERATIONS = 3;
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 180_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function qualityIsClean(dataset: Dataset): boolean {
  const issues = dataset.quality?.issues ?? [];
  return dataset.status === "prepared" && !issues.some((i) => i.severity === "error" || i.severity === "warning");
}

// Wait for the async prepare job to move the dataset to a terminal state (prepared/failed).
async function waitForDataset(
  supabase: ReturnType<typeof createClient>,
  datasetId: string,
): Promise<Dataset | null> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const { data } = await supabase.schema("mmm").from("datasets").select("*").eq("id", datasetId).maybeSingle();
    const ds = data as Dataset | null;
    if (ds && (ds.status === "prepared" || ds.status === "failed" || ds.status === "approved")) return ds;
    await sleep(POLL_INTERVAL_MS);
  }
  return null;
}

async function handlePost(request: Request) {
  const viewer = await getViewer();
  if (!viewer?.isBuilder) {
    return NextResponse.json({ error: "geen toegang" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const projectId: string | undefined = body?.project_id;
  if (!projectId) {
    return NextResponse.json({ error: "project_id is verplicht" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY niet geconfigureerd." }, { status: 503 });
  }

  const supabase = createClient();

  // Load the same pre-fit context the chat architect sees, so the auto-loop reasons from
  // the profiles, mapping, inspection and business context too.
  const [{ data: sources }, { data: projectContext }, { data: latestInspection }] = await Promise.all([
    supabase
      .schema("mmm")
      .from("source_files")
      .select("id, project_id, name, storage_path, role_hint, preview, profile, mapping, created_at")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase.schema("mmm").from("project_context").select("*").eq("project_id", projectId).maybeSingle(),
    supabase
      .schema("mmm")
      .from("data_inspections")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const sourceFiles = (sources ?? []) as SourceFile[];
  if (sourceFiles.length === 0) {
    return NextResponse.json({ error: "Upload eerst bronbestanden." }, { status: 400 });
  }
  const previews = sourceFiles.map((f) => ({ file: f, preview: f.preview ?? null }));
  const businessContext = (projectContext as ProjectContext | null) ?? null;
  const inspection = (latestInspection as DataInspection | null) ?? null;
  const emptyFit: ArchitectFitContext = { latestRun: null, latestJob: null, priorPredictive: null };

  const client = new Anthropic({ apiKey });
  const history: Anthropic.MessageParam[] = [
    {
      role: "user",
      content:
        "Stel een samenvoeg-recept voor deze bronnen voor met de tool propose_prepare_recipe, en verfijn het automatisch: ik voer het uit en geef je het kwaliteitsrapport terug, tot dat schoon is (geen fouten/waarschuwingen). Corrigeer bij elke ronde gericht wat het rapport aanwijst.",
    },
  ];

  let latestDataset: Dataset | null = null;
  const log: string[] = [];

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    if (!(await hasJobCapacity(supabase))) {
      return NextResponse.json(
        { error: `Er draaien al ${MAX_CONCURRENT_JOBS} taken; probeer het later opnieuw.`, log },
        { status: 409 },
      );
    }

    // Ask the architect for (a corrected) recipe given the current history + latest dataset.
    const datasetCtx = { latestDataset };
    let response: Anthropic.Message;
    try {
      response = await client.messages.create(
        buildRequest({ sources: previews, dataset: datasetCtx, fit: emptyFit, businessContext, inspection }, history),
      );
    } catch (err) {
      return NextResponse.json({ error: `Claude API-fout: ${(err as Error).message}`, log }, { status: 502 });
    }
    history.push({ role: "assistant", content: response.content });

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "propose_prepare_recipe",
    );
    if (!toolUse) {
      // The architect answered with text (needs info, or considers the dataset done) —
      // return that to the builder instead of forcing another merge.
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n\n");
      return NextResponse.json({ status: "stopped", message: text, dataset: latestDataset, log });
    }

    const recipe = toolUse.input as PrepareRecipe;

    // Create the dataset + prepare job (mirrors /api/datasets) and run it.
    const { data: dsRow, error: dsErr } = await supabase
      .schema("mmm")
      .from("datasets")
      .insert({ project_id: projectId, recipe, status: "preparing", created_by: viewer.id })
      .select("id")
      .single();
    if (dsErr) {
      return NextResponse.json({ error: dsErr.message, log }, { status: 400 });
    }
    const { data: job, error: jobErr } = await supabase
      .schema("mmm")
      .from("jobs")
      .insert({
        project_id: projectId,
        type: "prepare",
        dataset_id: dsRow.id,
        config: { dataset_id: dsRow.id, ...recipe },
        created_by: viewer.id,
      })
      .select("id")
      .single();
    if (jobErr) {
      await supabase.schema("mmm").from("datasets").update({ status: "draft" }).eq("id", dsRow.id);
      return NextResponse.json({ error: jobErr.message, log }, { status: 400 });
    }
    await nudgeModalEnqueue(job.id);

    const finished = await waitForDataset(supabase, dsRow.id);
    if (!finished) {
      return NextResponse.json(
        { status: "timeout", message: "De samenvoeging duurde te lang.", dataset: null, log },
        { status: 504 },
      );
    }
    latestDataset = finished;
    log.push(`Ronde ${iter + 1}: status ${finished.status}, ${finished.quality?.issues?.length ?? 0} melding(en).`);

    // Feed the quality report back as a real tool_result so the architect reasons on it.
    history.push({
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: formatDatasetContextBlock({ latestDataset: finished }),
        },
      ],
    });

    if (qualityIsClean(finished)) {
      return NextResponse.json({
        status: "clean",
        message: "De samenvoeging is klaar en het kwaliteitsrapport is schoon. Controleer en keur goed.",
        dataset: finished,
        log,
      });
    }
    // Otherwise loop: the architect will see the report and propose a corrected recipe.
  }

  return NextResponse.json({
    status: "exhausted",
    message: `Na ${MAX_ITERATIONS} rondes is het rapport nog niet volledig schoon. Bekijk de laatste versie en verfijn eventueel handmatig in de chat.`,
    dataset: latestDataset,
    log,
  });
}

export const POST = withJsonErrors(handlePost);
