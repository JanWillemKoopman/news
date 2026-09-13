/**
 * De controle op een Postgres-verbindingssnaar, vóór `pg` hem te zien krijgt.
 *
 * `pg-connection-string` accepteert namelijk álles. Wat geen `postgres://`-URI is, wordt
 * opgevat als een kale databasenaam met een standaardhost — en die standaardhost is de
 * letterlijke tekst `base`. Een verbindingssnaar met een spatie ervoor, met de naam van
 * de omgevingsvariabele er nog aan geplakt, of met een tekstuele placeholder erin,
 * mislukt daardoor niet met "dit is geen verbindingssnaar" maar met:
 *
 *     getaddrinfo ENOTFOUND base
 *
 * Dat is precies de fout die in productie op het scherm stond, en er is niets aan af te
 * lezen. Vandaar deze controle: hij kost niets en zegt wat er te doen valt.
 */

const SCHEMAS = ["postgres://", "postgresql://"];

/** Geeft null als de snaar bruikbaar is, anders een uitlegbare foutmelding. */
export function controleerVerbindingssnaar(snaar: string, naam: string): string | null {
  if (snaar !== snaar.trim()) {
    return `${naam} begint of eindigt met een spatie of regeleinde. Verwijder die — een spatie ervoor maakt de hele snaar onleesbaar voor de databaseclient.`;
  }
  if (!SCHEMAS.some((s) => snaar.startsWith(s))) {
    const kop = snaar.slice(0, 24);
    return `${naam} is geen geldige verbindingssnaar: hij hoort te beginnen met postgres:// of postgresql://, maar begint met "${kop}". Staat de naam van de variabele er nog voor, of staan er aanhalingstekens omheen?`;
  }
  return null;
}

/** Zelfde controle, maar als worp — voor plekken die toch al in een try/catch zitten. */
export function eisVerbindingssnaar(snaar: string, naam: string): void {
  const fout = controleerVerbindingssnaar(snaar, naam);
  if (fout) throw new Error(fout);
}
