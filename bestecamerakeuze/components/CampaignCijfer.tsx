"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const WAARDEN = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];

type Props = {
  campagneNaam: string;
  cijfer: number | null;
  /** Alleen ingelogde collega's mogen het cijfer aanpassen; anders is de badge alleen leesbaar. */
  ingelogd: boolean;
  onChange: (cijfer: number | null) => void;
};

/**
 * Handmatig campagnecijfer (0-10), als badge naast de campagnenaam. Een klik opent een
 * uitklapmenu met de tien waarden (10 bovenaan, 0 onderaan, zoals gevraagd) plus een
 * optie om het cijfer weer te wissen.
 *
 * Rendert het menu via een portal, om dezelfde reden als `Drawer.tsx`: de badge zit in
 * een sticky tabelkop en kan daar niet met een hoge z-index uit ontsnappen. De positie
 * wordt daarom zelf uitgerekend vanaf de badge in plaats van met CSS `absolute`.
 */
export default function CampaignCijfer({ campagneNaam, cijfer, ingelogd, onChange }: Props) {
  const knopRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [positie, setPositie] = useState<{ top: number; left: number } | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    function plaats() {
      const rect = knopRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPositie({ top: rect.bottom + 4, left: rect.left });
    }
    plaats();

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || knopRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("scroll", plaats, true);
    window.addEventListener("resize", plaats);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("scroll", plaats, true);
      window.removeEventListener("resize", plaats);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  async function kies(nieuw: number | null) {
    if (bezig || nieuw === cijfer) {
      setOpen(false);
      return;
    }
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch("/api/campagne-cijfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campagne: campagneNaam, cijfer: nieuw }),
      });
      const data = (await res.json().catch(() => ({}))) as { fout?: string };
      if (!res.ok) throw new Error(data.fout ?? "Opslaan mislukt.");
      onChange(nieuw);
      setOpen(false);
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Opslaan mislukt.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <>
      <button
        ref={knopRef}
        type="button"
        disabled={!ingelogd}
        onClick={() => setOpen((v) => !v)}
        title={ingelogd ? "Campagnecijfer aanpassen" : "Campagnecijfer"}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-5 min-w-5 shrink-0 items-center justify-center rounded-pill border px-1 text-xs font-semibold tabular-nums transition-colors duration-[var(--duur-snel)] ${
          cijfer !== null
            ? "border-primary/30 bg-primary-light text-primary"
            : "border-line-soft bg-surface text-ink-faint"
        } ${ingelogd ? "hover:border-primary/50" : "cursor-default"}`}
      >
        {cijfer !== null ? cijfer : "–"}
      </button>

      {open &&
        positie &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label={`Campagnecijfer voor ${campagneNaam}`}
            style={{ top: positie.top, left: positie.left }}
            className="fixed z-50 flex w-16 flex-col overflow-hidden rounded-card border border-line bg-card p-1 shadow-dropdown"
          >
            <div className="flex max-h-72 flex-col overflow-y-auto">
              {WAARDEN.map((waarde) => (
                <button
                  key={waarde}
                  type="button"
                  role="option"
                  aria-selected={waarde === cijfer}
                  disabled={bezig}
                  onClick={() => kies(waarde)}
                  className={`rounded-control px-2 py-1 text-center text-sm tabular-nums transition-colors disabled:opacity-60 ${
                    waarde === cijfer ? "bg-primary-light font-semibold text-primary" : "text-ink hover:bg-surface"
                  }`}
                >
                  {waarde}
                </button>
              ))}
            </div>
            {cijfer !== null && (
              <button
                type="button"
                disabled={bezig}
                onClick={() => kies(null)}
                className="mt-1 rounded-control border-t border-line-soft px-2 py-1 text-center text-xs text-ink-faint hover:bg-surface hover:text-ink disabled:opacity-60"
              >
                Wis
              </button>
            )}
            {fout && <p className="mt-1 px-1 text-xs text-negative">{fout}</p>}
          </div>,
          document.body,
        )}
    </>
  );
}
