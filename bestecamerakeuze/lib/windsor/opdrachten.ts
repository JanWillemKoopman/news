/**
 * De openstaande inhaalopdracht van de sync, zoals hij op de server staat.
 *
 * Dit bestand is het geheugen dat de rondenlus niet had. De sync knipt een lange periode
 * in stukken van dertig dagen en stopt uit zichzelf als het tijdbudget op is; wat er dan
 * nog te doen is stond tot nu toe in een variabele in de browser van degene die had
 * geklikt. Wie wegklikte, wiste de opdracht — zie `0021_sync_opdrachten.sql` voor de
 * jaargrafiek die daardoor acht maanden leeg bleef.
 *
 * Hier staat alleen het boekhouden. Wie de schakels aan elkaar knoopt staat in
 * `keten.ts`; wat er per schakel werkelijk wordt opgehaald in `uitvoeren.ts`.
 */

import type { Client } from "pg";
import type { Periode } from "@/lib/windsor/sync";

/**
 * Hoeveel schakels één opdracht hoogstens mag kosten.
 *
 * Twaalf maanden zijn dertien stukken van dertig dagen en een schakel haalt er in de
 * meting twee à drie, dus vijf tot zeven schakels per deel. Vijfentwintig is daar ruim
 * boven en tegelijk een harde stop: een server die telkens hetzelfde restant teruggeeft
 * hoort niet eindeloos zichzelf opnieuw aan te roepen.
 */
export const MAX_SCHAKELS = 25;

/**
 * Hoe lang een schakel de opdracht voor zichzelf houdt.
 *
 * Ruim boven de driehonderd seconden die een functie krijgt. Hij hóórt te verlopen: een
 * functie die door Vercel wordt afgekapt komt nooit meer toe aan het vrijgeven van zijn
 * claim, en zonder verlooptijd zou die opdracht voorgoed op slot staan.
 */
const CLAIM_MINUTEN = 6;

export interface Opdracht {
  deel: string;
  /**
   * Doet dit onderdeel mee in de lopende ronde?
   *
   * Wie in het dashboard alleen de website aanvinkt, bedoelt ook echt alleen de website.
   * De ketting claimt daarom uitsluitend actieve opdrachten; een overgeslagen onderdeel
   * houdt zijn stand en wacht op een volgende keer dat het wél wordt aangevinkt.
   */
  actief: boolean;
  /** Het stuk van de periode dat nog te doen is. */
  van: string;
  tot: string;
  /** Wat er oorspronkelijk gevraagd is. */
  gevraagdVan: string;
  gevraagdTot: string;
  schakels: number;
  /** Hoeveel rijen deze opdracht tot nu toe heeft weggeschreven. */
  rijen: number;
  gestartOp: string;
  bijgewerktOp: string;
  afgerondOp: string | null;
  fout: string | null;
}

function alsOpdracht(rij: Record<string, unknown>): Opdracht {
  return {
    deel: String(rij.deel),
    actief: rij.actief !== false,
    van: String(rij.van),
    tot: String(rij.tot),
    gevraagdVan: String(rij.gevraagd_van),
    gevraagdTot: String(rij.gevraagd_tot),
    schakels: Number(rij.schakels ?? 0),
    rijen: Number(rij.rijen ?? 0),
    gestartOp: new Date(rij.gestart_op as string).toISOString(),
    bijgewerktOp: new Date(rij.bijgewerkt_op as string).toISOString(),
    afgerondOp: rij.afgerond_op ? new Date(rij.afgerond_op as string).toISOString() : null,
    fout: (rij.fout as string) || null,
  };
}

/** De kolommen die `alsOpdracht` verwacht; datums als tekst, want `pg` maakt er anders Date van. */
const KOLOMMEN = `deel, actief, van::text as van, tot::text as tot,
                  gevraagd_van::text as gevraagd_van, gevraagd_tot::text as gevraagd_tot,
                  schakels, rijen, gestart_op, bijgewerkt_op, afgerond_op, fout`;

