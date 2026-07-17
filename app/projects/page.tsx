import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader, StatusBadge, TopBar } from "@/components/ui";
import { NoBuilderAccess } from "@/components/NoAccess";
import { ProjectCreateForm } from "@/components/ProjectCreateForm";
import type { Project } from "@/lib/types";

export const dynamic = "force-dynamic";

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
      <TopBar email={viewer.email} />
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <PageHeader title="Projecten" subtitle="Elk project is één modelbouw voor één klant." />

        <Card>
          <ProjectCreateForm />
        </Card>

        {projects.length === 0 ? (
          <p className="text-sm text-neutral-500">Nog geen projecten. Maak er hierboven één aan.</p>
        ) : (
          <ul className="space-y-3">
            {projects.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`}>
                  <Card className="transition hover:border-neutral-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-neutral-900">{p.name}</p>
                        {p.client_company && (
                          <p className="text-sm text-neutral-500">{p.client_company}</p>
                        )}
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
