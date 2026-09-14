import assert from "node:assert/strict";
import { test } from "node:test";
import { ontdubbel, splitsPeriode, standaardVenster } from "./sync.ts";

/**
 * `ontdubbel` is de laatste stap vóór het wegschrijven, en daarmee de plek waar cijfers
 * stilletjes kunnen verdwijnen. Windsor levert twee rijen met dezelfde sleutel zodra een
 * breakdown-veld leeg terugkomt; die twee zijn twee stukjes van hetzelfde dagcijfer.
 * Eerder hield deze functie alleen de laatste over — dan staat er minder in het
 * dashboard dan in Ads Manager, zonder dat iets dat meldt.
 */

/** Een rij in het formaat van ADVERTENTIE_KOLOMMEN: 20 dimensies, dan de metingen. */
function rij(opties: {
  datum?: string;
  platform?: string;
  advertentie_id?: string;
  uitgaven?: number;
  vertoningen?: number;
  bereik?: number;
  klikken?: number;
  leads?: number;
  acties?: Record<string, number>;
}): unknown[] {
  const r: unknown[] = new Array(31).fill(null);
  r[0] = opties.datum ?? "2026-09-01";
  r[1] = "meta";
  r[2] = "69324444";
  r[3] = "Van den Udenhout";
  r[4] = opties.platform ?? "facebook";
  r[5] = "feed";
  r[6] = "c1";
  r[7] = "Campagne";
  r[12] = opties.advertentie_id ?? "a1";
  r[20] = opties.uitgaven ?? 0; // uitgaven
  r[21] = opties.vertoningen ?? 0; // vertoningen
  r[22] = opties.bereik ?? 0; // bereik
  r[23] = opties.klikken ?? 0; // klikken
  r[24] = 0; // link_klikken
  r[25] = 0; // interacties
  r[26] = 0; // videoweergaven
  r[27] = opties.leads ?? 0; // leads
  r[28] = 0; // conversies
  r[29] = 0; // conversiewaarde
  r[30] = JSON.stringify(opties.acties ?? {});
  return r;
}

test("twee rijen met dezelfde sleutel worden opgeteld, niet weggegooid", () => {
  const uit = ontdubbel([
    rij({ uitgaven: 100, vertoningen: 1000, klikken: 10, leads: 1 }),
    rij({ uitgaven: 40, vertoningen: 400, klikken: 4, leads: 2 }),
  ]);

  assert.equal(uit.length, 1);
  assert.equal(uit[0][20], 140, "uitgaven mogen niet verdwijnen");
  assert.equal(uit[0][21], 1400);
  assert.equal(uit[0][23], 14);
  assert.equal(uit[0][27], 3);
});

test("rijen die op één sleutelkolom verschillen blijven los staan", () => {
  const uit = ontdubbel([
    rij({ platform: "facebook", uitgaven: 100 }),
    rij({ platform: "instagram", uitgaven: 40 }),
    rij({ datum: "2026-09-02", uitgaven: 7 }),
    rij({ advertentie_id: "a2", uitgaven: 3 }),
  ]);

  assert.equal(uit.length, 4);
  assert.equal(
    uit.reduce((som, r) => som + Number(r[20]), 0),
    150,
  );
});

test("de maatwerkconversies worden per veldnaam opgeteld", () => {
  const uit = ontdubbel([
    rij({ acties: { actions_proefrit_aanvraag: 2, actions_offerte: 1 } }),
    rij({ acties: { actions_proefrit_aanvraag: 3 } }),
  ]);

  assert.equal(uit.length, 1);
  assert.deepEqual(JSON.parse(String(uit[0][30])), {
    actions_proefrit_aanvraag: 5,
    actions_offerte: 1,
  });
});

test("een lege of onleesbare jsonb breekt het samenvoegen niet", () => {
  const kapot = rij({ uitgaven: 5 });
  kapot[30] = "geen json";
  const uit = ontdubbel([kapot, rij({ uitgaven: 5, acties: { actions_x: 1 } })]);

  assert.equal(uit.length, 1);
  assert.equal(uit[0][20], 10);
  assert.deepEqual(JSON.parse(String(uit[0][30])), { actions_x: 1 });
});

test("een enkele rij gaat ongewijzigd doorheen", () => {
  const een = rij({ uitgaven: 12.5, bereik: 900 });
  const uit = ontdubbel([een]);
  assert.equal(uit.length, 1);
  assert.equal(uit[0][20], 12.5);
  assert.equal(uit[0][22], 900);
});

/**
 * `splitsPeriode` is de reden dat een jaarimport überhaupt kan slagen. Elk stuk is een
 * aparte opvraging bij Windsor én een apart moment waarop er wordt weggeschreven; een gat
 * of een overlap tussen twee stukken is dus een gat of een dubbeltelling in de database.
 */
test("een korte periode blijft één stuk", () => {
  assert.deepEqual(splitsPeriode("2026-09-01", "2026-09-14", 30), [
    { van: "2026-09-01", tot: "2026-09-14" },
  ]);
});

test("een lange periode wordt geknipt, nieuwste stuk eerst en zonder gaten", () => {
  const stukken = splitsPeriode("2026-06-01", "2026-09-14", 30);

  assert.equal(stukken[0].tot, "2026-09-14", "de nieuwste dag hoort in het eerste stuk");
  assert.equal(stukken[stukken.length - 1].van, "2026-06-01");

  for (const stuk of stukken) {
    assert.ok(stuk.van <= stuk.tot);
    const dagen =
      (Date.parse(`${stuk.tot}T00:00:00Z`) - Date.parse(`${stuk.van}T00:00:00Z`)) / 86400000 + 1;
    assert.ok(dagen <= 30, `stuk van ${dagen} dagen is te lang`);
  }

  // Elk volgend stuk sluit precies aan op het vorige: geen dag dubbel, geen dag gemist.
  for (let i = 1; i < stukken.length; i++) {
    const vorige = new Date(`${stukken[i - 1].van}T00:00:00Z`);
    vorige.setUTCDate(vorige.getUTCDate() - 1);
    assert.equal(stukken[i].tot, vorige.toISOString().slice(0, 10));
  }
});

test("elke dag van de periode zit in precies één stuk", () => {
  const stukken = splitsPeriode("2025-09-15", "2026-09-14", 30);
  const dagen = stukken.reduce(
    (som, s) =>
      som + (Date.parse(`${s.tot}T00:00:00Z`) - Date.parse(`${s.van}T00:00:00Z`)) / 86400000 + 1,
    0,
  );
  assert.equal(dagen, 365);
});

test("een omgekeerde periode levert geen stukken op", () => {
  assert.deepEqual(splitsPeriode("2026-09-14", "2026-09-01"), []);
});

/**
 * `terug` is wat de wekelijkse inhaalronde in `vercel.json` opknipt: zonder dat verschoven
 * venster viel er elke zondag één opvraging van honderdtwintig dagen uit de functie-tijd.
 */
test("terug schuift het venster naar het verleden zonder de lengte te veranderen", () => {
  const recent = standaardVenster(60);
  const ouder = standaardVenster(60, 60);

  assert.equal(ouder.tot < recent.tot, true);
  const lengte = (p: { van: string; tot: string }) =>
    (Date.parse(`${p.tot}T00:00:00Z`) - Date.parse(`${p.van}T00:00:00Z`)) / 86400000;
  assert.equal(lengte(ouder), lengte(recent));

  // De twee vensters sluiten op elkaar aan: samen zijn ze de honderdtwintig dagen die er
  // vroeger in één keer werden opgevraagd.
  assert.equal(ouder.tot, recent.van);
});
