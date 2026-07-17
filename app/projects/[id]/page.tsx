import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, StatusBadge, TopBar } from "@/components/ui";
import { NoBuilderAccess } from "@/components/NoAccess";
import { SourceUpload } from "@/components/SourceUpload";
import { EdaSection } from "@/components/EdaSection";
import { DataPrepSection } from "@/components/DataPrepSection";
import { ModelConfigForm } from "@/components/ModelConfigForm";
import { JobList } from "@/components/JobList";
import { ResultsView } from "@/components/ResultsView";
import { ChatPanel } from "@/components/ChatPanel";
import { ChatDock, ChatDockProvider, ChatMain } from "@/components/ChatDock";
import { WizardChatProvider } from "@/components/WizardChatContext";
import { PipelineShell, PipelineStep } from "@/components/PipelineShell";
import { computePipelineSteps } from "@/lib/pipelineStatus";
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

  const [{ data: sources }, { data: jobs }, { data: runs }, { data: datasets }] = await Promise.all([
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
  ]);
  const latestDataset = ((datasets ?? []) as Dataset[])[0] ?? null;

  const runsList = (runs ?? []) as ModelRun[];
  let latestAnalysis: ModelRun["analysis"] = null;
  if (runsList[0]) {
    const { data: analysisRow } = await supabase
      .schema("mmm")
      .from("model_runs")
      .select("analysis")
      .eq("id", runsList[0].id)
      .maybeSingle();
    latestAnalysis = (analysisRow?.analysis as ModelRun["analysis"]) ?? null;
  }
  const runsWithAnalysis: ModelRun[] = runsList.map((r, i) => ({
    ...r,
    analysis: i === 0 ? latestAnalysis : null,
    inference_data_path: null,
  }));
  const pipelineSteps = computePipelineSteps({
    sources: (sources ?? []) as SourceFile[],
    dataset: latestDataset,
    jobs: (jobs ?? []) as Job[],
    runs: runsWithAnalysis,
  });

  return (
    <>
      <TopBar email={viewer.email} />
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
                    <SourceUpload projectId={p.id} sources={(sources ?? []) as SourceFile[]} />
                  </PipelineStep>

                  <PipelineStep id="eda" number={2}>
                    <EdaSection sources={(sources ?? []) as SourceFile[]} />
                  </PipelineStep>

                  <PipelineStep id="dataprep" number={3}>
                    <DataPrepSection
                      projectId={p.id}
                      sources={(sources ?? []) as SourceFile[]}
                      initialDataset={latestDataset}
                    />
                  </PipelineStep>

                  <PipelineStep id="config" number={4}>
                    <ModelConfigForm
                      projectId={p.id}
                      sources={(sources ?? []) as SourceFile[]}
                      approvedDataset={latestDataset?.status === "approved" ? latestDataset : null}
                    />
                  </PipelineStep>

                  <PipelineStep id="fits" number={5}>
                    <JobList projectId={p.id} initialJobs={(jobs ?? []) as Job[]} />
                  </PipelineStep>

                  <PipelineStep id="results" number={6}>
                    <ResultsView projectId={p.id} runs={runsWithAnalysis} />
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
