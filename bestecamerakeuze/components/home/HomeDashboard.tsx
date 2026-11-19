"use client";

import type { DashboardView } from "@/components/Sidebar";
import { IconArrowRight } from "@/components/icons";
import {
  navGroep,
  zichtbarePaginas,
  type NavGroepId,
  type NavPagina,
} from "@/components/navigatie";
import {
  CampagnesIllustratie,
  KanalenIllustratie,
  KpiIllustratie,
  InterneDataIllustratie,
} from "@/components/home/Illustraties";

type Blok = {
  fig: string;
  /** Welke sidebargroep dit blok is: kopje én pagina's komen daar vandaan. */
  groep: NavGroepId;
  titel: string;
  omschrijving: string;
  illustratie: React.ReactNode;
};

/**
 * De vier blokken van het startscherm, in de volgorde links-boven, rechts-boven,
 * links-onder, rechts-onder. Het grijze kopje en de pagina's komen uit
 * `components/navigatie.tsx`, dezelfde lijst als de sidebar, gefilterd met dezelfde
 * `magTabbladZien`: een gebruiker ziet hier precies de pagina's die hij ook in de sidebar
 * ziet. Hier staat alleen wat het startscherm zelf toevoegt.
 */
const BLOKKEN: Blok[] = [
  {
    fig: "FIG 0.1",
    groep: "kpis",
    titel: "Key performance indicators",
    omschrijving: "De targets voor 2027 per website en per Syntec-bron.",
    illustratie: <KpiIllustratie />,
  },
  {
    fig: "FIG 0.2",
    groep: "kanalen",
    titel: "Online kanalen analyseren",
    omschrijving: "Wat elk online kanaal deed: betaald, organisch en de website.",
    illustratie: <KanalenIllustratie />,
  },
  {
    fig: "FIG 0.3",
    groep: "tools",
    titel: "Interne data",
    omschrijving: "De leads uit Syntec en het klantenbestand uit Selligent.",
    illustratie: <InterneDataIllustratie />,
  },
  {
    fig: "FIG 0.4",
    groep: "campagnes",
    titel: "Campagnes monitoren",
    omschrijving: "Alle campagnes, hun looptijd en het beheer ervan.",
    illustratie: <CampagnesIllustratie />,
  },
];

type Props = {
  onNavigate: (view: DashboardView) => void;
  gebruikerEmail: string | null;
};

/** Het startscherm: titel in het midden en vier blokken die naar elke pagina doorverwijzen. */
export default function HomeDashboard({ onNavigate, gebruikerEmail }: Props) {
  return (
    <div>
      <h1 className="titel-theme text-center text-ink">Marketing dashboard</h1>

      <div className="mt-8 grid grid-cols-2 gap-6">
        {BLOKKEN.map((blok) => {
          const groep = navGroep(blok.groep);
          return (
            <GroepBlok
              key={blok.groep}
              blok={blok}
              kopje={groep.naam}
              paginas={zichtbarePaginas(groep, gebruikerEmail)}
              onNavigate={onNavigate}
            />
          );
        })}
      </div>
    </div>
  );
}

function GroepBlok({
  blok,
  kopje,
  paginas,
  onNavigate,
}: {
  blok: Blok;
  kopje: string;
  paginas: NavPagina[];
  onNavigate: (view: DashboardView) => void;
}) {
  return (
    <section className="iso-blok kaart-accent kaart-omlijst flex flex-col rounded-panel border border-line bg-card shadow-card">
      <div className="relative px-7 pt-6">
        <span className="font-mono text-label tracking-[0.08em] text-ink-faint">{blok.fig}</span>
        <div className="mx-auto mt-1 h-[230px] max-w-[380px]">{blok.illustratie}</div>
      </div>

      <div className="flex flex-1 flex-col px-7 pb-6 pt-4">
        <p className="label-theme text-label text-ink-faint">{kopje}</p>
        <h2 className="mt-0.5 font-sans-w7 text-base font-bold text-ink">{blok.titel}</h2>
        <p className="mt-1 text-meta text-ink-muted">{blok.omschrijving}</p>

        {paginas.length > 0 ? (
          <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-0.5 border-t border-line-soft pt-3">
            {paginas.map((pg) => (
              <li key={pg.view}>
                <button
                  type="button"
                  onClick={() => onNavigate(pg.view)}
                  className="group/link flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left text-sm text-ink-muted transition-colors duration-[var(--duur-snel)] ease-merk hover:bg-surface-tint hover:text-ink"
                >
                  <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{pg.icon}</span>
                  <span className="flex-1 truncate">{pg.label}</span>
                  <IconArrowRight className="h-3.5 w-3.5 shrink-0 -translate-x-1 opacity-0 transition-all duration-[var(--duur-snel)] ease-merk group-hover/link:translate-x-0 group-hover/link:opacity-100" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 border-t border-line-soft pt-3 text-meta text-ink-faint">
            Op dit moment staan er in deze groep geen pagina's voor je account open.
          </p>
        )}
      </div>
    </section>
  );
}
