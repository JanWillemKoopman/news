"use client";

import { useEffect, useState } from "react";
import GebruikersMenu from "@/components/GebruikersMenu";
import NavigationItem from "@/components/NavigationItem";
import { magTabbladZien } from "@/lib/beperkteTabbladen";
import {
  IconArrowRight,
  IconBrain,
  IconCalendarRange,
  IconChartBar,
  IconChevronDown,
  IconColumns,
  IconTrophy,
} from "@/components/icons";
import { AnalyseIllustratie, CampagneAnalyseIllustratie, TimelineIllustratie } from "@/components/home/Illustraties";
import {
  NAV_GROEPEN,
  zichtbarePaginas,
  type NavGroep,
  type NavGroepId,
} from "@/components/navigatie";

export type DashboardView =
  | "home"
  | "scores"
  | "kennisacties"
  | "campagnes"
  | "tijdlijn"
  | "campagnebeheer"
  | "campagne-analyse"
  | "marketing-analyse"
  | "campagne-timeline"
  | "kpi-overzicht"
  | "kpi-2027"
  | "kpi-2027-syntec"
  | "kpi-2027-social"
  | "kpi-2027-crm"
  | "social-ads"
  | "google-ads"
  | "organisch"
  | "account-ontwikkeling"
  | "website"
  | "leads"
  | "leads-syntec"
  | "selligent"
  | "koppeltabel"
  | "budget-beheer"
  | "landingspagina"
  | "prikbord"
  | "chat"
  | "kennis"
  | "kosten"
  | "instellingen";

type Props = {
  actief: DashboardView;
  onNavigate: (view: DashboardView) => void;
  gebruikerEmail: string | null;
  profielNaam: string | null;
  profielAvatarUrl: string | null;
};

/**
 * De drie pagina's waar de sidebar om draait (november 2026, op verzoek): Campagne analyse,
 * Marketing analyse en Campagne timeline staan bovenaan als grote tegel met een illustratie, in plaats van
 * als gewone rij. De rest van de groep Campagnes (Campagnes, Tijdlijn, Campagnebeheer)
 * staat niet meer in de sidebar — wel nog op het startscherm, dat `NAV_GROEPEN` volledig
 * toont. De groepen KPI's 2027, Kanalen en Tools staan eronder, standaard ingeklapt.
 */
const UITGELICHT: {
  view: DashboardView;
  label: string;
  icon: React.ReactNode;
  illustratie: React.ReactNode;
}[] = [
  {
    view: "campagne-analyse",
    label: "Campagne analyse",
    icon: <IconColumns />,
    illustratie: <CampagneAnalyseIllustratie />,
  },
  {
    view: "marketing-analyse",
    label: "Marketing analyse",
    icon: <IconChartBar />,
    illustratie: <AnalyseIllustratie />,
  },
  {
    view: "campagne-timeline",
    label: "Campagne timeline",
    icon: <IconCalendarRange />,
    illustratie: <TimelineIllustratie />,
  },
];

/** De groep Campagnes staat niet als groep in de sidebar: zie `UITGELICHT`. */
const SIDEBAR_GROEPEN = NAV_GROEPEN.filter((g) => g.id !== "campagnes");

/** Toon alleen het lokale deel van het werkadres als naam; het domein staat al in "Marketing" eronder. */
function naamVoor(email: string | null): string {
  if (!email) return "Gast";
  return email.split("@")[0] || email;
}

