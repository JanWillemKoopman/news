"use client";

import { useState } from "react";
import Drawer from "@/components/Drawer";
import BedrijvenKiezer from "@/components/marketingAnalyse/BedrijvenKiezer";
import { bedrijvenLabel, rapportageNaam } from "@/lib/marketingAnalyse/rekenen";
import { STANDAARD_OPZET_ID, type MaCampagne, type MaOpzet, type MaVoorstel } from "@/lib/marketingAnalyse/types";

type Props = {
  /** Zonder campagne: een nieuwe aanmaken. */
  campagne: MaCampagne | null;
  /**
   * Een voorgestelde campagne analyse: het formulier staat ingevuld met het voorstel en opslaan
   * voegt hem toe (Campagne analyse, Analyse ronde aan). Alleen zonder `campagne`.
   */
  voorstel?: MaVoorstel | null;
  /** De analyse opzetten voor het uitklapmenu bovenaan. */
  opzetten: MaOpzet[];
  /** De keuzelijst Bedrijf, uit het blok Algemeen van de semantic layer. */
  bedrijven: string[];
  isEigenaar: boolean;
  onClose: () => void;
  onOpgeslagen: (campagne: MaCampagne) => void;
  onVerwijderd: (id: string) => void;
};

type Velden = {
  opzetId: string;
  naam: string;
  bedrijven: string[];
  merk: string;
  modellen: string;
  startdatum: string;
  einddatum: string;
  periodeTekst: string;
  budget: string;
  doel: string;
  omschrijving: string;
  campagnePaginas: string;
  dataCorrectie: string;
};

