/**
 * De websites en KPI's waarvoor het tabblad KPI's 2027 een target zet.
 *
 * Dit bestand is de enige plek die zegt welk GA4-cijfer bij welke KPI van welke website
 * hoort, en welke dagen als gemeten tellen. De wekelijkse ophaalactie (`ophalen.ts`) haalt
 * precies op wat hier staat, en het tabblad toont onder elke grafiek wat er hier staat.
 * Een event toevoegen is dus één regel; de eerstvolgende zondag haalt hem op.
 *
 * ## Gemeten en niet gemeten dagen
 *
 * De rekensom (`rekenen.ts`) neemt het gemiddelde per dag over de **gemeten** dagen en vult
 * de rest van het jaar daarmee in: de toekomst, maar ook dagen waarop de meting nog niet
 * bestond of kapot was. Welke dagen gemeten zijn, staat hier op twee niveaus:
 *
 *  - `uitval` op de website: dagen waarop de hele property niets mat (beide Porsche-sites
 *    van 25 juni t/m 11 augustus 2026 — ook geen sessies). Geldt voor elke KPI.
 *  - `meetperiodes` op een KPI: wanneer het event bestond. Zonder meetperiodes is het hele
 *    jaar gemeten. Een event dat in een niet-gemeten periode toch een keer vuurt (een
 *    losse test, een restant van de oude meting) telt niet mee.
 *
 * Dat is een keuze van het team (november 2026), dezelfde als eerder bij zakelijke lease
 * van udenhout.nl: een ontbrekend event bewijst niet dat er geen aanvragen waren, en een
 * nul over een periode zonder meting zou het target kunstmatig drukken. Elke meetperiode
 * hieronder is de eerste en laatste dag waarop het event in 2026 werd gezien (gemeten in
 * november 2026, per dag over 1 januari t/m 17 november), en staat ook in gewone taal
 * onder de grafiek.
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
 * ## Open besluit: proefritaanvragen, private lease en offerte onderhoud (udenhout.nl)
 *
 * Bij deze drie verschilt het niveau sterk tussen januari–maart en de rest van het jaar
 * (offerte onderhoud ±170 per maand tegen ±60–140, private lease ±25 tegen ±60–190,
 * proefritaanvragen ±65 tegen ±90–200), maar beide periodes zijn wél gemeten — het is een
 * trackingwissel, geen gat. Of ze daarom vanaf april moeten rekenen, is een besluit dat de
 * eigenaar van het dashboard nog moet nemen — zie "OPEN BESLUIT" in CLAUDE.md. Niet op
 * eigen initiatief veranderen; tot dan rekenen ze over alle dagen van 2026.
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

/** Een periode van `van` t/m `tot` (beide inbegrepen); zonder `tot` loopt hij door. */
export interface Periode {
  van: string;
  tot?: string;
}

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