/** De donkere navigatieschil links: branding, hoofdnavigatie en gebruikersprofiel. */
export default function Sidebar({
  actief,
  onNavigate,
  gebruikerEmail,
  profielNaam,
  profielAvatarUrl,
}: Props) {
  const weergavenaam = profielNaam || naamVoor(gebruikerEmail);

  // Wie welk tabblad ziet staat in `lib/beperkteTabbladen.ts`: Scores, Kennis en acties,
  // Budget beheer, Koppeltabel en Kosten niemand; Leads, Landingspagina en Instellingen
  // alleen de eigenaar.
  const zie = (view: DashboardView) => magTabbladZien(view, gebruikerEmail);

  // Welke groepen zijn uitgeklapt? Standaard geen enkele. Kom je via het startscherm of
  // een link (`?tab=…`) op een pagina uit een ingeklapte groep, dan klapt die groep open,
  // zodat de actieve pagina altijd in de sidebar te zien is.
  const [open, setOpen] = useState<Set<NavGroepId>>(() => new Set());
  useEffect(() => {
    const groep = SIDEBAR_GROEPEN.find((g) => g.paginas.some((pg) => pg.view === actief));
    if (groep) setOpen((eerder) => (eerder.has(groep.id) ? eerder : new Set(eerder).add(groep.id)));
  }, [actief]);
  const wissel = (id: NavGroepId) =>
    setOpen((eerder) => {
      const nieuw = new Set(eerder);
      if (nieuw.has(id)) nieuw.delete(id);
      else nieuw.add(id);
      return nieuw;
    });

  return (
    // Staat standaard ingeklapt op een smalle icoon-rail (72px); bij hover klapt hij uit
    // tot 240px. De rail zelf reserveert de ruimte in AppShell (sticky, w-[72px]) en dit
    // element is daarbinnen absoluut gepositioneerd, zodat uitklappen over de content
    // heen valt in plaats van hem opzij te duwen — geen layoutshift op hover.
    <aside className="group absolute inset-y-0 left-0 flex w-[72px] flex-col justify-between overflow-x-hidden overflow-y-auto border-r border-sidebar-line sidebar-vlak px-4 py-5 transition-[width] duration-[var(--duur)] ease-merk hover:z-40 hover:w-[240px] hover:shadow-dropdown">
      <div>
        {/* Geen beeldmerk meer (op verzoek): alleen de titel "Marketing dashboard",
            horizontaal gecentreerd, die met de sidebar mee uitklapt. Een klik erop brengt
            je naar het startscherm. De vaste hoogte houdt de navigatie eronder op dezelfde
            plek, ook ingeklapt. */}
        <button
          type="button"
          onClick={() => onNavigate("home")}
          aria-label="Naar het startscherm"
          aria-current={actief === "home" ? "page" : undefined}
          className="flex h-9 w-full items-center justify-center text-center"
        >
          {/* Ingeklapt staat er alleen de letter "M" als logo (op verzoek); bij uitklappen
              maakt hij plaats voor de volledige titel. */}
          <span
            aria-hidden="true"
            className="font-sans-w7 text-title font-bold leading-none text-sidebar-ink group-hover:hidden"
          >
            M
          </span>
          <span className="max-w-0 overflow-hidden whitespace-nowrap font-sans-w7 text-cell font-bold tracking-[0.04em] text-sidebar-ink opacity-0 transition-all duration-[var(--duur)] group-hover:max-w-[200px] group-hover:opacity-100">
            Marketing dashboard
          </span>
        </button>
        {/* Witte streep onder de titel, 80% transparant (op verzoek). sidebar-ink is het
            "wit" van de navigatieschil, zodat de streep ook in elk theme klopt. */}
        <div aria-hidden="true" className="mt-3 h-px w-full bg-sidebar-ink/20" />

        <nav aria-label="Hoofdnavigatie" className="mt-6 flex flex-col gap-0.5">
          {/* Staan bewust bóven de groep "Campagnes" en zonder eigen groepskopje: dit is
              wat het team zelf vastlegt en het eerste waar je 's ochtends naar kijkt —
              de cijfers eronder vertellen wat er gebeurde, dit waarom. Scores staat
              vooraan omdat de weekstand de aanleiding is om iets vast te leggen; wat er
              vastligt lees je op het tabblad erna. */}
          {zie("scores") && (
            <NavigationItem
              icon={<IconTrophy />}
              label="Scores"
              active={actief === "scores"}
              onClick={() => onNavigate("scores")}
            />
          )}
          {zie("kennisacties") && (
            <NavigationItem
              icon={<IconBrain />}
              label="Kennis en acties"
              active={actief === "kennisacties"}
              onClick={() => onNavigate("kennisacties")}
            />
          )}

          {/* De twee hoofdpagina's als tegels. */}
          <div className="flex flex-col gap-2 group-hover:gap-2.5">
            {UITGELICHT.filter((t) => zie(t.view)).map((t) => (
              <SidebarTegel
                key={t.view}
                label={t.label}
                icon={t.icon}
                illustratie={t.illustratie}
                active={actief === t.view}
                onClick={() => onNavigate(t.view)}
              />
            ))}
          </div>

          {/* De groepen zelf (KPI's 2027, Kanalen, Tools) staan in `components/navigatie.tsx`,
              gedeeld met het startscherm. Een groep zonder zichtbare pagina krijgt ook geen
              kopje. */}
          <div className="mt-3">
            {SIDEBAR_GROEPEN.map((groep) => (
              <InklapGroep
                key={groep.id}
                groep={groep}
                gebruikerEmail={gebruikerEmail}
                actief={actief}
                open={open.has(groep.id)}
                onWissel={() => wissel(groep.id)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </nav>
      </div>

      {/* Kosten en Instellingen staan niet meer als losse navigatie-items hier — ze
          zitten nu als snelkoppelingen in het uitklapmenu van GebruikersMenu, zodat er
          geen dubbele ingang naar dezelfde pagina's is. */}
      <div className="border-t border-sidebar-line pt-3">
        <GebruikersMenu
          naam={weergavenaam}
          email={gebruikerEmail}
          avatarUrl={profielAvatarUrl}
          toontKoppeltabel={zie("koppeltabel")}
          toontKosten={zie("kosten")}
          toontInstellingen={zie("instellingen")}
          onKoppeltabel={() => onNavigate("koppeltabel")}
          onKosten={() => onNavigate("kosten")}
          onInstellingen={() => onNavigate("instellingen")}
        />
      </div>
    </aside>
  );
}

/**
 * Een uitgelichte pagina als tegel. Ingeklapt (rail op 72px) is het een vierkantje met
 * alleen het icoon, net zo groot als een gewone rij; klapt de sidebar uit, dan groeit hij
 * tot een blok met de isometrische illustratie (zelfde stijl als het startscherm) en de
 * titel eronder. De kleuren staan in `.sidebar-tegel` (globals.css): die zet de kaart- en
 * inktkleur van de illustratie op die van de sidebar, zodat hij in elk theme klopt.
 */
function SidebarTegel({
  label,
  icon,
  illustratie,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  illustratie: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      title={label}
      className={`sidebar-tegel iso-blok group/tegel relative block h-10 w-full overflow-hidden rounded-control border text-left transition-[height,background-color,border-color] duration-[var(--duur)] ease-merk group-hover:h-[140px] ${
        active ? "nav-item-actief" : ""
      }`}
    >
      {/* Rail: alleen het icoon, gecentreerd. */}
      <span className="absolute inset-0 flex items-center justify-center transition-opacity duration-[var(--duur-snel)] group-hover:opacity-0 [&>svg]:h-[18px] [&>svg]:w-[18px]">
        {icon}
      </span>

      {/* Uitgeklapt: illustratie met de titel eronder. */}
      <span className="absolute inset-0 flex flex-col opacity-0 transition-opacity duration-[var(--duur)] ease-merk group-hover:opacity-100 group-hover:delay-75">
        <span className="sidebar-tegel-gloed pointer-events-none absolute inset-0" aria-hidden="true" />
        <span className="relative flex min-h-0 flex-1 items-center justify-center px-6 pt-3">
          <span className="block h-full w-full">{illustratie}</span>
        </span>
        <span className="relative flex items-center justify-between gap-2 whitespace-nowrap px-3.5 pb-3 pt-1">
          <span className="text-sm font-semibold">{label}</span>
          <IconArrowRight className="h-3.5 w-3.5 shrink-0 -translate-x-1 opacity-0 transition-all duration-[var(--duur-snel)] ease-merk group-hover/tegel:translate-x-0 group-hover/tegel:opacity-70" />
        </span>
      </span>
    </button>
  );
}

/**
 * Een navigatiegroep die je in- en uitklapt met het kopje. Standaard ingeklapt; het pijltje
 * rechts van het kopje wijst naar rechts (dicht) of omlaag (open). In de smalle rail staat
 * er in plaats van het kopje een kort streepje, en alleen de iconen van open groepen.
 */
function InklapGroep({
  groep,
  gebruikerEmail,
  actief,
  open,
  onWissel,
  onNavigate,
}: {
  groep: NavGroep;
  gebruikerEmail: string | null;
  actief: DashboardView;
  open: boolean;
  onWissel: () => void;
  onNavigate: (view: DashboardView) => void;
}) {
  const paginas = zichtbarePaginas(groep, gebruikerEmail);
  if (paginas.length === 0) return null;
  const lijstId = `nav-groep-${groep.id}`;
  return (
    <div className="flex flex-col">
      <div aria-hidden="true" className="mx-auto mb-2 mt-3 h-px w-5 bg-sidebar-ink/15 group-hover:hidden" />
      <button
        type="button"
        onClick={onWissel}
        aria-expanded={open}
        aria-controls={lijstId}
        className="nav-item mt-1 hidden w-full items-center justify-between px-3 py-2 text-sidebar-ink-muted transition-colors duration-[var(--duur-snel)] ease-merk hover:bg-sidebar-hover hover:text-sidebar-ink group-hover:flex"
      >
        <span className="label-theme whitespace-nowrap text-label">{groep.naam}</span>
        <IconChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-[var(--duur)] ease-merk ${
            open ? "" : "-rotate-90"
          }`}
        />
      </button>
      <div
        id={lijstId}
        inert={!open}
        className={`grid transition-[grid-template-rows,opacity] duration-[var(--duur)] ease-merk ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="flex min-h-0 flex-col gap-0.5 overflow-hidden">
          {paginas.map((pg) => (
            <NavigationItem
              key={pg.view}
              icon={pg.icon}
              label={pg.label}
              active={actief === pg.view}
              onClick={() => onNavigate(pg.view)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
