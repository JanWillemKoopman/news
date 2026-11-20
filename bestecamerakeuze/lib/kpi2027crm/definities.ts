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
 *  - **Contacten met opt-in**: het aantal verschillende e-mailadressen met minstens één rij
 *    waarop minstens één opt-inkolom `True` is (een *of* over alle booleaanse kolommen).
 *  - **Aantal auto's**: het aantal verschillende kentekens (`VDUVEHICLES_LICENSE_PLATE`).
 *  - **Auto's met opt-in**: het aantal verschillende kentekens dat op minstens één rij staat bij
 *    een e-mailadres met minstens één opt-in op `True` — de auto's van Contacten met opt-in.
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
  VDU: "VDU",
  SERVICE: "Service",
  SERVICES: "Service",
  VELOO: "VELOO",
};

/**
 * De algemene opt-ins: die staan niet bij de merken maar bovenaan, in de groep Algemeen naast
 * Contacten, in deze volgorde (verzoek van de eigenaar, 20 november 2026: Contacten is de
 * belangrijkste, dan VDU, dan Service, dan de merken). Herkend op het deel na `PREFERENCES_`
 * (of de hele kolomnaam zonder voorvoegsel), hoofdletterongevoelig.
 */
export const ALGEMENE_OPTINS: readonly { naam: string; delen: readonly string[] }[] = [
  { naam: "VDU", delen: ["VDU"] },
  { naam: "Service", delen: ["SERVICE", "SERVICES"] },
];

/** Het deel van de kolomnaam na `PREFERENCES_`, in hoofdletters. */
function deelVan(kolom: string): string {
  const groot = kolom.toUpperCase();
  return groot.startsWith(OPTIN_VOORVOEGSEL) ? groot.slice(OPTIN_VOORVOEGSEL.length) : groot;
}

/** De plek van een kolom in {@link ALGEMENE_OPTINS} (0 = VDU), of null als het een merk-opt-in is. */
export function algemenePlek(kolom: string): number | null {
  const deel = deelVan(kolom);
  const plek = ALGEMENE_OPTINS.findIndex((a) => a.delen.includes(deel));
  return plek === -1 ? null : plek;
}

/** "FOO_BAR" → "Foo bar". */
function alsNaam(deel: string): string {
  const woorden = deel.replace(/_/g, " ").trim().toLowerCase();
  return woorden.charAt(0).toUpperCase() + woorden.slice(1);
}

/** De naam van de KPI bij een opt-inkolom: `PREFERENCES_VW` → "Opt-in Volkswagen". */
export function optinNaam(kolom: string): string {
  const deel = deelVan(kolom);
  return `Opt-in ${OPTIN_NAMEN[deel] ?? alsNaam(deel)}`;
}

/** De sleutel van een KPI: `contacten`, `met-optin`, of `optin:<kolomnaam>`. */
export const CONTACTEN_SLEUTEL = "contacten";
export const MET_OPTIN_SLEUTEL = "met-optin";
export const AUTOS_SLEUTEL = "autos";
export const AUTOS_OPTIN_SLEUTEL = "autos-optin";

export function optinSleutel(kolom: string): string {
  return `optin:${kolom}`;
}

/** Wat `keuzesVoor` van een KPI moet weten. */
export interface KeuzeContext {
  soort: "contacten" | "met-optin" | "autos" | "autos-optin" | "optin";
  /** De kolom met e-mailadressen (`MAIL`). */
  mailKolom: string;
  /** Bij een opt-in: de opt-inkolom; bij de auto-KPI's: de kentekenkolom. */
  kolom: string;
  /** Bij een opt-in: "VDU" of "Service" als het een algemene opt-in is, anders null. */
  algemeen?: string | null;
}

/**
 * De besluiten achter een KPI, voor onder de grafiek ("Keuzes in de definitie"). Elke KPI heeft
 * er minstens drie: wat er geteld wordt en waarom zo, het target, en hoe de stand en de
 * realisatie werken (getest). Verander je een definitie, pas deze tekst in dezelfde wijziging aan.
 */
