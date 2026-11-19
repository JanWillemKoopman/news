import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GEEN_FILTERS,
  filterRegels,
  groepeer,
  jaarTerug,
  korrelVoor,
  modelSleutelVan,
  pakUit,
  reeks,
  tel,
  vakBegin,
  vastePeriodes,
  verschil,
  vorigJaar,
  type SyntecKubus,
} from "@/lib/leadsSyntec/samenvatting";

/** Een kleine kubus zoals de route hem levert. */
function kubus(): SyntecKubus {
  return {
    dagen: ["2026-11-02", "2026-11-03", "2025-11-03"],
    kanalen: [
      { kanaal: "Udenhout.nl", kanaalgroep: "Internet" },
      { kanaal: "CST", kanaalgroep: "Showroom" },
      { kanaal: "Mailing", kanaalgroep: "" },
    ],
    merken: ["Volkswagen", "FORD", "", "Volkswagen Bedrijfswagens"],
    modellen: ["POLO", "Polo (6) GP", "Fiesta", "", "Caddy"],
    ordersoorten: ["Nieuw", "Gebruikt", ""],
    soorten: ["Offerte", "Overig"],
    // dag, kanaal, merk, model, ordersoort, soort, dubbel, aantal
    regels: [
      [0, 0, 0, 0, 0, 0, 0, 3],
      [0, 1, 0, 1, 0, 1, 0, 5],
      [1, 1, 1, 2, 1, 1, 1, 2],
      [1, 2, 2, 3, 2, 1, 0, 1],
      [1, 0, 3, 4, 0, 0, 0, 4],
      [2, 0, 0, 0, 0, 0, 0, 7],
    ],
  };
}

test("pakUit deelt merk, model, herkomst en lege waarden in", () => {
  const regels = pakUit(kubus());
  assert.equal(regels.length, 6);
  assert.deepEqual(
    regels.map((r) => [r.herkomst, r.merk, r.model]),
    [
      ["internet", "Volkswagen", "Polo"],
      ["offline", "Volkswagen", "Polo"],
      ["offline", "Overige merken", "Fiesta"],
      ["offline", "Onbekend", "Onbekend"],
      ["internet", "Volkswagen Bedrijfswagens", "Caddy"],
      ["internet", "Volkswagen", "Polo"],
    ],
  );
  assert.equal(regels[3].kanaalgroep, "Geen kanaalgroep");
  assert.equal(regels[3].ordersoort, "Onbekend");
  assert.equal(regels[0].soort, "Offerte");
  assert.equal(regels[2].dubbel, true);
  assert.equal(regels[2].merkDetail, "FORD");
});

test("filteren: periode, herkomst, dubbel en 'of' binnen een filter", () => {
  const regels = pakUit(kubus());
  const nov2026 = { van: "2026-11-01", tot: "2026-11-30" };
  assert.equal(tel(filterRegels(regels, GEEN_FILTERS, nov2026)).totaal, 15);
  assert.equal(tel(filterRegels(regels, GEEN_FILTERS, null)).totaal, 22);
  assert.deepEqual(tel(filterRegels(regels, GEEN_FILTERS, nov2026)), { totaal: 15, internet: 7, offline: 8 });
  assert.equal(tel(filterRegels(regels, { ...GEEN_FILTERS, herkomst: "internet" }, nov2026)).totaal, 7);
  assert.equal(tel(filterRegels(regels, { ...GEEN_FILTERS, zonderDubbel: true }, nov2026)).totaal, 13);
  assert.equal(
    tel(filterRegels(regels, { ...GEEN_FILTERS, merken: ["Volkswagen", "Onbekend"] }, nov2026)).totaal,
    9,
  );
  assert.equal(
    tel(filterRegels(regels, { ...GEEN_FILTERS, modellen: [modelSleutelVan({ merk: "Volkswagen", model: "Polo" })] }, nov2026))
      .totaal,
    8,
  );
});

test("groeperen telt internet, offline, per merk en de schrijfwijzen", () => {
  const regels = filterRegels(pakUit(kubus()), GEEN_FILTERS, { van: "2026-11-01", tot: "2026-11-30" });
  const perKanaal = groepeer(regels, (r) => r.kanaal);
  assert.deepEqual(
    perKanaal.map((g) => [g.sleutel, g.totaal, g.internet, g.offline]),
    [
      ["CST", 7, 0, 7],
      ["Udenhout.nl", 7, 7, 0],
      ["Mailing", 1, 0, 1],
    ],
  );
  const udenhout = perKanaal.find((g) => g.sleutel === "Udenhout.nl");
  assert.deepEqual(udenhout?.perMerk, { Volkswagen: 3, "Volkswagen Bedrijfswagens": 4 });
  const polo = groepeer(regels.filter((r) => r.model === "Polo"), modelSleutelVan, (r) => r.modelRuw);
  assert.deepEqual(polo[0].onderdelen, { POLO: 3, "Polo (6) GP": 5 });
  // De groepen samen zijn het totaal: er raakt niets zoek.
  assert.equal(perKanaal.reduce((t, g) => t + g.totaal, 0), tel(regels).totaal);
});

