"use client";

import type { DashboardView } from "@/components/Sidebar";
import { magTabbladZien } from "@/lib/beperkteTabbladen";
import {
  IconAdHeart,
  IconArrowRight,
  IconCalendar,
  IconChartBar,
  IconCoin,
  IconGlobe,
  IconMail,
  IconMegaphone,
  IconPhoto,
  IconSearch,
  IconSettings,
  IconTarget,
  IconTrendUp,
  IconUserCircle,
  IconUsers,
} from "@/components/icons";
import {
  CampagnesIllustratie,
  KanalenIllustratie,
  KpiIllustratie,
  ToolsIllustratie,
} from "@/components/home/Illustraties";

type Pagina = { view: DashboardView; label: string; icon: React.ReactNode };

type Groep = {
  fig: string;
  titel: string;
  omschrijving: string;
  illustratie: React.ReactNode;
  paginas: Pagina[];
};

/**
 * De vier blokken van het startscherm, in de volgorde links-boven, rechts-boven,
 * links-onder, rechts-onder. Elk blok is een groep uit de sidebar (`Sidebar.tsx`) met
 * dezelfde pagina's, labels en iconen: voeg je daar een tabblad toe, zet hem hier ook neer.
 * Wie een tabblad niet mag zien (`lib/beperkteTabbladen.ts`), ziet hem hier ook niet.
 */
const GROEPEN: Groep[] = [
  {
    fig: "FIG 0.1",
    titel: "KPI's",
    omschrijving: "De kerncijfers van dit jaar en de targets voor 2027.",
    illustratie: <KpiIllustratie />,
    paginas: [
      { view: "kpi-overzicht", label: "KPI's 2026", icon: <IconChartBar /> },
      { view: "kpi-2027", label: "KPI's 2027 GA", icon: <IconTrendUp /> },
      { view: "kpi-2027-syntec", label: "KPI's 2027 Syntec", icon: <IconTarget /> },
    ],
  },
  {
    fig: "FIG 0.2",
    titel: "Kanalen",
    omschrijving: "Wat elk kanaal deed: betaald, organisch, de website en de leads.",
    illustratie: <KanalenIllustratie />,
    paginas: [
      { view: "social-ads", label: "Social ads", icon: <IconAdHeart /> },
      { view: "google-ads", label: "Google Ads", icon: <IconSearch /> },
      { view: "organisch", label: "Social organisch", icon: <IconPhoto /> },
      { view: "account-ontwikkeling", label: "Social accounts", icon: <IconUserCircle /> },
      { view: "website", label: "Website", icon: <IconGlobe /> },
      { view: "leads", label: "Leads", icon: <IconTarget /> },
      { view: "leads-syntec", label: "Leads Syntec", icon: <IconUsers /> },
      { view: "selligent", label: "Selligent", icon: <IconMail /> },
    ],
  },
  {
    fig: "FIG 0.3",
    titel: "Tools",
    omschrijving: "Budget bewaken en landingspagina's laten beoordelen.",
    illustratie: <ToolsIllustratie />,
    paginas: [
      { view: "budget-beheer", label: "Budget beheer", icon: <IconCoin /> },
      { view: "landingspagina", label: "Landingspagina", icon: <IconGlobe /> },
    ],
  },
  {
    fig: "FIG 0.4",
    titel: "Campagnes",
    omschrijving: "Alle campagnes, hun looptijd en het beheer ervan.",
    illustratie: <CampagnesIllustratie />,
    paginas: [
      { view: "campagnes", label: "Campagnes", icon: <IconMegaphone /> },
      { view: "tijdlijn", label: "Tijdlijn", icon: <IconCalendar /> },
      { view: "campagnebeheer", label: "Campagnebeheer", icon: <IconSettings /> },
    ],
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
        {GROEPEN.map((groep) => (
          <GroepBlok
            key={groep.titel}
            groep={groep}
            paginas={groep.paginas.filter((pg) => magTabbladZien(pg.view, gebruikerEmail))}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

function GroepBlok({
  groep,
  paginas,
  onNavigate,
}: {
  groep: Groep;
  paginas: Pagina[];
  onNavigate: (view: DashboardView) => void;
}) {
  return (
    <section className="iso-blok kaart-accent kaart-omlijst flex flex-col rounded-panel border border-line bg-card shadow-card">
      <div className="relative px-7 pt-6">
        <span className="font-mono text-label tracking-[0.08em] text-ink-faint">{groep.fig}</span>
        <div className="mx-auto mt-1 h-[230px] max-w-[380px]">{groep.illustratie}</div>
      </div>

      <div className="flex flex-1 flex-col px-7 pb-6 pt-4">
        <h2 className="font-sans-w7 text-base font-bold text-ink">{groep.titel}</h2>
        <p className="mt-1 text-meta text-ink-muted">{groep.omschrijving}</p>

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
