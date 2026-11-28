"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Plaats = "onder" | "boven" | "rechts" | "links";
type Tip = { tekst: string; x: number; y: number; plaats: Plaats };

const VERTRAGING_MS = 350;
const ZONDER_VERTRAGING_MS = 500;
const AFSTAND = 8;

/**
 * Eén tooltiplaag voor het hele dashboard (G7). Een element met `data-tip="…"` krijgt bij
 * hover of toetsenbordfocus een nette tooltip in de stijl van het dashboard, in plaats van
 * de trage grijze browser-`title`. Optioneel `data-tip-plaats="rechts|links|boven|onder"`
 * (standaard onder; past hij daar niet, dan klapt hij om).
 *
 * Waarom één laag met event-delegatie en geen wrapper per knop: zo kan elke bestaande knop
 * een tooltip krijgen met één attribuut, en staat de tooltip in een portal naar <body>, dus
 * een tabel of kaart met overflow-hidden snijdt hem niet af. Geef een icoonknop daarnaast
 * altijd een `aria-label`: de tooltip is voor het oog, het label voor de schermlezer.
 */
export default function TooltipLaag() {
  const [gemount, setGemount] = useState(false);
  const [tip, setTip] = useState<Tip | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const huidig = useRef<Element | null>(null);
  const laatstGetoond = useRef(0);
  const bel = useRef<HTMLDivElement | null>(null);
  const [schuif, setSchuif] = useState(0);

  // Past de tooltip niet binnen het venster (een knop in de hoek), dan schuift hij op.
  useLayoutEffect(() => {
    setSchuif(0);
    if (!tip || !bel.current) return;
    const r = bel.current.getBoundingClientRect();
    if (r.right > window.innerWidth - 8) setSchuif(window.innerWidth - 8 - r.right);
    else if (r.left < 8) setSchuif(8 - r.left);
  }, [tip]);

  useEffect(() => {
    setGemount(true);

    const verberg = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      if (huidig.current) laatstGetoond.current = Date.now();
      huidig.current = null;
      setTip(null);
    };

    const toon = (el: Element) => {
      const tekst = el.getAttribute("data-tip");
      if (!tekst) return;
      const r = el.getBoundingClientRect();
      let plaats = (el.getAttribute("data-tip-plaats") as Plaats | null) ?? "onder";
      if (plaats === "onder" && r.bottom + 40 > window.innerHeight) plaats = "boven";
      if (plaats === "boven" && r.top < 40) plaats = "onder";
      const x =
        plaats === "rechts" ? r.right + AFSTAND : plaats === "links" ? r.left - AFSTAND : r.left + r.width / 2;
      const y =
        plaats === "onder" ? r.bottom + AFSTAND : plaats === "boven" ? r.top - AFSTAND : r.top + r.height / 2;
      setTip({ tekst, x, y, plaats });
    };

    const start = (el: Element) => {
      if (huidig.current === el) return;
      verberg();
      huidig.current = el;
      const snel = Date.now() - laatstGetoond.current < ZONDER_VERTRAGING_MS;
      timer.current = setTimeout(() => toon(el), snel ? 0 : VERTRAGING_MS);
    };

    const over = (e: Event) => {
      const el = (e.target as Element | null)?.closest?.("[data-tip]");
      if (el) start(el);
      else if (huidig.current) verberg();
    };
    const focus = (e: FocusEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-tip]");
      // Alleen bij toetsenbordfocus: een muisklik geeft ook focus, maar dan hangt er al een tip.
      if (el && (e.target as Element).matches(":focus-visible")) start(el);
    };

    document.addEventListener("pointerover", over);
    document.addEventListener("focusin", focus);
    document.addEventListener("focusout", verberg);
    document.addEventListener("pointerdown", verberg);
    const toets = (e: KeyboardEvent) => {
      if (e.key === "Escape") verberg();
    };
    document.addEventListener("keydown", toets);
    window.addEventListener("scroll", verberg, true);
    return () => {
      document.removeEventListener("pointerover", over);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("focusout", verberg);
      document.removeEventListener("pointerdown", verberg);
      document.removeEventListener("keydown", toets);
      window.removeEventListener("scroll", verberg, true);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!gemount || !tip) return null;

  const transform =
    tip.plaats === "onder"
      ? "translate(-50%, 0)"
      : tip.plaats === "boven"
        ? "translate(-50%, -100%)"
        : tip.plaats === "rechts"
          ? "translate(0, -50%)"
          : "translate(-100%, -50%)";

  return createPortal(
    <div
      ref={bel}
      role="tooltip"
      style={{ left: tip.x + schuif, top: tip.y, transform }}
      className="tip-in pointer-events-none fixed z-[70] max-w-[260px] rounded-control bg-ink px-2.5 py-1.5 text-meta font-medium leading-snug text-card shadow-dropdown"
    >
      {tip.tekst}
    </div>,
    document.body,
  );
}
