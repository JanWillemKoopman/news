"use client";

import { useState } from "react";
import { datumKort } from "@/lib/marketingAnalyse/rekenen";
import type { MaCampagne, MaOverzichtRegel, MaResultaat } from "@/lib/marketingAnalyse/types";
import { toonMelding } from "@/lib/meldingen";

/** Het veld Data correctie: altijd de huidige tekst van de campagne, voor de volgende analyse. */
export function DataCorrectie({
  campagne,
  bijVersie,
  onOpgeslagen,
}: {
  campagne: MaOverzichtRegel;
  bijVersie: string | null | undefined;
  onOpgeslagen: (c: MaCampagne) => void;
}) {
  const [tekst, setTekst] = useState(campagne.dataCorrectie ?? "");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [melding, setMelding] = useState<string | null>(null);
  const gewijzigd = tekst.trim() !== (campagne.dataCorrectie ?? "").trim();

  async function opslaan() {
    setBezig(true);
    setFout(null);
    setMelding(null);
    try {
      const res = await fetch(`/api/marketing-analyse?id=${encodeURIComponent(campagne.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataCorrectie: tekst }),
      });
      const data = (await res.json().catch(() => ({}))) as { campagne?: MaCampagne; fout?: string };
      if (!res.ok || !data.campagne) throw new Error(data.fout ?? "Kon de Data correctie niet opslaan.");
      onOpgeslagen(data.campagne);
      toonMelding({ titel: "Data correctie opgeslagen", regel: "Geldt vanaf de volgende analyse." });
      setMelding("Opgeslagen. De volgende analyse neemt dit mee.");
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setBezig(false);
    }
  }

  return (
    <section className="rounded-panel border border-line bg-card px-6 py-5 shadow-subtle">
      <h2 className="label-theme text-label text-ink-muted">Data correctie</h2>
      <p className="mt-1 max-w-[90ch] text-meta text-ink-faint">
        Klopt de verantwoording niet? Schrijf op wat er mist of te veel is meegenomen, bijvoorbeeld een post die er niet bij hoort
        of een pagina of mailing die ontbreekt. De volgende analyse past het toe en meldt wat hij ermee deed.
      </p>
      <textarea
        value={tekst}
        onChange={(e) => {
          setTekst(e.target.value);
          setMelding(null);
        }}
        aria-label="Data correctie"
        rows={4}
        className="mt-3 w-full resize-y rounded-card border border-line bg-surface-tint px-4 py-3 text-sm text-ink outline-none focus:border-primary"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-meta text-ink-faint">
          {(bijVersie ?? "") !== (campagne.dataCorrectie ?? "")
            ? bijVersie
              ? "Deze versie is gemaakt met een eerdere tekst."
              : "Deze versie is gemaakt zonder Data correctie."
            : campagne.dataCorrectieBijgewerktOp
              ? `Laatst aangepast ${datumKort(campagne.dataCorrectieBijgewerktOp)}.`
              : ""}
        </p>
        <div className="flex items-center gap-3">
          {fout && <span className="text-sm text-negative">{fout}</span>}
          {melding && <span className="text-sm text-positive">{melding}</span>}
          <button
            type="button"
            onClick={opslaan}
            disabled={bezig || !gewijzigd}
            className="rounded-button bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {bezig ? "Opslaan…" : "Opslaan"}
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * Het tabblad Verantwoording: wat de analyse aan de campagne heeft toegerekend en waarom, welke
 * bronnen hij gebruikte, wat hij met de Data correctie deed, de kanttekeningen bij de data, het
 * invulveld voor de volgende Data correctie en de voorstellen voor de semantic layer.
 */
export default function Verantwoording({
  resultaat: r,
  campagne,
  dataCorrectieBijVersie,
  isEigenaar,
  onCampagneBijgewerkt,
  versieId,
}: {
  resultaat: MaResultaat;
  campagne: MaOverzichtRegel;
  dataCorrectieBijVersie: string | null | undefined;
  isEigenaar: boolean;
  onCampagneBijgewerkt: (c: MaCampagne) => void;
  versieId: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-panel border border-line bg-card shadow-subtle">
        <header className="border-b border-line-soft px-6 py-4">
          <h2 className="label-theme text-label text-ink-muted">Wat bij de campagne hoort</h2>
          <p className="mt-1 text-meta text-ink-faint">
            Wat de analyse aan deze campagne heeft toegerekend, en waarom. Klopt iets niet? Vul de Data correctie hieronder in.
          </p>
          {r.bronnen && r.bronnen.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {r.bronnen.map((b) => (
                <span key={b} className="rounded-control border border-line-soft bg-surface-tint px-2 py-0.5 text-meta text-ink-muted">
                  {b}
                </span>
              ))}
            </div>
          )}
        </header>
        {r.herkenning.length === 0 ? (
          <p className="px-6 py-4 text-sm text-ink-muted">Geen toewijzingen vastgelegd.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-label text-ink-faint">
                <th className="label-theme px-6 py-2 font-normal">Bron</th>
                <th className="label-theme px-3 py-2 font-normal">Soort</th>
                <th className="label-theme px-3 py-2 font-normal">Naam</th>
                <th className="label-theme px-3 py-2 font-normal">Waarom</th>
                <th className="label-theme px-6 py-2 text-right font-normal">Zekerheid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft border-t border-line-soft">
              {r.herkenning.map((h, i) => (
                <tr key={i} className="align-top">
                  <td className="whitespace-nowrap px-6 py-2.5 text-ink">{h.bron}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-ink-muted">{h.soort}</td>
                  <td className="max-w-[28ch] break-words px-3 py-2.5 font-medium text-ink">{h.naam}</td>
                  <td className="px-3 py-2.5 text-ink-muted">{h.reden}</td>
                  <td className={`whitespace-nowrap px-6 py-2.5 text-right ${h.zekerheid === "twijfel" ? "text-negative" : "text-ink-muted"}`}>
                    {h.zekerheid ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {r.correcties && r.correcties.length > 0 && (
          <div className="border-t border-line-soft px-6 py-4">
            <p className="mb-2 text-sm font-semibold text-ink">Wat er met de Data correctie is gedaan</p>
            <ul className="flex flex-col gap-2 text-sm">
              {r.correcties.map((c, i) => (
                <li key={i}>
                  <span className="text-ink">{c.correctie}</span>
                  <span className="text-ink-muted"> → {c.verwerking}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {r.datakwaliteit && r.datakwaliteit.length > 0 && (
          <div className="border-t border-line-soft px-6 py-4">
            <p className="mb-2 text-sm font-semibold text-ink">Kanttekeningen bij de data</p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink-muted">
              {r.datakwaliteit.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <DataCorrectie key={versieId} campagne={campagne} bijVersie={dataCorrectieBijVersie} onOpgeslagen={onCampagneBijgewerkt} />

      {r.semantiekVoorstellen && r.semantiekVoorstellen.length > 0 && (
        <section className="rounded-panel border border-line bg-card px-6 py-5 shadow-subtle">
          <h2 className="label-theme text-label text-ink-muted">Voorstellen voor de semantic layer</h2>
          <p className="mt-1 text-meta text-ink-faint">
            Bevindingen die voor alle campagnes lijken te gelden. De analyse past de semantic layer nooit zelf aan
            {isEigenaar ? "; neem over wat klopt via de knop Semantic layer." : "; de eigenaar beslist."}
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {r.semantiekVoorstellen.map((v, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 rounded-control border border-line px-1.5 py-0.5 text-meta text-ink-muted">{v.blok}</span>
                <div className="min-w-0">
                  <p className="text-sm text-ink">{v.voorstel}</p>
                  <p className="mt-0.5 text-meta text-ink-muted">{v.reden}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
