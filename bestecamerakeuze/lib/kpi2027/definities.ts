import {
  WERKPLAATS_EXPORT_BRABANT,
  WERKPLAATS_EXPORT_MAASTRICHT,
  WERKPLAATS_EXPORT_TOT,
} from "@/lib/kpi2027/werkplaatsExport";
import { UDENHOUTLEASE_AANVRAGEN, UDENHOUTLEASE_TOT } from "@/lib/kpi2027/udenhoutleaseExport";

/**
 * De websites en KPI's waarvoor het tabblad KPI's 2027 een target zet.
 *
 * Dit bestand is de enige plek die zegt welk GA4-cijfer bij welke KPI van welke website
 * hoort, en welke dagen als gemeten tellen. De wekelijkse ophaalactie (`ophalen.ts`) haalt
 * precies op wat hier staat, en het tabblad toont onder elke grafiek wat er hier staat.
 * Een event toevoegen is dus één regel; de eerstvolgende zondag haalt hem op.
 *
 * ## Wanneer er geschat wordt: alleen op dagen zonder sessies
 *
 * De rekensom (`rekenen.ts`) neemt het gemiddelde per dag over de **gemeten** dagen en vult
 * de rest van het jaar daarmee in. Gemeten is elke dag waarop de property sessies had;
 * alleen een dag met **0 sessies** telt als "tracking werkte niet" en wordt bijgeschat — bij
 * elke KPI van die website. Dat leest `rekenen.ts` uit de sessiecijfers in de stand zelf;
 * er staat hier dus geen lijst met uitvaldagen die kan verouderen.
 *
 * Een dag mét sessies maar zonder een bepaald event telt gewoon als nul, ook als dat event
 * toen nog niet bestond of kapot was. Dat is een keuze van de eigenaar van het dashboard
 * (november 2026): "overal waar de tracking gewoon werkte de daadwerkelijk gemeten cijfers,
 * alleen op dagen zonder sessies een schatting, verder nergens". Hij vervangt de eerdere
 * meetperiodes per KPI (zakelijke lease vanaf april, Porsche-werkplaats vanaf september,
 * Bentley vanaf 21 oktober …), die te veel bijschatten. Waar een event pas laat in het jaar
 * begon, valt het target daardoor laag uit; dat staat onder die grafieken.
 *
 * Nu herkend: beide Porsche-properties hadden van 25 juni t/m 11 augustus 2026 geen enkele
 * sessie. De andere websites hebben elke dag data.
 *
 * ## Domeinen
 *
 * Per website gaan bekende test-, staging- en vreemde domeinen eruit
 * (`uitgeslotenHosts`); al het andere telt mee, ook hostname "(not set)". Een sessie
 * waarvan het session_start-event geen hostname heeft, staat in GA4 zowel onder "(not set)"
 * als onder het echte domein — bij PGZ leek daardoor 39% van de sessies hostnameloos,
 * terwijl het grotendeels dezelfde sessies waren. Uitsluiten in plaats van insluiten houdt
 * alles wat echt is binnen, en `ophalen.ts` laat GA4 de sessies en gebruikers zelf
 * filteren zodat niets dubbel telt. udenhout.nl heeft geen uitsluitingen: de vreemde hosts
 * daar zijn samen een paar sessies, en www.plan-it-online.nl hoort bij de
 * werkplaatsplanner.
 *
 * ## Besloten: proefritaanvragen, private lease en offerte onderhoud (udenhout.nl)
 *
 * Bij deze drie verschilt het niveau sterk tussen januari–maart en de rest van het jaar
 * (trackingwissel). Het stond open of ze vanaf april moesten rekenen; de regel hierboven
 * beslist het: januari–maart is gemeten (de site had sessies), dus die cijfers tellen.
 *
 * ## Zakelijke lease: udenhoutlease.nl t/m maart
 *
 * Tot en met maart 2026 kwamen de zakelijke leads binnen via de aparte site
 * udenhoutlease.nl (eigen GA4-property 344604643); begin april stopte die site en verhuisden
 * de zakelijke leads naar udenhout.nl. De KPI Zakelijke lease telt daarom januari t/m maart
 * de aanvragen van udenhoutlease.nl op bij wat udenhout.nl zelf mat (`externeBron` met
 * `optellen: true`, cijfers in `udenhoutleaseExport.ts`). Besluit van de eigenaar,
 * 19 november 2026.
 *
 * ## Waarom events en geen key events
 *
 * Geteld wordt `event_count`: hoe vaak het event vuurde. Dezelfde keuze als op het tabblad
 * Leads en bij de GA-conversies per campagne. Productaankopen van VELOO is de enige
 * uitzondering: `ecommerce_purchases`, het aantal afgeronde bestellingen.
 */

