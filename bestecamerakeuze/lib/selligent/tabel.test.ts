import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bepaalScheiding,
  bouwTabel,
  dagNummer,
  doorloopCsv,
  leesDatum,
  maandSleutel,
} from "./tabel.ts";

const META = { pad: "output/test.csv", bytes: 0, gewijzigdOp: null, etag: null };

test("leest de datum dag-eerst, zoals de export hem levert", () => {
  // 3/02/2021 is 3 februari. new Date() zou hier 2 maart van maken.
  assert.equal(leesDatum("3/02/2021 6:00:22")?.toISOString(), "2021-02-03T06:00:22.000Z");
  assert.equal(leesDatum("23/04/2027 0:00:00")?.toISOString(), "2027-04-23T00:00:00.000Z");
  assert.equal(leesDatum("21/08/2015")?.toISOString(), "2015-08-21T00:00:00.000Z");
});

test("weigert een datum die niet bestaat in plaats van hem door te rollen", () => {
  assert.equal(leesDatum("31/02/2021 0:00:00"), null);
  assert.equal(leesDatum("13/13/2021"), null);
  assert.equal(leesDatum("JV239Z"), null);
  assert.equal(leesDatum(""), null);
});

test("bepaalt het scheidingsteken uit de koprij", () => {
  assert.equal(bepaalScheiding('"A";"B";"C"'), ";");
  assert.equal(bepaalScheiding("a,b,c,d"), ",");
});

test("doorloopt gequote velden met scheidingstekens en regeleindes erin", () => {
  const rijen: string[][] = [];
  doorloopCsv('"a";"b;c"\n"regel\neen";"zei ""hoi"""\n', ";", (r) => rijen.push(r));
  assert.deepEqual(rijen, [
    ["a", "b;c"],
    ["regel\neen", 'zei "hoi"'],
  ]);
});

test("neemt een laatste regel zonder regeleinde eronder mee", () => {
  const rijen: string[][] = [];
  doorloopCsv("a;b\nc;d", ";", (r) => rijen.push(r));
  assert.deepEqual(rijen, [
    ["a", "b"],
    ["c", "d"],
  ]);
});

test("codeert elke kolom en zet de waarden aflopend op aantal", () => {
  const tabel = bouwTabel(
    '"MERK";"OPTIN"\n"Audi";"True"\n"Volkswagen";"False"\n"Volkswagen";""\n"Volkswagen";"True"\n',
    META,
  );
  assert.equal(tabel.rijen, 4);
  const merk = tabel.kolommen[0];
  // Index 0 is altijd leeg; daarna het meestvoorkomende eerst.
  assert.deepEqual(merk.waarden, ["", "Volkswagen", "Audi"]);
  assert.deepEqual([...merk.aantallen], [0, 3, 1]);
  assert.deepEqual([...merk.codes], [2, 1, 1, 1]);
  assert.equal(merk.gevuld, 4);

  const optin = tabel.kolommen[1];
  assert.equal(optin.type, "booleaans");
  assert.equal(optin.gevuld, 3);
  assert.equal(optin.waarden[0], "");
  assert.equal(optin.aantallen[0], 1);
});

test("berekent dag en maand per code, niet per rij", () => {
  const tabel = bouwTabel(
    '"CREATED_DT"\n"3/02/2021 6:00:22"\n"3/02/2021 6:00:22"\n"1/01/2026 0:00:00"\n',
    META,
  );
  const kolom = tabel.kolommen[0];
  assert.equal(kolom.type, "datum");
  // Twee gelijke datums leveren één code op, dus drie rijen en twee datumwaarden.
  assert.equal(kolom.waarden.length, 3);
  assert.equal(kolom.maandPerCode![1], 2021 * 12 + 1);
  assert.equal(kolom.dagPerCode![1], dagNummer("2021-02-03"));
});

test("een onleesbare datum krijgt geen dag en geen maand", () => {
  const tabel = bouwTabel('"D"\n"3/02/2021"\n"onbekend"\n"3/02/2021"\n', META);
  const kolom = tabel.kolommen[0];
  const slecht = kolom.waarden.indexOf("onbekend");
  assert.equal(kolom.dagPerCode![slecht], -1);
  assert.equal(kolom.maandPerCode![slecht], -1);
});

test("slaat rijen met een afwijkend aantal velden over en meldt hoeveel", () => {
  const tabel = bouwTabel('"A";"B"\n"1";"2"\n"3";"4";"5"\n"6";"7"\n', META);
  assert.equal(tabel.rijen, 2);
  assert.equal(tabel.overgeslagenRijen, 1);
});

test("blijft werken als mailadres en geslacht uit de export verdwijnen", () => {
  const zonder = bouwTabel('"ID";"MERK"\n"1";"Audi"\n', META);
  assert.deepEqual(
    zonder.kolommen.map((k) => k.naam),
    ["ID", "MERK"],
  );
  assert.equal(zonder.rijen, 1);
});

test("rekent maandsleutels terug naar jaar-maand", () => {
  assert.equal(maandSleutel(2021 * 12 + 1), "2021-02");
  assert.equal(maandSleutel(2026 * 12 + 11), "2026-12");
});

test("leest een yyyy-mm-dd naar een dagnummer en weigert de rest", () => {
  assert.equal(dagNummer("1970-01-01"), 0);
  assert.equal(dagNummer("1970-01-02"), 1);
  assert.equal(dagNummer("3/02/2021"), null);
  assert.equal(dagNummer(""), null);
});
