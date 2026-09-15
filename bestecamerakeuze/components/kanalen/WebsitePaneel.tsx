"use client";

import KanaalPagina from "@/components/kanalen/KanaalPagina";
import {
  EVENT_STATISTIEKEN,
  LANDINGSPAGINA_STATISTIEKEN,
  PAGINA_STATISTIEKEN,
  WEBSITE_STATISTIEKEN,
} from "@/lib/windsor/velden";

/**
 * De website: alle GA4-properties van de groep op één tabblad.
 *
 * ## Waar deze pagina voor bedoeld is
 *
 * Dat een marketeer hier een analyse kan maken zonder in GA4 in te loggen. De opbouw volgt
 * het gesprek dat je met de cijfers voert, in drie secties:
 *
 *   Herkomst      hoeveel verkeer, en van welke site, welk kanaal, welke bron, welke
 *                 campagne en welk apparaat het kwam
 *   Pagina's      waar ze binnenkwamen (met engagement en conversie) en wat ze daarna zagen
 *   Wat ze deden  de conversies, en daaronder alle events
 *
 * ## Drie manieren om erin te duiken, en waarom het er drie zijn
 *
 * - **De filterbalk** voor wat over het hele scherm geldt: een site, een kanaal, een
 *   periode. Dat zijn keuzes die je even vasthoudt terwijl je rondkijkt.
 * - **Het zoekveld in een tabel** voor het terugvinden van één regel tussen duizenden
 *   pagina-paden. Lokaal, want een pagina-pad is geen eigenschap van het hele scherm — een
 *   globaal paginafilter zou acht van de negen tabellen onaangeroerd laten en toch de
 *   indruk wekken dat het scherm meebewoog.
 * - **Een klik op een regel** voor de vraag die altijd volgt op een getal: "en waar kwam
 *   dát dan vandaan?" Dat opent de zijbalk met dezelfde rijen, één keer anders gegroepeerd.
 *   Voor een landingspagina is dat letterlijk de vraag waarvoor dit tabblad is gemaakt:
 *   hoeveel mensen stapten hier in, en via welk kanaal en welke campagne.
 *
 * De tabellen zijn inklapbaar en de helft staat dicht. Dichtgeklapt blijft de kop staan
 * met zijn regelaantal en toelichting, dus de rij koppen leest als een inhoudsopgave van
 * wat er te halen valt — dat is wat een pagina met negen tabellen overzichtelijk houdt
 * zonder hem in tabbladen te knippen (en zonder de dubbele navigatie die dat oplevert).
 *
 * ## Vier korrels op één scherm
 *
 * GA4 kent geen rij waarin een sessie, een pagina en een event tegelijk passen: één sessie
 * raakt tien pagina's en elke pagina vuurt vijf events. De vier tabellen lezen daarom vier
 * verschillende kubussen (zie `haalWebsite` in `lib/kanalen/bron.ts`), elk met hun eigen
 * statistieklijst. Dat is de reden dat "Sessies" in de tabel Pagina's iets anders betekent
 * dan in de tabel Kanalen, en dat allebei de betekenissen in hun `uitleg` staan.
 *
 * ## Welk filter waar werkt
 *
 * `website` en `kanaalgroep` zitten in alle vier de kubussen, `campagne` in twee, en
 * `bron_medium` en `apparaat` alleen in het verkeer. Dat is geen slordigheid maar de prijs
 * van de rijen: bron/medium bij elke pagina zetten verdubbelt die tabel, en de campagne bij
 * elk event ook. Waar een filter niet kan werken, zegt de tabel dat met zoveel woorden
 * (`zonderDimensies`) in plaats van stil te blijven staan terwijl de grafiek erboven
 * verspringt.
 */

/**
 * Waarnaar een regel uit de verkeerkubus uitgesplitst kan worden.
 *
 * Alles wat hier staat zit in dezelfde kubus, dus de zijbalk hoeft niets op te halen en
 * telt per definitie op tot de regel waarop je klikte. Zie `UitsplitsingPaneel.tsx`.
 */
const VERKEER_UITSPLITSING = {
  dimensies: [
    { id: "kanaalgroep", label: "Per kanaal" },
    { id: "bron_medium", label: "Per bron / medium" },
    { id: "campagne", label: "Per campagne" },
    { id: "apparaat", label: "Per apparaat" },
    { id: "website", label: "Per website" },
  ],
};

