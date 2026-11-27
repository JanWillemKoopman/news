"use client";

import { useEffect, useState } from "react";
import Drawer from "@/components/Drawer";
import BedrijvenKiezer from "@/components/marketingAnalyse/BedrijvenKiezer";
import { bedrijvenLabel } from "@/lib/marketingAnalyse/rekenen";
import {
  FORMULIER_NAAM,
  PLANNING_NAAM,
  PLANNINGEN,
  type Formulier,
  type MaOpzet,
  type MaPrompt,
  type Planning,
} from "@/lib/marketingAnalyse/types";

export function opgeslagenRegel(
  p: { standaard: boolean; versie: number; opgeslagenOp: string | null; opgeslagenDoorNaam: string | null },
  leeg: string,
) {
  if (p.standaard) return leeg;
  const op = p.opgeslagenOp
    ? `, opgeslagen ${new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(p.opgeslagenOp))}`
    : "";
  return `Versie ${p.versie}${op}${p.opgeslagenDoorNaam ? ` door ${p.opgeslagenDoorNaam}` : ""}`;
}

const INVOER =
  "w-full rounded-control border border-line bg-card px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-primary disabled:opacity-60";
const KNOP_LICHT =
  "rounded-button border border-line bg-card px-4 py-2 text-sm font-medium text-ink vdu:text-ink-muted transition-colors vdu:hover:border-ink-faint hover:bg-surface vdu:hover:text-ink disabled:opacity-60";
const KNOP =
  "rounded-button bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary-dark disabled:opacity-50";

type Props = {
  /** Null: een nieuwe opzet aanmaken (alleen de eigenaar). */
  opzet: MaOpzet | null;
  bedrijven: string[];
  isEigenaar: boolean;
  onOpzetOpgeslagen: (opzet: MaOpzet) => void;
  onOpzetVerwijderd: (id: string) => void;
  onClose: () => void;
};

