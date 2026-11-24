import type { DashboardView } from "@/components/Sidebar";
import { magTabbladZien } from "@/lib/beperkteTabbladen";
import {
  IconAdHeart,
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

export type NavPagina = { view: DashboardView; label: string; icon: React.ReactNode };

export type NavGroepId = "campagnes" | "kpis" | "kanalen" | "tools";

export type NavGroep = {
  id: NavGroepId;
  /** Het kleine uppercase kopje in de sidebar, en het grijze kopje op het startscherm. */
  naam: string;
  paginas: NavPagina[];
};

/**
 * De navigatiegroepen, op één plek voor de sidebar (`Sidebar.tsx`) én het startscherm
 * (`home/HomeDashboard.tsx`). Zo kunnen die twee nooit uit elkaar lopen: wat hier staat
 * en wat `magTabbladZien` (`lib/beperkteTabbladen.ts`) toestaat, staat op allebei — en
 * niets anders. Volgorde = volgorde in de sidebar.
 *
 * - **Campagnes** staat bovenaan: de campagnetabel is waar het weekoverleg begint.
 * - **KPI's 2027**: de targets per GA4-website, per Syntec-bron en per social-account. KPI's 2026
 *   (`kpi-overzicht`) is er in november 2026 op verzoek uit gehaald en staat verborgen.
 * - **Kanalen** komt ná de KPI's: dat is waar je doorklikt om te zien waaróm een
 *   campagne loopt zoals hij loopt. Social en Google staan apart omdat het twee andere
 *   gesprekken zijn (bereik en beeld tegenover zoekintentie); Website staat onderaan,
 *   want dat gaat over waar de rest landt. De koppeltabel staat bewust niet hier maar in
 *   het profielmenu.
 * - **Tools**: de interne bronnen (Syntec, de Selligent-export, de GA4-leads van
 *   udenhout.nl) en de hulpmiddelen Budget beheer en Landingspagina. Syntec leads en
 *   Selligent database stonden eerst onder Kanalen, Leads ook; in november 2026 op
 *   verzoek hierheen verplaatst — het zijn geen online kanalen.
 */
export const NAV_GROEPEN: NavGroep[] = [
  {
    id: "campagnes",
    naam: "Campagnes",
    paginas: [
      { view: "campagnes", label: "Campagnes", icon: <IconMegaphone /> },
      { view: "tijdlijn", label: "Tijdlijn", icon: <IconCalendar /> },
      { view: "campagnebeheer", label: "Campagnebeheer", icon: <IconSettings /> },
      { view: "marketing-analyse", label: "Marketing analyse", icon: <IconChartBar /> },
    ],
  },
  {
    id: "kpis",
    naam: "KPI's 2027",
    paginas: [
      { view: "kpi-2027", label: "KPI's Google Analytics", icon: <IconTrendUp /> },
      { view: "kpi-2027-syntec", label: "KPI's Syntec", icon: <IconTarget /> },
      { view: "kpi-2027-social", label: "KPI's social media", icon: <IconUsers /> },
      { view: "kpi-2027-crm", label: "KPI's CRM", icon: <IconMail /> },
    ],
  },
  {
    id: "kanalen",
    naam: "Kanalen",
    paginas: [
      { view: "social-ads", label: "Social ads", icon: <IconAdHeart /> },
      { view: "google-ads", label: "Google Ads", icon: <IconSearch /> },
      { view: "organisch", label: "Social organisch", icon: <IconPhoto /> },
      { view: "account-ontwikkeling", label: "Social accounts", icon: <IconUserCircle /> },
      { view: "website", label: "Website", icon: <IconGlobe /> },
    ],
  },
  {
    id: "tools",
    naam: "Tools",
    paginas: [
      { view: "leads-syntec", label: "Syntec leads", icon: <IconUsers /> },
      { view: "selligent", label: "Selligent database", icon: <IconMail /> },
      { view: "leads", label: "Online leads", icon: <IconTarget /> },
      { view: "budget-beheer", label: "Budget beheer", icon: <IconCoin /> },
      { view: "landingspagina", label: "Landingspagina", icon: <IconGlobe /> },
    ],
  },
];

/** De pagina's uit een groep die deze gebruiker mag zien — voor sidebar en startscherm. */
export function zichtbarePaginas(groep: NavGroep, email: string | null): NavPagina[] {
  return groep.paginas.filter((pg) => magTabbladZien(pg.view, email));
}

export function navGroep(id: NavGroepId): NavGroep {
  const groep = NAV_GROEPEN.find((g) => g.id === id);
  if (!groep) throw new Error(`Onbekende navigatiegroep: ${id}`);
  return groep;
}
