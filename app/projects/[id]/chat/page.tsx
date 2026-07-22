import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/ui";
import { NoBuilderAccess } from "@/components/NoAccess";
import { ChatWizard } from "@/components/wizard/ChatWizard";
import { ModelDossier } from "@/components/wizard/ModelDossier";
import { derivePhase } from "@/lib/wizard/phase";
import { getHandleidingMarkdown } from "@/lib/handleiding";
import type { BusinessContextNote, Dataset, Job, ModelRun, Project, SourceFile } from "@/lib/types";

export const dynamic = "force-dynamic";

// De chat-gestuurde wizard: één doorlopend gesprek links dat de bouwer stap voor stap door
// het hele MMM-proces loodst, met rechts een read-only model-dossier dat de vorderingen en
// alle vastgelegde kennis toont. Deze route staat NAAST de klassieke stepper-wizard
// (/projects/[id]); de backend (jobs, mmm-core, worker, RLS) is identiek.
export default async function ProjectChat({ params }: { params: { id: string } }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.isBuilder) return <NoBuilderAccess email={viewer.email} />;

  const supabase = createClient();
  const { data: project } = await supabase.schema("mmm").from("projects").select("*").eq("id", params.id).maybeSingle();
  if (!project) notFound();
  const p = project as Project;

  const [{ data: sources }, { data: jobs }, { data: runs }, { data: datasets }, { data: projectContext }] =
    await Promise.all([
      supabase.schema("mmm").from("source_files").select("*").eq("project_id", p.id).order("created_at"),
      supabase.schema("mmm").from("jobs").select("*").eq("project_id", p.id).order("created_at", { ascending: false }),
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
      supabase
        .schema("mmm")
        .from("project_context")
        .select("industry, notes, description")
        .eq("project_id", p.id)
        .maybeSingle(),
    ]);

  const sourceList = (sources ?? []) as SourceFile[];
  const jobList = (jobs ?? []) as Job[];
  const runList = ((runs ?? []) as ModelRun[]).map((r) => ({ ...r, analysis: null, client_summary: null, inference_data_path: null }));
  const dataset = ((datasets ?? []) as Dataset[])[0] ?? null;
  const businessNotes = ((projectContext?.notes as BusinessContextNote[] | null) ?? []) as BusinessContextNote[];
  const industry = (projectContext?.industry as string | null) ?? null;
  const companyDescription = (projectContext?.description as string | null) ?? null;

  const contextProvided =
    Boolean(industry) || Boolean(companyDescription) || businessNotes.length > 0 || p.kpi_margin != null;
  const phase = derivePhase({ sources: sourceList, dataset, jobs: jobList, runs: runList, contextProvided });

  return (
    <>
      <TopBar email={viewer.email} guideMarkdown={getHandleidingMarkdown()} />
      <div className="mx-auto max-w-[1800px] px-4 pt-4 sm:px-6">
        <Link href="/projects" className="text-sm text-fg-muted transition hover:text-fg">
          ← Projecten
        </Link>
      </div>
      <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-0 px-4 pb-4 pt-3 sm:px-6 lg:grid-cols-[1fr_22rem] lg:gap-6">
        {/* Linkerkant — de chat-motor. */}
        <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface-1">
          <ChatWizard
            projectId={p.id}
            sources={sourceList}
            dataset={dataset}
            jobs={jobList}
            runs={runList}
            kpiMargin={p.kpi_margin ?? null}
            industry={industry}
            companyDescription={companyDescription}
            contextProvided={contextProvided}
          />
        </div>

        {/* Rechterkant — read-only model-dossier. */}
        <aside className="hidden h-[calc(100vh-8rem)] overflow-hidden rounded-2xl border border-border bg-surface-1 lg:block">
          <ModelDossier
            phase={phase}
            projectName={p.name}
            clientCompany={p.client_company}
            sources={sourceList}
            dataset={dataset}
            jobs={jobList}
            runs={runList}
            industry={industry}
            businessNotes={businessNotes}
            companyDescription={companyDescription}
          />
        </aside>
      </div>
    </>
  );
}
