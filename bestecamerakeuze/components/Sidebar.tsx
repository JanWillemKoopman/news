"use client";

import GebruikersMenu from "@/components/GebruikersMenu";
import NavigationItem from "@/components/NavigationItem";
import { magTabbladZien } from "@/lib/beperkteTabbladen";
import { IconBrain, IconTrophy } from "@/components/icons";
import { NAV_GROEPEN, zichtbarePaginas } from "@/components/navigatie";

export type DashboardView =
  | "home"
  | "scores"
  | "kennisacties"
  | "campagnes"
  | "tijdlijn"
  | "campagnebeheer"
  | "kpi-overzicht"
  | "kpi-2027"
  | "kpi-2027-syntec"
  | "kpi-2027-social"
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

          {/* De groepen zelf (Campagnes, KPI's 2027, Kanalen, Tools) staan in
              `components/navigatie.tsx`, gedeeld met het startscherm. Een groep zonder
              zichtbare pagina krijgt ook geen kopje. */}
          {NAV_GROEPEN.map((groep) => {
            const paginas = zichtbarePaginas(groep, gebruikerEmail);
            if (paginas.length === 0) return null;
            return (
              <div key={groep.id} className="flex flex-col gap-0.5">
                <p className="label-theme mb-1 mt-4 hidden px-3 text-label text-sidebar-ink-muted group-hover:block">
                  {groep.naam}
                </p>
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
            );
          })}
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