export interface KpiDefinitie {
  sleutel: string;
  naam: string;
  bron: KpiBron;
  /** Wanneer deze KPI gemeten werd; zonder deze lijst het hele jaar (minus de uitval). */
  meetperiodes?: readonly Periode[];
  /** De bron in gewone taal, voor sessies, gebruikers en aankopen. */
  bronTekst?: string;
  /** Een opmerking onder de bron, als er iets is wat de lezer moet weten. */
  opmerking?: string;
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
  /** Dagen waarop de hele property niets mat. */
  uitval: readonly Periode[];
  /** De uitval in gewone taal, bovenaan het tabblad. */
  uitvalTekst?: string;
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

/** Beide Porsche-properties maten van 25 juni t/m 11 augustus 2026 helemaal niets. */
const PORSCHE_UITVAL: readonly Periode[] = [{ van: "2026-06-25", tot: "2026-08-11" }];
const PORSCHE_UITVAL_TEKST =
  "Van 25 juni t/m 11 augustus 2026 heeft deze property niets gemeten, ook geen sessies. Die dagen zijn bij elke KPI met het gemiddelde per gemeten dag bijgeschat.";

/**
 * De aanvraag-events op beide Porsche-sites verschijnen voor het eerst op 30 januari 2026
 * (Brabant contact en meer info, Maastricht meer info), terwijl er in januari gewoon bezoek
 * was. Bij Brabant komen er zo'n zeven meer-info-aanvragen per maand binnen; drie weken nul
 * is dan geen toeval maar een meting die nog niet liep.
 */
const PORSCHE_LEADS_VANAF: readonly Periode[] = [{ van: "2026-01-30" }];

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
      meetperiodes: PORSCHE_LEADS_VANAF,
    },
    {
      sleutel: "meer-info",
      naam: "Meer-info-aanvragen",
      bron: {
        soort: "events",
        events: [{ naam: "generate_lead_info", toelichting: "onder meer voorraadpagina's met /bedankt-info" }],
      },
      meetperiodes: PORSCHE_LEADS_VANAF,
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
      meetperiodes: PORSCHE_LEADS_VANAF,
    },
    vestiging === "brabant"
      ? {
          sleutel: "werkplaatsafspraken",
          naam: "Werkplaatsafspraken",
          bron: {
            soort: "events",
            events: [
              {
                naam: "generate_lead_werkplaatsafspraak",
                toelichting: "op /service-onderhoud/werkplaatsafspraak/bedankt, gemeten 2 feb t/m 31 mrt",
              },
              {
                naam: "generate_lead_werkplaats",
                toelichting: "op /service-onderhoud/werkplaatsafspraak, vanaf 3 sep",
              },
            ],
          },
          // Februari en maart ±35 per maand, april t/m augustus vier keer in vijf maanden
          // terwijl het bezoek normaal was: daar liep de oude meting niet meer.
          meetperiodes: [
            { van: "2026-02-02", tot: "2026-03-31" },
            { van: "2026-09-03" },
          ],
          opmerking:
            "Gemeten van 2 februari t/m 31 maart en vanaf 3 september; daartussen vuurde de oude meting vrijwel niet (4× in vijf maanden) en is bijgeschat. generate_lead_werkplaats vuurt op de formulierpagina zelf: of dat pas na verzenden gebeurt, is nog niet gecontroleerd. Het telt online aanvragen, geen bevestigde afspraken.",
        }
      : {
          sleutel: "werkplaatsafspraken",
          naam: "Werkplaatsafspraken",
          bron: {
            soort: "events",
            events: [
              {
                naam: "generate_lead_werkplaatsafspraak",
                toelichting: "op /service-onderhoud/werkplaatsafspraak/bedankt, alleen 19 mei gezien",
              },
              {
                naam: "generate_lead_werkplaats",
                toelichting: "op /service-onderhoud/werkplaatsafspraak, vanaf 3 sep",
              },
            ],
          },
          meetperiodes: [{ van: "2026-09-03" }],
          opmerking:
            "Pas gemeten vanaf 3 september (de oude meting vuurde alleen op 19 mei, 3×); de dagen daarvoor zijn bijgeschat. generate_lead_werkplaats vuurt op de formulierpagina zelf: of dat pas na verzenden gebeurt, is nog niet gecontroleerd. Het telt online aanvragen, geen bevestigde afspraken.",
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
    uitval: [],
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
        // Vóór april vrijwel niet gemeten (generate_lead_zakelijk_lease vuurde 2×).
        meetperiodes: [{ van: "2026-04-01" }],
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
    uitval: PORSCHE_UITVAL,
    uitvalTekst: PORSCHE_UITVAL_TEKST,
    kpis: porscheKpis("brabant"),
  },
  {
    sleutel: "porsche-maastricht",
    naam: "Porsche Centrum Maastricht",
    domein: "porschecentrummaastricht.nl",
    property: "306394313",
    uitgeslotenHosts: [],
    uitval: PORSCHE_UITVAL,
    uitvalTekst: PORSCHE_UITVAL_TEKST,
    kpis: porscheKpis("maastricht"),
  },
  {
    sleutel: "pgz",
    naam: "PGZ",
    domein: "pgz.nl",
    property: "405407306",
    uitgeslotenHosts: ["staging.pgz.nl"],
    uitval: [],
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
        meetperiodes: [{ van: "2026-10-11" }],
        opmerking: "Het event bestaat pas sinds 11 oktober; de dagen daarvoor zijn bijgeschat.",
      },
    ],
  },
  {
    sleutel: "bentley",
    naam: "Bentley Maastricht",
    domein: "bentley-maastricht.nl",
    property: "435349999",
    uitgeslotenHosts: ["bentley-maastricht.acc2.ddp.uname-it.digital", "pon-test-maastricht.uname-it.digital"],
    uitval: [],
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
        // De oude naam staat ook op de bedankpagina van een proefrit; vandaar het pad.
        meetperiodes: [
          { van: "2026-03-04", tot: "2026-09-29" },
          { van: "2026-10-20" },
        ],
        opmerking:
          "Contactaanvraag vuurt ook bij een proefrit; alleen die met /caw-bedankt/offerte/ in het pad zijn offertes. Gemeten van 4 maart t/m 29 september en vanaf 20 oktober; daarvoor en daartussen bijgeschat.",
      },
      {
        sleutel: "contactaanvragen",
        naam: "Contactaanvragen",
        bron: { soort: "events", events: [{ naam: "generate_lead_contact", toelichting: "op /contact, vanaf 21 okt" }] },
        meetperiodes: [{ van: "2026-10-21" }],
        opmerking:
          "Pas gemeten vanaf 21 oktober, met nog maar een handvol aanvragen: de verwachting voor 2026 en dus het target rusten op weinig dagen.",
      },
      {
        sleutel: "werkplaatsafspraken",
        naam: "Werkplaatsafspraken",
        bron: {
          soort: "events",
          events: [{ naam: "generate_lead_werkplaats", toelichting: "op /service, vanaf 21 okt" }],
        },
        meetperiodes: [{ van: "2026-10-21" }],
        opmerking:
          "Pas gemeten vanaf 21 oktober, met nog maar een handvol aanvragen: de verwachting voor 2026 en dus het target rusten op weinig dagen. Het telt online aanvragen, geen bevestigde afspraken.",
      },
    ],
  },
  {
    sleutel: "veloo",
    naam: "VELOO",
    domein: "veloo.nl",
    property: "381559171",
    uitgeslotenHosts: ["www.johnvermeulenfietsplezier.nl", "gtm-msr.appspot.com"],
    uitval: [],
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
