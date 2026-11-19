"use client";

import GebruikersMenu from "@/components/GebruikersMenu";
import NavigationItem from "@/components/NavigationItem";
import { magTabbladZien } from "@/lib/beperkteTabbladen";
import {
  IconAdHeart,
  IconBrain,
  IconChartBar,
  IconCalendar,
  IconCoin,
  IconGlobe,
  IconMail,
  IconMegaphone,
  IconPhoto,
  IconSearch,
  IconSettings,
  IconTarget,
  IconTrendUp,
  IconTrophy,
  IconUserCircle,
  IconUsers,
} from "@/components/icons";

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
        {/* Geen beeldmerk meer (op verzoek): alleen de tekst, die met de sidebar mee
            uitklapt. Een klik erop brengt je naar het startscherm. De vaste hoogte houdt
            de navigatie eronder op dezelfde plek, ook ingeklapt. */}
        <button
          type="button"
          onClick={() => onNavigate("home")}
          aria-label="Naar het startscherm"
          aria-current={actief === "home" ? "page" : undefined}
          className="flex h-9 w-full items-center text-left"
        >
          <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-[var(--duur)] group-hover:max-w-[180px] group-hover:opacity-100">
            <span className="block font-sans-w7 text-cell font-bold tracking-[0.04em] text-sidebar-ink">
              Marketing
            </span>
            <span className="block text-label text-sidebar-ink-muted">Marketing dashboard</span>
          </span>
        </button>

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

          <p className="label-theme mb-1 mt-4 hidden px-3 text-label text-sidebar-ink-muted group-hover:block">
            Campagnes
          </p>
          <NavigationItem
            icon={<IconMegaphone />}
            label="Campagnes"
            active={actief === "campagnes"}
            onClick={() => onNavigate("campagnes")}
          />
          <NavigationItem
            icon={<IconCalendar />}
            label="Tijdlijn"
            active={actief === "tijdlijn"}
            onClick={() => onNavigate("tijdlijn")}
          />
          <NavigationItem
            icon={<IconSettings />}
            label="Campagnebeheer"
            active={actief === "campagnebeheer"}
            onClick={() => onNavigate("campagnebeheer")}
          />

          <p className="label-theme mb-1 mt-4 hidden px-3 text-label text-sidebar-ink-muted group-hover:block">
            KPI&apos;s
          </p>
          <NavigationItem
            icon={<IconChartBar />}
            label="KPI's 2026"
            active={actief === "kpi-overzicht"}
            onClick={() => onNavigate("kpi-overzicht")}
          />
          {/* De targets voor 2027 staan direct onder het overzicht: het overzicht is waar
              je de stand leest, dit is waar je hem tegen afzet. */}
          <NavigationItem
            icon={<IconTrendUp />}
            label="KPI's 2027 GA"
            active={actief === "kpi-2027"}
            onClick={() => onNavigate("kpi-2027")}
          />
          {/* Dezelfde opzet, maar dan de websiteleads uit Syntec per bron in plaats van
              de GA4-cijfers van udenhout.nl. */}
          <NavigationItem
            icon={<IconTarget />}
            label="KPI's 2027 Syntec"
            active={actief === "kpi-2027-syntec"}
            onClick={() => onNavigate("kpi-2027-syntec")}
          />

          {/* Kanalen staat ná KPI's: de campagnetabel is waar het weekoverleg begint,
              de kanaalcijfers zijn waar je doorklikt als je wilt weten waaróm een campagne
              loopt zoals hij loopt. Social en Google staan apart omdat het twee andere
              gesprekken zijn — bereik en beeld tegenover zoekintentie. De koppeltabel
              staat niet in deze lijst maar bovenaan in het profielmenu (GebruikersMenu),
              boven Kosten — je komt er alleen als je iets te koppelen hebt, niet als
              onderdeel van de dagelijkse navigatie. */}
          <p className="label-theme mb-1 mt-4 hidden px-3 text-label text-sidebar-ink-muted group-hover:block">
            Kanalen
          </p>
          <NavigationItem
            icon={<IconAdHeart />}
            label="Social ads"
            active={actief === "social-ads"}
            onClick={() => onNavigate("social-ads")}
          />
          <NavigationItem
            icon={<IconSearch />}
            label="Google Ads"
            active={actief === "google-ads"}
            onClick={() => onNavigate("google-ads")}
          />
          <NavigationItem
            icon={<IconPhoto />}
            label="Social organisch"
            active={actief === "organisch"}
            onClick={() => onNavigate("organisch")}
          />
          <NavigationItem
            icon={<IconUserCircle />}
            label="Social accounts"
            active={actief === "account-ontwikkeling"}
            onClick={() => onNavigate("account-ontwikkeling")}
          />
          {/* Website staat onderaan de groep en niet bovenaan: de vier tabbladen
              erboven gaan over wat je zelf de deur uit doet, dit tabblad over waar dat
              landt. Je klikt hier dus naartoe vanuit een kanaal, niet andersom. */}
          <NavigationItem
            icon={<IconGlobe />}
            label="Website"
            active={actief === "website"}
            onClick={() => onNavigate("website")}
          />
          {/* Leads staat direct onder Website: het zijn de leads die op de website
              worden afgevuurd (GA4-events), gekoppeld aan wat de betaalde kanalen kostten.
              Je komt er vanuit de vraag "wat leverde het op", niet vanuit een kanaal.
              Alleen zichtbaar voor de eigenaar (november 2026, op verzoek). */}
          {zie("leads") && (
            <NavigationItem
              icon={<IconTarget />}
              label="Leads"
              active={actief === "leads"}
              onClick={() => onNavigate("leads")}
            />
          )}
          {/* Tools (voorheen Monitoren) staat ná Kanalen: de kanaalpagina's vertellen wat er gebeurde, dit
              kopje of dat binnen de afspraak blijft — budget en klikdoel per maand. */}
          <p className="label-theme mb-1 mt-4 hidden px-3 text-label text-sidebar-ink-muted group-hover:block">
            Tools
          </p>
          {/* Leads Syntec en Selligent staan sinds november 2026 onder Tools (op verzoek):
              het zijn interne bronnen (Syntec, de Selligent-export), geen online kanalen. */}
          <NavigationItem
            icon={<IconUsers />}
            label="Leads Syntec"
            active={actief === "leads-syntec"}
            onClick={() => onNavigate("leads-syntec")}
          />
          <NavigationItem
            icon={<IconMail />}
            label="Selligent"
            active={actief === "selligent"}
            onClick={() => onNavigate("selligent")}
          />
          {zie("budget-beheer") && (
            <NavigationItem
              icon={<IconCoin />}
              label="Budget beheer"
              active={actief === "budget-beheer"}
              onClick={() => onNavigate("budget-beheer")}
            />
          )}
          {zie("landingspagina") && (
            <NavigationItem
              icon={<IconGlobe />}
              label="Landingspagina"
              active={actief === "landingspagina"}
              onClick={() => onNavigate("landingspagina")}
            />
          )}
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
