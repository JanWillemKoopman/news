import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildRequest } from "@/lib/anthropic/architect";
import type { SourceFile } from "@/lib/types";

const RAW_BUCKET = "mmm-raw-data";
const PREVIEW_LINES = 15;

// Small, best-effort text preview of an uploaded source file for the architect's
// context. CSV previews cleanly as text; binary formats (xlsx) are skipped rather than
// dumped as garbled bytes into the prompt — the architect asks the builder instead.
async function previewFile(name: string, bytes: Blob): Promise<string | null> {
  if (!/\.csv$/i.test(name)) return null;
  const text = await bytes.text();
  return text.split("\n").slice(0, PREVIEW_LINES).join("\n");
}

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

  const [{ data: sources }, { data: priorRows }] = await Promise.all([
    supabase.schema("mmm").from("source_files").select("*").eq("project_id", projectId).order("created_at"),
    supabase
      .schema("mmm")
      .from("chat_messages")
      .select("role, content")
      .eq("project_id", projectId)
      .order("created_at"),
  ]);

  const sourceFiles = (sources ?? []) as SourceFile[];
  const previews = await Promise.all(
    sourceFiles.map(async (f) => {
      const { data } = await supabase.storage.from(RAW_BUCKET).download(f.storage_path);
      const preview = data ? await previewFile(f.name, data).catch(() => null) : null;
      return { file: f, preview };
    }),
  );

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
    response = await client.messages.create(buildRequest({ sources: previews }, history));
  } catch (err) {
    return NextResponse.json({ error: `Claude API-fout: ${(err as Error).message}` }, { status: 502 });
  }

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "propose_model_config",
  );
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
    rowsToInsert.push({
      project_id: projectId,
      role: "user",
      content: [{ type: "tool_result", tool_use_id: toolUse.id, content: "Voorstel ontvangen door de bouwer." }],
      created_by: viewer.id,
    });
  }
  await supabase.schema("mmm").from("chat_messages").insert(rowsToInsert);

  return NextResponse.json({
    reply: replyText,
    proposedConfig: toolUse ? toolUse.input : null,
    usage: response.usage,
  });
}
