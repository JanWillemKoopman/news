/**
 * De definities achter het tabblad KPI's 2027 CRM (view `kpi-2027-crm`).
 *
 * ## Wat er geteld wordt
 *
 * Alles telt **unieke e-mailadressen** uit de Selligent-export op Azure
 * (`output/autoline/users_customers_dashboard.csv`, hetzelfde bestand als Tools → Selligent
 * database, via `lib/selligent/bron.ts`):
 *
 *  - **Contacten**: het aantal verschillende waarden in de kolom `MAIL` (lege cel telt niet).
 *    Precies het getal van de tegel "E-mailadressen" op Tools → Selligent database.
 *  - **Opt-in <merk>**: per booleaanse kolom (`PREFERENCES_VW`, `PREFERENCES_AUDI`, …) het
 *    aantal verschillende e-mailadressen met minstens één rij waarop die kolom `True` is.
 *    Welke kolommen dat zijn staat nergens opgesomd: het zijn de kolommen die als booleaans
 *    uit de data komen, net als de opt-in-tegels op Tools → Selligent database. Een nieuwe
 *    voorkeur in de export levert dus vanzelf een nieuwe KPI op.
 *
 * ## Een stand, geen optelsom
 *
 * Er wordt niets bewaard (besluit van de eigenaar, november 2026): het tabblad kent alleen de
 * stand van de laatste export. Alle maanden van 2026 vóór die meting krijgen hetzelfde getal
 * (een aanname, gestippeld), de stand eind 2026 is die laatste stand, en het target eind 2027
 * is die stand plus {@link CRM_GROEI} — voor elke KPI hetzelfde.
 */

/** Het groeipercentage voor elke CRM-KPI: +10% (besluit van de eigenaar, 20 november 2026). */
export const CRM_GROEI = 0.1;

/** Het voorvoegsel van de opt-inkolommen; wat erachter staat is het merk of de dienst. */
const OPTIN_VOORVOEGSEL = "PREFERENCES_";

/**
 * De leesbare naam per opt-inkolom (het deel na `PREFERENCES_`, in hoofdletters). Een kolom
 * die hier niet in staat, krijgt het deel na het voorvoegsel als naam (`PREFERENCES_FOO` →
 * "Opt-in Foo"): deze lijst is een verfraaiing en nooit een voorwaarde.
 */
const OPTIN_NAMEN: Record<string, string> = {
  VW: "Volkswagen",
  VOLKSWAGEN: "Volkswagen",
  AUDI: "Audi",
  SEAT: "SEAT",
  CUPRA: "CUPRA",
  SKODA: "Škoda",
  VWB: "Volkswagen Bedrijfswagens",
  VWBW: "Volkswagen Bedrijfswagens",
  VWCV: "Volkswagen Bedrijfswagens",
  VWN: "Volkswagen Bedrijfswagens",
  BEDRIJFSWAGENS: "Volkswagen Bedrijfswagens",
  PORSCHE: "Porsche",
  BENTLEY: "Bentley",
  VDU: "Van den Udenhout",
  VELOO: "VELOO",
};

/** "FOO_BAR" → "Foo bar". */
function alsNaam(deel: string): string {
  const woorden = deel.replace(/_/g, " ").trim().toLowerCase();
  return woorden.charAt(0).toUpperCase() + woorden.slice(1);
}

/** De naam van de KPI bij een opt-inkolom: `PREFERENCES_VW` → "Opt-in Volkswagen". */
export function optinNaam(kolom: string): string {
  const deel = kolom.toUpperCase().startsWith(OPTIN_VOORVOEGSEL) ? kolom.slice(OPTIN_VOORVOEGSEL.length) : kolom;
  return `Opt-in ${OPTIN_NAMEN[deel.toUpperCase()] ?? alsNaam(deel)}`;
}

/** De sleutel van een KPI: `contacten`, of `optin:<kolomnaam>`. */
export const CONTACTEN_SLEUTEL = "contacten";

export function optinSleutel(kolom: string): string {
  return `optin:${kolom}`;
}

/** De besluiten achter een KPI, voor onder de grafiek ("Keuzes in de definitie"). */
export function keuzesVoor(soort: "contacten" | "optin"): string[] {
  const gemeen = [
    `Target: +${Math.round(CRM_GROEI * 100)}% op de stand eind 2026, voor elke CRM-KPI hetzelfde (besluit van de eigenaar, november 2026).`,
    "Er wordt geen historie bewaard: alleen de stand van de laatste export telt. Alle maanden van 2026 vóór die meting krijgen hetzelfde getal (een aanname, gestippeld), en de stand eind 2026 is die laatste stand.",
  ];
  if (soort === "contacten") {
    return [
      "Een contact is een uniek e-mailadres, niet een rij en niet een klantnummer: een rij in de export is een klant mét een voertuig, en één klant kan meerdere klantnummers hebben.",
      "Rijen zonder e-mailadres tellen niet mee. Het e-mailadres wordt geteld zoals het in de export staat; er wordt niets opgeschoond (net als op Tools → Selligent database).",
      ...gemeen,
    ];
  }
  return [
    "Een e-mailadres telt als het op minstens één van zijn rijen True heeft in deze kolom (hoofdletters en spaties aan de rand maken niet uit). False en een lege cel tellen niet.",
    "Elke booleaanse kolom in de export is een opt-in en krijgt een eigen KPI; een nieuwe voorkeur in de export verschijnt hier vanzelf.",
    ...gemeen,
  ];
}
