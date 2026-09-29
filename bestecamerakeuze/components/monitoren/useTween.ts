"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Laat een getal in `ms` milliseconden naar `doel` lopen (lineair; het easing doet de
 * aanroeper). Gebruikt voor tellende cijfers en de bewegende bollen in het rapport.
 * Wie `prefers-reduced-motion` heeft staan, krijgt direct de eindwaarde.
 */
export function useTween(doel: number, ms = 900): number {
  const [waarde, setWaarde] = useState(0);
  const huidig = useRef(0);

  useEffect(() => {
    const rustig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (rustig) {
      huidig.current = doel;
      setWaarde(doel);
      return;
    }
    const van = huidig.current;
    const start = performance.now();
    let raf = 0;
    const stap = (nu: number) => {
      const k = Math.min(1, (nu - start) / ms);
      huidig.current = van + (doel - van) * k;
      setWaarde(huidig.current);
      if (k < 1) raf = requestAnimationFrame(stap);
    };
    raf = requestAnimationFrame(stap);
    return () => cancelAnimationFrame(raf);
  }, [doel, ms]);

  return waarde;
}

export const easeOutCubic = (k: number) => 1 - Math.pow(1 - k, 3);

/** Met een lichte overshoot: een bol die er even overheen schiet en terugveert. */
export const easeOutBack = (k: number) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
};

export const tussen = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
