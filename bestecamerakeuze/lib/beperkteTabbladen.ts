/**
 * Tabbladen die alleen de eigenaar ziet (zijn twee accounts), en verder niemand.
 *
 * Nu: **Landingspagina** (Monitoren) en **Leads** (Kanalen, november 2026 op verzoek
 * verborgen voor iedereen behalve de eigenaar). Zelfde twee adressen als de beheerders in
 * `lib/gebruikersbeheer.ts`, maar bewust een eigen module: deze wordt ook in de browser
 * geladen (Sidebar, AppShell), en `gebruikersbeheer.ts` bevat het standaardwachtwoord
 * voor nieuwe accounts, dat nooit in de clientbundel mag komen.
 *
 * Verbergen in de sidebar is niet genoeg: wie `?tab=leads` intypt of `/api/leads`
 * aanroept, mag de data ook niet krijgen. Daarom op vier plekken toegepast: de sidebar,
 * `AppShell` (een tabblad uit de URL), `app/page.tsx` (het paneel wordt niet eens
 * gerenderd) en de API-route.
 */

export const BEPERKTE_TABBLADEN_EMAILS = ["koopman.janwillem@gmail.com", "jkoopman@udenhout.nl"] as const;

/** De tabbladen (views) die alleen voor die accounts bestaan. */
export const BEPERKTE_TABBLADEN = ["landingspagina", "leads"] as const;

export function magBeperkteTabbladenZien(email: string | null | undefined): boolean {
  if (!email) return false;
  return (BEPERKTE_TABBLADEN_EMAILS as readonly string[]).includes(email.toLowerCase());
}

/** Mag deze gebruiker dit tabblad openen? Elk tabblad buiten de lijst: ja. */
export function magTabbladZien(view: string, email: string | null | undefined): boolean {
  return !(BEPERKTE_TABBLADEN as readonly string[]).includes(view) || magBeperkteTabbladenZien(email);
}