/** Het jaar waarvan de realisatie (plus verwachting) de basis is. */
export const KPI_JAAR = 2026;

/** Het jaar waarvoor het target geldt. */
export const KPI_DOELJAAR = 2027;

/** De groei die op de verwachting van het basisjaar komt: +5%, voor elke KPI. */
export const KPI_GROEI = 0.05;

export interface KpiEvent {
  /** De eventnaam precies zoals GA4 hem kent — hoofdletters tellen. */
  naam: string;
  /** Alleen als het paginapad dit bevat (Bentley's oude offertemeting). */
  paginaBevat?: string;
  /** Wanneer en waar het vuurt, voor de regel onder de grafiek. */
  toelichting?: string;
}

export type KpiBron =
  | { soort: "sessies" }
  | { soort: "gebruikers" }
  | { soort: "aankopen" }
  | { soort: "events"; events: readonly KpiEvent[] };

/**
 * Een andere bron dan Google Analytics van deze website voor het begin van het jaar. Twee
 * soorten:
 *
 * - **Vervangen** (standaard, Porsche-werkplaats): t/m `tot` tellen deze dagcijfers in
 *   plaats van de GA4-cijfers, en geldt elke dag als gemeten (de bron dekt hem, ook als de
 *   website toen 0 sessies had). Daarna weer GA4 met de gewone regel.
 * - **Optellen** (`optellen: true`, zakelijke lease via udenhoutlease.nl): t/m `tot` komen
 *   deze dagcijfers bovenop de GA4-cijfers van de website, die gewoon blijven tellen. De
 *   uitvalregel verandert niet: een dag zonder sessies op de website blijft bijgeschat.
 */
export interface ExterneBron {
  /** T/m deze dag geldt deze bron. */
  tot: string;
  /**
   * True: optellen bij GA4 in plaats van GA4 te vervangen. Een optellende bron telt ook mee
   * in de lijn van het vergelijkingsjaar, voor zover hij dagen in dat jaar heeft.
   */
  optellen?: boolean;
  /** Wat één eenheid is, meervoud, voor onder de grafiek: "afspraken", "aanvragen". */
  eenheid: string;
  /** Korte naam in een zin: "de werkplaatsplanning". */
  naam: string;
  /** Wat er precies geteld wordt, voor onder de grafiek. */
  omschrijving: string;
  /** Aantal per dag (alleen dagen met een waarde). */
  dagen: Readonly<Record<string, number>>;
}

export interface KpiDefinitie {
  sleutel: string;
  naam: string;
  bron: KpiBron;
  /** Een andere bron voor het begin van het jaar (Porsche-werkplaats t/m oktober). */
  externeBron?: ExterneBron;
  /** De bron in gewone taal, voor sessies, gebruikers en aankopen. */
  bronTekst?: string;
  /** Een opmerking onder de bron, als er iets is wat de lezer moet weten. */
  opmerking?: string;
  /**
   * Waarom deze KPI géén lijn voor het vergelijkingsjaar krijgt, terwijl zijn website die
   * wel heeft (zakelijke lease op udenhout.nl: in 2025 niet gemeten). Staat onder de grafiek.
   */
  zonderVergelijking?: string;
}

/**
 * Een eerder jaar als extra lijn in de grafieken van een website, ter vergelijking. Het
 * telt niet mee in de verwachting of het target: het is alleen een lijn.
 */
export interface Vergelijkingsjaar {
  jaar: number;
  /** Wat de lezer moet weten om de lijn goed te lezen, bovenaan de tab. */
  toelichting: string;
}

export interface KpiWebsite {
  sleutel: string;
  /** Zoals het tabblad heet. */
  naam: string;
  /** Het domein, voor de bronregel. */
  domein: string;
  /** De GA4-property in Windsor. */
  property: string;
  /** Hostnames die niet meetellen (test, staging, andere sites in dezelfde property). */
  uitgeslotenHosts: readonly string[];
  /** Optioneel: een eerder jaar als extra lijn in elke grafiek (nu alleen udenhout.nl, 2025). */
  vergelijkingsjaar?: Vergelijkingsjaar;
  kpis: readonly KpiDefinitie[];
}

const SESSIES: KpiDefinitie = {
  sleutel: "sessies",
  naam: "Sessies",
  bron: { soort: "sessies" },
  bronTekst: "Statistiek Sessies (sessions): het aantal bezoeken dat begon, oftewel hoe vaak session_start vuurde.",
};

