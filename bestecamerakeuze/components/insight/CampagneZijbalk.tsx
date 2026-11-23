"use client";

import { useState } from "react";
import Drawer from "@/components/Drawer";
import type { InsightCampagne, InsightCampagneInvoer } from "@/lib/insight/types";

type Props = {
  /** Zonder campagne: een nieuwe aanmaken. */
  campagne: InsightCampagne | null;
  magVerwijderen: boolean;
  onClose: () => void;
  onOpgeslagen: (campagne: InsightCampagne) => void;
  onVerwijderd: (id: string) => void;
};

type Velden = Record<keyof InsightCampagneInvoer, string>;

function beginwaarden(c: InsightCampagne | null): Velden {
  return {
    naam: c?.naam ?? "",
    merk: c?.merk ?? "",
    model: c?.model ?? "",
    startdatum: c?.startdatum ?? "",
    einddatum: c?.einddatum ?? "",
    doel: c?.doel ?? "",
    budget: c?.budget != null ? String(c.budget).replace(".", ",") : "",
    omschrijving: c?.omschrijving ?? "",
    zoektermen: c?.zoektermen ?? "",
    campagnepaginas: c?.campagnepaginas ?? "",
  };
}

const INVOER =
  "w-full rounded-control border border-line bg-card px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-primary disabled:opacity-60";

function Veld({
  label,
  verplicht,
  hint,
  children,
}: {
  label: string;
  verplicht?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
        {label}
        {verplicht && (
          <span className="ml-0.5 text-negative" aria-hidden="true">
            *
          </span>
        )}
      </span>
      {children}
      {hint && <span className="text-meta text-ink-faint">{hint}</span>}
    </label>
  );
}

/**
 * De briefing van een campagne, in de zijbalk: aanmaken én bewerken. Wat hier staat, haalt
 * Claude Code op bij een analyse; de analyse legt de briefing van dat moment vast, dus een
 * latere wijziging verandert een oude versie niet.
 */
