/**
 * Wat verdient je aandacht op deze pagina?
 *
 * ## Waarom dit binnen de gekozen periode rekent en niet met de vorige periode
 *
 * De vergelijking met de vorige periode staat uit tenzij je hem aanzet — hij kost een
 * tweede ophaalactie. Signalen die alleen verschijnen als je eerst een schakelaar omzet,
 * zijn geen signalen maar een tweede tabblad. Daarom knipt dit de gekozen periode zelf in
 * tweeën: een **recent** deel (het laatste derde) tegen een **eerder** deel (de eerste
 * twee derde), allebei omgerekend naar een daggemiddelde zodat de ongelijke lengte niets
 * uitmaakt. Bij "30 dagen" vergelijk je dus de laatste tien dagen met de twintig ervoor.
 *
 * ## Waarom er drempels in zitten
 *
 * Een campagne die van één naar drie leads gaat is +200% en betekent niets. Elke regel
 * hieronder eist daarom zowel een relatieve afwijking als een absolute ondergrens, en de
 * lijst is gesorteerd op het bedrag dat ermee gemoeid is — niet op het percentage. Wat
 * hier staat moet iets zijn waar je in het weekoverleg iets mee doet; een lijst van
 * dertig "signalen" leest niemand een tweede keer.
 */

import { groepeer, telOp, waardeVan, type Kubus } from "./kubus";
import type { Statistiek } from "../windsor/velden";

export type Ernst = "let-op" | "goed" | "neutraal";

export interface Signaal {
  id: string;
  ernst: Ernst;
  /**
   * Ging het cijfer omhoog of omlaag?
   *
   * Los van `ernst`, want die twee lopen niet samen: kosten per lead die dalen is
   * "omlaag" én "goed". Een pijl afleiden uit de ernst gaat één keer goed en bij de
   * volgende regel niet meer.
   */
  richting: "omhoog" | "omlaag" | "geen";
  /** Waar het over gaat — een campagnenaam, een account. */
  onderwerp: string;
  /** Eén zin in gewone taal. */
  tekst: string;
  /** Het bedrag of aantal waar het om draait; bepaalt de volgorde. */
  gewicht: number;
}

export interface SignaalInstellingen {
  /** Op welke dimensie de signalen gaan (campagne, account). */
  dimensie: string;
  /** Minimale uitgaven in de periode voordat een campagne meetelt. */
  drempelUitgaven?: number;
  /** Minimaal aantal leads in het eerdere deel voordat een CPL-vergelijking iets zegt. */
  drempelLeads?: number;
  /**
   * Minimaal aantal sessies in het eerdere deel voordat websiteverkeer meetelt.
   *
   * De website kent geen uitgaven, dus het gewicht van een signaal is daar het volume.
   * Een kanaal dat van vier naar één sessie per dag zakt is −75% en betekent niets.
   */
  drempelSessies?: number;
}

const STANDAARD_DREMPEL_UITGAVEN = 250;
const STANDAARD_DREMPEL_LEADS = 5;
const STANDAARD_DREMPEL_SESSIES = 100;
/** Vanaf hoeveel procent afwijking is iets het vermelden waard? */
const AFWIJKING = 0.25;

interface Helft {
  totalen: Record<string, number>;
  dagen: number;
}

/** Per dag, zodat een eerste deel van twintig dagen en een laatste van tien vergelijkbaar zijn. */
function perDag(helft: Helft, veld: string): number {
  return helft.dagen > 0 ? (helft.totalen[veld] ?? 0) / helft.dagen : 0;
}

function verhouding(nu: number, toen: number): number | null {
  if (toen === 0) return null;
  return (nu - toen) / Math.abs(toen);
}

/**
 * Knipt de datums van de kubus in een eerder en een recent deel.
 *
 * Geeft `null` als er te weinig dagen zijn om iets zinnigs te zeggen: onder de negen
 * dagen is het "laatste derde" drie dagen, en dan is elke uitschieter een weekendeffect.
 */
function knip(kubus: Kubus): { grens: string; eerdereDagen: number; recenteDagen: number } | null {
  const datums = [...(kubus.labels.datum ?? [])].sort();
  if (datums.length < 9) return null;
  const recent = Math.max(3, Math.round(datums.length / 3));
  const grens = datums[datums.length - recent];
  return { grens, eerdereDagen: datums.length - recent, recenteDagen: recent };
}

function splits(
  kubus: Kubus,
  rijen: number[][],
  grens: string,
): { eerder: number[][]; recent: number[][] } {
  const kolom = kubus.dimensies.indexOf("datum");
  const datums = kubus.labels.datum ?? [];
  const eerder: number[][] = [];
  const recent: number[][] = [];
  for (const rij of rijen) {
    const datum = datums[rij[kolom]];
    if (!datum) continue;
    if (datum >= grens) recent.push(rij);
    else eerder.push(rij);
  }
  return { eerder, recent };
}

