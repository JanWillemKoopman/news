/**
 * Welke tabbladen wie ziet.
 *
 * Twee lijsten (november 2026, op verzoek van de eigenaar):
 *
 *  - **Verborgen voor iedereen**, ook de eigenaar (`VERBORGEN_TABBLADEN`): Scores, Kennis en
 *    acties, Budget beheer, Koppeltabel, Kosten, Landingspagina en KPI's 2026 (`kpi-overzicht`,
 *    november 2026). De code blijft staan; terugzetten is ze
 *    uit deze lijst halen.
 *  - **Alleen voor de eigenaar** (zijn twee accounts, `BEPERKTE_TABBLADEN`): Instellingen en Leads (Leads sinds
 *    november 2026 weer zichtbaar, eerst alleen voor de eigenaar).
 *
 * Zelfde twee adressen als de beheerders in `lib/gebruikersbeheer.ts`, maar bewust een
 * eigen module: deze wordt ook in de browser geladen (Sidebar, AppShell), en
 * `gebruikersbeheer.ts` bevat het standaardwachtwoord voor nieuwe accounts, dat nooit in
 * de clientbundel mag komen.
 *
 * Verbergen in de sidebar is niet genoeg: wie `?tab=leads` intypt, komt er ook niet. Daarom
 * op drie plekken toegepast: de sidebar (en het profielmenu), `AppShell` (een tabblad uit de
 * URL opent niet) en `app/page.tsx` (het paneel wordt niet eens gerenderd). `/api/leads`
 * controleert het daarnaast zelf. De API-routes van de verborgen tabbladen staan bewust nog
 * open: `/api/campagne-notities` draagt ook het logboek per campagne, `/api/profiel` het
 * theme van iedereen.
 */

export const BEPERKTE_TABBLADEN_EMAILS = ["koopman.janwillem@gmail.com", "jkoopman@udenhout.nl"] as const;

/** Tabbladen die niemand ziet. */
export const VERBORGEN_TABBLADEN = ["scores", "kennisacties", "budget-beheer", "koppeltabel", "kosten", "landingspagina", "kpi-overzicht"] as const;

/** Tabbladen die alleen voor de accounts van de eigenaar bestaan. */
export const BEPERKTE_TABBLADEN = ["instellingen", "leads"] as const;

export function magBeperkteTabbladenZien(email: string | null | undefined): boolean {
  if (!email) return false;
  return (BEPERKTE_TABBLADEN_EMAILS as readonly string[]).includes(email.toLowerCase());
}

/** Mag deze gebruiker dit tabblad openen? */
export function magTabbladZien(view: string, email: string | null | undefined): boolean {
  if ((VERBORGEN_TABBLADEN as readonly string[]).includes(view)) return false;
  return !(BEPERKTE_TABBLADEN as readonly string[]).includes(view) || magBeperkteTabbladenZien(email);
}