/** Voor een landingspagina: de vraag die altijd volgt op "hoeveel stapten hier in". */
const LANDING_UITSPLITSING = {
  dimensies: [
    { id: "kanaalgroep", label: "Per kanaal" },
    { id: "campagne", label: "Per campagne" },
    { id: "website", label: "Per website" },
  ],
};

/** Pagina's en events kennen alleen het kanaal — meer zit er in die kubussen niet. */
const PAGINA_UITSPLITSING = {
  dimensies: [
    { id: "kanaalgroep", label: "Per kanaal" },
    { id: "website", label: "Per website" },
  ],
};

/** De twee dimensies die alleen het verkeer kent; hergebruikt in drie tabellen. */
const ALLEEN_IN_VERKEER = [
  {
    id: "bron_medium",
    label: "Bron / medium",
    reden: "GA4 levert dat niet per pagina",
  },
  {
    id: "apparaat",
    label: "Apparaat",
    reden: "GA4 levert dat niet per pagina",
  },
];

const ALLEEN_IN_VERKEER_EN_LANDING = [
  ...ALLEEN_IN_VERKEER,
  {
    id: "campagne",
    label: "Campagne",
    reden: "die hangt aan de sessie, niet aan de pagina",
  },
];

export default function WebsitePaneel({ ingelogd }: { ingelogd: boolean }) {
  return (
    <KanaalPagina
      pagina="website"
      weergave="website"
      ingelogd={ingelogd}
      statistieken={WEBSITE_STATISTIEKEN}
      standaardStatistiek="sessies"
      // Signalen op de kanaalgroep en niet op de campagne: op een website is "Organic
      // Search zakt weg" het bericht waar iemand 's ochtends iets mee doet, en een
      // campagne zie je al op de advertentiepagina's.
      signaalDimensie="kanaalgroep"
      filterDimensies={[
        { id: "website", label: "Website" },
        { id: "kanaalgroep", label: "Kanaal" },
        { id: "bron_medium", label: "Bron / medium" },
        { id: "campagne", label: "Campagne" },
        { id: "apparaat", label: "Apparaat" },
      ]}
      uitsplitsbaar={[
        { id: "kanaalgroep", label: "Kanaal" },
        { id: "website", label: "Website" },
        { id: "apparaat", label: "Apparaat" },
        { id: "bron_medium", label: "Bron / medium" },
        { id: "campagne", label: "Campagne" },
      ]}
      tabellen={[
        {
          sectie: {
            titel: "Herkomst",
            toelichting:
              "Waar het bezoek vandaan komt. Alle vijf de filters werken op dit blok, en elke regel is aan te klikken voor een uitsplitsing in de zijbalk.",
          },
          titel: "Kanalen",
          toelichting: "hoe bezoekers de site vonden, in GA4's eigen kanaalgroepering",
          bron: "reeks",
          groepeerOp: "kanaalgroep",
          groepLabel: "Kanaal",
          inklapbaar: true,
          uitsplitsing: VERKEER_UITSPLITSING,
        },
        {
          titel: "Websites",
          toelichting: "de properties van de groep naast elkaar",
          bron: "reeks",
          groepeerOp: "website",
          groepLabel: "Website",
          inklapbaar: true,
          standaardOpen: false,
          uitsplitsing: VERKEER_UITSPLITSING,
        },
        {
          titel: "Bron / medium",
          toelichting: "een niveau fijner dan het kanaal: welke site en welk soort verwijzing",
          bron: "reeks",
          groepeerOp: "bron_medium",
          groepLabel: "Bron / medium",
          inklapbaar: true,
          standaardOpen: false,
          zoekbaar: true,
          uitsplitsing: VERKEER_UITSPLITSING,
        },
        {
          titel: "Campagnes",
          toelichting:
            "de campagnenaam zoals die in de utm-tag of in Google Ads staat — 'Geen campagne' is al het verkeer dat niet uit een campagne kwam",
          bron: "reeks",
          groepeerOp: "campagne",
          groepLabel: "Campagne",
          inklapbaar: true,
          standaardOpen: false,
          zoekbaar: true,
          uitsplitsing: VERKEER_UITSPLITSING,
        },
        {
          titel: "Apparaat",
          toelichting: "desktop, mobiel en tablet naast elkaar",
          bron: "reeks",
          groepeerOp: "apparaat",
          groepLabel: "Apparaat",
          inklapbaar: true,
          standaardOpen: false,
          uitsplitsing: VERKEER_UITSPLITSING,
        },
        {
          // Het hart van de pagina: waar mensen binnenkomen, en wat daar van terechtkomt.
          // De conversies in deze tabel zijn die van de hele sessie die hier begon — dus
          // ook als het formulier drie pagina's verderop is ingevuld. Dat is precies wat je
          // van een campagnelandingspagina wilt weten, en het staat ook zo in de uitleg.
          sectie: {
            titel: "Pagina's",
            toelichting:
              "Waar bezoekers binnenkwamen en wat ze daarna bekeken. Klik op een landingspagina om te zien via welke kanalen en campagnes daar is ingestapt. De filters Bron / medium en Apparaat werken hier niet — GA4 levert die niet per pagina.",
          },
          titel: "Landingspagina's",
          toelichting: "waar bezoeken begonnen, en wat die bezoeken opleverden",
          bron: "landingspaginas",
          groepeerOp: "landingspagina",
          groepLabel: "Landingspagina",
          statistieken: LANDINGSPAGINA_STATISTIEKEN,
          zonderDimensies: ALLEEN_IN_VERKEER,
          inklapbaar: true,
          zoekbaar: true,
          uitsplitsing: LANDING_UITSPLITSING,
        },
        {
          titel: "Pagina's",
          toelichting: "wat er daarna bekeken is, en hoeveel events en conversies daar vuurden",
          bron: "paginas",
          groepeerOp: "pagina",
          groepLabel: "Pagina",
          statistieken: PAGINA_STATISTIEKEN,
          zonderDimensies: ALLEEN_IN_VERKEER_EN_LANDING,
          inklapbaar: true,
          standaardOpen: false,
          zoekbaar: true,
          uitsplitsing: PAGINA_UITSPLITSING,
        },
        {
          sectie: {
            titel: "Wat ze deden",
            toelichting:
              "De events die de site afvuurt, en welke daarvan in GA4 als conversie tellen. Dezelfde filterbeperking als hierboven: Bron / medium, Campagne en Apparaat gelden hier niet.",
          },
          titel: "Conversies",
          toelichting: "de events die in GA4 als key event zijn aangemerkt",
          bron: "conversies",
          groepeerOp: "event_naam",
          groepLabel: "Conversie",
          statistieken: EVENT_STATISTIEKEN,
          zonderDimensies: ALLEEN_IN_VERKEER_EN_LANDING,
          inklapbaar: true,
          uitsplitsing: PAGINA_UITSPLITSING,
        },
        {
          titel: "Alle events",
          toelichting:
            "elk event dat de site afvuurt, ook de automatische zoals page_view, scroll en session_start",
          bron: "events",
          groepeerOp: "event_naam",
          groepLabel: "Event",
          statistieken: EVENT_STATISTIEKEN,
          zonderDimensies: ALLEEN_IN_VERKEER_EN_LANDING,
          inklapbaar: true,
          standaardOpen: false,
          zoekbaar: true,
          uitsplitsing: PAGINA_UITSPLITSING,
        },
      ]}
      leeswijzer="Eén cijfer op deze pagina telt anders op dan de rest: Gebruikers. GA4 ontdubbelt dat per opgevraagde periode en wij bewaren dagcijfers, dus wie op drie dagen langskwam telt hier drie keer. Over één dag klopt het met GA4, over een maand ligt het hoger. Sessies, nieuwe gebruikers, weergaven, events en conversies tellen wél exact op. Verder: in de tabel Landingspagina's is 'Instappen' het aantal bezoeken dat op die pagina begon, en tellen de conversies daar voor de hele sessie die daar begon — ook als het formulier verderop is ingevuld. In de tabel Pagina's tellen Sessies en Gebruikers niet op over pagina's, want één bezoek raakt er meerdere; Weergaven, Events en Conversies doen dat wel. Welke conversie op welke pagina vuurde, halen we niet op: die kruising loopt in de miljoenen rijen per maand — de tabel Conversies geeft de namen over de hele site. Klik op een regel in een tabel om hem uitgesplitst te zien; die zijbalk rekent over exact dezelfde rijen, dus de onderdelen tellen altijd op tot de regel waarop je klikte."
    />
  );
}
