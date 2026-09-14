/**
 * De ketting die een lange import op de server afmaakt, zonder browser.
 *
 * ## Waarom dit bestaat
 *
 * Een import van twaalf maanden is dertien stukken van dertig dagen en past niet in de
 * driehonderd seconden die een functie krijgt. De sync stopt daarom uit zichzelf met een
 * `restant`, en tot nu toe was het de browser die dat restant vasthield en de route
 * opnieuw aanriep. Dat werkt precies zolang het tabblad open blijft — en dat is een
 * voorwaarde die niemand kent en die niets in beeld bevestigt.
 *
 * Hier staat dat restant in `dataloket.sync_opdrachten` en roept de server zichzelf aan:
 * elke schakel doet één stuk werk van hooguit tweehonderd seconden, boekt wat hij deed en
 * zet de volgende schakel in gang vóórdat hij zelf afsluit. Wegklikken is daarmee
 * onschadelijk geworden.
 *
 * ## Waarom de vervolgaanroep niet wordt afgewacht
 *
 * De volgende schakel duurt zelf weer minuten; wie daarop wacht houdt de huidige functie
 * al die tijd in de lucht en wordt alsnog afgekapt. We wachten daarom alleen tot het
 * verzoek de deur uit is en breken de verbinding dan af. Dat de sync gewoon doordraait
 * als de aanroeper wegvalt, is in dit project al gemeten: een organische ronde die als
 * "Load failed" in beeld kwam en ondertussen 196 posts wegschreef.
 *
 * ## Waarom er ook nog een cron-vangnet is
 *
 * Een ketting kan alsnog breken — een schakel die door Vercel wordt afgekapt vóórdat hij
 * de volgende heeft aangeroepen, of een `CRON_SECRET` dat ontbreekt. De opdracht blijft
 * dan gewoon openstaan, en `/api/windsor-sync` pakt hem de volgende nacht op. Trager,
 * maar niets blijft stilletjes half af.
 */

import { Client } from "pg";
import {
  boekVoortgang,
  claimOpdracht,
  haalOpdrachten,
  heeftOpenWerk,
  isVooruitgang,
  laatOpdrachtLos,
  zetOpdrachten,
  type Opdracht,
} from "@/lib/windsor/opdrachten";
import type { Periode, SyncResultaat } from "@/lib/windsor/sync";
import { DELEN, voerSyncUit, type Deel } from "@/lib/windsor/uitvoeren";
import { eisVerbindingssnaar } from "@/lib/verbindingssnaar";

/** Hoe lang we wachten tot het vervolgverzoek verstuurd is; daarna laten we het los. */
const DOORSCHAKEL_TIMEOUT_MS = 3000;

async function metSchrijfverbinding<T>(werk: (client: Client) => Promise<T>): Promise<T> {
  const connectionString = process.env.SYNC_DATABASE_URL;
  if (!connectionString) throw new Error("SYNC_DATABASE_URL ontbreekt.");
  eisVerbindingssnaar(connectionString, "SYNC_DATABASE_URL");
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    return await werk(client);
  } finally {
    await client.end().catch(() => {});
  }
}

/** Kan de server zichzelf doorschakelen, of is de ketting op de cron aangewezen? */
export function kanDoorschakelen(): boolean {
  return Boolean(process.env.CRON_SECRET?.trim());
}

/**
 * Zet een nieuwe opdracht klaar voor de gevraagde delen en periode.
 *
 * Schrijft alleen de opdracht weg; het werk begint pas bij de eerste schakel. Zo keert de
 * knop in het dashboard meteen terug met "hij loopt" in plaats van drie minuten stil te
 * staan op een verbinding die de browser toch niet zo lang openhoudt.
 */
export async function zetOpdrachtKlaar(delen: readonly Deel[], periode: Periode): Promise<void> {
  await metSchrijfverbinding((client) => zetOpdrachten(client, delen, periode));
}

export interface SchakelUitkomst {
  /** Welk deel deze schakel heeft gedaan, of null als er niets openstond. */
  deel: Deel | null;
  gedaan: Periode | null;
  restant: Periode | null;
  /** Is er daarna nog werk dat een volgende schakel verdient? */
  nogTeDoen: boolean;
  resultaten: SyncResultaat[];
  fout?: string;
}

