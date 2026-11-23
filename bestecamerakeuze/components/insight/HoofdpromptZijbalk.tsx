"use client";

import { useEffect, useState } from "react";
import Drawer from "@/components/Drawer";
import type { InsightPrompt } from "@/lib/insight/types";

type Versie = { id: string; versie: number; opgeslagenOp: string };

/**
 * De hoofdprompt: de opdracht waarmee Claude Code elke analyse maakt. Opslaan maakt een
 * nieuwe versie (nooit overschrijven), zodat bij elke analyse terug te lezen is met welke
 * opdracht hij is gemaakt. Lezen mag iedereen, bewerken alleen de beheerders.
 */
export default function HoofdpromptZijbalk({ onClose }: { onClose: () => void }) {
  const [prompt, setPrompt] = useState<InsightPrompt | null>(null);
  const [versies, setVersies] = useState<Versie[]>([]);
  const [magBewerken, setMagBewerken] = useState(false);
  const [tekst, setTekst] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [melding, setMelding] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/campagne-insight/prompt")
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          prompt?: InsightPrompt;
          versies?: Versie[];
          magBewerken?: boolean;
          fout?: string;
        };
        if (!res.ok || !data.prompt) throw new Error(data.fout ?? "Kon de hoofdprompt niet laden.");
        setPrompt(data.prompt);
        setTekst(data.prompt.inhoud);
        setVersies(data.versies ?? []);
        setMagBewerken(Boolean(data.magBewerken));
      })
      .catch((err) => setFout(err instanceof Error ? err.message : String(err)));
  }, []);

  const gewijzigd = prompt !== null && tekst.trim() !== prompt.inhoud.trim();

  async function opslaan() {
    if (!gewijzigd && !prompt?.standaard) return;
    setBezig(true);
    setFout(null);
    setMelding(null);
    try {
      const res = await fetch("/api/campagne-insight/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inhoud: tekst }),
      });
      const data = (await res.json().catch(() => ({}))) as { prompt?: InsightPrompt; fout?: string };
      if (!res.ok || !data.prompt) throw new Error(data.fout ?? "Kon de prompt niet opslaan.");
      setPrompt(data.prompt);
      setTekst(data.prompt.inhoud);
      setVersies((v) =>
        v.some((x) => x.id === data.prompt!.id)
          ? v
          : [{ id: data.prompt!.id!, versie: data.prompt!.versie, opgeslagenOp: data.prompt!.opgeslagenOp! }, ...v],
      );
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
            De opdracht waarmee Claude Code elke analyse maakt: wat er geanalyseerd wordt en hoe. Het formaat van het resultaat ligt
            vast in de code, dus hier kun je vrij schrijven zonder het dashboard te breken.
          </p>
          <p className="text-meta text-ink-faint">
            {prompt.standaard
              ? "Nog niet opgeslagen: dit is de standaardtekst. Opslaan maakt versie 1."
              : `Versie ${prompt.versie}${prompt.opgeslagenOp ? `, opgeslagen ${new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(prompt.opgeslagenOp))}` : ""}${prompt.opgeslagenDoorNaam ? ` door ${prompt.opgeslagenDoorNaam}` : ""}${versies.length > 1 ? ` · ${versies.length} versies` : ""}`}
          </p>
          <textarea
            value={tekst}
            onChange={(e) => {
              setTekst(e.target.value);
              setMelding(null);
            }}
            readOnly={!magBewerken}
            spellCheck={false}
            className="min-h-[60vh] flex-1 resize-none rounded-card border border-line bg-surface-tint px-4 py-3 font-mono text-[13px] leading-relaxed text-ink outline-none focus:border-primary"
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
            <p className="text-meta text-ink-faint">Alleen de beheerders kunnen de hoofdprompt aanpassen.</p>
          )}
        </div>
      )}
    </Drawer>
  );
}
