"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

/**
 * Marketing analyse — de bediening van de werkruimte (redesign november 2026): knoppen van één
 * hoogte, een segmented control, en een glazen popover die uit zijn knop opent. De stijlen staan
 * in `globals.css` onder "MARKETING ANALYSE — WERKRUIMTE" (`.ma-knop`, `.ma-segment`,
 * `.ma-glas-paneel`, `.ma-pop`).
 */

export type Stand = "open" | "dicht";

/**
 * Een element dat met een overgang verschijnt en verdwijnt. Bij openen staat het eerst één frame
 * op "dicht" (zodat de transitie iets heeft om vanaf te bewegen); bij sluiten blijft het staan
 * tot de overgang klaar is. Opnieuw openen tijdens het sluiten breekt het sluiten meteen af: de
 * laatste handeling wint, en niemand hoeft op een animatie te wachten.
 */
export function useOvergang(open: boolean, sluitDuur = 160): { aanwezig: boolean; stand: Stand } {
  const [aanwezig, setAanwezig] = useState(open);
  const [stand, setStand] = useState<Stand>(open ? "open" : "dicht");
  useEffect(() => {
    if (open) {
      setAanwezig(true);
      let tweede = 0;
      const eerste = requestAnimationFrame(() => {
        tweede = requestAnimationFrame(() => setStand("open"));
      });
      return () => {
        cancelAnimationFrame(eerste);
        cancelAnimationFrame(tweede);
      };
    }
    setStand("dicht");
    const t = window.setTimeout(() => setAanwezig(false), sluitDuur);
    return () => window.clearTimeout(t);
  }, [open, sluitDuur]);
  return { aanwezig, stand };
}

/** Sluiten met Escape of een klik buiten het element én buiten de knop die het opende. */
export function useBuitenKlik(open: boolean, refs: RefObject<HTMLElement | null>[], onSluit: () => void) {
  const sluit = useRef(onSluit);
  sluit.current = onSluit;
  useEffect(() => {
    if (!open) return;
    function klik(e: MouseEvent | TouchEvent) {
      const doel = e.target as Node;
      if (refs.every((r) => !r.current?.contains(doel))) sluit.current();
    }
    function toets(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        sluit.current();
      }
    }
    document.addEventListener("mousedown", klik);
    document.addEventListener("touchstart", klik);
    document.addEventListener("keydown", toets);
    return () => {
      document.removeEventListener("mousedown", klik);
      document.removeEventListener("touchstart", klik);
      document.removeEventListener("keydown", toets);
    };
  }, [open, refs]);
}

type PopoverProps = {
  open: boolean;
  onSluit: () => void;
  anker: RefObject<HTMLElement | null>;
  /** Welke rand van de popover gelijk staat met de knop. */
  uitlijning?: "links" | "rechts";
  breedte?: number;
  label: string;
  children: ReactNode;
  /** Rol van het paneel: een menu of een dialoogje met eigen bediening. */
  rol?: "menu" | "dialog";
};

/**
 * Een glazen paneel dat onder zijn knop opent en er ook naartoe terugkeert: de oorsprong van de
 * schaal- en vervagingsovergang ligt bij de knop. Rendert in een portal (zie CLAUDE.md over
 * sticky stacking contexts). Bij sluiten gaat de focus terug naar de knop.
 */
export function Popover({ open, onSluit, anker, uitlijning = "links", breedte = 300, label, children, rol = "dialog" }: PopoverProps) {
  const { aanwezig, stand } = useOvergang(open, 130);
  const paneel = useRef<HTMLDivElement>(null);
  const [plek, setPlek] = useState<{ top: number; left: number; breedte: number } | null>(null);

  const meet = useCallback(() => {
    const r = anker.current?.getBoundingClientRect();
    if (!r) return;
    const vw = window.innerWidth;
    const b = Math.min(breedte, vw - 24);
    let left = uitlijning === "rechts" ? r.right - b : r.left;
    left = Math.max(12, Math.min(left, vw - b - 12));
    setPlek({ top: r.bottom + 6, left, breedte: b });
  }, [anker, breedte, uitlijning]);

  useLayoutEffect(() => {
    if (!aanwezig) return;
    meet();
    window.addEventListener("resize", meet);
    window.addEventListener("scroll", meet, true);
    return () => {
      window.removeEventListener("resize", meet);
      window.removeEventListener("scroll", meet, true);
    };
  }, [aanwezig, meet]);

  const refs = useRef([paneel, anker]).current;
  useBuitenKlik(open, refs, onSluit);

  // Focus het paneel bij openen (toetsenbord kan meteen verder), en geef hem terug bij sluiten.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      const t = window.setTimeout(() => {
        const eerste = paneel.current?.querySelector<HTMLElement>("[data-autofocus], button:not([disabled]), [href], input, select");
        (eerste ?? paneel.current)?.focus({ preventScroll: true });
      }, 20);
      return () => window.clearTimeout(t);
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      if (paneel.current?.contains(document.activeElement) || document.activeElement === document.body) {
        anker.current?.focus({ preventScroll: true });
      }
    }
  }, [open, anker]);

  if (!aanwezig || !plek) return null;
  return createPortal(
    <div
      ref={paneel}
      role={rol}
      aria-label={label}
      tabIndex={-1}
      data-stand={stand}
      style={
        {
          top: plek.top,
          left: plek.left,
          width: plek.breedte,
          "--ma-oorsprong": uitlijning === "rechts" ? "top right" : "top left",
        } as React.CSSProperties
      }
      className="ma-pop ma-glas-paneel fixed z-[60] max-h-[min(72vh,560px)] overflow-y-auto rounded-[14px] p-1.5 text-sm text-ink outline-none"
    >
      {children}
    </div>,
    document.body,
  );
}

