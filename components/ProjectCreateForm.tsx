"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ProjectCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .schema("mmm")
      .from("projects")
      .insert({ name, client_company: company || null, created_by: userData.user?.id });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setName("");
    setCompany("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div className="grow">
        <label className="block text-xs font-medium text-fg-muted">Projectnaam</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Q3-attributie"
          className="mt-1 w-full rounded-lg border border-border-strong px-3 py-2 text-sm outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
        />
      </div>
      <div className="grow">
        <label className="block text-xs font-medium text-fg-muted">Klant (optioneel)</label>
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Acme BV"
          className="mt-1 w-full rounded-lg border border-border-strong px-3 py-2 text-sm outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:bg-accent-hover hover:shadow-glow-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Bezig…" : "Project aanmaken"}
      </button>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </form>
  );
}
