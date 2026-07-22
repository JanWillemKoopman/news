"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";

// Het allereerste dat na het uploaden wordt gevraagd (bovenaan stap 2): een groot vrij-
// tekstblok met de bedrijfscontext. Wie is het bedrijf, welke markt, wat zijn de doelen en
// bijzonderheden? De AI leest dit vanaf hier mee in élke vervolgstap (voorbereiden, config,
// fit) via mmm.project_context.description. Bewust groot en bovenaan: dit is de belangrijkste
// menselijke input voor een Bayesiaans MMM en hoort daarom als eerste te worden vastgelegd.
// Dezelfde opslag als het zakelijke-context-paneel in stap 3, dus AI en UI zien hetzelfde.
const PLACEHOLDER = `Bijvoorbeeld:
• Wat verkoopt het bedrijf, aan wie, en via welke kanalen (online/winkel)?
• Hoe groot is het (omzet, aantal winkels, regio's/landen)?
• Wat is het doel van dit MMM (budget verdelen, ROI aantonen, kanaal beoordelen)?
• Belangrijke seizoenen, campagnes of acties in de periode van de data.
• Offline media met lange nawerking (tv, radio, out-of-home) of bekende externe factoren.
• Alles wat de cijfers verklaart dat niet uit de data zelf blijkt.`;

export function CompanyContextBlock({
  projectId,
  description,
}: {
  projectId: string;
  description: string | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(description ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saved = description ?? "";
  const dirty = draft.trim() !== saved.trim();

  async function save() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/business-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, description: draft }),
      });
      if (!res.ok) {
        setError((await res.json().catch(() => ({}))).error ?? "Opslaan mislukt.");
        return;
      }
      setMsg("Opgeslagen — de AI neemt dit vanaf nu mee in elke stap.");
      router.refresh();
    } catch {
      setError("Verbinding mislukt — probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-accent/30 bg-accent-dim/30 p-4">
      <div className="flex items-start gap-2.5">
        <Building2 className="mt-0.5 h-5 w-5 flex-none text-accent" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-fg">Vertel eerst over het bedrijf</h3>
          <p className="mt-0.5 text-xs text-fg-muted">
            Beschrijf het bedrijf waarvoor dit MMM wordt gemaakt: markt, omvang, doel van de
            analyse en bijzonderheden. Dit is de belangrijkste context — de AI gebruikt het
            vanaf hier in élke stap (voorbereiden, model instellen, resultaten). Je kunt het
            later altijd aanvullen.
          </p>
        </div>
      </div>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={9}
        className="mt-3 w-full resize-y rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm leading-relaxed text-fg outline-none placeholder:text-fg-faint focus:border-accent/50"
      />

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          onClick={save}
          disabled={busy || !dirty}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:bg-accent-hover hover:shadow-glow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Opslaan…" : saved ? "Bedrijfscontext bijwerken" : "Bedrijfscontext opslaan"}
        </button>
        {!dirty && saved && !msg && (
          <span className="text-xs text-fg-muted">Opgeslagen — de AI neemt dit mee in elke stap.</span>
        )}
        {msg && <span className="text-xs text-success">{msg}</span>}
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    </section>
  );
}
