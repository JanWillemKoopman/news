"use client";

import { useEffect, useState } from "react";
import Drawer from "@/components/Drawer";
import type { MaPrompt } from "@/lib/marketingAnalyse/types";

function opgeslagenRegel(p: { standaard: boolean; versie: number; opgeslagenOp: string | null; opgeslagenDoorNaam: string | null }, leeg: string) {
  if (p.standaard) return leeg;
  const op = p.opgeslagenOp
    ? `, opgeslagen ${new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(p.opgeslagenOp))}`
    : "";
  return `Versie ${p.versie}${op}${p.opgeslagenDoorNaam ? ` door ${p.opgeslagenDoorNaam}` : ""}`;
}

export { opgeslagenRegel };

/**
 * De hoofdprompt: hoe Claude Code elke analyse maakt, met een hoofdstuk per label. Opslaan
 * maakt altijd een nieuwe versie, zodat bij elke analyse terug te lezen is met welke opdracht
 * hij is gemaakt. Lezen mag iedereen, bewerken alleen de eigenaar.
 */
export default function HoofdpromptZijbalk({ onClose }: { onClose: () => void }) {
  const [prompt, setPrompt] = useState<MaPrompt | null>(null);
  const [magBewerken, setMagBewerken] = useState(false);
  const [tekst, setTekst] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [melding, setMelding] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/marketing-analyse/prompt")
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { prompt?: MaPrompt; magBewerken?: boolean; fout?: string };
        if (!res.ok || !data.prompt) throw new Error(data.fout ?? "Kon de hoofdprompt niet laden.");
        setPrompt(data.prompt);
        setTekst(data.prompt.inhoud);
        setMagBewerken(Boolean(data.magBewerken));
      })
      .catch((err) => setFout(err instanceof Error ? err.message : String(err)));
  }, []);

  const gewijzigd = prompt !== null && tekst.trim() !== prompt.inhoud.trim();

  async function opslaan() {
    setBezig(true);
    setFout(null);
    setMelding(null);
    try {
      const res = await fetch("/api/marketing-analyse/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inhoud: tekst }),
      });
      const data = (await res.json().catch(() => ({}))) as { prompt?: MaPrompt; fout?: string };
      if (!res.ok || !data.prompt) throw new Error(data.fout ?? "Kon de prompt niet opslaan.");
      setPrompt(data.prompt);
      setTekst(data.prompt.inhoud);
      setMelding(`Opgeslagen als versie ${data.prompt.versie}. De volgende analyse gebruikt deze versie.`);
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setBezig(false);
    }
  }

  return (
    <Drawer title="Hoofdprompt" onClose={onClose} breed>
      {!prompt ? (
        <p className="text-sm text-ink-muted">{fout ?? "Laden…"}</p>
      ) : (
        <div className="flex h-full flex-col gap-3">
          <p className="text-sm text-ink-muted">
            Hoe Claude Code elke analyse maakt en beoordeelt, met een hoofdstuk voor de tussentijdse evaluatie en een voor de
            eindevaluatie. Hoe de data per bron te lezen is, staat in de semantic layer. Het formaat van het resultaat ligt vast in
            de code, dus hier kun je vrij schrijven zonder de pagina te breken.
          </p>
          <p className="text-meta text-ink-faint">{opgeslagenRegel(prompt, "Nog niet opgeslagen: dit is de standaardtekst. Opslaan maakt versie 1.")}</p>
          <textarea
            value={tekst}
            onChange={(e) => {
              setTekst(e.target.value);
              setMelding(null);
            }}
            readOnly={!magBewerken}
            spellCheck={false}
            aria-label="Hoofdprompt"
            className="min-h-[60vh] flex-1 resize-none rounded-card border border-line bg-surface-tint px-4 py-3 font-mono text-sm leading-relaxed text-ink outline-none focus:border-primary"
          />
          {fout && <p className="text-sm text-negative">{fout}</p>}
          {melding && <p className="text-sm text-positive">{melding}</p>}
          {magBewerken ? (
            <div className="flex items-center justify-end gap-2">
              {gewijzigd && (
                <button
                  type="button"
                  onClick={() => setTekst(prompt.inhoud)}
                  disabled={bezig}
                  className="rounded-button border border-line bg-card px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface disabled:opacity-60"
                >
                  Wijzigingen weggooien
                </button>
              )}
              <button
                type="button"
                onClick={opslaan}
                disabled={bezig || (!gewijzigd && !prompt.standaard)}
                className="rounded-button bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary-dark disabled:opacity-50"
              >
                {bezig ? "Opslaan…" : prompt.standaard && !gewijzigd ? "Opslaan als versie 1" : "Opslaan als nieuwe versie"}
              </button>
            </div>
          ) : (
            <p className="text-meta text-ink-faint">Alleen de eigenaar kan de hoofdprompt aanpassen.</p>
          )}
        </div>
      )}
    </Drawer>
  );
}
