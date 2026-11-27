"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * De werkruimte van Marketing analyse (redesign november 2026): de doorlopende zijbalk en de
 * knoppenbalk horen bij elkaar. Op een smal scherm is de zijbalk een lade die de knoppenbalk
 * opent; deze context verbindt die twee, zonder dat AppShell iets van de pagina hoeft te weten.
 */

/** De plek in de zijbalk waar een geopende analyse zijn stappen neerzet (via een portal). */
export const STAPPEN_PLEK_ID = "ma-zijbalk-stappen";

/** Vanaf deze breedte staat de zijbalk vast in beeld (Tailwind `lg`). */
export const VASTE_ZIJBALK_VANAF = 1024;

type Werkruimte = {
  navOpen: boolean;
  openNavigatie: () => void;
  sluitNavigatie: () => void;
  /** True vanaf `VASTE_ZIJBALK_VANAF`: dan is de zijbalk geen lade. */
  breed: boolean;
};

const Context = createContext<Werkruimte>({
  navOpen: false,
  openNavigatie: () => {},
  sluitNavigatie: () => {},
  breed: true,
});

export function WerkruimteProvider({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  // AppShell toont deze pagina pas na de eerste render in de browser (het tabblad staat in de URL),
  // dus meteen goed meten voorkomt een flits van de vaste zijbalk op een telefoon.
  const [breed, setBreed] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia(`(min-width: ${VASTE_ZIJBALK_VANAF}px)`).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${VASTE_ZIJBALK_VANAF}px)`);
    const zet = () => {
      setBreed(mq.matches);
      if (mq.matches) setNavOpen(false);
    };
    zet();
    mq.addEventListener("change", zet);
    return () => mq.removeEventListener("change", zet);
  }, []);
  const openNavigatie = useCallback(() => setNavOpen(true), []);
  const sluitNavigatie = useCallback(() => setNavOpen(false), []);
  const waarde = useMemo(() => ({ navOpen, openNavigatie, sluitNavigatie, breed }), [navOpen, openNavigatie, sluitNavigatie, breed]);
  return <Context.Provider value={waarde}>{children}</Context.Provider>;
}

export function useWerkruimte() {
  return useContext(Context);
}

/**
 * De mobiele viewport, alleen voor de werkruimte. Het dashboard heeft geen viewport-meta (het is
 * voor desktop gebouwd, zie CLAUDE.md): een telefoon toont daar een uitgezoomd desktopvenster.
 * Marketing analyse heeft sinds de redesign een eigen iPhone-weergave, dus zolang deze pagina open
 * is staat de viewport op de breedte van het apparaat; daarna gaat hij terug zoals hij was, zodat
 * de andere pagina's niet veranderen.
 */
export function useMobieleViewport(aan: boolean) {
  useEffect(() => {
    if (!aan) return;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    const eigen = !meta;
    const vorige = meta?.content ?? null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "viewport";
      document.head.appendChild(meta);
    }
    meta.content = "width=device-width, initial-scale=1, viewport-fit=cover";
    return () => {
      if (eigen) meta?.remove();
      else if (meta && vorige !== null) meta.content = vorige;
    };
  }, [aan]);
}

/** Is de pagina onder de knoppenbalk door gescrold? Dan krijgt het glas meer dekking. */
export function useGescrold(drempel = 4): boolean {
  const [gescrold, setGescrold] = useState(false);
  useEffect(() => {
    const zet = () => setGescrold(window.scrollY > drempel);
    zet();
    window.addEventListener("scroll", zet, { passive: true });
    return () => window.removeEventListener("scroll", zet);
  }, [drempel]);
  return gescrold;
}
