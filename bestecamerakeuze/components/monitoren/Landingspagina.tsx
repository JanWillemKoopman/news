"use client";

import { useState } from "react";
import Inlogprompt from "@/components/Inlogprompt";
import Markdown from "@/components/chat/Markdown";

/**
 * Landingspagina: vul een URL in, klik op Analyseer, en Claude beoordeelt de pagina als
 * campagne-landingspagina met een cijfer per onderdeel. Zie app/api/landingspagina.
 */
export default function Landingspagina({ ingelogd }: { ingelogd: boolean }) {
  const [url, setUrl] = useState("");
  const [bezig, setBezig] = useState(false);
  const [analyse, setAnalyse] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  if (!ingelogd) return <Inlogprompt tekst="Log in om een landingspagina te analyseren." />;

  async function analyseer(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || bezig) return;
    setBezig(true);
    setFout(null);
    setAnalyse(null);
    try {
      const res = await fetch("/api/landingspagina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const antwoord = (await res.json()) as { analyse?: string; fout?: string };
      if (!res.ok || !antwoord.analyse) throw new Error(antwoord.fout ?? `Analyse mislukt (${res.status}).`);
      setAnalyse(antwoord.analyse);
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={analyseer}
        className="flex gap-3 rounded-panel border border-line bg-card px-5 py-5 shadow-subtle"
      >
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.voorbeeld.nl/actie"
          className="w-full rounded-card border border-line bg-card px-4 py-2.5 text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={bezig}
          className="shrink-0 rounded-button bg-primary px-5 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary-dark disabled:opacity-60"
        >
          {bezig ? "Bezig met analyseren…" : "Analyseer"}
        </button>
      </form>

      {fout && (
        <div className="rounded-panel border border-line bg-card px-5 py-4 text-sm text-ink-muted shadow-subtle">
          {fout}
        </div>
      )}

      {analyse && (
        <div className="rounded-panel border border-line bg-card px-6 py-5 text-sm text-ink shadow-subtle">
          <Markdown tekst={analyse} />
        </div>
      )}
    </div>
  );
}