test("vorig jaar: dezelfde datums een jaar eerder, 29 februari wordt 28 februari", () => {
  assert.equal(jaarTerug("2026-11-17"), "2025-11-17");
  assert.equal(jaarTerug("2028-02-29"), "2027-02-28");
  assert.deepEqual(vorigJaar({ van: "2026-01-01", tot: "2026-03-31" }), { van: "2025-01-01", tot: "2025-03-31" });
});

test("vaste periodes lopen tot de laatste dag met leads", () => {
  const p = Object.fromEntries(vastePeriodes("2024-01-01", "2026-11-17").map((x) => [x.id, x]));
  assert.deepEqual([p.maand.van, p.maand.tot], ["2026-11-01", "2026-11-17"]);
  assert.deepEqual([p["vorige-maand"].van, p["vorige-maand"].tot], ["2026-10-01", "2026-10-31"]);
  assert.deepEqual([p["30d"].van, p["30d"].tot], ["2026-10-19", "2026-11-17"]);
  assert.deepEqual([p.jaar.van, p.jaar.tot], ["2026-01-01", "2026-11-17"]);
  assert.deepEqual([p["vorig-jaar"].van, p["vorig-jaar"].tot], ["2025-01-01", "2025-12-31"]);
  assert.deepEqual([p.alles.van, p.alles.tot], ["2024-01-01", "2026-11-17"]);
  // Nooit vóór de eerste dag in de sheet.
  const vroeg = Object.fromEntries(vastePeriodes("2024-01-01", "2024-01-10").map((x) => [x.id, x]));
  assert.equal(vroeg["90d"].van, "2024-01-01");
});

test("korrel en vakken: per dag, per week vanaf maandag, per maand; halve vakken gemarkeerd", () => {
  assert.equal(korrelVoor({ van: "2026-10-19", tot: "2026-11-17" }), "dag");
  assert.equal(korrelVoor({ van: "2026-08-20", tot: "2026-11-17" }), "week");
  assert.equal(korrelVoor({ van: "2026-01-01", tot: "2026-11-17" }), "maand");
  assert.equal(vakBegin("2026-11-19", "week"), "2026-11-16");
  assert.equal(vakBegin("2026-11-16", "week"), "2026-11-16");
  assert.equal(vakBegin("2026-11-19", "maand"), "2026-11-01");

  const regels = pakUit(kubus());
  const dagen = reeks(regels, { van: "2026-11-01", tot: "2026-11-04" }, "dag");
  assert.deepEqual(
    dagen.map((p) => [p.begin, p.internet, p.offline]),
    [
      ["2026-11-01", 0, 0],
      ["2026-11-02", 3, 5],
      ["2026-11-03", 4, 3],
      ["2026-11-04", 0, 0],
    ],
  );
  const maanden = reeks(regels, { van: "2025-11-03", tot: "2026-11-03" }, "maand");
  assert.equal(maanden.length, 13);
  assert.equal(maanden[0].volledig, false);
  assert.equal(maanden[1].volledig, true);
  assert.equal(maanden[12].volledig, false);
  assert.equal(maanden.reduce((t, p) => t + p.internet + p.offline, 0), 22);

  // Een halve dag (de export liep halverwege) maakt zijn vak onvolledig, de rest niet.
  const metHalveDag = reeks(regels, { van: "2026-11-01", tot: "2026-11-03" }, "dag", "2026-11-03");
  assert.deepEqual(
    metHalveDag.map((p) => p.volledig),
    [true, true, false],
  );
});

test("verschil: meer leads is gunstig, geen vergelijking zonder cijfer", () => {
  assert.deepEqual(verschil(120, 100), { nu: 120, toen: 100, absoluut: 20, relatief: 0.2, gunstig: true });
  assert.equal(verschil(80, 100).gunstig, false);
  assert.equal(verschil(5, 0).relatief, null);
  assert.equal(verschil(5, null).absoluut, null);
});