function beginwaarden(c: MaCampagne | null, voorstel: MaVoorstel | null): Velden {
  if (!c && voorstel) {
    return {
      opzetId: STANDAARD_OPZET_ID,
      naam: voorstel.naam,
      bedrijven: voorstel.bedrijven,
      merk: voorstel.merk ?? "",
      modellen: voorstel.modellen.join(", "),
      startdatum: voorstel.startdatum ?? "",
      einddatum: voorstel.einddatum ?? "",
      periodeTekst: "",
      budget: voorstel.budget != null ? String(voorstel.budget).replace(".", ",") : "",
      doel: voorstel.doel ?? "",
      omschrijving: voorstel.omschrijving ?? "",
      campagnePaginas: voorstel.campagnePaginas.join("\n"),
      dataCorrectie: "",
    };
  }
  return {
    opzetId: c?.opzetId ?? STANDAARD_OPZET_ID,
    naam: c?.naam ?? "",
    bedrijven: c?.bedrijven ?? [],
    merk: c?.merk ?? "",
    modellen: c?.modellen.join(", ") ?? "",
    startdatum: c?.startdatum ?? "",
    einddatum: c?.einddatum ?? "",
    periodeTekst: c?.periodeTekst ?? "",
    budget: c?.budget != null ? String(c.budget).replace(".", ",") : "",
    doel: c?.doel ?? "",
    omschrijving: c?.omschrijving ?? "",
    campagnePaginas: c?.campagnePaginas.join("\n") ?? "",
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
 * De briefing van een analyse, in de zijbalk: aanmaken én bewerken. Bovenaan kies je de
 * analyse opzet; die bepaalt het formulier eronder (campagne: de volledige briefing;
 * rapportage: naam, open periode en omschrijving) en of het bedrijf vastligt. Claude Code
 * haalt de briefing op bij een analyse; elke analyse legt hem (en de Data correctie) van dat
 * moment vast, dus een latere wijziging verandert een oude versie niet.
 */
export default function CampagneZijbalk({
  campagne,
  voorstel = null,
  opzetten,
  bedrijven,
  isEigenaar,
  onClose,
  onOpgeslagen,
  onVerwijderd,
}: Props) {
  const uitVoorstel = !campagne && voorstel !== null;
  const [v, setV] = useState<Velden>(() => beginwaarden(campagne, voorstel));
  // De naam van een rapportage loopt mee met opzet en periode, tot iemand hem zelf aanpast.
  const [naamAangepast, setNaamAangepast] = useState(Boolean(campagne));
  const opzet = opzetten.find((o) => o.id === v.opzetId) ?? null;
  const rapportage = opzet?.formulier === "rapportage";
  // Uitgezette opzetten staan alleen in de lijst als deze analyse er al een heeft.
  const opzetOpties = opzetten.filter((o) => o.actief || o.id === v.opzetId);
  const vasteBedrijven = opzet && opzet.bedrijven.length > 0 ? opzet.bedrijven : null;
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [bevestigWeg, setBevestigWeg] = useState(false);

  const zet = (veld: keyof Velden) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setV((huidig) => ({ ...huidig, [veld]: e.target.value }));

  /** Opzet of periode gewijzigd: bij een rapportage de voorgestelde naam bijwerken. */
  function zetMetNaam(wijziging: Partial<Velden>) {
    setV((huidig) => {
      const nieuw = { ...huidig, ...wijziging };
      const o = opzetten.find((x) => x.id === nieuw.opzetId);
      if (!naamAangepast && o?.formulier === "rapportage") nieuw.naam = rapportageNaam(o.naam, nieuw.periodeTekst);
      return nieuw;
    });
  }

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
    if (!v.naam.trim()) return setFout("Geef de analyse een naam.");
    if (!vasteBedrijven && v.bedrijven.length === 0) return setFout("Kies voor welk bedrijf of welke bedrijven de analyse is.");
    if (rapportage && !v.periodeTekst.trim()) return setFout("Vul de periode in.");
    const data = campagne
      ? await verstuur(`/api/marketing-analyse?id=${encodeURIComponent(campagne.id)}`, "PATCH", v)
      : voorstel
        ? await verstuur(`/api/marketing-analyse/voorstellen?id=${encodeURIComponent(voorstel.id)}`, "POST", { ...v, actie: "toevoegen" })
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
    <Drawer title={campagne ? `Briefing — ${campagne.naam}` : uitVoorstel ? "Voorgestelde analyse toevoegen" : "Nieuwe analyse"} onClose={onClose}>
      <form onSubmit={opslaan} className="flex flex-col gap-4">
        {uitVoorstel && (
          <p className="rounded-control border border-line-soft bg-surface-tint px-3 py-2.5 text-sm text-ink-muted">
            Claude heeft deze briefing ingevuld uit de advertenties, de campagnepagina en de social posts. Loop hem na, vooral het
            doel, het budget en de einddatum. Met <span className="font-medium text-ink">Toevoegen</span> komt hij op de lijst, met
            de Analyse ronde aan.
          </p>
        )}
        <Veld label="Analyse opzet" hint={uitVoorstel ? "Een voorstel is altijd een campagne-analyse." : "Welke soort analyse. Bepaalt de prompt en het formulier hieronder."}>
          <select
            className={INVOER}
            value={v.opzetId}
            onChange={(e) => zetMetNaam({ opzetId: e.target.value })}
            disabled={bezig || opzetten.length === 0 || uitVoorstel}
          >
            {opzetOpties.length === 0 && <option value={v.opzetId}>Campagne analyse</option>}
            {opzetOpties.map((o) => (
              <option key={o.id} value={o.id}>
                {o.naam}
                {!o.heeftPrompt ? " (nog geen prompt)" : ""}
                {!o.actief ? " (uitgezet)" : ""}
              </option>
            ))}
          </select>
        </Veld>
        {opzet && !opzet.heeftPrompt && (
          <p className="-mt-2 text-meta text-negative">
            Voor deze opzet is nog geen prompt. Aanmaken kan, maar Claude weigert de analyse tot de prompt er staat.
          </p>
        )}
        <Veld
          label={rapportage ? "Naam" : "Naam van de campagne"}
          verplicht
          hint={rapportage ? "Vult zich vanzelf met opzet en periode; pas hem gerust aan." : "De interne naam, bijv. “Audi A2”."}
        >
          <input
            className={INVOER}
            value={v.naam}
            onChange={(e) => {
              setNaamAangepast(true);
              zet("naam")(e);
            }}
            disabled={bezig}
            autoFocus={!campagne}
          />
        </Veld>
        {vasteBedrijven ? (
          <Veld label={vasteBedrijven.length > 1 ? "Bedrijven" : "Bedrijf"} hint="Ligt vast voor deze opzet.">
            <p className="rounded-control border border-line-soft bg-surface-tint px-3 py-2 text-sm text-ink">{bedrijvenLabel(vasteBedrijven)}</p>
          </Veld>
        ) : (
          <Veld label="Bedrijven" verplicht hint="Voor welke van onze bedrijven; meerdere kan. Bepaalt in welke accounts en websites de analyse kijkt.">
            <BedrijvenKiezer
              label="Bedrijven"
              opties={bedrijven}
              gekozen={v.bedrijven}
              onChange={(lijst) => setV((huidig) => ({ ...huidig, bedrijven: lijst }))}
              disabled={bezig}
            />
          </Veld>
        )}
        {rapportage ? (
          <Veld
            label="Periode"
            verplicht
            hint="In je eigen woorden, bijv. “Afgelopen 3 maanden”, “Q4 2026” of “1 januari t/m 10 februari 2026”. Claude zet het bij elke analyse om in datums; een relatieve periode schuift dus mee."
          >
            <input className={INVOER} value={v.periodeTekst} onChange={(e) => zetMetNaam({ periodeTekst: e.target.value })} disabled={bezig} />
          </Veld>
        ) : (
        <>
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
        <Veld
          label="Doel van de campagne"
          hint="In je eigen woorden, bijv. “20 proefritten”. De leads tellen standaard in Google Analytics (20 proefritten = 20 proefritleads op de website). Schrijf “uit Syntec” erbij om ze in Syntec te tellen: dan alleen leads met kanaalgroep Internet via udenhout.nl."
        >
          <textarea className={`${INVOER} min-h-16 resize-y`} value={v.doel} onChange={zet("doel")} disabled={bezig} />
        </Veld>
        <Veld
          label="Campagnepagina('s)"
          hint="Eén webadres per regel. De analyse begint hier, en een zoekronde stelt een campagne met deze pagina niet nog eens voor."
        >
          <textarea
            className={`${INVOER} min-h-16 resize-y font-mono text-xs`}
            value={v.campagnePaginas}
            onChange={zet("campagnePaginas")}
            disabled={bezig}
            placeholder="https://www.udenhout.nl/acties/a2-e-tron"
          />
        </Veld>
        </>
        )}
        <Veld label={rapportage ? "Omschrijving en aandachtspunten" : "Omschrijving"}>
          <textarea
            className={`${INVOER} min-h-28 resize-y`}
            value={v.omschrijving}
            onChange={zet("omschrijving")}
            disabled={bezig}
            placeholder={
              rapportage
                ? "Waar moet de rapportage extra op letten? Bijv. een actie of event in de periode, een kanaal dat nieuw is."
                : "Waar gaat de campagne over, voor wie, welke kanalen, bijzonderheden (events, acties)."
            }
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
            {bezig ? "Opslaan…" : campagne ? "Opslaan" : uitVoorstel ? "Toevoegen" : "Aanmaken"}
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
            {bevestigWeg ? "Zeker weten? Ook alle versies van deze analyse gaan weg." : "Verwijderen"}
          </button>
        )}
      </div>
    </Drawer>
  );
}
