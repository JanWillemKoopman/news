"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconClose, IconInfo } from "@/components/icons";
import { MELDING_EVENT, type KorteMelding } from "@/lib/meldingen";

type Regel = KorteMelding & { id: number; weg: boolean };

const DUUR_MS = 4500;
const MET_ACTIE_MS = 7000;
const UIT_MS = 180;

/**
 * Laat de meldingen uit `lib/meldingen.ts` rechtsonder in beeld zien (G3). Hooguit drie
 * tegelijk, de nieuwste onderaan. Een melding met een actie ("Ongedaan maken") blijft
 * langer staan, zodat er tijd is om te klikken; met de muis erop blijft hij staan.
 *
 * Staat links van `Toast` (de puntenmelding van Kennis en acties) op dezelfde hoogte, zodat
 * de twee elkaar nooit overlappen.
 */
export default function MeldingLaag() {
  const [gemount, setGemount] = useState(false);
  const [regels, setRegels] = useState<Regel[]>([]);
  const volgende = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const haalWeg = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setRegels((lijst) => lijst.map((r) => (r.id === id ? { ...r, weg: true } : r)));
    setTimeout(() => setRegels((lijst) => lijst.filter((r) => r.id !== id)), UIT_MS);
  }, []);

  const plan = useCallback(
    (id: number, ms: number) => {
      const oud = timers.current.get(id);
      if (oud) clearTimeout(oud);
      timers.current.set(
        id,
        setTimeout(() => haalWeg(id), ms),
      );
    },
    [haalWeg],
  );

  useEffect(() => {
    setGemount(true);
    const luister = (e: Event) => {
      const melding = (e as CustomEvent<KorteMelding>).detail;
      if (!melding?.titel) return;
      const id = volgende.current++;
      setRegels((lijst) => [...lijst.slice(-2), { ...melding, id, weg: false }]);
      plan(id, melding.actie ? MET_ACTIE_MS : DUUR_MS);
    };
    window.addEventListener(MELDING_EVENT, luister);
    const lopend = timers.current;
    return () => {
      window.removeEventListener(MELDING_EVENT, luister);
      for (const t of lopend.values()) clearTimeout(t);
    };
  }, [plan]);

  if (!gemount || regels.length === 0) return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] flex w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2">
      {regels.map((r) => (
        <div
          key={r.id}
          role="status"
          aria-live="polite"
          onMouseEnter={() => {
            const t = timers.current.get(r.id);
            if (t) clearTimeout(t);
          }}
          onMouseLeave={() => plan(r.id, 2500)}
          className={`melding-in pointer-events-auto flex items-start gap-3 rounded-card border border-line bg-card px-4 py-3 shadow-dropdown ${
            r.weg ? "melding-uit" : ""
          }`}
        >
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
              r.soort === "fout" ? "bg-negative/12 text-negative" : "bg-positive/12 text-positive"
            }`}
            aria-hidden="true"
          >
            {r.soort === "fout" ? <IconInfo className="h-3.5 w-3.5" /> : <IconCheck className="h-3.5 w-3.5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">{r.titel}</p>
            {r.regel && <p className="mt-0.5 text-meta text-ink-muted">{r.regel}</p>}
          </div>
          {r.actie && (
            <button
              type="button"
              onClick={() => {
                r.actie?.onClick();
                haalWeg(r.id);
              }}
              className="shrink-0 rounded-control px-2 py-1 text-sm font-semibold text-primary transition-colors duration-[var(--duur-snel)] ease-merk hover:bg-surface"
            >
              {r.actie.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => haalWeg(r.id)}
            aria-label="Melding sluiten"
            className="-mr-1 shrink-0 rounded-control p-1 text-ink-faint transition-colors duration-[var(--duur-snel)] ease-merk hover:bg-surface hover:text-ink"
          >
            <IconClose className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
