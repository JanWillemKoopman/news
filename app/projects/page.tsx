import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, LinkButton, PageHeader, StatusBadge, TopBar } from "@/components/ui";
import { NoBuilderAccess } from "@/components/NoAccess";
import { ProjectCreateForm } from "@/components/ProjectCreateForm";
import { getHandleidingMarkdown } from "@/lib/handleiding";
import type { Project } from "@/lib/types";

export const dynamic = "force-dynamic";

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export default async function ProjectsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.isBuilder) return <NoBuilderAccess email={viewer.email} />;

  const supabase = createClient();
  const { data } = await supabase
    .schema("mmm")
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  const projects = (data ?? []) as Project[];

  return (
    <>
      <TopBar email={viewer.email} guideMarkdown={getHandleidingMarkdown()} />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <PageHeader title="Projecten" subtitle="Elk project is één modelbouw voor één klant." />

        <Card>
          <ProjectCreateForm />
        </Card>

        {projects.length === 0 ? (
          <p className="text-sm text-fg-muted">Nog geen projecten. Maak er hierboven één aan.</p>
        ) : (
          <ul className="space-y-3">
            {projects.map((p) => (
              <li key={p.id}>
                <Card className="transition hover:border-border-strong">
                  <div className="flex items-center justify-between gap-4">
                    <Link href={`/projects/${p.id}`} className="min-w-0 flex-1">
                      <p className="font-medium text-fg">{p.name}</p>
                      {p.client_company && (
                        <p className="text-sm text-fg-muted">{p.client_company}</p>
                      )}
                      {p.published_at && (
                        <p className="mt-1 text-xs text-fg-faint">
                          Laatst gepubliceerd: {dateLabel(p.published_at)}
                        </p>
                      )}
                    </Link>
                    <div className="flex flex-none items-center gap-3">
                      {p.status === "published" && (
                        <LinkButton
                          href={`/dashboard/${p.id}`}
                          target="_blank"
                          variant="secondary"
                          className="text-xs"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Dashboard
                        </LinkButton>
                      )}
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
