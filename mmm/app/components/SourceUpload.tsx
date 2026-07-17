"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { SourceFile } from "@/lib/types";

const BUCKET = "mmm-raw-data";
const DATE_NAME_HINT = /date|datum|week|dag|day|periode/i;

interface FileStats {
  nRows: number;
  nCols: number;
  dateRange: [string, string] | null;
}

// Lightweight client-side sniff (headers, row count, a guessed date column's first/last
// value) so a card can say something useful about a file without a server round trip.
async function sniffStats(text: string): Promise<FileStats> {
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  const columns = parsed.meta.fields ?? [];
  const rows = parsed.data;
  const dateCol = columns.find((c) => DATE_NAME_HINT.test(c)) ?? columns[0];
  let dateRange: [string, string] | null = null;
  if (dateCol && rows.length > 0) {
    const first = rows[0]?.[dateCol];
    const last = rows[rows.length - 1]?.[dateCol];
    if (first && last && /^\d{4}-\d{2}-\d{2}/.test(first) && /^\d{4}-\d{2}-\d{2}/.test(last)) {
      dateRange = [first, last];
    }
  }
  return { nRows: rows.length, nCols: columns.length, dateRange };
}

export function SourceUpload({
  projectId,
  sources,
}: {
  projectId: string;
  sources: SourceFile[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, FileStats | "loading" | "error">>({});

  useEffect(() => {
    const missing = sources.filter((s) => /\.csv$/i.test(s.name) && !stats[s.id]);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      for (const file of missing) {
        setStats((prev) => ({ ...prev, [file.id]: "loading" }));
        const { data, error: dlErr } = await supabase.storage.from(BUCKET).download(file.storage_path);
        if (cancelled) return;
        if (dlErr || !data) {
          setStats((prev) => ({ ...prev, [file.id]: "error" }));
          continue;
        }
        const text = await data.text();
        const parsed = await sniffStats(text);
        if (!cancelled) setStats((prev) => ({ ...prev, [file.id]: parsed }));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources]);

  async function uploadFiles(files: FileList | File[]) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    for (const file of Array.from(files)) {
      const path = `${projectId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (upErr) {
        setError(upErr.message);
        continue;
      }
      const { error: rowErr } = await supabase
        .schema("mmm")
        .from("source_files")
        .insert({ project_id: projectId, name: file.name, storage_path: path });
      if (rowErr) setError(rowErr.message);
    }
    setBusy(false);
    router.refresh();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(files);
    e.target.value = "";
  }

  async function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) await uploadFiles(e.dataTransfer.files);
  }

  async function remove(file: SourceFile) {
    if (!confirm(`"${file.name}" verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return;
    setDeletingId(file.id);
    setError(null);
    const supabase = createClient();
    const { error: storageErr } = await supabase.storage.from(BUCKET).remove([file.storage_path]);
    if (storageErr) {
      setDeletingId(null);
      setError(storageErr.message);
      return;
    }
    const { error: rowErr } = await supabase.schema("mmm").from("source_files").delete().eq("id", file.id);
    setDeletingId(null);
    if (rowErr) {
      setError(rowErr.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {sources.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Nog geen bestanden. Upload je KPI- en spend-bestanden (CSV of XLSX).
        </p>
      ) : (
        <ul className="space-y-2">
          {sources.map((s) => {
            const s3 = stats[s.id];
            return (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-800">{s.name}</p>
                  <p className="text-xs text-neutral-500">
                    {s3 === "loading" && "Bestand wordt gelezen…"}
                    {s3 === "error" && "Kon dit bestand niet lezen"}
                    {s3 && s3 !== "loading" && s3 !== "error" && (
                      <>
                        {s3.nRows} rijen · {s3.nCols} kolommen
                        {s3.dateRange && <> · {s3.dateRange[0]} t/m {s3.dateRange[1]}</>}
                      </>
                    )}
                    {!s3 && !/\.csv$/i.test(s.name) && "xlsx-bestand"}
                  </p>
                </div>
                <button
                  onClick={() => remove(s)}
                  disabled={deletingId === s.id}
                  aria-label={`${s.name} verwijderen`}
                  className="flex-none rounded-lg p-2 text-neutral-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition ${
          dragOver ? "border-rose-400 bg-rose-50" : "border-neutral-200"
        }`}
      >
        <Upload className="h-5 w-5 text-neutral-400" />
        <p className="text-sm text-neutral-500">Sleep bestanden hierheen, of</p>
        <label className="inline-flex cursor-pointer items-center rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">
          {busy ? "Uploaden…" : "Bestand(en) kiezen"}
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            multiple
            onChange={onFile}
            disabled={busy}
            className="hidden"
          />
        </label>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