/** Een knop in de knoppenbalk die een popover opent; houdt zelf de open-toestand bij. */
export function PopoverKnop({
  label,
  inhoud,
  children,
  uitlijning,
  breedte,
  className = "",
  rol,
  titel,
}: {
  label: string;
  /** De knop zelf (icoon, tekst, chevron). */
  inhoud: ReactNode;
  children: (sluit: () => void) => ReactNode;
  uitlijning?: "links" | "rechts";
  breedte?: number;
  className?: string;
  rol?: "menu" | "dialog";
  titel?: string;
}) {
  const [open, setOpen] = useState(false);
  const knop = useRef<HTMLButtonElement>(null);
  const sluit = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        ref={knop}
        type="button"
        aria-haspopup={rol === "menu" ? "menu" : "dialog"}
        aria-expanded={open}
        aria-label={titel}
        title={titel}
        onClick={() => setOpen((x) => !x)}
        className={`ma-knop ${className}`}
      >
        {inhoud}
      </button>
      <Popover open={open} onSluit={sluit} anker={knop} uitlijning={uitlijning} breedte={breedte} label={label} rol={rol}>
        {children(sluit)}
      </Popover>
    </>
  );
}

/** Een gesegmenteerde keuze (macOS segmented control): één oppervlak, de keuze licht op. */
export function Segmenten<T extends string>({
  opties,
  waarde,
  onKies,
  label,
  className = "",
}: {
  opties: { id: T; naam: ReactNode; aantal?: number; uit?: boolean; titel?: string }[];
  waarde: T;
  onKies: (id: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={`ma-groep inline-flex items-center gap-0.5 rounded-[8px] p-[2px] ${className}`}>
      {opties.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={o.id === waarde}
          title={o.titel}
          onClick={() => onKies(o.id)}
          className={`ma-segment ${o.uit && o.id !== waarde ? "opacity-60" : ""}`}
        >
          {o.naam}
          {o.aantal !== undefined && <span className="ma-getal ml-1.5 text-ink-faint">{o.aantal}</span>}
        </button>
      ))}
    </div>
  );
}

/** Een kopje in een popover of menu. */
export function MenuKop({ children }: { children: ReactNode }) {
  return <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-faint">{children}</p>;
}

/** Een regel in een menu: tekst links, iets kleins rechts. */
export function MenuRegel({
  children,
  rechts,
  onClick,
  gekozen,
  uit,
  icoon,
  rol = "menuitem",
}: {
  children: ReactNode;
  rechts?: ReactNode;
  onClick: () => void;
  gekozen?: boolean;
  uit?: boolean;
  icoon?: ReactNode;
  rol?: "menuitem" | "menuitemradio";
}) {
  return (
    <button
      type="button"
      role={rol}
      aria-checked={rol === "menuitemradio" ? Boolean(gekozen) : undefined}
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-[7px] text-left text-[13px] transition-colors duration-[var(--ma-duur-klein)] hover:bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)] ${
        gekozen ? "bg-[var(--ma-selectie-actief)] font-medium" : ""
      } ${uit ? "text-ink-faint" : "text-ink"}`}
    >
      {icoon && <span className="flex h-4 w-4 shrink-0 items-center justify-center text-ink-muted [&>svg]:h-4 [&>svg]:w-4">{icoon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {rechts !== undefined && <span className="ma-getal shrink-0 text-[12px] text-ink-faint">{rechts}</span>}
    </button>
  );
}

export function MenuScheiding() {
  return <div role="separator" className="mx-2 my-1 h-px bg-[var(--ma-glas-lijn)]" />;
}