const GEBRUIKERS: KpiDefinitie = {
  sleutel: "gebruikers",
  naam: "Gebruikers",
  bron: { soort: "gebruikers" },
  bronTekst:
    "Statistiek Actieve gebruikers (activeUsers), per maand ontdubbeld — hetzelfde cijfer als het maandrapport in GA4.",
  opmerking:
    "Het jaar is de som van de twaalf maanden: wie in drie maanden terugkomt, telt drie keer. Zo is het maandtarget één-op-één te vergelijken met het maandcijfer in GA4.",
};

function porscheKpis(vestiging: "brabant" | "maastricht"): KpiDefinitie[] {
  return [
    SESSIES,
    GEBRUIKERS,
    {
      sleutel: "contactaanvragen",
      naam: "Contactaanvragen",
      bron: {
        soort: "events",
        events: [{ naam: "generate_lead_contact", toelichting: "op /over-ons-contact/contact/bedankt" }],
      },
    },
    {
      sleutel: "meer-info",
      naam: "Meer-info-aanvragen",
      bron: {
        soort: "events",
        events: [{ naam: "generate_lead_info", toelichting: "onder meer voorraadpagina's met /bedankt-info" }],
      },
      opmerking:
        vestiging === "brabant"
          ? "Telt ook de bedankpagina voor Porsche Approved Garantie mee, niet alleen aanvragen over voorraadauto's."
          : undefined,
    },
    {
      sleutel: "proefritaanvragen",
      naam: "Proefritaanvragen",
      bron: {
        soort: "events",
        events: [{ naam: "generate_lead_proefrit", toelichting: "onder meer /bedankt-proefrit en /bedankt-beide" }],
      },
    },
    {
      sleutel: "werkplaatsafspraken",
      naam: "Werkplaatsafspraken",
      bron: {
        soort: "events",
        events: [{ naam: "generate_lead_werkplaats", toelichting: "op /service-onderhoud/werkplaatsafspraak" }],
      },
      // Januari t/m oktober uit de werkplaatsplanning, op verzoek: de GA4-meting van de
      // werkplaats liep het grootste deel van 2026 niet (Brabant: alleen feb–mrt en vanaf
      // 3 sep; Maastricht: pas vanaf 3 sep), de planning wel. Zie werkplaatsExport.ts.
      externeBron: {
        tot: WERKPLAATS_EXPORT_TOT,
        eenheid: "afspraken",
        naam: "de werkplaatsplanning",
        omschrijving: `export van de werkplaatsplanning, afspraken per "Datum Van Aanvraag", ALvestiging ${vestiging === "brabant" ? "10" : "20"}`,
        dagen: vestiging === "brabant" ? WERKPLAATS_EXPORT_BRABANT : WERKPLAATS_EXPORT_MAASTRICHT,
      },
      opmerking:
        (vestiging === "maastricht"
          ? "Maastricht staat pas vanaf 20 februari in de export; januari en begin februari tellen als 0. "
          : "") +
        "Vanaf 1 november telt Google Analytics: generate_lead_werkplaats vuurt op de formulierpagina zelf, en of dat pas na verzenden gebeurt is nog niet gecontroleerd. De planning telt afspraken, GA4 online aanvragen — de twee sluiten niet per se op elkaar aan.",
    },
  ];
}

