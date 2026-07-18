import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildRequest, parseBusinessContextInput } from "@/lib/anthropic/architect";
import type { ArchitectFitContext } from "@/lib/anthropic/fitContext";
import type { ArchitectDatasetContext } from "@/lib/anthropic/datasetContext";
import type { DataInspection, Dataset, FitSummary, JobConfig, JobStatus, PriorPredictiveReview, ProjectContext, SourceFile } from "@/lib/types";

// Tool names the architect can call — kept here so the route and the frontend agree on
// what a "proposal" in the persisted/returned payload means. record_business_context is a
// side-effect tool (it persists elicited context) rather than a builder-facing proposal, so
// it is handled separately below but still needs a synthetic tool_result to keep history well-formed.
const PROPOSAL_TOOLS = ["propose_prepare_recipe", "propose_model_config"] as const;
const ALL_TOOLS = [...PROPOSAL_TOOLS, "record_business_context"] as const;

// Load prior chat history for a project so the panel survives a page refresh.
export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer?.isBuilder) {
    return NextResponse.json({ error: "geen toegang" }, { status: 403 });
  }
  const projectId = new URL(request.url).searchParams.get("project_id");
  if (!projectId) {
    return NextResponse.json({ error: "project_id is verplicht" }, { status: 400 });
  }

  const supabase = createClient();
  const { data } = await supabase
    .schema("mmm")
    .from("chat_messages")
    .select("id, role, content, created_at")
    .eq("project_id", projectId)
    .order("created_at");

  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer?.isBuilder) {
    return NextResponse.json({ error: "geen toegang" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const projectId: string | undefined = body?.project_id;
  const userMessage: string | undefined = body?.message;
  if (!projectId || !userMessage) {
    return NextResponse.json({ error: "project_id en message zijn verplicht" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is niet geconfigureerd op de server." },
      { status: 503 },
    );
  }

  const supabase = createClient();

  const [
    { data: sources },
    { data: priorRows },
    { data: latestRun },
    { data: latestFitJob },
    { data: latestDataset },
    { data: projectContext },
    { data: latestInspection },
  ] = await Promise.all([
      supabase
        .schema("mmm")
        .from("source_files")
        .select("id, project_id, name, storage_path, role_hint, preview, profile, mapping, created_at")
        .eq("project_id", projectId)
        .order("created_at"),
      supabase
        .schema("mmm")
        .from("chat_messages")
        .select("role, content")
        .eq("project_id", projectId)
        .order("created_at"),
      // The latest fit result and the latest FIT job give the architect its "resultaatinzicht":
      // it can interpret a completed fit or diagnose a failed one. Filtered to type='fit' —
      // the jobs table now also carries 'prepare' jobs, which are a different context (below).
      supabase
        .schema("mmm")
        .from("model_runs")
        .select("summary, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .schema("mmm")
        .from("jobs")
        .select("status, error, config, created_at")
        .eq("project_id", projectId)
        .eq("type", "fit")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      // The latest dataset (merge recipe + quality report) gives the architect its
      // data-preparation context — the step before modelling.
      supabase
        .schema("mmm")
        .from("datasets")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Elicited business context (one row per project) and the latest deep data
      // inspection — the two "more brains" inputs the architect reasons over pre-fit.
      supabase
        .schema("mmm")
        .from("project_context")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle(),
      supabase
        .schema("mmm")
        .from("data_inspections")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  // The latest prior-predictive review (its own lightweight job type), if one has run — a
  // cheap pre-fit sanity check the architect reads before proposing/spending a fit.
  const { data: latestPp } = await supabase
    .schema("mmm")
    .from("jobs")
    .select("prior_predictive, created_at")
    .eq("project_id", projectId)
    .eq("type", "prior_predictive")
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const fit: ArchitectFitContext = {
    latestRun: latestRun
      ? { summary: latestRun.summary as FitSummary, created_at: latestRun.created_at as string }
      : null,
    latestJob: latestFitJob
      ? {
          status: latestFitJob.status as JobStatus,
          error: (latestFitJob.error as string | null) ?? null,
          config: latestFitJob.config as JobConfig,
          created_at: latestFitJob.created_at as string,
        }
      : null,
    priorPredictive: latestPp?.prior_predictive
      ? {
          review: latestPp.prior_predictive as PriorPredictiveReview,
          created_at: latestPp.created_at as string,
        }
      : null,
  };
  const dataset: ArchitectDatasetContext = {
    latestDataset: (latestDataset as Dataset | null) ?? null,
  };
  const businessContext = (projectContext as ProjectContext | null) ?? null;
  const inspection = (latestInspection as DataInspection | null) ?? null;

  const sourceFiles = (sources ?? []) as SourceFile[];
  // The preview is cached on the row at upload time (see SourceUpload.tsx) instead of
  // downloaded from Storage on every chat turn.
  const previews = sourceFiles.map((f) => ({ file: f, preview: f.preview ?? null }));

  const history: Anthropic.MessageParam[] = (priorRows ?? []).map((row) => ({
    role: row.role as "user" | "assistant",
    content: row.content as Anthropic.ContentBlockParam[],
  }));

  const newUserBlock: Anthropic.ContentBlockParam = { type: "text", text: userMessage };
  // Cache breakpoint on the newest turn: everything up to here becomes a readable
  // prefix for the *next* request in this conversation (see shared/prompt-caching.md —
  // "put a breakpoint on the last content block of the most-recently-appended turn").
  const cachedUserBlock: Anthropic.ContentBlockParam = {
    ...newUserBlock,
    cache_control: { type: "ephemeral" },
  };
  history.push({ role: "user", content: [cachedUserBlock] });

  const client = new Anthropic({ apiKey });
  let response: Anthropic.Message;
  try {
    response = await client.messages.create(
      buildRequest({ sources: previews, dataset, fit, businessContext, inspection }, history),
    );
  } catch (err) {
    return NextResponse.json({ error: `Claude API-fout: ${(err as Error).message}` }, { status: 502 });
  }

  // Whichever tool the architect called (recipe / config / record_business_context) — at
  // most one, per the system prompt's design, but detect by name rather than assume.
  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock =>
      b.type === "tool_use" && (ALL_TOOLS as readonly string[]).includes(b.name),
  );

  // record_business_context is a side-effect tool: persist the elicited context (upsert one
  // row per project) so it feeds every later architect turn and the config's priors.
  if (toolUse?.name === "record_business_context") {
    const parsed = parseBusinessContextInput(toolUse.input);
    if (parsed) {
      const { data: existing } = await supabase
        .schema("mmm")
        .from("project_context")
        .select("industry, notes")
        .eq("project_id", projectId)
        .maybeSingle();
      const mergedNotes = [
        ...(((existing?.notes as ProjectContext["notes"]) ?? []) as NonNullable<ProjectContext["notes"]>),
        ...parsed.notes,
      ];
      await supabase
        .schema("mmm")
        .from("project_context")
        .upsert(
          {
            project_id: projectId,
            industry: parsed.industry ?? (existing?.industry as string | null) ?? null,
            notes: mergedNotes,
            updated_by: viewer.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "project_id" },
        );
    }
  }
  const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text");
  const replyText = textBlocks.map((b) => b.text).join("\n\n");

  // Persist: the user's plain turn (uncached copy — cache_control is a request-time
  // hint, not meaningful to store), the assistant's full response, and — if a tool was
  // called — a synthetic tool_result so the stored history stays well-formed for the
  // next request (a tool_use with no matching tool_result is an incomplete turn).
  const rowsToInsert: { project_id: string; role: "user" | "assistant"; content: unknown; created_by: string }[] = [
    { project_id: projectId, role: "user", content: [newUserBlock], created_by: viewer.id },
    { project_id: projectId, role: "assistant", content: response.content, created_by: viewer.id },
  ];
  if (toolUse) {
    const resultText =
      toolUse.name === "record_business_context"
        ? "Zakelijke context vastgelegd."
        : "Voorstel ontvangen door de bouwer.";
    rowsToInsert.push({
      project_id: projectId,
      role: "user",
      content: [{ type: "tool_result", tool_use_id: toolUse.id, content: resultText }],
      created_by: viewer.id,
    });
  }
  await supabase.schema("mmm").from("chat_messages").insert(rowsToInsert);

  return NextResponse.json({
    reply: replyText,
    proposedConfig: toolUse?.name === "propose_model_config" ? toolUse.input : null,
    proposedRecipe: toolUse?.name === "propose_prepare_recipe" ? toolUse.input : null,
    usage: response.usage,
  });
}