/**
 * Zet de opdracht voor elk gevraagd deel klaar, en gooit een eventuele vorige om.
 *
 * Overschrijven en niet naast elkaar zetten: twee kettingen door dezelfde maanden leveren
 * dezelfde upserts op en kosten alleen tijd. Wie opnieuw op "Data ophalen" klikt, bedoelt
 * "doe het nog eens", niet "doe het er nog eens bij".
 *
 * ## Waarom de níet-gevraagde delen hier ook langs moeten
 *
 * De ketting kijkt niet naar wie hem gestart heeft: hij claimt de eerstvolgende opdracht
 * die openstaat. Zolang het dashboard altijd alle vier de delen klaarzette, klopte dat.
 * Sinds je zelf kunt aanvinken wát je ophaalt, niet meer — wie alleen de website
 * aanvinkt terwijl er van een vorige ronde nog een halve organische opdracht openstaat,
 * zou alsnog een kwartier lang maanden ophalen die er al zijn.
 *
 * Wat er niet bij zit, wordt daarom op inactief gezet: de regel blijft staan met alles
 * wat erin zit — tot waar de historie loopt, hoeveel rijen, wat er misging — maar de
 * ketting laat hem liggen. Aanvinken bij een volgende ronde maakt hem weer actief.
 */
export async function zetOpdrachten(
  client: Client,
  delen: readonly string[],
  periode: Periode,
): Promise<void> {
  if (delen.length === 0) return;

  // Eerst de rest stilzetten, dan pas de gevraagde delen aanzetten: andersom zou deze
  // update de zojuist klaargezette opdrachten weer uitvinken.
  await client.query(
    `update dataloket.sync_opdrachten
        set actief = false, bezig_tot = null, bijgewerkt_op = now()
      where actief and deel <> all($1::text[])`,
    [[...delen]],
  );

  await client.query(
    `insert into dataloket.sync_opdrachten
       (deel, actief, van, tot, gevraagd_van, gevraagd_tot, schakels, rijen, bezig_tot,
        gestart_op, bijgewerkt_op, afgerond_op, fout)
     select d, true, $2::date, $3::date, $2::date, $3::date, 0, 0, null, now(), now(), null, null
       from unnest($1::text[]) as d
     on conflict (deel) do update
        set actief = true,
            van = excluded.van,
            tot = excluded.tot,
            gevraagd_van = excluded.gevraagd_van,
            gevraagd_tot = excluded.gevraagd_tot,
            schakels = 0,
            rijen = 0,
            bezig_tot = null,
            gestart_op = now(),
            bijgewerkt_op = now(),
            afgerond_op = null,
            fout = null`,
    [[...delen], periode.van, periode.tot],
  );
}

/**
 * Claimt de eerstvolgende opdracht die aan de beurt is, of geeft null.
 *
 * De volgorde komt van de aanroeper mee en is niet alfabetisch: `organisch` koppelt aan
 * het eind zijn posts aan de advertenties, dus het hoort ná `advertenties` te draaien.
 *
 * Claimen en uitkiezen in één opdracht, met `for update skip locked`: de cron en een
 * collega die tegelijk klikt mogen elkaar wel opvolgen, niet hetzelfde stuk dubbel doen.
 */
export async function claimOpdracht(
  client: Client,
  volgorde: readonly string[],
): Promise<Opdracht | null> {
  const res = await client.query(
    `update dataloket.sync_opdrachten
        set bezig_tot = now() + interval '${CLAIM_MINUTEN} minutes',
            bijgewerkt_op = now()
      where deel = (
              select deel
                from dataloket.sync_opdrachten
               where actief
                 and afgerond_op is null
                 and schakels < $2
                 and (bezig_tot is null or bezig_tot < now())
                 and array_position($1::text[], deel) is not null
               order by array_position($1::text[], deel)
               limit 1
                 for update skip locked
            )
      returning ${KOLOMMEN}`,
    [[...volgorde], MAX_SCHAKELS],
  );
  const rij = res.rows[0];
  return rij ? alsOpdracht(rij) : null;
}