/** Naam, formulier, bedrijven, standaardplanning en actief van een opzet; alleen de eigenaar ziet dit als formulier. */
function OpzetInstellingen({
  opzet,
  bedrijven,
  onOpgeslagen,
  onVerwijderd,
}: {
  opzet: MaOpzet | null;
  bedrijven: string[];
  onOpgeslagen: (opzet: MaOpzet) => void;
  onVerwijderd: (id: string) => void;
}) {
  const [naam, setNaam] = useState(opzet?.naam ?? "");
  const [formulier, setFormulier] = useState<Formulier>(opzet?.formulier ?? "rapportage");
  const [gekozen, setGekozen] = useState<string[]>(opzet?.bedrijven ?? []);
  const [actief, setActief] = useState(opzet?.actief ?? true);
  const [standaardPlanning, setStandaardPlanning] = useState<Planning>(opzet?.standaardPlanning ?? "uit");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [melding, setMelding] = useState<string | null>(null);
  const [bevestigWeg, setBevestigWeg] = useState(false);
  const gewijzigd =
    !opzet || naam.trim() !== opzet.naam || formulier !== opzet.formulier || gekozen.join("|") !== opzet.bedrijven.join("|") ||
    actief !== opzet.actief ||
    standaardPlanning !== opzet.standaardPlanning;

  async function verstuur(method: "POST" | "PATCH" | "DELETE") {
    setBezig(true);
    setFout(null);
    setMelding(null);
    try {
      const url = opzet ? `/api/marketing-analyse/opzetten?id=${encodeURIComponent(opzet.id)}` : "/api/marketing-analyse/opzetten";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "DELETE" ? undefined : JSON.stringify({ naam, formulier, bedrijven: gekozen, actief, standaardPlanning }),
      });
      const data = (await res.json().catch(() => ({}))) as { opzet?: MaOpzet; fout?: string };
      if (!res.ok) throw new Error(data.fout ?? "Er ging iets mis.");
      if (method === "DELETE" && opzet) return onVerwijderd(opzet.id);
      if (data.opzet) {
        onOpgeslagen(data.opzet);
        if (opzet) setMelding("Opgeslagen.");
      }
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setBezig(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!bezig && gewijzigd) verstuur(opzet ? "PATCH" : "POST");
      }}
      className="flex flex-col gap-3 rounded-card border border-line-soft bg-surface-tint px-4 py-4"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{opzet ? "Instellingen van de opzet" : "Nieuwe opzet"}</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-meta text-ink-faint">Naam</span>
          <input className={INVOER} value={naam} onChange={(e) => setNaam(e.target.value)} disabled={bezig} autoFocus={!opzet} placeholder="Bijv. VELOO maandrapportage" />
        </label>
        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-meta text-ink-faint">Formulier</span>
          <select
            className={INVOER}
            value={formulier}
            onChange={(e) => setFormulier(e.target.value as Formulier)}
            disabled={bezig || opzet?.standaard}
          >
            {(Object.keys(FORMULIER_NAAM) as Formulier[]).map((f) => (
              <option key={f} value={f}>
                {FORMULIER_NAAM[f]}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-meta text-ink-faint">Standaard planning — wat een nieuwe analyse met deze opzet krijgt</span>
          <select
            className={INVOER}
            value={standaardPlanning}
            onChange={(e) => setStandaardPlanning(e.target.value as Planning)}
            disabled={bezig}
          >
            {PLANNINGEN.map((p) => (
              <option key={p} value={p}>
                {PLANNING_NAAM[p]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-meta text-ink-faint">
          Bedrijven {gekozen.length === 0 ? "— niets gekozen: kiezen in de briefing" : "— liggen vast voor deze opzet"}
        </span>
        <BedrijvenKiezer label="Bedrijven van de opzet" opties={bedrijven} gekozen={gekozen} onChange={setGekozen} disabled={bezig} />
      </div>
      {opzet && !opzet.standaard && (
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={actief} onChange={(e) => setActief(e.target.checked)} disabled={bezig} />
          Actief (uit: niet meer te kiezen bij een nieuwe analyse; bestaande blijven staan)
        </label>
      )}
      {fout && <p className="text-sm text-negative">{fout}</p>}
      {melding && <p className="text-sm text-positive">{melding}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {opzet && !opzet.standaard ? (
          <button
            type="button"
            onClick={() => (bevestigWeg ? verstuur("DELETE") : setBevestigWeg(true))}
            disabled={bezig}
            className="text-sm text-negative underline-offset-2 hover:underline disabled:opacity-60"
            title={opzet.aantalCampagnes > 0 ? "Er hangen analyses aan; zet hem dan uit" : undefined}
          >
            {bevestigWeg ? "Zeker weten? De prompt gaat ook weg." : "Opzet verwijderen"}
          </button>
        ) : (
          <span />
        )}
        <button type="submit" disabled={bezig || !gewijzigd || !naam.trim()} className={KNOP}>
          {bezig ? "Opslaan…" : opzet ? "Instellingen opslaan" : "Opzet aanmaken"}
        </button>
      </div>
    </form>
  );
}

/**
 * De prompt van één analyse opzet. Opslaan maakt altijd een nieuwe versie (per opzet
 * genummerd), zodat bij elke analyse terug te lezen is met welke opdracht hij is gemaakt.
 * Lezen mag iedereen, bewerken alleen de eigenaar. Een lege prompt (behalve bij Campagne
 * analyse, die de standaardtekst heeft) laat Claude de analyse weigeren.
 */
export default function AnalysePromptZijbalk({ opzet, bedrijven, isEigenaar, onOpzetOpgeslagen, onOpzetVerwijderd, onClose }: Props) {
  const [prompt, setPrompt] = useState<MaPrompt | null>(null);
  const [magBewerken, setMagBewerken] = useState(false);
  const [tekst, setTekst] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [melding, setMelding] = useState<string | null>(null);
  const opzetId = opzet?.id ?? null;

  useEffect(() => {
    if (!opzetId) return;
    fetch(`/api/marketing-analyse/prompt?opzet=${encodeURIComponent(opzetId)}`)
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { prompt?: MaPrompt; magBewerken?: boolean; fout?: string };
        if (!res.ok || !data.prompt) throw new Error(data.fout ?? "Kon de prompt niet laden.");
        setPrompt(data.prompt);
        setTekst(data.prompt.inhoud);
        setMagBewerken(Boolean(data.magBewerken));
      })
      .catch((err) => setFout(err instanceof Error ? err.message : String(err)));
  }, [opzetId]);

  const gewijzigd = prompt !== null && tekst.trim() !== prompt.inhoud.trim();
  const leeg = prompt !== null && prompt.standaard && !opzet?.standaard;

  async function opslaan() {
    if (!opzet) return;
    setBezig(true);
    setFout(null);
    setMelding(null);
    try {
      const res = await fetch("/api/marketing-analyse/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opzetId: opzet.id, inhoud: tekst }),
      });
      const data = (await res.json().catch(() => ({}))) as { prompt?: MaPrompt; fout?: string };
      if (!res.ok || !data.prompt) throw new Error(data.fout ?? "Kon de prompt niet opslaan.");
      setPrompt(data.prompt);
      setTekst(data.prompt.inhoud);
      setMelding(`Opgeslagen als versie ${data.prompt.versie}. De volgende analyse met deze opzet gebruikt deze versie.`);
      if (!opzet.heeftPrompt) onOpzetOpgeslagen({ ...opzet, heeftPrompt: true });
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setBezig(false);
    }
  }

  const titel = opzet ? `Analyse prompt — ${opzet.naam}` : "Nieuwe analyse opzet";

  return (
    <Drawer title={titel} onClose={onClose} breed>
      <div className="flex h-full flex-col gap-3">
        {isEigenaar ? (
          <OpzetInstellingen key={opzet?.id ?? "nieuw"} opzet={opzet} bedrijven={bedrijven} onOpgeslagen={onOpzetOpgeslagen} onVerwijderd={onOpzetVerwijderd} />
        ) : (
          opzet && (
            <p className="text-meta text-ink-faint">
              {FORMULIER_NAAM[opzet.formulier]} · {opzet.bedrijven.length > 0 ? bedrijvenLabel(opzet.bedrijven) : "bedrijven kiezen in de briefing"}
              {!opzet.actief && " · uitgezet"}
            </p>
          )
        )}

        {!opzet ? (
          <p className="text-sm text-ink-muted">
            Na het aanmaken schrijf je hier de prompt. Zolang die leeg is, weigert Claude een analyse met deze opzet.
          </p>
        ) : !prompt ? (
          <p className="text-sm text-ink-muted">{fout ?? "Laden…"}</p>
        ) : (
          <>
            <p className="text-sm text-ink-muted">
              {opzet.standaard
                ? "Hoe Claude Code een campagne analyseert en beoordeelt, met een hoofdstuk voor de tussentijdse evaluatie en een voor de eindevaluatie."
                : `Hoe Claude Code een ${opzet.naam.toLowerCase()} maakt. Schrijf alleen wat specifiek is voor deze opzet: de harde dataregel, de schrijfstijl voor de marketeer en de managementsamenvatting van vijf regels gelden altijd (die staan in de skill).`}{" "}
              Hoe de data per bron te lezen is, staat in de semantic layer. Het formaat van het resultaat ligt vast in de code, dus hier
              kun je vrij schrijven zonder de pagina te breken.
            </p>
            <p className={`text-meta ${leeg ? "text-negative" : "text-ink-faint"}`}>
              {leeg
                ? "Nog geen prompt. Zolang hij leeg is, weigert Claude een analyse met deze opzet."
                : opgeslagenRegel(prompt, "Nog niet opgeslagen: dit is de standaardtekst. Opslaan maakt versie 1.")}
            </p>
            <textarea
              value={tekst}
              onChange={(e) => {
                setTekst(e.target.value);
                setMelding(null);
              }}
              readOnly={!magBewerken}
              spellCheck={false}
              aria-label={`Prompt ${opzet.naam}`}
              placeholder={magBewerken ? "Schrijf hier de prompt voor deze opzet…" : "Nog geen prompt."}
              className="min-h-[50vh] flex-1 resize-none rounded-card border border-line bg-surface-tint px-4 py-3 font-mono text-sm leading-relaxed text-ink outline-none focus:border-primary"
            />
            {fout && <p className="text-sm text-negative">{fout}</p>}
            {melding && <p className="text-sm text-positive">{melding}</p>}
            {magBewerken ? (
              <div className="flex items-center justify-end gap-2">
                {gewijzigd && (
                  <button type="button" onClick={() => setTekst(prompt.inhoud)} disabled={bezig} className={KNOP_LICHT}>
                    Wijzigingen weggooien
                  </button>
                )}
                <button
                  type="button"
                  onClick={opslaan}
                  disabled={bezig || !tekst.trim() || (!gewijzigd && !(prompt.standaard && opzet.standaard))}
                  className={KNOP}
                >
                  {bezig ? "Opslaan…" : prompt.standaard ? "Opslaan als versie 1" : "Opslaan als nieuwe versie"}
                </button>
              </div>
            ) : (
              <p className="text-meta text-ink-faint">Alleen de eigenaar kan de analyse prompts aanpassen.</p>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}
