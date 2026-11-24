"use client";

import { useState } from "react";
import Drawer from "@/components/Drawer";
import type { MaCampagne } from "@/lib/marketingAnalyse/types";

type Props = {
  /** Zonder campagne: een nieuwe aanmaken. */
  campagne: MaCampagne | null;
  /** De keuzelijst Bedrijf, uit het blok Algemeen van de semantic layer. */
  bedrijven: string[];
  isEigenaar: boolean;
  onClose: () => void;
  onOpgeslagen: (campagne: MaCampagne) => void;
  onVerwijderd: (id: string) => void;
};

type Velden = {
  naam: string;
  bedrijf: string;
  merk: string;
  modellen: string;
  startdatum: string;
  einddatum: string;
  budget: string;
  doel: string;
  omschrijving: string;
  dataCorrectie: string;
};

function beginwaarden(c: MaCampagne | null): Velden {
  return {
    naam: c?.naam ?? "",
    bedrijf: c?.bedrijf ?? "",
    merk: c?.merk ?? "",
    modellen: c?.modellen.join(", ") ?? "",
    startdatum: c?.startdatum ?? "",
    einddatum: c?.einddatum ?? "",
    budget: c?.budget != null ? String(c.budget).replace(".", ",") : "",
    doel: c?.doel ?? "",
    omschrijving: c?.omschrijving ?? "",
    dataCorrectie: c?.dataCorrectie ?? "",
  };
}

const INVOER =
  "w-full rounded-control border border-line bg-card px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-primary disabled:opacity-60";

function Veld({ label, verplicht, hint, children }: { label: string; verplicht?: boolean; hint?: string; children: React.ReactNode }) {
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
 * De briefing van een campagne, in de zijbalk: aanmaken én bewerken. Claude Code haalt hem
 * op bij een analyse; elke analyse legt de briefing (en de Data correctie) van dat moment
 * vast, dus een latere wijziging verandert een oude versie niet.
 */
export default function CampagneZijbalk({ campagne, bedrijven, isEigenaar, onClose, onOpgeslagen, onVerwijderd }: Props) {
  const [v, setV] = useState<Velden>(() => beginwaarden(campagne));
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [bevestigWeg, setBevestigWeg] = useState(false);
  // Een bedrijf dat niet (meer) in de lijst staat, blijft kiesbaar voor deze campagne.
  const opties = v.bedrijf && !bedrijven.includes(v.bedrijf) ? [...bedrijven, v.bedrijf] : bedrijven;

  const zet = (veld: keyof Velden) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
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
      const data = (await res.json().catch(() => ({}))) as { campagne?: MaCampagne; fout?: string };
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
    if (!v.naam.trim()) return setFout("Geef de campagne een naam.");
    if (!v.bedrijf.trim()) return setFout("Kies voor welk bedrijf de campagne is.");
    const data = campagne
      ? await verstuur(`/api/marketing-analyse?id=${encodeURIComponent(campagne.id)}`, "PATCH", v)
      : await verstuur("/api/marketing-analyse", "POST", v);
    if (data?.campagne) {
      onOpgeslagen(data.campagne);
      onClose();
    }
  }

  async function verwijder() {
    if (!campagne) return;
    if (!bevestigWeg) return setBevestigWeg(true);
    const data = await verstuur(`/api/marketing-analyse?id=${encodeURIComponent(campagne.id)}`, "DELETE");
    if (data) {
      onVerwijderd(campagne.id);
      onClose();
    }
  }

  return (
    <Drawer title={campagne ? `Briefing — ${campagne.naam}` : "Nieuwe campagne"} onClose={onClose}>
      <form onSubmit={opslaan} className="flex flex-col gap-4">
        <Veld label="Naam van de campagne" verplicht hint="De interne naam, bijv. “Audi A2”.">
          <input className={INVOER} value={v.naam} onChange={zet("naam")} disabled={bezig} autoFocus={!campagne} />
        </Veld>
        <Veld label="Bedrijf" verplicht hint="Voor welk van onze bedrijven. Bepaalt in welke accounts en websites de analyse kijkt.">
          <select className={INVOER} value={v.bedrijf} onChange={zet("bedrijf")} disabled={bezig}>
            <option value="">Kies een bedrijf…</option>
            {opties.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </Veld>
        <div className="grid grid-cols-2 gap-3">
          <Veld label="Merk" hint="Het automerk.">
            <input className={INVOER} value={v.merk} onChange={zet("merk")} disabled={bezig} placeholder="Audi" />
          </Veld>
          <Veld label="Model(len)" hint="Meerdere met komma's.">
            <input className={INVOER} value={v.modellen} onChange={zet("modellen")} disabled={bezig} placeholder="A2 e-tron" />
          </Veld>
          <Veld label="Startdatum">
            <input type="date" className={INVOER} value={v.startdatum} onChange={zet("startdatum")} disabled={bezig} />
          </Veld>
          <Veld label="Einddatum" hint="Wanneer de campagne stopt.">
            <input type="date" className={INVOER} value={v.einddatum} onChange={zet("einddatum")} disabled={bezig} />
          </Veld>
        </div>
        <Veld label="Totaalbudget" hint="Wat marketing voor de hele campagneperiode beschikbaar heeft.">
          <input className={`${INVOER} tabular-nums`} inputMode="decimal" value={v.budget} onChange={zet("budget")} disabled={bezig} placeholder="5.000" />
        </Veld>
        <Veld label="Doel van de campagne" hint="In je eigen woorden, bijv. “20 proefritaanvragen”. De analyse beoordeelt hoe het ervoor staat.">
          <textarea className={`${INVOER} min-h-16 resize-y`} value={v.doel} onChange={zet("doel")} disabled={bezig} />
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
        <Veld
          label="Data correctie"
          hint="Wat klopte er niet bij een vorige analyse? Bijv. een post die er niet bij hoort, een pagina of mailing die ontbrak. De volgende analyse past het toe."
        >
          <textarea className={`${INVOER} min-h-24 resize-y`} value={v.dataCorrectie} onChange={zet("dataCorrectie")} disabled={bezig} />
        </Veld>

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
            {bezig ? "Opslaan…" : campagne ? "Opslaan" : "Campagne aanmaken"}
          </button>
        </div>
      </form>

      <div className="mt-8 flex flex-col gap-4 border-t border-line-soft pt-5">
        <div>
          <p className="text-sm font-semibold text-ink">Analyse starten</p>
          <p className="mt-1 text-sm text-ink-muted">
            Zeg in Claude Code: <span className="font-medium text-ink">“maak een marketing analyse van {v.naam.trim() || "…"}”</span>. Of
            zet de schakelaar <span className="font-medium text-ink">Analyse ronde</span> in het overzicht aan en zeg “voer de
            analyseronde uit”. Elke analyse wordt een nieuwe versie; eerdere blijven bewaard.
          </p>
        </div>
        {campagne && isEigenaar && (
          <button
            type="button"
            onClick={verwijder}
            disabled={bezig}
            className="self-start text-sm text-negative underline-offset-2 hover:underline disabled:opacity-60"
          >
            {bevestigWeg ? "Zeker weten? Ook alle analyses van deze campagne gaan weg." : "Campagne verwijderen"}
          </button>
        )}
      </div>
    </Drawer>
  );
}
