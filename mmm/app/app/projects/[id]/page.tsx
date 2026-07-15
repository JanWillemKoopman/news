import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader, StatusBadge, TopBar } from "@/components/ui";
import { NoBuilderAccess } from "@/components/NoAccess";
import { SourceUpload } from "@/components/SourceUpload";
import { ModelConfigForm } from "@/components/ModelConfigForm";
import { JobList } from "@/components/JobList";
import { ResultsView } from "@/components/ResultsView";
import { ChatPanel } from "@/components/ChatPanel";
import { WizardChatProvider } from "@/components/WizardChatContext";
import type { Job, ModelRun, Project, SourceFile } from "@/lib/types";

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

  const [{ data: sources }, { data: jobs }, { data: runs }] = await Promise.all([
    supabase.schema("mmm").from("source_files").select("*").eq("project_id", p.id).order("created_at"),
    supabase.schema("mmm").from("jobs").select("*").eq("project_id", p.id).order("created_at", { ascending: false }),
    supabase.schema("mmm").from("model_runs").select("*").eq("project_id", p.id).order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <TopBar email={viewer.email} />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <Link href="/projects" className="text-sm text-neutral-500 hover:text-neutral-800">
            ← Projecten
          </Link>
        </div>
        <PageHeader
          title={p.name}
          subtitle={p.client_company ?? undefined}
          action={<StatusBadge status={p.status} />}
        />

        <WizardChatProvider>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <section>
                <h2 className="mb-2 text-sm font-semibold text-neutral-700">1 · Data</h2>
                <Card>
                  <SourceUpload projectId={p.id} sources={(sources ?? []) as SourceFile[]} />
                </Card>
              </section>

              <section>
                <h2 className="mb-2 text-sm font-semibold text-neutral-700">2 · Model configureren</h2>
                <Card>
                  <ModelConfigForm projectId={p.id} sources={(sources ?? []) as SourceFile[]} />
                </Card>
              </section>

              <section>
                <h2 className="mb-2 text-sm font-semibold text-neutral-700">3 · Fits</h2>
                <Card>
                  <JobList projectId={p.id} initialJobs={(jobs ?? []) as Job[]} />
                </Card>
              </section>

              <section>
                <h2 className="mb-2 text-sm font-semibold text-neutral-700">4 · Resultaten</h2>
                <Card>
                  <ResultsView projectId={p.id} runs={(runs ?? []) as ModelRun[]} />
                </Card>
              </section>
            </div>

            <div className="lg:sticky lg:top-8 lg:h-[calc(100vh-8rem)]">
              <ChatPanel projectId={p.id} />
            </div>
          </div>
        </WizardChatProvider>
      </main>
    </>
  );
}
