import assert from "node:assert/strict";
import { test } from "node:test";
import type { Bron, GeparsteRij } from "@/lib/sync/bronnen";
import { bouwBlokInsert, inBlokken, isLegeRij, rijenAlsRecords, teBewarenAfwijkingen } from "@/lib/sync/blokken";

const bron: Bron = {
  naam: "Data leads",
  sheetId: "x",
  tabblad: "Data leads",
  doeltabel: "leads_raw",
  sleutelKolom: "regelnummer",
  vereisteKolom: "Kanaal",
  kolommen: { regelnummer: "regelnummer", Kanaal: "kanaal", Onderwerp: "onderwerp" },
};

function rij(rijnummer: number, waarden: Record<string, string>): GeparsteRij {
  return { rijnummer, waarden: { regelnummer: String(rijnummer), ...waarden } };
}

test("inBlokken verdeelt zonder iets te verliezen of te verdubbelen", () => {
  const lijst = Array.from({ length: 12_001 }, (_, i) => i);
  const blokken = inBlokken(lijst, 5000);
  assert.deepEqual(blokken.map((b) => b.length), [5000, 5000, 2001]);
  assert.deepEqual(blokken.flat(), lijst);
  assert.deepEqual(inBlokken([], 5000), []);
});

test("de blokinsert zet één JSON-parameter om naar de types van de doeltabel", () => {
  assert.equal(
    bouwBlokInsert(bron),
    "insert into dataloket.leads_raw (regelnummer, kanaal, onderwerp) " +
      "select regelnummer, kanaal, onderwerp from json_populate_recordset(null::dataloket.leads_raw, $1::json) " +
      "on conflict (regelnummer) do nothing",
  );
  // Namen komen letterlijk in de query: alles behalve kleine letters, cijfers en _ weigert hij.
  assert.throws(() => bouwBlokInsert({ ...bron, doeltabel: "leads raw" }));
  assert.throws(() => bouwBlokInsert({ ...bron, kolommen: { Kanaal: "Kanaal-x" } }));
});

test("records gebruiken de databasekolommen; een ontbrekende sheetkolom wordt null", () => {
  assert.deepEqual(rijenAlsRecords([rij(2, { Kanaal: "Skoda.nl" })], bron), [
    { regelnummer: "2", kanaal: "Skoda.nl", onderwerp: null },
  ]);
});

test("lege opvulregels worden geteld maar niet met hun inhoud bewaard", () => {
  const leeg = rij(3, { Kanaal: " ", Onderwerp: "" });
  const halfLeeg = rij(4, { Kanaal: "", Onderwerp: "Offerte aanvraag" });
  assert.equal(isLegeRij(leeg, bron), true);
  assert.equal(isLegeRij(halfLeeg, bron), false);
  const afgekeurd = [leeg, halfLeeg].map((r) => ({ rij: r, reden: "Lege verplichte kolom" }));
  assert.deepEqual(teBewarenAfwijkingen(afgekeurd, bron).map((a) => a.rij.rijnummer), [4]);
  const veel = Array.from({ length: 900 }, (_, i) => ({ rij: rij(i + 10, { Onderwerp: "x" }), reden: "r" }));
  assert.equal(teBewarenAfwijkingen(veel, bron).length, 500);
});