export function bepaalSignalen(
  kubus: Kubus,
  rijen: number[][],
  statistieken: Statistiek[],
  instellingen: SignaalInstellingen,
): Signaal[] {
  const knippen = knip(kubus);
  if (!knippen || kubus.dimensies.indexOf(instellingen.dimensie) === -1) return [];

  const drempelUitgaven = instellingen.drempelUitgaven ?? STANDAARD_DREMPEL_UITGAVEN;
  const drempelLeads = instellingen.drempelLeads ?? STANDAARD_DREMPEL_LEADS;
  const drempelSessies = instellingen.drempelSessies ?? STANDAARD_DREMPEL_SESSIES;
  const cpl = statistieken.find((s) => s.id === "cpl");
  const heeftUitgaven = kubus.kolommen.includes("uitgaven");

  const signalen: Signaal[] = [];
  const groepen = groepeer(kubus, rijen, instellingen.dimensie);

  // Eén pass om de rijen per groep te verdelen; per groep opnieuw over alles heen filteren
  // is bij twintig campagnes twintig keer dezelfde lus over een paar duizend rijen.
  const kolom = kubus.dimensies.indexOf(instellingen.dimensie);
  const labels = kubus.labels[instellingen.dimensie] ?? [];
  const perGroep = new Map<string, number[][]>();
  for (const rij of rijen) {
    const naam = labels[rij[kolom]] ?? "—";
    const bestaand = perGroep.get(naam);
    if (bestaand) bestaand.push(rij);
    else perGroep.set(naam, [rij]);
  }

  for (const groep of groepen) {
    const { eerder, recent } = splits(kubus, perGroep.get(groep.sleutel) ?? [], knippen.grens);
    const eerderDeel: Helft = { totalen: telOp(kubus, eerder), dagen: knippen.eerdereDagen };
    const recentDeel: Helft = { totalen: telOp(kubus, recent), dagen: knippen.recenteDagen };

    if (heeftUitgaven) {
      const uitgavenEerder = eerderDeel.totalen.uitgaven ?? 0;
      const uitgavenRecent = recentDeel.totalen.uitgaven ?? 0;

      // 1. Stilgevallen: er ging geld in om, en de laatste dagen niets meer. Dit is de
      //    reden dat deze lijst bestaat — een campagne die uit zichzelf stopt (budget op,
      //    afgekeurde advertentie) valt in een tabel met periodetotalen niet op.
      if (uitgavenEerder >= drempelUitgaven && uitgavenRecent === 0) {
        signalen.push({
          id: `stil:${groep.sleutel}`,
          ernst: "let-op",
          richting: "omlaag",
          onderwerp: groep.label,
          tekst: `Geen uitgaven meer in de laatste ${knippen.recenteDagen} dagen, daarvoor nog ${euro(uitgavenEerder)}.`,
          gewicht: uitgavenEerder,
        });
        continue; // De rest zegt niets meer over iets wat stilstaat.
      }

      // 2. Nieuw of net weer aangezet.
      if (uitgavenEerder === 0 && uitgavenRecent >= drempelUitgaven) {
        signalen.push({
          id: `nieuw:${groep.sleutel}`,
          ernst: "neutraal",
          richting: "omhoog",
          onderwerp: groep.label,
          tekst: `Pas de laatste ${knippen.recenteDagen} dagen actief, ${euro(uitgavenRecent)} uitgegeven.`,
          gewicht: uitgavenRecent,
        });
        continue;
      }
    }

    const totaalUitgaven = groep.totalen.uitgaven ?? 0;
    if (heeftUitgaven && totaalUitgaven < drempelUitgaven) continue;

    // 3. Kosten per lead die wegloopt. Alleen als er in het eerdere deel genoeg leads
    //    waren om een prijs per lead te kunnen berekenen die iets betekent.
    if (cpl && (eerderDeel.totalen.leads ?? 0) >= drempelLeads) {
      const cplEerder = waardeVan(cpl, eerderDeel.totalen);
      const cplRecent = waardeVan(cpl, recentDeel.totalen);
      if (cplEerder !== null && cplRecent !== null) {
        const verschil = verhouding(cplRecent, cplEerder);
        if (verschil !== null && Math.abs(verschil) >= AFWIJKING) {
          const omhoog = verschil > 0;
          signalen.push({
            id: `cpl:${groep.sleutel}`,
            ernst: omhoog ? "let-op" : "goed",
            richting: omhoog ? "omhoog" : "omlaag",
            onderwerp: groep.label,
            tekst: `Kosten per lead ${omhoog ? "gestegen" : "gedaald"} van ${euro(cplEerder)} naar ${euro(cplRecent)} in de laatste ${knippen.recenteDagen} dagen.`,
            gewicht: totaalUitgaven,
          });
          continue;
        }
      }
    }

    // 4. Meer geld, niet meer resultaat. De klassieke stille verspilling: het budget
    //    loopt door, de opbrengst niet mee.
    if (heeftUitgaven && kubus.kolommen.includes("leads")) {
      const uitgavenGroei = verhouding(perDag(recentDeel, "uitgaven"), perDag(eerderDeel, "uitgaven"));
      const leadGroei = verhouding(perDag(recentDeel, "leads"), perDag(eerderDeel, "leads"));
      if (
        uitgavenGroei !== null &&
        uitgavenGroei >= AFWIJKING &&
        (eerderDeel.totalen.leads ?? 0) >= drempelLeads &&
        (leadGroei === null || leadGroei <= 0)
      ) {
        signalen.push({
          id: `budget:${groep.sleutel}`,
          ernst: "let-op",
          richting: "omhoog",
          onderwerp: groep.label,
          tekst: `Uitgaven per dag ${procent(uitgavenGroei)} omhoog, leads niet mee.`,
          gewicht: totaalUitgaven,
        });
        continue;
      }
    }

    // 5. Website: het verkeer zelf loopt terug of juist op. Geen uitgaven in deze kubus,
    //    dus het volume is hier zowel de drempel als het gewicht — een kanaal dat honderd
    //    sessies per week kwijtraakt is een groter verhaal dan een dat er drie verliest.
    if (!heeftUitgaven && kubus.kolommen.includes("sessies")) {
      const sessiesEerder = eerderDeel.totalen.sessies ?? 0;
      if (sessiesEerder >= drempelSessies) {
        const groei = verhouding(perDag(recentDeel, "sessies"), perDag(eerderDeel, "sessies"));
        if (groei !== null && Math.abs(groei) >= AFWIJKING) {
          const omhoog = groei > 0;
          signalen.push({
            id: `sessies:${groep.sleutel}`,
            ernst: omhoog ? "goed" : "let-op",
            richting: omhoog ? "omhoog" : "omlaag",
            onderwerp: groep.label,
            tekst: `Sessies per dag ${procent(groei)} ${omhoog ? "omhoog" : "omlaag"} in de laatste ${knippen.recenteDagen} dagen.`,
            gewicht: groep.totalen.sessies ?? 0,
          });
          continue;
        }

        // Evenveel bezoek, minder resultaat: het verkeer valt niet op maar de opbrengst
        // wel. Bewust ná de vorige regel, want een gedaald conversiepercentage bij
        // gehalveerd verkeer is hetzelfde verhaal twee keer.
        const conversiesEerder = eerderDeel.totalen.conversies ?? 0;
        if (conversiesEerder >= 10) {
          const ratioEerder = sessiesEerder > 0 ? conversiesEerder / sessiesEerder : 0;
          const sessiesRecent = recentDeel.totalen.sessies ?? 0;
          const ratioRecent =
            sessiesRecent > 0 ? (recentDeel.totalen.conversies ?? 0) / sessiesRecent : 0;
          const verschil = verhouding(ratioRecent, ratioEerder);
          if (verschil !== null && Math.abs(verschil) >= AFWIJKING) {
            const omhoog = verschil > 0;
            signalen.push({
              id: `conversieratio:${groep.sleutel}`,
              ernst: omhoog ? "goed" : "let-op",
              richting: omhoog ? "omhoog" : "omlaag",
              onderwerp: groep.label,
              tekst: `Conversieratio ${omhoog ? "gestegen" : "gedaald"} van ${procent(ratioEerder)} naar ${procent(ratioRecent)}, bij vergelijkbaar verkeer.`,
              gewicht: groep.totalen.sessies ?? 0,
            });
            continue;
          }
        }
      }
    }

    // 6. Accounts: volgers eraf. Geen uitgaven in deze kubus, dus eigen drempel.
    if (!heeftUitgaven && kubus.kolommen.includes("volgers_netto")) {
      const netto = recentDeel.totalen.volgers_netto ?? 0;
      if (netto < 0) {
        signalen.push({
          id: `volgers:${groep.sleutel}`,
          ernst: "let-op",
          richting: "omlaag",
          onderwerp: groep.label,
          tekst: `${Math.abs(netto).toLocaleString("nl-NL")} volgers verloren in de laatste ${knippen.recenteDagen} dagen.`,
          gewicht: Math.abs(netto),
        });
      }
    }
  }

  // Op gewicht en niet op percentage: een campagne van tienduizend euro met 30% duurdere
  // leads is een groter probleem dan eentje van driehonderd die verdubbelde.
  return signalen.sort((a, b) => b.gewicht - a.gewicht);
}

function euro(waarde: number): string {
  const decimalen = Math.abs(waarde) < 10 && waarde !== 0 ? 2 : 0;
  return `€ ${waarde.toLocaleString("nl-NL", {
    minimumFractionDigits: decimalen,
    maximumFractionDigits: decimalen,
  })}`;
}

function procent(fractie: number): string {
  return `${Math.round(Math.abs(fractie) * 100)}%`;
}