export const KPI_WEBSITES: readonly KpiWebsite[] = [
  {
    sleutel: "udenhout",
    naam: "Udenhout",
    domein: "udenhout.nl",
    property: "255949462",
    uitgeslotenHosts: [],
    // Onderzocht in november 2026: Windsor heeft deze property vanaf 1 januari 2025, elke
    // dag met sessies (geen uitval), en heel 2025 draaide de oude tracking — dezelfde
    // events als januari t/m maart 2026, die de KPI's hieronder al meetellen.
    vergelijkingsjaar: {
      jaar: 2025,
      toelichting:
        "De lijn 2025 telt dezelfde events als 2026, zoals gemeten (in 2025 had de website elke dag sessies, dus niets bijgeschat). Heel 2025 draaide de oude tracking; vanaf april 2026 de nieuwe. Een verschil tussen 2025 en 2026 vanaf april kan dus deels aan de andere meting liggen in plaats van aan meer of minder aanvragen. Bij zakelijke lease is de lijn 2025 vooral udenhoutlease.nl: daar liepen de zakelijke leads in 2025.",
    },
    kpis: [
      SESSIES,
      GEBRUIKERS,
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
      },
      {
        sleutel: "zakelijke-lease",
        naam: "Zakelijke lease",
        bron: {
          soort: "events",
          events: [
            { naam: "generate_lead_zakelijk_lease", toelichting: "t/m maart" },
            {
              naam: "generate_lead_zakelijk_offerte",
              toelichting: "vanaf april, formulieren stock zakelijk en pagina zakelijk",
            },
            { naam: "generate_lead_leasecontact", toelichting: "vanaf april, contactformulier op /leasen/contact" },
          ],
        },
        // Januari t/m maart kwamen de zakelijke leads binnen via udenhoutlease.nl, met een
        // eigen GA4-property; die site stopte eind maart. Zie udenhoutleaseExport.ts.
        externeBron: {
          tot: UDENHOUTLEASE_TOT,
          optellen: true,
          eenheid: "aanvragen",
          naam: "udenhoutlease.nl",
          omschrijving:
            "udenhoutlease.nl (GA4-property 344604643), de aparte zakelijke leasesite die eind maart stopte: offerte_aanvraag (/contact/vrijblijvende-offerte) + contact_verzonden (/contact)",
          dagen: UDENHOUTLEASE_AANVRAGEN,
        },
        opmerking:
          "Tot en met maart kwamen de zakelijke leads binnen via udenhoutlease.nl; vanaf april via udenhout.nl. Daarom telt januari t/m maart beide sites op: udenhoutlease.nl als aparte bron (vaste cijfers, die site meet niet meer) plus wat udenhout.nl zelf mat (2 aanvragen). Niet meegeteld van udenhoutlease.nl: het proefritformulier (6) en de actieformulieren per merk (20) — die zijn op udenhout.nl ook geen zakelijke lease.",
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
      },
      {
        sleutel: "werkplaatsafspraken",
        naam: "Werkplaatsafspraken",
        bron: {
          soort: "events",
          events: [{ naam: "bedanktpagina_werkplaatsplanner", toelichting: "bedankpagina van de werkplaatsplanner" }],
        },
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
      },
    ],
  },
  {
    sleutel: "porsche-brabant",
    naam: "Porsche Centrum Brabant",
    domein: "porschecentrumbrabant.nl",
    property: "306403800",
    // www. en zonder www. zijn allebei de live site. De tweede property met dezelfde naam
    // ("(inactief)") wordt niet gebruikt: de aanvragen staan in deze.
    uitgeslotenHosts: [],
    kpis: porscheKpis("brabant"),
  },
  {
    sleutel: "porsche-maastricht",
    naam: "Porsche Centrum Maastricht",
    domein: "porschecentrummaastricht.nl",
    property: "306394313",
    uitgeslotenHosts: [],
    kpis: porscheKpis("maastricht"),
  },
  {
    sleutel: "pgz",
    naam: "PGZ",
    domein: "pgz.nl",
    property: "405407306",
    uitgeslotenHosts: ["staging.pgz.nl"],
    kpis: [
      SESSIES,
      GEBRUIKERS,
      {
        sleutel: "proefritaanvragen",
        naam: "Proefritaanvragen",
        bron: {
          soort: "events",
          events: [{ naam: "generate_lead_proefrit", toelichting: "voertuigpagina's onder /onze-voorraad/ en /hexon/" }],
        },
      },
      {
        sleutel: "contactaanvragen",
        naam: "Contactaanvragen",
        bron: { soort: "events", events: [{ naam: "generate_lead_contact", toelichting: "op /contact en /lease" }] },
        opmerking:
          "Op naam van het event, niet op pagina: op /contact komen ook offerteaanvragen voor. Klikken (click_to_contact, click_tel, click_mailto), form_submit en het algemene generate_lead tellen niet mee.",
      },
      {
        sleutel: "offerteaanvragen",
        naam: "Offerteaanvragen",
        bron: {
          soort: "events",
          events: [
            { naam: "generate_lead_offerte", toelichting: "voertuigpagina's, /contact en /cosmetics, vanaf 11 okt" },
          ],
        },
        opmerking:
          "Het event bestaat pas sinds 11 oktober. De maanden daarvoor tellen als nul, omdat de website toen wel mat: het target is dus vooral wat er sinds oktober binnenkwam.",
      },
    ],
  },
  {
    sleutel: "bentley",
    naam: "Bentley Maastricht",
    domein: "bentley-maastricht.nl",
    property: "435349999",
    uitgeslotenHosts: ["bentley-maastricht.acc2.ddp.uname-it.digital", "pon-test-maastricht.uname-it.digital"],
    kpis: [
      SESSIES,
      GEBRUIKERS,
      {
        sleutel: "offerteaanvragen",
        naam: "Offerteaanvragen",
        bron: {
          soort: "events",
          events: [
            {
              naam: "Contactaanvraag",
              paginaBevat: "/caw-bedankt/offerte/",
              toelichting: "alleen met /caw-bedankt/offerte/ in het pad, 4 mrt t/m 29 sep",
            },
            { naam: "generate_lead_offerte", toelichting: "vanaf 20 okt" },
          ],
        },
        opmerking:
          "Contactaanvraag vuurt ook bij een proefrit; alleen die met /caw-bedankt/offerte/ in het pad zijn offertes. Vóór 4 maart en van 30 september t/m 19 oktober vuurde geen offerte-event; die dagen tellen als nul.",
      },
      {
        sleutel: "contactaanvragen",
        naam: "Contactaanvragen",
        bron: { soort: "events", events: [{ naam: "generate_lead_contact", toelichting: "op /contact, vanaf 21 okt" }] },
        opmerking:
          "Het event bestaat pas sinds 21 oktober. De maanden daarvoor tellen als nul, omdat de website toen wel mat: het target is dus vooral wat er sinds oktober binnenkwam.",
      },
      {
        sleutel: "werkplaatsafspraken",
        naam: "Werkplaatsafspraken",
        bron: {
          soort: "events",
          events: [{ naam: "generate_lead_werkplaats", toelichting: "op /service, vanaf 21 okt" }],
        },
        opmerking:
          "Het event bestaat pas sinds 21 oktober. De maanden daarvoor tellen als nul, omdat de website toen wel mat: het target is dus vooral wat er sinds oktober binnenkwam. Het telt online aanvragen, geen bevestigde afspraken.",
      },
    ],
  },
  {
    sleutel: "veloo",
    naam: "VELOO",
    domein: "veloo.nl",
    property: "381559171",
    uitgeslotenHosts: ["www.johnvermeulenfietsplezier.nl", "gtm-msr.appspot.com"],
    kpis: [
      SESSIES,
      {
        sleutel: "leaseaanvragen",
        naam: "Leaseaanvragen",
        bron: { soort: "events", events: [{ naam: "Lease_aanvraag", toelichting: "op /pages/leaseaanvraag" }] },
      },
      {
        sleutel: "lease-via-werk",
        naam: "Leaseaanvragen via werk",
        bron: {
          soort: "events",
          events: [{ naam: "Lease_via_werk_aanvragen", toelichting: "op /pages/lease-via-werk-aanvragen" }],
        },
      },
      {
        sleutel: "info-aanvragen",
        naam: "Info-aanvragen",
        bron: { soort: "events", events: [{ naam: "Info_aanvraag", toelichting: "op productpagina's" }] },
      },
      {
        sleutel: "productaankopen",
        naam: "Productaankopen",
        bron: { soort: "aankopen" },
        bronTekst:
          "Statistiek Ecommerce purchases (ecommercePurchases): het aantal afgeronde bestellingen, oftewel hoe vaak purchase vuurde op de bedankpagina van de checkout.",
        opmerking: "Een bestelling met meerdere producten telt als één aankoop.",
      },
    ],
  },
];

