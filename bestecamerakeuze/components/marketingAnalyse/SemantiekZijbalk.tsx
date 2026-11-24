"use client";

import { useEffect, useState } from "react";
import Drawer from "@/components/Drawer";
import { opgeslagenRegel } from "@/components/marketingAnalyse/HoofdpromptZijbalk";
import { SEMANTIEK_BLOKKEN, type MaSemantiek, type SemantiekInhoud, type SemantiekSleutel } from "@/lib/marketingAnalyse/types";

type Props = {
  onClose: () => void;
  /** Na opslaan: de bedrijvenlijst kan veranderd zijn (keuzelijst in de briefing). */
  onOpgeslagen?: (inhoud: SemantiekInhoud) => void;
};

/**
 * De semantic layer: per databron de kennis die bij elke analyse meegaat — hoe de data in
 * elkaar zit en hoe de analyse ermee moet omgaan. Links de blokken, rechts de tekst van het
 * gekozen blok. In het blok Algemeen staat ook de lijst bedrijven voor de briefing. Opslaan
 * slaat alle blokken samen op als één nieuwe versie. Lezen mag iedereen, bewerken alleen de
 * eigenaar.
 */
export default function SemantiekZijbalk({ onClose, onOpgeslagen }: Props) {
  const [semantiek, setSemantiek] = useState<MaSemantiek | null>(null);
  const [concept, setConcept] = useState<SemantiekInhoud | null>(null);
  const [bedrijvenTekst, setBedrijvenTekst] = useState("");
  const [blok, setBlok] = useState<SemantiekSleutel>("algemeen");
  const [magBewerken, setMagBewerken] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [melding, setMelding] = useState<string | null>(null);

  function zet(s: MaSemantiek) {
    setSemantiek(s);
    setConcept(s.inhoud);
    setBedrijvenTekst(s.inhoud.bedrijven.join("\n"));
  }

  useEffect(() => {
    fetch("/api/marketing-analyse/semantiek")
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { semantiek?: MaSemantiek; magBewerken?: boolean; fout?: string };
        if (!res.ok || !data.semantiek) throw new Error(data.fout ?? "Kon de semantic layer niet laden.");
        zet(data.semantiek);
        setMagBewerken(Boolean(data.magBewerken));
      })
      .catch((err) => setFout(err instanceof Error ? err.message : String(err)));
  }, []);

  if (!semantiek || !concept) {
    return (
      <Drawer title="Semantic layer" onClose={onClose} extraBreed>
        <p className="text-sm text-ink-muted">{fout ?? "Laden…"}</p>
      </Drawer>
    );
  }

  const bedrijven = bedrijvenTekst
    .split("\n")
    .map((b) => b.trim())
    .filter(Boolean);
  const nieuw: SemantiekInhoud = { bedrijven, blokken: concept.blokken };
  const gewijzigd = JSON.stringify(nieuw) !== JSON.stringify(semantiek.inhoud);
  const blokGewijzigd = (s: SemantiekSleutel) =>
    concept.blokken[s] !== semantiek.inhoud.blokken[s] || (s === "algemeen" && bedrijven.join("\n") !== semantiek.inhoud.bedrijven.join("\n"));

  async function opslaan() {
    setBezig(true);
    setFout(null);
    setMelding(null);
    try {
      const res = await fetch("/api/marketing-analyse/semantiek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inhoud: nieuw }),
      });
      const data = (await res.json().catch(() => ({}))) as { semantiek?: MaSemantiek; fout?: string };
      if (!res.ok || !data.semantiek) throw new Error(data.fout ?? "Kon de semantic layer niet opslaan.");
      zet(data.semantiek);
      onOpgeslagen?.(data.semantiek.inhoud);
      setMelding(`Opgeslagen als versie ${data.semantiek.versie}. De volgende analyse gebruikt deze versie.`);
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setBezig(false);
    }
  }

  const huidig = SEMANTIEK_BLOKKEN.find((b) => b.sleutel === blok) ?? SEMANTIEK_BLOKKEN[0];

  return (
    <Drawer title="Semantic layer" onClose={onClose} extraBreed>
      <div className="flex h-full flex-col gap-3">
        <p className="max-w-[110ch] text-sm text-ink-muted">
          Per databron de kennis die bij elke analyse meegaat: hoe de data in elkaar zit en hoe de analyse ermee moet omgaan. In
          het blok Algemeen staat welke accounts bij welk bedrijf horen en welke bronnen per bedrijf van toepassing zijn.
        </p>
        <p className="text-meta text-ink-faint">
          {opgeslagenRegel(semantiek, "Nog niet opgeslagen: dit is de startinhoud. Opslaan maakt versie 1.")}
        </p>

        <div className="flex min-h-0 flex-1 gap-4">
          <nav aria-label="Blokken" className="flex w-56 shrink-0 flex-col gap-0.5">
            {SEMANTIEK_BLOKKEN.map((b) => (
              <button
                key={b.sleutel}
                type="button"
                onClick={() => setBlok(b.sleutel)}
                aria-current={blok === b.sleutel ? "true" : undefined}
                className={`flex items-center justify-between rounded-control px-3 py-2 text-left text-sm transition-colors ${
                  blok === b.sleutel ? "bg-surface font-semibold text-ink" : "text-ink-muted hover:bg-surface hover:text-ink"
                }`}
              >
                {b.naam}
                {blokGewijzigd(b.sleutel) && <span className="h-1.5 w-1.5 rounded-full bg-primary" title="Gewijzigd, nog niet opgeslagen" />}
              </button>
            ))}
          </nav>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {blok === "algemeen" && (
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Bedrijven (één per regel)</span>
                <textarea
                  value={bedrijvenTekst}
                  onChange={(e) => setBedrijvenTekst(e.target.value)}
                  readOnly={!magBewerken}
                  rows={4}
                  className="resize-y rounded-card border border-line bg-surface-tint px-4 py-2 text-sm text-ink outline-none focus:border-primary"
                />
                <span className="text-meta text-ink-faint">De keuzelijst Bedrijf in de briefing.</span>
              </label>
            )}
            <label className="flex min-h-0 flex-1 flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{huidig.naam}</span>
              <textarea
                value={concept.blokken[blok]}
                onChange={(e) => {
                  setConcept({ ...concept, blokken: { ...concept.blokken, [blok]: e.target.value } });
                  setMelding(null);
                }}
                readOnly={!magBewerken}
                spellCheck={false}
                className="min-h-[50vh] flex-1 resize-none rounded-card border border-line bg-surface-tint px-4 py-3 font-mono text-sm leading-relaxed text-ink outline-none focus:border-primary"
              />
            </label>
          </div>
        </div>

        {fout && <p className="text-sm text-negative">{fout}</p>}
        {melding && <p className="text-sm text-positive">{melding}</p>}
        {magBewerken ? (
          <div className="flex items-center justify-end gap-2">
            {gewijzigd && (
              <button
                type="button"
                onClick={() => zet(semantiek)}
                disabled={bezig}
                className="rounded-button border border-line bg-card px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface disabled:opacity-60"
              >
                Wijzigingen weggooien
              </button>
            )}
            <button
              type="button"
              onClick={opslaan}
              disabled={bezig || (!gewijzigd && !semantiek.standaard)}
              className="rounded-button bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {bezig ? "Opslaan…" : semantiek.standaard && !gewijzigd ? "Opslaan als versie 1" : "Opslaan als nieuwe versie"}
            </button>
          </div>
        ) : (
          <p className="text-meta text-ink-faint">Alleen de eigenaar kan de semantic layer aanpassen.</p>
        )}
      </div>
    </Drawer>
  );
}
