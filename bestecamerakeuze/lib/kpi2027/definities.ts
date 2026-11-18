import { LEADS_GA4_PROPERTY } from "@/lib/leads/bereik";

/**
 * De KPI's van udenhout.nl waarvoor het tabblad KPI's 2027 een target zet.
 *
 * Dit bestand is de enige plek die zegt welk GA4-cijfer bij welke KPI hoort. De wekelijkse
 * ophaalactie (`ophalen.ts`) haalt precies de events op die hier staan, en het tabblad
 * toont onder elke grafiek wat er hier staat. Een event toevoegen is dus één regel; de
 * eerstvolgende zondag haalt hem op.
 *
 * ## Waarom de meeste KPI's twee generaties events hebben
 *
 * udenhout.nl wisselde eind maart 2026 van tracking. Tot en met maart heette een
 * proefritaanvraag `generate_lead_proefrit_aanvraag`, vanaf april `generate_lead_proefrit`
 * (gemeten in november 2026 over het hele jaar, per maand). Wie alleen de nieuwe naam
 * telt mist het eerste kwartaal, wie alleen de oude telt mist de rest. Beide staan er dus
 * in, met de periode waarin ze vuurden als uitleg — de som is de KPI.
 *
 * ## Waarom zakelijke lease pas vanaf april rekent
 *
 * Vóór april werd zakelijke lease vrijwel niet gemeten: `generate_lead_zakelijk_lease`
 * vuurde in het hele eerste kwartaal twee keer. Het gemiddelde over alle dagen van 2026
 * zou het jaartotaal en daarmee het target dus kunstmatig drukken. Op verzoek rekent die
 * KPI daarom met het gemiddelde per dag vanaf 1 april (`basisVanaf`), en schat hij januari
 * t/m maart met datzelfde gemiddelde bij. Alle andere KPI's rekenen met het gemiddelde
 * over alle dagen van 2026, zoals gevraagd.
 *
 * ## Waarom events en geen key events
 *
 * Geteld wordt `event_count`: hoe vaak het event vuurde. Dat is dezelfde keuze als op het
 * tabblad Leads en bij de GA-conversies per campagne. Het aantal key events ligt bij een
 * paar events iets lager (GA4 telt een key event bij sommige instellingen één keer per
 * sessie), maar het gaat hier om de groei ten opzichte van het eigen jaar, en die blijft
 * gelijk zolang de telling dezelfde blijft.
 */

/** Het jaar waarvan de realisatie (plus verwachting) de basis is. */
export const KPI_JAAR = 2026;

/** Het jaar waarvoor het target geldt. */
export const KPI_DOELJAAR = 2027;

/** De groei die op de verwachting van het basisjaar komt: +5%. */
export const KPI_GROEI = 0.05;

/** De GA4-property van udenhout.nl — dezelfde als die van het tabblad Leads. */
export const KPI_PROPERTY = LEADS_GA4_PROPERTY;

export interface KpiEvent {
  /** De eventnaam precies zoals GA4 hem kent. */
  naam: string;
  /** Wanneer en waar het vuurt, voor de regel onder de grafiek. */
  toelichting?: string;
}

export type KpiBron =
  | { soort: "verkeer"; veld: "sessies" | "gebruikers" }
  | { soort: "events"; events: readonly KpiEvent[] };

export interface KpiDefinitie {
  sleutel: string;
  naam: string;
  bron: KpiBron;
  /**
   * Vanaf welke dag het gemiddelde per dag rekent. Standaard 1 januari; alleen anders
   * waar de meting later begon. Altijd de eerste van een maand, want de opgehaalde
   * cijfers staan per maand.
   */
  basisVanaf?: string;
  /** De bron in gewone taal, in kleine letters onder de grafiek. */
  bronTekst: string;
  /** Een extra opmerking onder de bron, als er iets is wat de lezer moet weten. */
  opmerking?: string;
}

