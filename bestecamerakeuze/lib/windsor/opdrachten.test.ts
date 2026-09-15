import assert from "node:assert/strict";
import { test } from "node:test";
import { splitsPeriode, type Periode } from "./sync.ts";
import { MAX_SCHAKELS, heeftOpenWerk, isVastgelopen, isVooruitgang, type Opdracht } from "./opdrachten.ts";

/**
 * Deze tests gaan over de vraag die op 14 september 2026 acht maanden uit een jaargrafiek
 * liet verdwijnen: loopt een import die niet in één aanroep past werkelijk tot het eind
 * door, en is te zien wanneer dat niet lukt.
 */

function opdracht(opties: Partial<Opdracht> = {}): Opdracht {
  return {
    deel: "advertenties",
    actief: true,
    van: "2025-09-14",
    tot: "2026-09-13",
    gevraagdVan: "2025-09-14",
    gevraagdTot: "2026-09-13",
    schakels: 0,
    rijen: 0,
    gestartOp: "2026-09-14T12:00:00.000Z",
    bijgewerktOp: "2026-09-14T12:00:00.000Z",
    afgerondOp: null,
    fout: null,
    ...opties,
  };
}

/**
 * Wat `draai` in `uitvoeren.ts` met een aflopend tijdbudget doet, in het klein: een paar
 * stukken van dertig dagen wegschrijven en de rest teruggeven als `restant`. De vorm van
 * dat restant is wat de ketting doorgeeft, dus die hoort hier nagespeeld te worden.
 */
function eenSchakel(periode: Periode, stukkenPerSchakel: number) {
  const stukken = splitsPeriode(periode.van, periode.tot, 30);
  const gedaan = stukken.slice(0, stukkenPerSchakel);
  const eerstvolgende = stukken[stukkenPerSchakel];
  return {
    gedaan,
    restant: eerstvolgende ? { van: periode.van, tot: eerstvolgende.tot } : null,
  };
}

/**
 * De kern van de verbouwing: het restant gaat de server rond tot het leeg is. Als dit
 * klopt, dan komt een jaar historie binnen zonder dat er een browser aan te pas komt —
 * en zonder gat, want elke dag hoort in precies één stuk terecht te komen.
 */
test("een jaar komt in schakels binnen, zonder gaten en binnen de grens", () => {
  const gevraagd: Periode = { van: "2025-09-14", tot: "2026-09-13" };
  const dagen = new Map<string, number>();
  let restant: Periode | null = gevraagd;
  let schakels = 0;

  while (restant) {
    schakels++;
    assert.ok(schakels <= MAX_SCHAKELS, "de ketting hoort binnen MAX_SCHAKELS te eindigen");
    const vorig: Periode = restant;
    const stap = eenSchakel(vorig, 3);

    for (const stuk of stap.gedaan) {
      for (
        let d = new Date(`${stuk.van}T00:00:00Z`);
        d <= new Date(`${stuk.tot}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() + 1)
      ) {
        const dag = d.toISOString().slice(0, 10);
        dagen.set(dag, (dagen.get(dag) ?? 0) + 1);
      }
    }

    if (stap.restant) {
      assert.ok(isVooruitgang(vorig, stap.restant), "elke schakel hoort het restant op te schuiven");
    }
    restant = stap.restant;
  }

  assert.equal(dagen.size, 365, "elke dag van het jaar hoort opgehaald te zijn");
  assert.ok([...dagen.values()].every((n) => n === 1), "geen enkele dag hoort dubbel opgehaald te zijn");
});

/**
 * Een schakel die niets opschuift is de val waar een zelf-aanroepende server in kan
 * blijven hangen: dezelfde maand, eindeloos opnieuw. `isVooruitgang` is de rem.
 */
test("een schakel die hetzelfde restant teruggeeft telt niet als vooruitgang", () => {
  const zelfde: Periode = { van: "2025-09-14", tot: "2026-01-17" };
  assert.equal(isVooruitgang(zelfde, zelfde), false);
  assert.equal(isVooruitgang(zelfde, { van: "2025-09-14", tot: "2025-12-18" }), true);
});

/**
 * `heeftOpenWerk` bepaalt of de ketting nog een schakel verdient én of de nachtelijke
 * cron iets op te ruimen heeft. Een opdracht die zijn schakels heeft opgebruikt telt
 * niet mee: die hoort te wachten op een mens, niet op nóg een ronde.
 */
test("open werk is werk dat nog een schakel mag kosten", () => {
  assert.equal(heeftOpenWerk([]), false);
  assert.equal(heeftOpenWerk([opdracht({ afgerondOp: "2026-09-14T13:00:00.000Z" })]), false);
  assert.equal(heeftOpenWerk([opdracht()]), true);
  assert.equal(heeftOpenWerk([opdracht({ schakels: MAX_SCHAKELS })]), false);

  // Eén afgerond deel en één dat nog moet: de ketting hoort door te lopen naar het tweede.
  assert.equal(
    heeftOpenWerk([
      opdracht({ deel: "advertenties", afgerondOp: "2026-09-14T13:00:00.000Z" }),
      opdracht({ deel: "organisch" }),
    ]),
    true,
  );
});

/**
 * Waarom een uitgevinkt onderdeel niet meetelt als open werk: wie in het dashboard alleen
 * de website aanvinkt, bedoelt ook echt alleen de website. Zonder deze regel pakt de
 * ketting alsnog de halve organische opdracht van een vorige ronde op — precies het
 * kwartier aan al opgehaalde maanden dat de vinkjes moesten voorkomen.
 */
test("een overgeslagen onderdeel is geen open werk en geen storing", () => {
  const overgeslagen = opdracht({ deel: "organisch", actief: false });

  assert.equal(heeftOpenWerk([overgeslagen]), false);
  assert.equal(isVastgelopen(opdracht({ actief: false, schakels: MAX_SCHAKELS })), false);

  // Naast een uitgevinkt onderdeel blijft het aangevinkte gewoon aan de beurt.
  assert.equal(heeftOpenWerk([overgeslagen, opdracht({ deel: "website" })]), true);
});

/**
 * Vastgelopen is het geval dat vroeger onzichtbaar was: de import stopt en niets in beeld
 * zegt dat de rest er nooit is gekomen. Daarom is het een eigen toestand en geen stilte.
 */
test("een opdracht zonder schakels over is vastgelopen, een afgeronde niet", () => {
  assert.equal(isVastgelopen(opdracht({ schakels: MAX_SCHAKELS })), true);
  assert.equal(isVastgelopen(opdracht({ schakels: 3 })), false);
  assert.equal(
    isVastgelopen(opdracht({ schakels: MAX_SCHAKELS, afgerondOp: "2026-09-14T13:00:00.000Z" })),
    false,
  );
});
