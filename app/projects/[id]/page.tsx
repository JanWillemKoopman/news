import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, StatusBadge, TopBar } from "@/components/ui";
import { NoBuilderAccess } from "@/components/NoAccess";
import { SourceUpload } from "@/components/SourceUpload";
import { EdaSection } from "@/components/EdaSection";
import { BusinessContextPanel } from "@/components/BusinessContextPanel";
import { DataPrepSection } from "@/components/DataPrepSection";
import { ModelConfigForm } from "@/components/ModelConfigForm";
import { JobList } from "@/components/JobList";
import { ResultsView } from "@/components/ResultsView";
import { ChatPanel } from "@/components/ChatPanel";
import { StepIntro } from "@/components/StepIntro";
import { ChatDock, ChatDockProvider, ChatMain } from "@/components/ChatDock";
import { WizardChatProvider } from "@/components/WizardChatContext";
import { PipelineShell, PipelineStep } from "@/components/PipelineShell";
import { computePipelineSteps } from "@/lib/pipelineStatus";
import { getHandleidingMarkdown } from "@/lib/handleiding";
import type { Dataset, Job, ModelRun, Project, SourceFile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectDetail({ params }: { params: { id: string } }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.isBuilder) return <NoBuilderAccess email={viewer.email} />;

  const supabase = createClient();
  const { data: project } = await supabase
    .schema("mmm")
    .from("projects")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!project) notFound();
  const p = project as Project;

  const [{ data: sources }, { data: jobs }, { data: runs }, { data: datasets }, { data: projectContext }] = await Promise.all([
    supabase.schema("mmm").from("source_files").select("*").eq("project_id", p.id).order("created_at"),
    supabase.schema("mmm").from("jobs").select("*").eq("project_id", p.id).order("created_at", { ascending: false }),
    // Trimmed columns: `analysis` holds base64 PNG data URLs from the deep-analysis step
    // and can be sizeable per run. RunHistory only needs summary.quality_gate + dates for
    // every run; ResultsView only ever shows `analysis` for the newest run — fetched
    // separately below instead of dragging every historical run's analysis along here.
    supabase
      .schema("mmm")
      .from("model_runs")
      .select("id, project_id, job_id, summary, quality, is_published, created_at, published_at")
      .eq("project_id", p.id)
      .order("created_at", { ascending: false }),
    supabase
      .schema("mmm")
      .from("datasets")
      .select("*")
      .eq("project_id", p.id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.schema("mmm").from("project_context").select("industry, notes").eq("project_id", p.id).maybeSingle(),
  ]);
  const latestDataset = ((datasets ?? []) as Dataset[])[0] ?? null;
  const businessNotes = ((projectContext?.notes as import("@/lib/types").BusinessContextNote[] | null) ?? []) as import("@/lib/types").BusinessContextNote[];
  const businessIndustry = (projectContext?.industry as string | null) ?? null;

  const runsList = (runs ?? []) as ModelRun[];
  let latestAnalysis: ModelRun["analysis"] = null;
  let latestClientSummary: ModelRun["client_summary"] = null;
  if (runsList[0]) {
    const { data: analysisRow } = await supabase
      .schema("mmm")
      .from("model_runs")
      .select("analysis, client_summary")
      .eq("id", runsList[0].id)
      .maybeSingle();
    latestAnalysis = (analysisRow?.analysis as ModelRun["analysis"]) ?? null;
    latestClientSummary = (analysisRow?.client_summary as ModelRun["client_summary"]) ?? null;
  }
  const runsWithAnalysis: ModelRun[] = runsList.map((r, i) => ({
    ...r,
    analysis: i === 0 ? latestAnalysis : null,
    client_summary: i === 0 ? latestClientSummary : null,
    inference_data_path: null,
  }));
  // job_id -> fit-config, voor de "config hergebruiken"-knop in de run-historie.
  const jobConfigById = Object.fromEntries(
    ((jobs ?? []) as Job[])
      .filter((j) => j.type === "fit" || j.type === "fit_hierarchical")
      .map((j) => [j.id, j.config]),
  ) as Record<string, import("@/lib/types").JobConfig>;

  const pipelineSteps = computePipelineSteps({
    sources: (sources ?? []) as SourceFile[],
    dataset: latestDataset,
    jobs: (jobs ?? []) as Job[],
    runs: runsWithAnalysis,
  });

  return (
    <>
      <TopBar email={viewer.email} guideMarkdown={getHandleidingMarkdown()} />
      <WizardChatProvider>
        <ChatDockProvider>
          <ChatMain>
            <main className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
              <div className="mb-6">
                <Link href="/projects" className="text-sm text-fg-muted transition hover:text-fg">
                  ← Projecten
                </Link>
              </div>
              <PageHeader
                title={p.name}
                subtitle={p.client_company ?? undefined}
                action={<StatusBadge status={p.status} />}
              />

              <div className="mt-6">
                <PipelineShell steps={pipelineSteps}>
                  <PipelineStep id="data" number={1}>
                    <StepIntro step="data" />
                    <SourceUpload projectId={p.id} sources={(sources ?? []) as SourceFile[]} />
                  </PipelineStep>

                  <PipelineStep id="dataprep" number={2}>
                    <StepIntro step="dataprep" />
                    {/* Verkennen (EDA) is optioneel en hoort bij het beoordelen van je
                        data — daarom een uitklapbaar paneel binnen deze stap, geen eigen
                        stap meer in de pijplijn. */}
                    <details className="mb-4 rounded-[10px] border border-border p-3">
                      <summary className="cursor-pointer select-none text-sm font-medium text-fg">
                        Data verkennen (grafieken, kolomstatistieken & correlaties)
                        <span className="ml-2 font-normal text-fg-muted">— optioneel</span>
                      </summary>
                      <div className="mt-3">
                        <EdaSection
                          sources={(sources ?? []) as SourceFile[]}
                          projectId={p.id}
                          completed={p.eda_completed_at != null}
                        />
                      </div>
                    </details>
                    <DataPrepSection
                      projectId={p.id}
                      sources={(sources ?? []) as SourceFile[]}
                      initialDataset={latestDataset}
                    />
                  </PipelineStep>

                  <PipelineStep id="config" number={3}>
                    <StepIntro step="config" />
                    <div className="mb-4">
                      <BusinessContextPanel projectId={p.id} industry={businessIndustry} notes={businessNotes} />
                    </div>
                    <ModelConfigForm
                      projectId={p.id}
                      sources={(sources ?? []) as SourceFile[]}
                      approvedDataset={latestDataset?.status === "approved" ? latestDataset : null}
                    />
                  </PipelineStep>

                  <PipelineStep id="run" number={4}>
                    <StepIntro step="run" />
                    <div className="space-y-5">
                      <JobList projectId={p.id} initialJobs={(jobs ?? []) as Job[]} />
                      <div className="border-t border-border pt-5">
                        <ResultsView projectId={p.id} runs={runsWithAnalysis} jobConfigs={jobConfigById} />
                      </div>
                    </div>
                  </PipelineStep>
                </PipelineShell>
              </div>
            </main>
          </ChatMain>

          <ChatDock>
            <ChatPanel projectId={p.id} />
          </ChatDock>
        </ChatDockProvider>
      </WizardChatProvider>
    </>
  );
}
