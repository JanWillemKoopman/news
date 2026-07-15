"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/ui";
import type { Job } from "@/lib/types";

// Live job list: subscribes to Realtime so status flips (queued -> running -> succeeded)
// appear without a refresh, and refreshes the page data when a job finishes.
export function JobList({ projectId, initialJobs }: { projectId: string; initialJobs: Job[] }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>(initialJobs);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`jobs-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "mmm", table: "jobs", filter: `project_id=eq.${projectId}` },
        (payload) => {
          const row = payload.new as Job;
          setJobs((prev) => {
            const next = prev.filter((j) => j.id !== row.id);
            return [row, ...next].sort((a, b) => b.created_at.localeCompare(a.created_at));
          });
          if (row.status === "succeeded" || row.status === "failed") router.refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, router]);

  if (jobs.length === 0) {
    return <p className="text-sm text-neutral-500">Nog geen fits gestart.</p>;
  }

  return (
    <ul className="divide-y divide-neutral-100 text-sm">
      {jobs.map((job) => (
        <li key={job.id} className="flex items-center justify-between py-2">
          <div>
            <span className="font-mono text-xs text-neutral-400">{job.id.slice(0, 8)}</span>
            {job.error && <p className="mt-0.5 text-xs text-rose-600">{job.error}</p>}
          </div>
          <StatusBadge status={job.status} />
        </li>
      ))}
    </ul>
  );
}
