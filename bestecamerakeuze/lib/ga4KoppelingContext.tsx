"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useCampagneFilters } from "@/lib/campagneFilterContext";
import type { Ga4Koppeling, Ga4Telling, Regel } from "@/lib/ga4Koppeling";

type Ga4KoppelingContextValue = {
  /** Per campagnenaam, alleen campagnes waarvoor iets is vastgelegd. */
  koppelingen: Record<string, Ga4Koppeling>;
  /** Per campagnenaam, alleen campagnes met regels én een startdatum. */
  tellingen: Record<string, Ga4Telling>;
  /** Tot en met welke dag de telling loopt (gisteren), of null zolang er niets geteld is. */
  telTot: string | null;
  laden: boolean;
  fout: string | null;
  slaOp: (campagneNaam: string, wijziging: { doelConversies?: number | null; regels?: Regel[] }) => Promise<void>;
};

const Ga4KoppelingContext = createContext<Ga4KoppelingContextValue | null>(null);

/**
 * Eén ophaalactie voor de GA-koppelingen, gedeeld door de campagnetabel (rijen "Doel GA
 * conversies" en "GA conversies") en Campagnebeheer → Google Analytics. Zelfde reden als
 * `lib/teamData.tsx`: twee tabbladen die dezelfde rijen tonen horen niet elk hun eigen
 * stand bij te houden — anders staat er na het opslaan op het ene tabblad een ander getal
 * dan op het andere.
 *
 * De telling volgt de campagnes uit de sheet (looptijd) en de opgeslagen regels; zodra
 * één van die twee verandert, telt hij opnieuw.
 */
export function Ga4KoppelingProvider({ ingelogd, children }: { ingelogd: boolean; children: ReactNode }) {
  const { campagnes } = useCampagneFilters();
  const [koppelingen, setKoppelingen] = useState<Record<string, Ga4Koppeling>>({});
  const [tellingen, setTellingen] = useState<Record<string, Ga4Telling>>({});
  const [telTot, setTelTot] = useState<string | null>(null);
  const [laden, setLaden] = useState(true);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    if (!ingelogd) return;
    let actief = true;
    fetch("/api/campagne-ga4")
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { items?: Ga4Koppeling[]; fout?: string };
        if (!res.ok) throw new Error(data.fout ?? "Kon de GA-koppelingen niet ophalen.");
        if (actief) setKoppelingen(Object.fromEntries((data.items ?? []).map((k) => [k.campagneNaam, k])));
      })
      .catch((err) => actief && setFout(err instanceof Error ? err.message : String(err)))
      .finally(() => actief && setLaden(false));
    return () => {
      actief = false;
    };
  }, [ingelogd]);

  // Alleen de campagnes met regels gaan mee; de rest heeft niets te tellen. De sleutel
  // houdt de effect-afhankelijkheid stabiel: een nieuwe array met dezelfde inhoud mag
  // geen nieuwe query starten.
  const teTellen = useMemo(
    () =>
      campagnes
        .filter((c) => (koppelingen[c.naam]?.regels.length ?? 0) > 0)
        .map((c) => ({
          naam: c.naam,
          startdatum: c.startdatum,
          einddatum: c.einddatum,
          regels: koppelingen[c.naam].regels,
        })),
    [campagnes, koppelingen],
  );
  const telSleutel = useMemo(() => JSON.stringify(teTellen), [teTellen]);

  useEffect(() => {
    if (!ingelogd) return;
    const vragen = JSON.parse(telSleutel) as unknown[];
    if (vragen.length === 0) {
      setTellingen({});
      return;
    }
    let actief = true;
    fetch("/api/campagne-ga4/tellen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campagnes: vragen }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          tellingen?: Record<string, Ga4Telling>;
          tot?: string;
          fout?: string;
        };
        if (!res.ok) throw new Error(data.fout ?? "Kon de GA-conversies niet tellen.");
        if (!actief) return;
        setTellingen(data.tellingen ?? {});
        setTelTot(data.tot ?? null);
        setFout(null);
      })
      .catch((err) => actief && setFout(err instanceof Error ? err.message : String(err)));
    return () => {
      actief = false;
    };
  }, [ingelogd, telSleutel]);

  const slaOp = useCallback(
    async (campagneNaam: string, wijziging: { doelConversies?: number | null; regels?: Regel[] }) => {
      const res = await fetch("/api/campagne-ga4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campagne: campagneNaam, ...wijziging }),
      });
      const data = (await res.json().catch(() => ({}))) as { item?: Ga4Koppeling; fout?: string };
      if (!res.ok || !data.item) throw new Error(data.fout ?? "Opslaan mislukt.");
      const item = data.item;
      setKoppelingen((huidig) => ({ ...huidig, [campagneNaam]: item }));
    },
    [],
  );

  const waarde = useMemo(
    () => ({ koppelingen, tellingen, telTot, laden, fout, slaOp }),
    [koppelingen, tellingen, telTot, laden, fout, slaOp],
  );

  return <Ga4KoppelingContext.Provider value={waarde}>{children}</Ga4KoppelingContext.Provider>;
}

export function useGa4Koppelingen(): Ga4KoppelingContextValue {
  const context = useContext(Ga4KoppelingContext);
  if (!context) throw new Error("useGa4Koppelingen moet binnen een Ga4KoppelingProvider staan.");
  return context;
}
