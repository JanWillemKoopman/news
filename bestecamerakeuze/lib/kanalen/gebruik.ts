"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CampagneBudget } from "@/lib/kanalen/budget";
import { LEGE_KUBUS, type Kubus, type Selectie } from "@/lib/kanalen/kubus";
import { vorigePeriode, type Periode } from "@/lib/kanalen/periode";

export {
  dagenIn,
  eigenPeriode,
  kortDatum,
  periodeGrenzen,
  standaardPeriodes,
  vorigePeriode,
  type Periode,
  type PeriodeKeuze,
} from "@/lib/kanalen/periode";

/**
 * Het ophalen van één Kanalen-pagina, en de filterselectie eromheen.
 *
 * De periode is de énige keuze die een nieuwe ophaalactie veroorzaakt. Alle andere
 * filters werken op wat er al in het geheugen staat — zie `lib/kanalen/kubus.ts`.
 *
 * De vergelijking met de vorige periode is een **tweede** ophaalactie, en staat daarom
 * standaard uit: hij verdubbelt het verkeer, en niet elke blik op de cijfers is een
 * vergelijking. Wie hem aanzet krijgt exact dezelfde kubussen over de even lange periode
 * die eindigt op de dag vóór de huidige.
 */

export type PaginaSleutel =
  | "social"
  | "google"
  | "betaald"
  | "organisch"
  | "account"
  | "koppeltabel";

export interface KanaalAntwoord {
  reeks?: Kubus;
  detail?: Kubus;
  koppelingen?: unknown[];
  laatsteSync?: string | null;
  /** Draait er op dit moment een sync? Voedt de waarschuwing in "Data ophalen". */
  syncLoopt?: boolean;
  /** Telt de leadkolom conversie-acties mee? Bepaalt of Google Ads leads toont. */
  leadsUitConversies?: boolean;
  /** Budget en doelen uit de sheet, voor de campagnes die eraan gekoppeld zijn. */
  budgetten?: CampagneBudget[];
  fout?: string;
}

export interface KanaalData {
  reeks: Kubus;
  detail: Kubus;
  ruw: KanaalAntwoord | null;
  bezig: boolean;
  fout: string | null;
  laatsteSync: string | null;
  syncLoopt: boolean;
  leadsUitConversies: boolean;
  budgetten: CampagneBudget[];
  herlaad: () => void;
  /** De kubussen over de vorige, even lange periode — alleen als de vergelijking aanstaat. */
  vorige: { reeks: Kubus; detail: Kubus } | null;
  vorigeBezig: boolean;
  vorigeGrenzen: Periode;
}

async function haalKubus(pagina: PaginaSleutel, periode: Periode, vers: boolean) {
  const res = await fetch(
    `/api/kanalen?pagina=${pagina}&van=${periode.van}&tot=${periode.tot}`,
    // `reload` bij een handmatige ververs: het antwoord draagt `max-age=300,
    // stale-while-revalidate=3600`, dus zonder dit haalt de browser tot een uur lang zijn
    // eigen kopie op en levert de knop precies niets. Dat viel vooral op na "Data
    // ophalen" — dan keek je na een verse sync nog steeds naar de oude cijfers.
    { cache: vers ? "reload" : "default" },
  );
  const data = (await res.json()) as KanaalAntwoord;
  if (!res.ok) throw new Error(data.fout ?? `De data kon niet worden opgehaald (${res.status}).`);
  return data;
}

export function useKanaalData(
  pagina: PaginaSleutel,
  periode: Periode,
  vergelijk: boolean,
): KanaalData {
  const [antwoord, setAntwoord] = useState<KanaalAntwoord | null>(null);
  const [vorigeAntwoord, setVorigeAntwoord] = useState<KanaalAntwoord | null>(null);
  const [bezig, setBezig] = useState(true);
  const [vorigeBezig, setVorigeBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [teller, setTeller] = useState(0);

  const herlaad = useCallback(() => setTeller((t) => t + 1), []);
  const { van, tot } = periode;
  const vorigeGrenzen = useMemo(() => vorigePeriode({ van, tot }), [van, tot]);

  useEffect(() => {
    let afgebroken = false;
    setBezig(true);
    setFout(null);

    haalKubus(pagina, { van, tot }, teller > 0)
      .then((data) => {
        if (!afgebroken) setAntwoord(data);
      })
      .catch((err: unknown) => {
        if (afgebroken) return;
        setFout(err instanceof Error ? err.message : String(err));
        setAntwoord(null);
      })
      .finally(() => {
        if (!afgebroken) setBezig(false);
      });

    return () => {
      afgebroken = true;
    };
  }, [pagina, van, tot, teller]);

  useEffect(() => {
    if (!vergelijk) {
      setVorigeAntwoord(null);
      setVorigeBezig(false);
      return;
    }
    let afgebroken = false;
    setVorigeBezig(true);

    haalKubus(pagina, vorigeGrenzen, teller > 0)
      .then((data) => {
        if (!afgebroken) setVorigeAntwoord(data);
      })
      // Een mislukte vergelijking mag de pagina niet stukmaken: de cijfers van nu staan
      // er dan gewoon, alleen zonder het verschil erbij.
      .catch(() => {
        if (!afgebroken) setVorigeAntwoord(null);
      })
      .finally(() => {
        if (!afgebroken) setVorigeBezig(false);
      });

    return () => {
      afgebroken = true;
    };
  }, [pagina, vergelijk, vorigeGrenzen, teller]);

  const vorige = useMemo(() => {
    if (!vergelijk || !vorigeAntwoord) return null;
    return {
      reeks: vorigeAntwoord.reeks ?? LEGE_KUBUS,
      detail: vorigeAntwoord.detail ?? LEGE_KUBUS,
    };
  }, [vergelijk, vorigeAntwoord]);

  return {
    reeks: antwoord?.reeks ?? LEGE_KUBUS,
    detail: antwoord?.detail ?? LEGE_KUBUS,
    ruw: antwoord,
    bezig,
    fout,
    laatsteSync: antwoord?.laatsteSync ?? null,
    syncLoopt: antwoord?.syncLoopt ?? false,
    leadsUitConversies: antwoord?.leadsUitConversies ?? false,
    budgetten: antwoord?.budgetten ?? [],
    herlaad,
    vorige,
    vorigeBezig,
    vorigeGrenzen,
  };
}

/**
 * De filterselectie per dimensie, met de bewerkingen die de filterbalk nodig heeft.
 *
 * `begin` komt uit de URL: een gedeelde link opent met de selectie die de afzender zag.
 * Waarden voor een dimensie die deze pagina niet kent worden genegeerd.
 */
export function useSelectie(dimensies: string[], begin?: Record<string, string[]>) {
  const leeg = useMemo(() => {
    const uit: Selectie = {};
    dimensies.forEach((d) => (uit[d] = []));
    return uit;
  }, [dimensies]);

  const [selectie, setSelectie] = useState<Selectie>(() => {
    if (!begin) return leeg;
    const uit: Selectie = {};
    dimensies.forEach((d) => (uit[d] = begin[d] ?? []));
    return uit;
  });

  const zet = useCallback((dimensie: string, waarden: string[]) => {
    setSelectie((huidig) => ({ ...huidig, [dimensie]: waarden }));
  }, []);

  const wis = useCallback(() => setSelectie(leeg), [leeg]);

  const aantalActief = useMemo(
    () => Object.values(selectie).filter((v) => v.length > 0).length,
    [selectie],
  );

  return { selectie, zet, wis, aantalActief };
}
