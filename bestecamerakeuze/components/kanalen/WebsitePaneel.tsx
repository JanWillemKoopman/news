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
 * Dat een marketeer hier een analyse kan maken zonder in GA4 in te loggen. De volgorde van
 * de blokken is daarom die van het gesprek dat je met de cijfers voert, van buiten naar
 * binnen:
 *
 *   1. hoeveel verkeer was er, en hoe liep het (de grafiek)
 *   2. van welke site, via welk kanaal, welke bron en welke campagne kwam het
 *   3. waar stapten ze binnen — de landingspagina's, met hun engagement en conversie
 *   4. wat deden ze daarna — de pagina's
 *   5. wat leverde het op — de conversies, en daaronder alle events
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
          titel: "Websites",
          toelichting: "de properties van de groep naast elkaar",
          bron: "reeks",
          groepeerOp: "website",
          groepLabel: "Website",
        },
        {
          titel: "Kanalen",
          toelichting: "hoe bezoekers de site vonden, in GA4's eigen kanaalgroepering",
          bron: "reeks",
          groepeerOp: "kanaalgroep",
          groepLabel: "Kanaal",
        },
        {
          titel: "Bron / medium",
          toelichting: "een niveau fijner dan het kanaal: welke site en welk soort verwijzing",
          bron: "reeks",
          groepeerOp: "bron_medium",
          groepLabel: "Bron / medium",
        },
        {
          titel: "Campagnes",
          toelichting:
            "de campagnenaam zoals die in de utm-tag of in Google Ads staat — 'Geen campagne' is al het verkeer dat niet uit een campagne kwam",
          bron: "reeks",
          groepeerOp: "campagne",
          groepLabel: "Campagne",
        },
        {
          titel: "Apparaat",
          toelichting: "desktop, mobiel en tablet naast elkaar",
          bron: "reeks",
          groepeerOp: "apparaat",
          groepLabel: "Apparaat",
        },
        {
          // Het hart van de pagina: waar mensen binnenkomen, en wat daar van terechtkomt.
          // De conversies in deze tabel zijn die van de hele sessie die hier begon — dus
          // ook als het formulier drie pagina's verderop is ingevuld. Dat is precies wat je
          // van een campagnelandingspagina wilt weten, en het staat ook zo in de uitleg.
          titel: "Landingspagina's",
          toelichting:
            "waar bezoeken begonnen, en wat die bezoeken opleverden. Filter op kanaal of campagne om te zien via welke weg er op een pagina is ingestapt",
          bron: "landingspaginas",
          groepeerOp: "landingspagina",
          groepLabel: "Landingspagina",
          statistieken: LANDINGSPAGINA_STATISTIEKEN,
          zonderDimensies: ALLEEN_IN_VERKEER,
        },
        {
          titel: "Pagina's",
          toelichting: "wat er daarna bekeken is, en hoeveel events en conversies daar vuurden",
          bron: "paginas",
          groepeerOp: "pagina",
          groepLabel: "Pagina",
          statistieken: PAGINA_STATISTIEKEN,
          zonderDimensies: ALLEEN_IN_VERKEER_EN_LANDING,
        },
        {
          titel: "Conversies",
          toelichting: "de events die in GA4 als key event zijn aangemerkt",
          bron: "conversies",
          groepeerOp: "event_naam",
          groepLabel: "Conversie",
          statistieken: EVENT_STATISTIEKEN,
          zonderDimensies: ALLEEN_IN_VERKEER_EN_LANDING,
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
        },
      ]}
      leeswijzer="Eén cijfer op deze pagina telt anders op dan de rest: Gebruikers. GA4 ontdubbelt dat per opgevraagde periode en wij bewaren dagcijfers, dus wie op drie dagen langskwam telt hier drie keer. Over één dag klopt het met GA4, over een maand ligt het hoger. Sessies, nieuwe gebruikers, weergaven, events en conversies tellen wél exact op. Verder: in de tabel Landingspagina's is 'Instappen' het aantal bezoeken dat op die pagina begon, en tellen de conversies daar voor de hele sessie die daar begon — ook als het formulier verderop is ingevuld. In de tabel Pagina's tellen Sessies en Gebruikers niet op over pagina's, want één bezoek raakt er meerdere; Weergaven, Events en Conversies doen dat wel. Welke conversie op welke pagina vuurde, halen we niet op: die kruising loopt in de miljoenen rijen per maand — de tabel Conversies geeft de namen over de hele site."
    />
  );
}