/**
 * Doet één schakel: claim de opdracht die aan de beurt is, haal er een stuk van op, boek
 * wat er gedaan is.
 *
 * Geeft `nogTeDoen` terug zodat de route weet of hij zichzelf nog eens moet aanroepen.
 * Dat oordeel hoort hier en niet in de route, want het hangt af van dingen die alleen
 * deze functie ziet: schoof het restant werkelijk op, en staat er van een ánder deel nog
 * iets open.
 */
export async function voerSchakelUit(): Promise<SchakelUitkomst> {
  const opdracht = await metSchrijfverbinding((client) => claimOpdracht(client, DELEN));
  if (!opdracht) {
    return { deel: null, gedaan: null, restant: null, nogTeDoen: false, resultaten: [] };
  }

  const deel = opdracht.deel as Deel;
  const teDoen: Periode = { van: opdracht.van, tot: opdracht.tot };

  let uitkomst;
  try {
    uitkomst = await voerSyncUit(deel, teDoen);
  } catch (err) {
    // De schakel is omgevallen vóór er iets is opgehaald. De opdracht hoort dan gewoon
    // weer aan de beurt te zijn in plaats van zijn claim uit te zitten.
    const bericht = err instanceof Error ? err.message : String(err);
    await metSchrijfverbinding((client) => laatOpdrachtLos(client, deel, bericht)).catch(() => {});
    return {
      deel,
      gedaan: null,
      restant: teDoen,
      nogTeDoen: false,
      resultaten: [],
      fout: bericht,
    };
  }

  const fouten = uitkomst.resultaten.filter((r) => r.fout);
  const fout = fouten.length === 0 ? null : fouten.map((f) => `${f.onderdeel}: ${f.fout}`).join(" | ");

  // Schoof het restant niet op, dan heeft deze schakel niets opgeleverd en zou de
  // volgende precies hetzelfde stuk opnieuw proberen. De opdracht blijft openstaan — het
  // cron-vangnet probeert het vannacht nog eens — maar de ketting stopt hier.
  const vastgelopen = uitkomst.restant !== null && !isVooruitgang(teDoen, uitkomst.restant);

  const geschreven = uitkomst.resultaten.reduce((t, r) => t + r.geschreven, 0);
  const nogTeDoen = await metSchrijfverbinding(async (client) => {
    await boekVoortgang(client, deel, uitkomst.restant, geschreven, fout);
    if (vastgelopen) return false;
    return heeftOpenWerk(await haalOpdrachten(client, DELEN));
  });

  return {
    deel,
    gedaan: uitkomst.gedaan,
    restant: uitkomst.restant,
    nogTeDoen,
    resultaten: uitkomst.resultaten,
    fout: fout ?? undefined,
  };
}

/**
 * Zet de volgende schakel in gang.
 *
 * Hoort binnen `after()` van een route aangeroepen te worden: dan gaat het antwoord eerst
 * de deur uit en houdt Vercel de functie nog net lang genoeg in de lucht om dit verzoek
 * te versturen.
 */
export async function schakelDoor(basisUrl: string): Promise<boolean> {
  const geheim = process.env.CRON_SECRET?.trim();
  if (!geheim) return false;

  const url = new URL("/api/windsor-sync?keten=1", basisUrl).toString();
  try {
    await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${geheim}` },
      cache: "no-store",
      signal: AbortSignal.timeout(DOORSCHAKEL_TIMEOUT_MS),
    });
  } catch {
    // Vrijwel altijd het aflopen van de timeout hierboven: het verzoek is verstuurd en de
    // volgende schakel draait, wij hoeven alleen niet op zijn antwoord te wachten. Gaat er
    // tóch iets mis, dan blijft de opdracht openstaan en pakt de cron hem op.
  }
  return true;
}

/** De stand van alle opdrachten, voor wie wil weten hoe ver de import is. */
export async function haalOpdrachtStand(): Promise<Opdracht[]> {
  return metSchrijfverbinding((client) => haalOpdrachten(client, DELEN));
}
