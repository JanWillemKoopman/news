"use client";

import { useEffect, useRef, useState } from "react";
import { formatteer } from "@/components/chat/chartTheme";
import { KPI_GROEI } from "@/lib/kpi2027/definities";
import { leesPercentage, percentageInvoer } from "@/lib/kpi2027/groeiInvoer";

/**
 * Het groeipercentage van één KPI met de hand aanpassen — op de kaart (`KpiKaart.tsx`)
 * én in de overzichtstabel (`OverzichtTabel.tsx`), met precies hetzelfde gedrag: klik op
 * het percentage, typ een getal, Enter of wegklikken slaat op, Escape annuleert; precies
 * de standaard typen zet hem terug. Het opslaan en herberekenen doet de ouder
 * (`opslaan`, zie de panelen), zodat kaart en tabel altijd hetzelfde getal tonen.
 */

export function groeiTekst(groei: number): string {
  return `${groei >= 0 ? "+" : "−"}${formatteer(Math.abs(groei) * 100, "procent")}`;
}

export const STANDAARD_GROEI_TEKST = groeiTekst(KPI_GROEI);

export function useGroeiBewerken(groei: number, opslaan: (groei: number | null) => Promise<void>) {
  const [bewerken, setBewerken] = useState(false);
  const [invoer, setInvoer] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const veld = useRef<HTMLInputElement>(null);
  // Enter slaat op en haalt daarmee de focus weg; dan hoort blur niet nóg eens op te slaan.
  const klaar = useRef(false);

  useEffect(() => {
    if (bewerken) veld.current?.select();
  }, [bewerken]);

  function begin() {
    if (bezig) return;
    klaar.current = false;
    setFout(null);
    setInvoer(percentageInvoer(groei));
    setBewerken(true);
  }

  async function bewaar(nieuw: number | null) {
    setBezig(true);
    setFout(null);
    try {
      await opslaan(nieuw);
      setBewerken(false);
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Opslaan mislukt.");
    } finally {
      setBezig(false);
    }
  }

  async function bevestig() {
    if (klaar.current) return;
    const nieuw = leesPercentage(invoer);
    if (nieuw === null) {
      setFout("Typ een percentage, bijvoorbeeld 7,5.");
      return;
    }
    klaar.current = true;
    if (Math.abs(nieuw - groei) < 1e-9) {
      setBewerken(false);
      return;
    }
    await bewaar(Math.abs(nieuw - KPI_GROEI) < 1e-9 ? null : nieuw);
    klaar.current = false;
  }

  const invoerProps = {
    ref: veld,
    type: "text",
    inputMode: "decimal" as const,
    "aria-label": "Groeipercentage",
    value: invoer,
    disabled: bezig,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setInvoer(e.target.value);
      setFout(null);
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void bevestig();
      } else if (e.key === "Escape") {
        klaar.current = true;
        setBewerken(false);
        setFout(null);
      }
    },
    onBlur: () => void bevestig(),
  };

  return { bewerken, bezig, fout, begin, terugzetten: () => void bewaar(null), invoerProps };
}