export const KPI_DEFINITIES: readonly KpiDefinitie[] = [
  {
    sleutel: "sessies",
    naam: "Sessies",
    bron: { soort: "verkeer", veld: "sessies" },
    bronTekst:
      "Statistiek Sessies (sessions): het aantal bezoeken dat begon, oftewel hoe vaak het event session_start vuurde.",
  },
  {
    sleutel: "gebruikers",
    naam: "Gebruikers",
    bron: { soort: "verkeer", veld: "gebruikers" },
    bronTekst:
      "Statistiek Totaal aantal gebruikers (totalUsers), per maand ontdubbeld — hetzelfde cijfer als het maandrapport in GA4.",
    opmerking:
      "Het jaar is de som van de twaalf maanden: wie in drie maanden terugkomt, telt drie keer. Zo is het maandtarget één-op-één te vergelijken met het maandcijfer in GA4.",
  },
  {
    sleutel: "proefritaanvragen",
    naam: "Proefritaanvragen",
    bron: {
      soort: "events",
      events: [
        { naam: "generate_lead_proefrit_aanvraag", toelichting: "t/m maart" },
        { naam: "generate_lead_proefrit", toelichting: "vanaf april" },
      ],
    },
    bronTekst: "Events",
  },
  {
    sleutel: "offerteaanvragen",
    naam: "Offerteaanvragen",
    bron: {
      soort: "events",
      events: [
        { naam: "generate_lead_offerte_aanvraag", toelichting: "t/m maart" },
        { naam: "generate_lead_offerte", toelichting: "vanaf april, formulieren stock prive en pagina prive" },
      ],
    },
    bronTekst: "Events",
    opmerking: "Zakelijke offertes (generate_lead_zakelijk_offerte) tellen bij Zakelijke lease.",
  },
  {
    sleutel: "private-lease",
    naam: "Private (groei) lease",
    bron: {
      soort: "events",
      events: [
        { naam: "generate_lead_private_lease", toelichting: "hele jaar, vanaf april formulier stock prive" },
        { naam: "private_groeilease", toelichting: "t/m maart" },
        { naam: "generate_lead_privatelease", toelichting: "vanaf april, op /offerte en /acties/groeilease" },
      ],
    },
    bronTekst: "Events",
  },
  {
    sleutel: "zakelijke-lease",
    naam: "Zakelijke lease",
    bron: {
      soort: "events",
      events: [
        { naam: "generate_lead_zakelijk_lease", toelichting: "t/m maart" },
        { naam: "generate_lead_zakelijk_offerte", toelichting: "vanaf april, formulieren stock zakelijk en pagina zakelijk" },
        { naam: "generate_lead_leasecontact", toelichting: "vanaf april, contactformulier op /leasen/contact" },
      ],
    },
    basisVanaf: `${KPI_JAAR}-04-01`,
    bronTekst: "Events",
    opmerking:
      "Vóór april werd zakelijke lease vrijwel niet gemeten. Het gemiddelde per dag rekent daarom vanaf 1 april, en januari t/m maart zijn met dat gemiddelde bijgeschat.",
  },
  {
    sleutel: "verhuur",
    naam: "Verhuur",
    bron: {
      soort: "events",
      events: [
        { naam: "verhuur_aanvraag", toelichting: "t/m maart" },
        { naam: "verhuuractie_verzonden", toelichting: "t/m maart" },
        { naam: "verhuur_losse_formulieren", toelichting: "t/m maart" },
        { naam: "generate_lead_verhuur", toelichting: "vanaf april" },
      ],
    },
    bronTekst: "Events",
  },
  {
    sleutel: "werkplaatsafspraken",
    naam: "Werkplaatsafspraken",
    bron: {
      soort: "events",
      events: [{ naam: "bedanktpagina_werkplaatsplanner", toelichting: "bedankpagina van de werkplaatsplanner" }],
    },
    bronTekst: "Events",
    opmerking: "Een bedankpagina kan bij verversen opnieuw vuren; dat is niet gecorrigeerd.",
  },
  {
    sleutel: "offerte-onderhoud",
    naam: "Offerte onderhoud",
    bron: {
      soort: "events",
      events: [
        { naam: "offerte_onderhoud", toelichting: "t/m maart" },
        { naam: "generate_lead_onderhoudsofferte", toelichting: "vanaf april" },
      ],
    },
    bronTekst: "Events",
  },
];

/** Alle events die de wekelijkse ophaalactie bij GA4 opvraagt, zonder dubbelen. */
export function kpiEvents(definities: readonly KpiDefinitie[] = KPI_DEFINITIES): string[] {
  const namen = new Set<string>();
  for (const d of definities) {
    if (d.bron.soort === "events") for (const e of d.bron.events) namen.add(e.naam);
  }
  return [...namen];
}
