import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AnalysisView } from "@/components/AnalysisView";
import { Card, PageHeader, TopBar } from "@/components/ui";
import { SummaryView } from "@/components/SummaryView";
import type { ModelRun, Project } from "@/lib/types";

export const dynamic = "force-dynamic";

// The client-facing dashboard: only published results of a project the viewer was granted.
// RLS guarantees this even if the id is guessed — a non-permitted project returns nothing.
export default async function ClientDashboard({ params }: { params: { projectId: string } }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const supabase = createClient();
  const { data: project } = await supabase
    .schema("mmm")
    .from("projects")
    .select("*")
    .eq("id", params.projectId)
    .maybeSingle();
  if (!project) notFound();
  const p = project as Project;

  const { data: runs } = await supabase
    .schema("mmm")
    .from("model_runs")
    .select("*")
    .eq("project_id", p.id)
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(1);
  const latest = (runs ?? [])[0] as ModelRun | undefined;

  return (
    <>
      <TopBar email={viewer.email} />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <PageHeader
          title={p.name}
          subtitle={p.client_company ?? "Media mix model — resultaten"}
        />
        {latest ? (
          <Card>
            <SummaryView summary={latest.summary} />
            {latest.analysis && <AnalysisView analysis={latest.analysis} />}
          </Card>
        ) : (
          <p className="text-sm text-fg-muted">
            Er is nog geen gepubliceerd resultaat voor dit project.
          </p>
        )}
        <p className="text-xs text-fg-faint">
          Elke waarde toont de mediaan met een 94%-betrouwbaarheidsinterval. Brede marges bij
          data-arme kanalen zijn een eerlijke weergave van onzekerheid, geen fout.
        </p>
      </main>
    </>
  );
}
