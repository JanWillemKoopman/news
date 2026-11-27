"use client";

import { useEffect, useRef, useState } from "react";
import GebruikersMenu from "@/components/GebruikersMenu";
import type { DashboardView } from "@/components/Sidebar";
import { NAV_GROEPEN, zichtbarePaginas, type NavGroepId } from "@/components/navigatie";
import { IconBrain, IconCalendarRange, IconChartBar, IconChevronDown, IconClose, IconColumns, IconTrophy } from "@/components/icons";
import { magTabbladZien } from "@/lib/beperkteTabbladen";
import { STAPPEN_PLEK_ID, useWerkruimte } from "@/components/marketingAnalyse/werkruimte/WerkruimteContext";
import { useOvergang } from "@/components/marketingAnalyse/werkruimte/Bediening";

/**
 * De doorlopende zijbalk van de werkruimte Marketing analyse (redesign november 2026). Dezelfde
 * bestemmingen als de gewone sidebar (`Sidebar.tsx`: de drie campagnepagina's, dan KPI's 2027,
 * Kanalen en Tools, ingeklapt), maar als een rustige, altijd leesbare kolom van boven tot onder:
 * de zijbalk vertelt waar je bent. Onder Marketing analyse zet een geopende analyse zijn stappen
 * (`STAPPEN_PLEK_ID`), zodat er maar één navigatiekolom is.
 *
 * Breedte 248px: de langste labels ("KPI's Google Analytics", "Vervolg op de website" met
 * nummer en oordeelstip) passen zonder afkappen. Onder 1024px is het een lade (`.ma-lade`).
 */

const HOOFD: { view: DashboardView; label: string; icon: React.ReactNode }[] = [
  { view: "campagne-analyse", label: "Campagne analyse", icon: <IconColumns /> },
  { view: "marketing-analyse", label: "Marketing analyse", icon: <IconChartBar /> },
  { view: "campagne-timeline", label: "Campagne timeline", icon: <IconCalendarRange /> },
];

const GROEPEN = NAV_GROEPEN.filter((g) => g.id !== "campagnes");

