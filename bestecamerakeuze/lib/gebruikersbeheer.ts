// Server-only regels voor Instellingen → Gebruikers. Bewust hardcoded i.p.v. een
// rol-vlag in de database: dit zijn twee specifieke, nooit-te-verwijderen accounts,
// geen groep die kan groeien.

// Deze twee accounts staan op slot: niet te verwijderen door wie dan ook, via de UI
// noch via de API — de check hieronder wordt ook server-side afgedwongen, niet alleen
// verstopt in de knop.
export const VERGRENDELDE_EMAILS = ["koopman.janwillem@gmail.com", "jkoopman@udenhout.nl"];

// Alleen dit account mag het gedeelde standaardwachtwoord voor nieuwe collega-accounts
// wijzigen. Iedereen anders ziet die sectie niet eens.
export const WACHTWOORD_EIGENAAR_EMAIL = "koopman.janwillem@gmail.com";

// Wachtwoord waarmee nieuw aangemaakte collega-accounts starten, zolang er geen andere
// waarde in dataloket.instellingen (sleutel "gebruikers_standaard_wachtwoord") staat.
// Nooit naar de client gestuurd — alleen server-side gebruikt bij het aanmaken.
export const STANDAARD_WACHTWOORD_FALLBACK = "letsgomarketing";

export function isVergrendeldeEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return VERGRENDELDE_EMAILS.includes(email.toLowerCase());
}

export function isWachtwoordEigenaar(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase() === WACHTWOORD_EIGENAAR_EMAIL;
}

// Dezelfde twee accounts als VERGRENDELDE_EMAILS, maar deze naam gaat over een andere
// bevoegdheid: naam, foto en wachtwoord van willekeurig welke collega mogen bekijken en
// wijzigen bij Instellingen → Gebruikers. Server-side afgedwongen in de
// /api/gebruikers-routes, niet alleen verstopt in de UI.
export function isBeheerder(email: string | null | undefined): boolean {
  return isVergrendeldeEmail(email);
}

// Wie mag een bericht (campagne-aantekening) weggooien: de collega die het schreef, en
// daarnaast de twee beheeraccounts — die mogen berichten van iedereen verwijderen, waar
// ze ook staan (het logboek per campagne én het tabblad Kennis en acties).
//
// Waarom niet iedereen, zoals eerst: opruimen hoort bij wie het schreef of bij wie het
// overzicht bewaakt. Een bericht is bovendien geen losse regel meer sinds de
// puntentelling — het weghalen van andermans bericht verandert diens weekstand.
//
// Afgedwongen op drie plekken, in deze volgorde van belang: de RLS-policy op
// dataloket.campagne_notities (0026_berichten_verwijderen.sql), de DELETE-route in
// app/api/campagne-notities/[id], en pas daarna de knop in de UI.
export function magBerichtVerwijderen(
  gebruiker: { id: string; email: string | null },
  aangemaaktDoor: string,
): boolean {
  return gebruiker.id === aangemaaktDoor || isBeheerder(gebruiker.email);
}
