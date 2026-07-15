"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SourceFile } from "@/lib/types";

const BUCKET = "mmm-raw-data";

export function SourceUpload({
  projectId,
  sources,
}: {
  projectId: string;
  sources: SourceFile[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const path = `${projectId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
    if (upErr) {
      setBusy(false);
      setError(upErr.message);
      return;
    }
    const { error: rowErr } = await supabase
      .schema("mmm")
      .from("source_files")
      .insert({ project_id: projectId, name: file.name, storage_path: path });
    setBusy(false);
    if (rowErr) {
      setError(rowErr.message);
      return;
    }
    e.target.value = "";
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {sources.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Nog geen bestanden. Upload je KPI- en spend-bestanden (CSV of XLSX).
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100 text-sm">
          {sources.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2">
              <span className="text-neutral-800">{s.name}</span>
              <span className="font-mono text-xs text-neutral-400">{s.storage_path}</span>
            </li>
          ))}
        </ul>
      )}
      <label className="inline-flex cursor-pointer items-center rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">
        {busy ? "Uploaden…" : "Bestand uploaden (CSV/XLSX)"}
        <input type="file" accept=".csv,.xlsx,.xls" onChange={onFile} disabled={busy} className="hidden" />
      </label>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
