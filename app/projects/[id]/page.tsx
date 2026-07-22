import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, StatusBadge, TopBar } from "@/components/ui";
import { NoBuilderAccess } from "@/components/NoAccess";
import { SourceUpload } from "@/components/SourceUpload";
import { EdaSection } from "@/components/EdaSection";
import { BusinessContextPanel } from "@/components/BusinessContextPanel";
import { CompanyContextBlock } from "@/components/CompanyContextBlock";
import { DataPrepSection } from "@/components/DataPrepSection";
import { ModelConfigForm } from "@/components/ModelConfigForm";
import { JobList } from "@/components/JobList";
import { ResultsView } from "@/components/ResultsView";
import { ChatPanel } from "@/components/ChatPanel";
import { StepIntro } from "@/components/StepIntro";
import { ChatDock, ChatDockProvider, ChatMain } from "@/components/ChatDock";
import { WizardChatProvider } from "@/components/WizardChatContext";
import { PipelineShell, PipelineStep } from "@/components/PipelineShell";
import { SubStep, type SubStepState } from "@/components/SubStep";
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

  const [{ data: sources }, { data: jobs }, { data: runs }, { data: datasets }, { data: projectContext }, { data: latestInspection }] = await Promise.all([
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
    supabase.schema("mmm").from("project_context").select("industry, notes, description").eq("project_id", p.id).maybeSingle(),
    // De laatste diepe inspectie: de bevindingen worden in substap 2b als kaarten
    // getoond (InspectionFindings) i.p.v. alleen als teller.
    supabase
      .schema("mmm")
      .from("data_inspections")
      .select("*")
      .eq("project_id", p.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const latestDataset = ((datasets ?? []) as Dataset[])[0] ?? null;
  const businessNotes = ((projectContext?.notes as import("@/lib/types").BusinessContextNote[] | null) ?? []) as import("@/lib/types").BusinessContextNote[];
  const businessIndustry = (projectContext?.industry as string | null) ?? null;
  const companyDescription = (projectContext?.description as string | null) ?? null;

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

  // Substap-statussen: elke stap leest als een genummerd recept (1a, 2a, 3a, …) zodat
  // de volgorde van handelingen nooit een raadsel is. Live bijgewerkte substappen
  // (2b-2d in DataPrepSection) berekenen hun eigen status client-side; deze hier komen
  // rechtstreeks uit de server-data en verversen mee met router.refresh().
  const sourceList = (sources ?? []) as SourceFile[];
  const jobList = (jobs ?? []) as Job[];
  const fitJobs = jobList.filter((j) => j.type === "fit" || j.type === "fit_hierarchical");
  const latestFitJob = fitJobs[0] ?? null;
  const datasetApproved = latestDataset?.status === "approved";

  const uploadState: SubStepState = sourceList.length > 0 ? "done" : "active";
  const edaState: SubStepState = p.eda_completed_at != null ? "done" : "todo";
  const contextState: SubStepState =
    businessIndustry || businessNotes.length > 0 || p.kpi_margin != null
      ? "done"
      : datasetApproved
        ? "active"
        : "todo";
  const configState: SubStepState = fitJobs.length > 0 ? "done" : datasetApproved ? "active" : "todo";
  const jobState: SubStepState = !latestFitJob
    ? "todo"
    : latestFitJob.status === "failed"
      ? "attention"
      : latestFitJob.status === "succeeded"
        ? "done"
        : "active";
  const publishState: SubStepState = runsWithAnalysis[0]?.is_published
    ? "done"
    : runsWithAnalysis.length > 0
      ? "active"
      : "todo";

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
                    <SubStep
                      label="1a"
                      title="Upload je bestanden (CSV of Excel)"
                      state={uploadState}
                      summary={
                        sourceList.length > 0
                          ? `${sourceList.length} bestand${sourceList.length === 1 ? "" : "en"} geüpload — klopt de lijst? Door naar stap 2`
                          : "KPI- en spend-bestanden van de klant, één bestand per bron"
                      }
                    >
                      <SourceUpload projectId={p.id} sources={sourceList} />
                    </SubStep>
                  </PipelineStep>

                  <PipelineStep id="dataprep" number={2}>
                    <StepIntro step="dataprep" />
                    <div className="space-y-3">
                      <CompanyContextBlock projectId={p.id} description={companyDescription} />
                      <SubStep
                        label="2a"
                        title="Verken de data (grafieken, statistieken & correlaties)"
                        state={edaState}
                        optional
                        summary="Handig vóór het samenvoegen: zie verloop, gaten en samenhang per kolom"
                      >
                        <EdaSection
                          sources={sourceList}
                          projectId={p.id}
                          completed={p.eda_completed_at != null}
                        />
                      </SubStep>
                      <DataPrepSection
                        projectId={p.id}
                        sources={sourceList}
                        initialDataset={latestDataset}
                        latestInspection={(latestInspection as import("@/lib/types").DataInspection | null) ?? null}
                      />
                    </div>
                  </PipelineStep>

                  <PipelineStep id="config" number={3}>
                    <StepIntro step="config" />
                    <div className="space-y-3">
                      <SubStep
                        label="3a"
                        title="Vertel de zakelijke context"
                        state={contextState}
                        optional
                        summary="Branche, marge en bijzonderheden — de AI weegt dit mee in elk voorstel"
                      >
                        <BusinessContextPanel projectId={p.id} industry={businessIndustry} notes={businessNotes} kpiMargin={p.kpi_margin ?? null} />
                      </SubStep>
                      <SubStep
                        label="3b"
                        title="Stel het model in en start de berekening"
                        state={configState}
                        summary={
                          fitJobs.length > 0
                            ? `${fitJobs.length} berekening${fitJobs.length === 1 ? "" : "en"} gestart — volg de voortgang bij stap 4`
                            : datasetApproved
                              ? "Kies KPI en kanalen (of laat de AI een configuratie voorstellen)"
                              : "Beschikbaar zodra de dataset is goedgekeurd (stap 2d)"
                        }
                      >
                        <ModelConfigForm
                          projectId={p.id}
                          sources={sourceList}
                          approvedDataset={datasetApproved ? latestDataset : null}
                        />
                      </SubStep>
                    </div>
                  </PipelineStep>

                  <PipelineStep id="run" number={4}>
                    <StepIntro step="run" />
                    <div className="space-y-3">
                      <SubStep
                        label="4a"
                        title="Volg de berekening"
                        state={jobState}
                        summary={
                          !latestFitJob
                            ? "Beschikbaar zodra je bij stap 3 een berekening start"
                            : latestFitJob.status === "running" || latestFitJob.status === "queued"
                              ? "De berekening loopt — dit duurt doorgaans 3 à 5 minuten"
                              : latestFitJob.status === "failed"
                                ? "De laatste berekening is niet gelukt — bekijk de melding hieronder"
                                : "Laatste berekening geslaagd"
                        }
                      >
                        <JobList projectId={p.id} initialJobs={jobList} />
                      </SubStep>
                      <SubStep
                        label="4b"
                        title="Beoordeel het resultaat en publiceer"
                        state={publishState}
                        summary={
                          runsWithAnalysis[0]?.is_published
                            ? "Gepubliceerd naar het klantdashboard"
                            : runsWithAnalysis.length > 0
                              ? "Controleer de kwaliteitspoort en publiceer naar het klantdashboard"
                              : "Beschikbaar zodra een berekening is geslaagd"
                        }
                      >
                        <ResultsView projectId={p.id} runs={runsWithAnalysis} jobConfigs={jobConfigById} kpiMargin={p.kpi_margin ?? null} />
                      </SubStep>
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
