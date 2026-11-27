"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const BREEDTE = 320;
const RAND = 12;
const OPEN_VERTRAGING_MS = 120;

/**
 * Een kaartje met meer uitleg bij een cijfer, dat opent als de muis erboven staat (of de toets-
 * focus erop ligt). Het kaartje staat in een portal op `<body>` met een vaste positie, niet in de
 * cel zelf: de tabel scrolt horizontaal (`overflow-x-auto`), en daarin zou een kaartje worden
 * afgesneden — dezelfde reden als bij `Modal` en `Drawer`. Het gaat onder het cijfer open en klapt
 * naar boven als er onder geen ruimte is. Een korte vertraging voorkomt geflikker als de muis over
 * meerdere cellen heen gaat.
 */
export default function HoverKaart({
  titel,
  kaart,
  children,
  className = "",
}: {
  titel: string;
  kaart: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const anker = useRef<HTMLDivElement>(null);
  const kaartRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const sluit = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setOpen(false);
    setPos(null);
  }, []);

  const plan = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), OPEN_VERTRAGING_MS);
  }, []);

  // Positie bepalen zodra het kaartje er is, zodat we zijn hoogte kennen (onder of boven het anker).
  useLayoutEffect(() => {
    if (!open || !anker.current || !kaartRef.current) return;
    const r = anker.current.getBoundingClientRect();
    const hoogte = kaartRef.current.offsetHeight;
    const links = Math.min(Math.max(r.left, RAND), window.innerWidth - BREEDTE - RAND);
    const onder = r.bottom + 8;
    const top = onder + hoogte > window.innerHeight - RAND && r.top - 8 - hoogte > RAND ? r.top - 8 - hoogte : onder;
    setPos({ left: links, top });
  }, [open]);

  // Scrollen of van grootte veranderen: het anker verschuift, dus sluiten we het kaartje.
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", sluit, true);
    window.addEventListener("resize", sluit);
    return () => {
      window.removeEventListener("scroll", sluit, true);
      window.removeEventListener("resize", sluit);
    };
  }, [open, sluit]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <div
      ref={anker}
      tabIndex={0}
      role="group"
      aria-label={titel}
      onMouseEnter={plan}
      onMouseLeave={sluit}
      onFocus={plan}
      onBlur={sluit}
      onKeyDown={(e) => e.key === "Escape" && sluit()}
      className={`cursor-default rounded-control outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 ${className}`}
    >
      {children}
      {open &&
        createPortal(
          <div
            ref={kaartRef}
            role="tooltip"
            style={{ width: BREEDTE, left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }}
            className="pointer-events-none fixed z-50 rounded-card border border-line bg-card p-4 shadow-dropdown"
          >
            <p className="label-theme mb-2.5 text-label text-ink-faint">{titel}</p>
            {kaart}
          </div>,
          document.body,
        )}
    </div>
  );
}