export default function CampagneZijbalk({ campagne, magVerwijderen, onClose, onOpgeslagen, onVerwijderd }: Props) {
  const [v, setV] = useState<Velden>(() => beginwaarden(campagne));
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [bevestigWeg, setBevestigWeg] = useState(false);
  const nieuw = !campagne;

  const zet = (veld: keyof Velden) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV((huidig) => ({ ...huidig, [veld]: e.target.value }));

  async function verstuur(url: string, method: string, body?: unknown) {
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { campagne?: InsightCampagne; fout?: string };
      if (!res.ok) throw new Error(data.fout ?? "Er ging iets mis.");
      return data;
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setBezig(false);
    }
  }

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    if (bezig) return;
    if (!v.naam.trim()) {
      setFout("Geef de campagne een naam.");
      return;
    }
    const data = campagne
      ? await verstuur(`/api/campagne-insight?id=${encodeURIComponent(campagne.id)}`, "PATCH", v)
      : await verstuur("/api/campagne-insight", "POST", v);
    if (data?.campagne) {
      onOpgeslagen(data.campagne);
      onClose();
    }
  }

  async function aanvraag(aan: boolean) {
    if (!campagne) return;
    const data = await verstuur(`/api/campagne-insight?id=${encodeURIComponent(campagne.id)}`, "PATCH", { aanvraag: aan });
    if (data?.campagne) onOpgeslagen(data.campagne);
  }

  async function verwijder() {
    if (!campagne) return;
    if (!bevestigWeg) {
      setBevestigWeg(true);
      return;
    }
    const data = await verstuur(`/api/campagne-insight?id=${encodeURIComponent(campagne.id)}`, "DELETE");
    if (data) {
      onVerwijderd(campagne.id);
      onClose();
    }
  }

  return (
    <Drawer title={campagne ? `Briefing — ${campagne.naam}` : "Nieuwe campagne"} onClose={onClose}>
      <form onSubmit={opslaan} className="flex flex-col gap-4">
        <Veld label="Naam van de campagne" verplicht hint="De interne naam, bijv. “Audi A2”.">
          <input className={INVOER} value={v.naam} onChange={zet("naam")} disabled={bezig} autoFocus={nieuw} />
        </Veld>
        <div className="grid grid-cols-2 gap-3">
          <Veld label="Startdatum">
            <input type="date" className={INVOER} value={v.startdatum} onChange={zet("startdatum")} disabled={bezig} />
          </Veld>
          <Veld label="Einddatum">
            <input type="date" className={INVOER} value={v.einddatum} onChange={zet("einddatum")} disabled={bezig} />
          </Veld>
          <Veld label="Merk">
            <input className={INVOER} value={v.merk} onChange={zet("merk")} disabled={bezig} placeholder="Audi" />
          </Veld>
          <Veld label="Model">
            <input className={INVOER} value={v.model} onChange={zet("model")} disabled={bezig} placeholder="A2 e-tron" />
          </Veld>
        </div>
        <Veld label="Totaal budget">
          <input
            className={`${INVOER} tabular-nums`}
            inputMode="decimal"
            value={v.budget}
            onChange={zet("budget")}
            disabled={bezig}
            placeholder="5.000"
          />
        </Veld>
        <Veld label="Doel van de campagne" hint="Zo concreet mogelijk, bijv. “20 proefritaanvragen”.">
          <input className={INVOER} value={v.doel} onChange={zet("doel")} disabled={bezig} />
        </Veld>
        <Veld label="Omschrijving">
          <textarea
            className={`${INVOER} min-h-28 resize-y`}
            value={v.omschrijving}
            onChange={zet("omschrijving")}
            disabled={bezig}
            placeholder="Waar gaat de campagne over, voor wie, welke kanalen, bijzonderheden (events, acties)."
          />
        </Veld>

        <details className="rounded-card border border-line-soft px-4 py-3" open={Boolean(v.zoektermen || v.campagnepaginas)}>
          <summary className="cursor-pointer text-sm font-semibold text-ink">Herkenning (optioneel)</summary>
          <p className="mt-1 text-meta text-ink-muted">
            Helpt Claude de campagne in de advertentieplatforms en op de website te vinden. Leeg laten mag: dan zoekt hij op naam,
            merk en model.
          </p>
          <div className="mt-3 flex flex-col gap-3">
            <Veld label="Zoektermen" hint="Woorden in campagnenamen en posts, één per regel.">
              <textarea className={`${INVOER} min-h-16 resize-y`} value={v.zoektermen} onChange={zet("zoektermen")} disabled={bezig} placeholder={"A2 e-tron\nAudi A2"} />
            </Veld>
            <Veld label="Campagnepagina's" hint="Eén URL per regel.">
              <textarea
                className={`${INVOER} min-h-16 resize-y`}
                value={v.campagnepaginas}
                onChange={zet("campagnepaginas")}
                disabled={bezig}
                placeholder="https://www.udenhout.nl/acties/a2-e-tron"
              />
            </Veld>
          </div>
        </details>

        {fout && <p className="text-sm text-negative">{fout}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={bezig}
            className="rounded-button border border-line bg-card px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface disabled:opacity-60"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={bezig}
            className="rounded-button bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary-dark disabled:cursor-wait disabled:opacity-60"
          >
            {bezig ? "Opslaan…" : nieuw ? "Campagne aanmaken" : "Opslaan"}
          </button>
        </div>
      </form>

      {campagne && (
        <div className="mt-8 flex flex-col gap-4 border-t border-line-soft pt-5">
          <div>
            <p className="text-sm font-semibold text-ink">Analyse starten</p>
            <p className="mt-1 text-sm text-ink-muted">
              Zeg in Claude Code: <span className="font-medium text-ink">“maak een campaign insight-analyse van {campagne.naam}”</span>. Of vraag
              hem hier aan en zeg daarna “draai de aangevraagde analyses”. Elke analyse wordt een nieuwe versie; eerdere blijven bewaard.
            </p>
            <button
              type="button"
              onClick={() => aanvraag(!campagne.analyseGevraagdOp)}
              disabled={bezig}
              className="mt-3 rounded-button border border-line bg-card px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface disabled:opacity-60"
            >
              {campagne.analyseGevraagdOp ? "Aanvraag intrekken" : "Analyse aanvragen"}
            </button>
            {campagne.analyseGevraagdOp && (
              <p className="mt-2 text-meta text-ink-faint">
                Aangevraagd op{" "}
                {new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(campagne.analyseGevraagdOp))}
              </p>
            )}
          </div>
          {magVerwijderen && (
            <div>
              <button
                type="button"
                onClick={verwijder}
                disabled={bezig}
                className="text-sm text-negative underline-offset-2 hover:underline disabled:opacity-60"
              >
                {bevestigWeg ? "Zeker weten? Ook alle analyses van deze campagne gaan weg." : "Campagne verwijderen"}
              </button>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
