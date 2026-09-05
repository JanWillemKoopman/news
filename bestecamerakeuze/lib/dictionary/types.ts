/**
 * Het datawoordenboek: de "kennismaking" die het model krijgt voordat het één query
 * schrijft.
 *
 * Dit bestand legt alleen de vórm vast. De inhoud — wat een kolom betekent, wat bij
 * jullie als "verkocht" telt, hoe een week loopt — staat per tabel in `tabellen/`.
 * Die inhoud is het waardevolste deel van dit hele systeem: het is de kennis die
 * nergens in de data zelf te vinden is.
 *
 * Het is bewust TypeScript en geen YAML: de compiler controleert dan dat elke tabel
 * compleet is, en Claude Code kan de bestanden net zo makkelijk schrijven.
 */

export interface Kolom {
  /** Kolomnaam exact zoals in de view. */
  naam: string;
  /** Postgres-type, in gewone taal: text, date, timestamp, int, numeric, boolean. */
  type: string;
  /** Wat deze kolom betekent — schrijf het voor iemand die het bedrijf niet kent. */
  betekenis: string;
  /**
   * Volledige lijst toegestane waarden, als die eindig is. Dit voorkomt de meest
   * voorkomende fout: filteren op een merk- of statusnaam die net anders gespeld is.
   */
  waarden?: string[];
  /** Eenheid, als die niet vanzelfsprekend is: "euro, exclusief btw", "aantal stuks". */
  eenheid?: string;
  /** Wat een lege waarde betekent. Vaak iets anders dan nul. */
  leegBetekent?: string;
}

export interface Voorbeeldvraag {
  vraag: string;
  sql: string;
  /** Waarom deze query zo is opgebouwd — de les die het model eruit moet halen. */
  toelichting?: string;
}

export interface Koppeling {
  /** Naam van de andere view. */
  naarTabel: string;
  /** Hoe de koppeling loopt, als SQL-fragment: "v_verkopen.ordernummer = v_leads.order_id". */
  via: string;
  /** Wanneer je deze koppeling wel of juist niet moet gebruiken. */
  toelichting?: string;
}

export interface TabelBeschrijving {
  /** Naam van de view waar het model op mag queryen — altijd met v_-prefix. */
  view: string;
  /** Waar deze tabel over gaat, in twee zinnen. */
  doel: string;
  /** Wat is precies één rij? Bepaalt of iets count(*) of sum(kolom) moet zijn. */
  granulariteit: string;
  /** Waar de data vandaan komt, in mensentaal. */
  bron: string;
  /** Hoe vaak hij ververst wordt. */
  ververst: string;
  /** Wie inhoudelijk over deze data gaat. */
  eigenaar?: string;
  kolommen: Kolom[];
  /**
   * De bedrijfsregels. Dit is het belangrijkste veld van het hele woordenboek:
   * definities, wat wel en niet meetelt, historische breuken, afrondingsafspraken.
   */
  regels: string[];
  /** Woorden die collega's gebruiken, en waar die op slaan. */
  synoniemen?: Record<string, string>;
  /** Bekende valkuilen: dubbelingen, kolommen die je moet negeren, rare periodes. */
  valkuilen?: string[];
  koppelingen?: Koppeling[];
  /** Echte vragen met de correcte query. De sterkste kwaliteitsknop die je hebt. */
  voorbeelden: Voorbeeldvraag[];
}

/** Kennis die over alle tabellen heen geldt. */
export interface AlgemeneContext {
  /** Wat voor bedrijf dit is en wat de data beschrijft. */
  organisatie: string;
  /** Hoe periodes werken: weeknummering, boekjaar, seizoenen. */
  kalender: string[];
  /** Afspraken die overal gelden: valuta, btw, afronding, tijdzone. */
  conventies: string[];
}