function NavRegel({
  icon,
  label,
  actief,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  actief: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={actief ? "page" : undefined}
      className={`ma-nav-item flex h-[30px] w-full items-center gap-2.5 px-2.5 text-left text-[13px] ${
        actief ? "font-semibold text-ink" : "text-ink-muted hover:text-ink"
      }`}
    >
      <span className={`flex h-4 w-4 shrink-0 items-center justify-center [&>svg]:h-4 [&>svg]:w-4 ${actief ? "text-primary" : ""}`}>{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

export default function WerkruimteZijbalk({
  actief,
  onNavigate,
  gebruikerEmail,
  profielNaam,
  profielAvatarUrl,
}: {
  actief: DashboardView;
  onNavigate: (view: DashboardView) => void;
  gebruikerEmail: string | null;
  profielNaam: string | null;
  profielAvatarUrl: string | null;
}) {
  const { navOpen, sluitNavigatie, breed } = useWerkruimte();
  const { aanwezig, stand } = useOvergang(navOpen || breed, 200);
  const zie = (view: DashboardView) => magTabbladZien(view, gebruikerEmail);
  const [open, setOpen] = useState<Set<NavGroepId>>(() => new Set());
  const zijbalk = useRef<HTMLElement>(null);
  const naam = profielNaam || (gebruikerEmail ? gebruikerEmail.split("@")[0] : "Gast");

  // Een pagina uit een ingeklapte groep: die groep open, zodat de plek altijd zichtbaar is.
  useEffect(() => {
    const groep = GROEPEN.find((g) => g.paginas.some((pg) => pg.view === actief));
    if (groep) setOpen((eerder) => (eerder.has(groep.id) ? eerder : new Set(eerder).add(groep.id)));
  }, [actief]);

  // De lade: Escape sluit, de focus gaat erin bij openen.
  useEffect(() => {
    if (breed || !navOpen) return;
    const t = window.setTimeout(() => zijbalk.current?.querySelector<HTMLElement>("button")?.focus(), 30);
    const toets = (e: KeyboardEvent) => e.key === "Escape" && sluitNavigatie();
    document.addEventListener("keydown", toets);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", toets);
    };
  }, [breed, navOpen, sluitNavigatie]);

  function ga(view: DashboardView) {
    onNavigate(view);
    if (!breed) sluitNavigatie();
  }

  const lade = !breed;
  return (
    <>
      {lade && aanwezig && (
        <div
          aria-hidden="true"
          onClick={sluitNavigatie}
          data-stand={navOpen ? stand : "dicht"}
          className="ma-scherm fixed inset-0 z-[65] bg-[rgb(15_23_42/0.28)]"
        />
      )}
      <aside
        ref={zijbalk}
        aria-label="Navigatie"
        data-stand={lade ? (navOpen ? stand : "dicht") : "open"}
        inert={lade && !navOpen ? true : undefined}
        className="ma-zijbalk ma-lade fixed inset-y-0 left-0 z-[70] flex w-[min(86vw,300px)] flex-col lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:w-[var(--ma-zijbalk-breedte)] lg:shrink-0"
      >
        <div className="flex h-[var(--ma-balk-hoogte)] shrink-0 items-center justify-between gap-2 px-4">
          <button
            type="button"
            onClick={() => ga("home")}
            className="ma-titel truncate rounded-[6px] text-ink transition-opacity hover:opacity-70"
            title="Naar het startscherm"
          >
            Marketing dashboard
          </button>
          {lade && (
            <button type="button" onClick={sluitNavigatie} aria-label="Navigatie sluiten" className="ma-knop -mr-1 px-2">
              <IconClose />
            </button>
          )}
        </div>

        <nav aria-label="Hoofdnavigatie" className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-4">
          {(zie("scores") || zie("kennisacties")) && (
            <div className="mb-3 flex flex-col gap-px">
              {zie("scores") && <NavRegel icon={<IconTrophy />} label="Scores" actief={actief === "scores"} onClick={() => ga("scores")} />}
              {zie("kennisacties") && (
                <NavRegel icon={<IconBrain />} label="Kennis en acties" actief={actief === "kennisacties"} onClick={() => ga("kennisacties")} />
              )}
            </div>
          )}

          <p className="px-2.5 pb-1 pt-1 text-[11px] font-semibold text-ink-faint">Campagnes</p>
          <div className="flex flex-col gap-px">
            {HOOFD.filter((h) => zie(h.view)).map((h) => (
              <div key={h.view}>
                <NavRegel icon={h.icon} label={h.label} actief={actief === h.view} onClick={() => ga(h.view)} />
                {/* Hier zet een geopende analyse zijn stappen neer. */}
                {h.view === "marketing-analyse" && <div id={STAPPEN_PLEK_ID} />}
              </div>
            ))}
          </div>

          {GROEPEN.map((g) => {
            const paginas = zichtbarePaginas(g, gebruikerEmail);
            if (paginas.length === 0) return null;
            const isOpen = open.has(g.id);
            const id = `ma-nav-${g.id}`;
            return (
              <div key={g.id} className="mt-3">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={id}
                  onClick={() =>
                    setOpen((eerder) => {
                      const nieuw = new Set(eerder);
                      if (nieuw.has(g.id)) nieuw.delete(g.id);
                      else nieuw.add(g.id);
                      return nieuw;
                    })
                  }
                  className="flex w-full items-center justify-between rounded-[6px] px-2.5 py-1 text-[11px] font-semibold text-ink-faint transition-colors hover:text-ink-muted"
                >
                  {g.naam}
                  <IconChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-[var(--ma-duur-klein)] ${isOpen ? "" : "-rotate-90"}`}
                  />
                </button>
                <div
                  id={id}
                  inert={!isOpen ? true : undefined}
                  className={`grid transition-[grid-template-rows,opacity] duration-[var(--ma-duur-paneel)] ease-[var(--ma-ease-uit)] ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="flex min-h-0 flex-col gap-px overflow-hidden">
                    {paginas.map((pg) => (
                      <NavRegel key={pg.view} icon={pg.icon} label={pg.label} actief={actief === pg.view} onClick={() => ga(pg.view)} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-[var(--ma-zijbalk-lijn)] px-2.5 py-2.5">
          <GebruikersMenu
            uitgeklapt
            naam={naam}
            email={gebruikerEmail}
            avatarUrl={profielAvatarUrl}
            toontKoppeltabel={zie("koppeltabel")}
            toontKosten={zie("kosten")}
            toontInstellingen={zie("instellingen")}
            onKoppeltabel={() => ga("koppeltabel")}
            onKosten={() => ga("kosten")}
            onInstellingen={() => ga("instellingen")}
          />
        </div>
      </aside>
    </>
  );
}
