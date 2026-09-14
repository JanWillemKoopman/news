import assert from "node:assert/strict";
import { test } from "node:test";
import { ontdubbel } from "./sync.ts";

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
