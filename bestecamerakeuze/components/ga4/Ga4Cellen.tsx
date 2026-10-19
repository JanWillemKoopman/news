"use client";

import { useState } from "react";
import MetricCell, { PlainCell } from "@/components/MetricCell";
import type { Campagne } from "@/lib/sheet";
import { formatNumber, percentOfTarget, ratio } from "@/lib/format";
import { normaliseerGetal } from "@/lib/getallen";
import { useGa4Koppelingen } from "@/lib/ga4KoppelingContext";

/**
 * "Doel GA conversies" in de campagnetabel: een open veld dat het team zelf invult.
 *
 * Ziet eruit en werkt als `BewerkbaarVeld` (klik → invoerveld → opslaan bij verlaten),
 * maar schrijft naar Supabase (`campagne_ga4_doelen`) en niet naar de sheet: het doel
 * hoort bij de GA-koppeling, en de sheet heeft er geen kolom voor.
 */
export function Ga4DoelCel({ campagne, bewerkbaar }: { campagne: Campagne; bewerkbaar: boolean }) {
  const { koppelingen, slaOp } = useGa4Koppelingen();
  const doel = koppelingen[campagne.naam]?.doelConversies ?? null;
  const [bewerken, setBewerken] = useState(false);
  const [waarde, setWaarde] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const weergave = <PlainCell value={formatNumber(doel)} />;
  if (!bewerkbaar) return weergave;

  function beginBewerken() {
    setWaarde(doel !== null ? String(doel).replace(".", ",") : "");
    setFout(null);
    setBewerken(true);
  }

  async function opslaan() {
    if (bezig) return;
    const genormaliseerd = normaliseerGetal(waarde);
    if (genormaliseerd === null) {
      setFout("Voer een geldig getal in.");
      return;
    }
    const nieuw = genormaliseerd === "" ? null : Number(genormaliseerd.replace(",", "."));
    if (nieuw === doel) {
      setBewerken(false);
      return;
    }
    setBezig(true);
    setFout(null);
    try {
      await slaOp(campagne.naam, { doelConversies: nieuw });
      setBewerken(false);
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Opslaan mislukt.");
    } finally {
      setBezig(false);
    }
  }

  if (!bewerken) {
    return (
      <button
        type="button"
        onClick={beginBewerken}
        title="Klik om te bewerken"
        className="block w-full rounded-control text-left decoration-line-soft decoration-dotted underline-offset-4 hover:underline"
      >
        {weergave}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        autoFocus
        type="text"
        inputMode="decimal"
        value={waarde}
        disabled={bezig}
        onChange={(e) => setWaarde(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setBewerken(false);
        }}
        onBlur={opslaan}
        className="w-full rounded-control border border-line bg-card px-2 py-1 text-sm tabular-nums text-ink outline-none focus:border-primary disabled:opacity-60"
      />
      {fout && <span className="text-xs text-negative">{fout}</span>}
    </div>
  );
}

/**
 * "GA conversies": hoe vaak de gekoppelde events vuurden binnen de looptijd. Zonder
 * koppeling een neutrale "—" en geen nul — "niet gekoppeld" is iets anders dan "niets
 * binnengekomen".
 */
export function Ga4ConversieCel({ campagne }: { campagne: Campagne }) {
  const { koppelingen, tellingen } = useGa4Koppelingen();
  const koppeling = koppelingen[campagne.naam];
  if (!koppeling || koppeling.regels.length === 0) return <PlainCell value="—" muted />;

  const telling = tellingen[campagne.naam];
  if (!telling) return <PlainCell value={campagne.startdatum ? "…" : "—"} muted />;

  const doel = koppeling.doelConversies;
  const percent = ratio(telling.totaal, doel);
  return (
    <MetricCell
      primary={formatNumber(telling.totaal)}
      secondary={percentOfTarget(telling.totaal, doel) ?? undefined}
      progress={percent ?? undefined}
    />
  );
}