/** De bronsleutel waaronder een event in de bewaarde stand staat. */
export function eventBron(event: KpiEvent): string {
  return event.paginaBevat ? `event:${event.naam}@${event.paginaBevat}` : `event:${event.naam}`;
}

/** Alle gewone events (zonder padvoorwaarde) van een website, zonder dubbelen. */
export function gewoneEvents(website: KpiWebsite): string[] {
  const namen = new Set<string>();
  for (const k of website.kpis) {
    if (k.bron.soort === "events") for (const e of k.bron.events) if (!e.paginaBevat) namen.add(e.naam);
  }
  return [...namen];
}

/** De events met een padvoorwaarde: die vragen elk een eigen opvraging. */
export function padEvents(website: KpiWebsite): KpiEvent[] {
  const gezien = new Map<string, KpiEvent>();
  for (const k of website.kpis) {
    if (k.bron.soort === "events") for (const e of k.bron.events) if (e.paginaBevat) gezien.set(eventBron(e), e);
  }
  return [...gezien.values()];
}

/** Heeft de website een KPI met productaankopen? Dan haalt hij die statistiek mee op. */
export function heeftAankopen(website: KpiWebsite): boolean {
  return website.kpis.some((k) => k.bron.soort === "aankopen");
}

export function vindWebsite(sleutel: string): KpiWebsite | undefined {
  return KPI_WEBSITES.find((w) => w.sleutel === sleutel);
}