/**
 * Boekt wat een schakel heeft gedaan en geeft de claim weer vrij.
 *
 * `restant` leeg betekent klaar. Staat er iets, dan telt de schakel mee — ook als er niets
 * opschoof, want juist dan moet de teller een keer tegen zijn grens lopen in plaats van
 * dat de ketting op dezelfde maand blijft hangen.
 */
export async function boekVoortgang(
  client: Client,
  deel: string,
  restant: Periode | null,
  geschreven: number,
  fout: string | null,
): Promise<void> {
  if (!restant) {
    await client.query(
      `update dataloket.sync_opdrachten
          set van = gevraagd_van, tot = gevraagd_tot,
              schakels = schakels + 1, rijen = rijen + $2, bezig_tot = null,
              bijgewerkt_op = now(), afgerond_op = now(), fout = $3
        where deel = $1`,
      [deel, geschreven, fout],
    );
    return;
  }
  await client.query(
    `update dataloket.sync_opdrachten
        set van = $2::date, tot = $3::date,
            schakels = schakels + 1, rijen = rijen + $4, bezig_tot = null,
            bijgewerkt_op = now(), fout = $5
      where deel = $1`,
    [deel, restant.van, restant.tot, geschreven, fout],
  );
}

/**
 * Geeft een geclaimde opdracht terug zonder hem als schakel te tellen.
 *
 * Voor het geval dat de schakel zelf omvalt vóór er iets is opgehaald — een wegvallende
 * databaseverbinding bijvoorbeeld. De opdracht hoort dan gewoon weer aan de beurt te zijn.
 */
export async function laatOpdrachtLos(client: Client, deel: string, fout: string): Promise<void> {
  await client.query(
    `update dataloket.sync_opdrachten
        set bezig_tot = null, bijgewerkt_op = now(), fout = $2
      where deel = $1`,
    [deel, fout],
  );
}

/** Alle opdrachten, op de meegegeven volgorde. */
export async function haalOpdrachten(
  client: Client,
  volgorde: readonly string[],
): Promise<Opdracht[]> {
  const res = await client.query(
    `select ${KOLOMMEN}
       from dataloket.sync_opdrachten
      where array_position($1::text[], deel) is not null
      order by array_position($1::text[], deel)`,
    [[...volgorde]],
  );
  return res.rows.map(alsOpdracht);
}

/**
 * Staat er nog werk open dat een volgende schakel verdient?
 *
 * Alleen actieve opdrachten tellen. Een onderdeel dat deze ronde is overgeslagen staat
 * wel open, maar niemand heeft erom gevraagd — het cron-vangnet hoort er dus ook niet
 * vannacht alsnog een kwartier aan te besteden.
 */
export function heeftOpenWerk(opdrachten: readonly Opdracht[]): boolean {
  return opdrachten.some((o) => o.actief && !o.afgerondOp && o.schakels < MAX_SCHAKELS);
}

/**
 * Is een opdracht vastgelopen — open, maar de schakels zijn op?
 *
 * Dit is het geval dat vroeger onzichtbaar was: de import stopt, en niets in beeld zegt
 * dat de rest er nooit is gekomen. De pagina hoort dit te tonen.
 */
export function isVastgelopen(opdracht: Opdracht): boolean {
  // Een overgeslagen opdracht is niet vastgelopen maar afgezegd: rood melden dat de
  // import is gestopt, terwijl je hem zelf hebt uitgevinkt, is precies het soort
  // alarm dat mensen leren negeren.
  return opdracht.actief && !opdracht.afgerondOp && opdracht.schakels >= MAX_SCHAKELS;
}

/**
 * Schoof het restant werkelijk op?
 *
 * De stukken gaan nieuwste eerst, dus een geslaagde schakel laat `tot` naar het verleden
 * schuiven. Blijft hij staan, dan heeft de schakel niets opgeleverd en hoort de ketting te
 * stoppen in plaats van dezelfde maand te blijven herhalen.
 */
export function isVooruitgang(vorig: Periode, nieuw: Periode): boolean {
  return nieuw.tot < vorig.tot;
}