export function keuzesVoor({ soort, mailKolom, kolom, algemeen = null }: KeuzeContext): string[] {
  const gemeen = [
    `Target: +${Math.round(CRM_GROEI * 100)}% op de stand eind 2026, voor elke CRM-KPI hetzelfde en niet per KPI aan te passen (besluit van de eigenaar, november 2026).`,
    "Er wordt geen historie bewaard: alleen de stand van de laatste export telt. Januari t/m de maand vóór de export krijgen dezelfde stand (een aanname, gestippeld), en de stand eind 2026 is die laatste stand.",
    "Realisatie 2027 is de stand van de laatste export in 2027. Omdat er niets bewaard wordt, is de stand eind 2026 dan niet meer uit het bestand te lezen; die moet vóór 1 januari 2027 worden vastgelegd.",
  ];
  const optinUitleg =
    "Een opt-in staat aan als de cel True is; hoofdletters en spaties aan de rand maken niet uit. False en een lege cel tellen niet.";
  switch (soort) {
    case "contacten":
      return [
        `Een contact is een uniek e-mailadres (kolom ${mailKolom}), niet een rij en niet een klantnummer: een rij in de export is een klant mét een voertuig, dus één klant met drie auto's staat er drie keer in, en één klant kan meerdere klantnummers hebben.`,
        "Rijen zonder e-mailadres tellen niet mee. Het e-mailadres wordt geteld zoals het in de export staat; er wordt niets opgeschoond, net als op Tools → Selligent database (tegel E-mailadressen).",
        ...gemeen,
      ];
    case "met-optin":
      return [
        `Een e-mailadres telt als het op minstens één van zijn rijen minstens één opt-in aan heeft: VDU, Service of een merk (alle True/False-kolommen in de export). Zo is het op minstens één manier te bereiken. Dezelfde definitie als het filter Minimaal 1 opt-in op Tools → Selligent database.`,
        `Elk e-mailadres (kolom ${mailKolom}) telt één keer, ook als het meerdere opt-ins aan heeft. Dit getal is dus kleiner dan de opt-ins bij elkaar opgeteld. ${optinUitleg}`,
        ...gemeen,
      ];
    case "autos":
      return [
        `Een auto is een uniek kenteken (kolom ${kolom}), niet een rij: dezelfde auto kan bij meerdere contacten in de export staan en telt dan één keer. Rijen zonder kenteken (contacten zonder auto) tellen niet mee.`,
        "Het kenteken wordt geteld zoals het in de export staat; er wordt niets opgeschoond. Tools → Selligent database telt auto's op het voertuig-id (VDUVEHICLES_VEHICLE_ID), dus dat getal kan een paar auto's afwijken.",
        ...gemeen,
      ];
    case "autos-optin":
      return [
        `Een auto (kenteken, kolom ${kolom}) telt als hij op minstens één rij staat bij een e-mailadres dat minstens één opt-in aan heeft: VDU, Service of een merk. Het zijn dus de auto's van Contacten met opt-in. De opt-in hoeft niet op dezelfde rij te staan als de auto: hij hoort bij het contact.`,
        `Een rij zonder e-mailadres (kolom ${mailKolom}) maakt een auto niet bereikbaar en telt hier dus niet, ook niet als er een opt-in op staat. Elk kenteken telt één keer, ook als het bij meerdere contacten met opt-in staat.`,
        ...gemeen,
      ];
    case "optin":
      return [
        `Een e-mailadres telt als het op minstens één van zijn rijen de kolom ${kolom} aan heeft; elk adres telt één keer. ${optinUitleg}`,
        algemeen
          ? `${algemeen} is een algemene opt-in en staat daarom bovenaan naast Contacten, niet bij de merken (besluit van de eigenaar, november 2026). Herkend aan de kolomnaam ${kolom} (ALGEMENE_OPTINS in lib/kpi2027crm/definities.ts).`
          : "Elke True/False-kolom in de export is een opt-in en krijgt een eigen KPI; een nieuwe voorkeur in de export verschijnt hier vanzelf. De naam van de KPI komt uit de kolomnaam (OPTIN_NAMEN in lib/kpi2027crm/definities.ts).",
        ...gemeen,
      ];
  }
}
