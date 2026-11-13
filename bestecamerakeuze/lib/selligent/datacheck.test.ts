import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bepaalScheiding,
  berekenDatacheck,
  doorloopCsv,
  isPersoonsgegeven,
  leesDatum,
} from "./datacheck.ts";

const BESTAND = { pad: "output/test.csv", bytes: 0, gewijzigdOp: null };

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

test("beschrijft de kolommen zonder een vaste kolomlijst te kennen", () => {
  const csv =
    '"MERK";"OPTIN";"CREATED_DT"\n' +
    '"Volkswagen";"True";"3/02/2021 6:00:22"\n' +
    '"Audi";"False";"23/03/2017 0:00:00"\n' +
    '"Volkswagen";"";"1/01/2026 0:00:00"\n';
  const check = berekenDatacheck(csv, BESTAND);

  assert.equal(check.rijen, 3);
  assert.deepEqual(
    check.kolommen.map((k) => k.naam),
    ["MERK", "OPTIN", "CREATED_DT"],
  );

  const merk = check.kolommen[0];
  assert.equal(merk.type, "tekst");
  assert.equal(merk.gevuld, 3);
  assert.equal(merk.vulgraad, 1);
  assert.equal(merk.verschillend, 2);
  assert.deepEqual(merk.waarden, [
    { waarde: "Volkswagen", aantal: 2 },
    { waarde: "Audi", aantal: 1 },
  ]);

  const optin = check.kolommen[1];
  assert.equal(optin.type, "booleaans");
  assert.equal(optin.gevuld, 2);

  const datum = check.kolommen[2];
  assert.equal(datum.type, "datum");
  assert.deepEqual(datum.bereik, {
    van: "2017-03-23T00:00:00.000Z",
    tot: "2026-01-01T00:00:00.000Z",
  });
});

test("blijft werken als mailadres en geslacht uit de export verdwijnen", () => {
  const met = berekenDatacheck('"ID";"MAIL";"GENDER";"MERK"\n"1";"a@b.nl";"M";"Audi"\n', BESTAND);
  const zonder = berekenDatacheck('"ID";"MERK"\n"1";"Audi"\n', BESTAND);
  assert.equal(met.rijen, 1);
  assert.equal(zonder.rijen, 1);
  assert.deepEqual(
    zonder.kolommen.map((k) => k.naam),
    ["ID", "MERK"],
  );
});

test("laat geen enkele waarde van een persoonskolom in het antwoord staan", () => {
  const check = berekenDatacheck(
    '"MAIL";"GENDER";"VDUVEHICLES_LICENSE_PLATE";"MERK"\n' +
      '"a@b.nl";"M";"JV239Z";"Audi"\n' +
      '"c@d.nl";"M";"XX123Y";"Audi"\n',
    BESTAND,
  );
  for (const naam of ["MAIL", "GENDER", "VDUVEHICLES_LICENSE_PLATE"]) {
    const kolom = check.kolommen.find((k) => k.naam === naam)!;
    assert.deepEqual(kolom.waarden, [], `${naam} hoort geen waarden te tonen`);
    assert.equal(kolom.waardenVerborgen, "persoonsgegeven");
    // Het aantal mag wél: dat zegt niets over een individu.
    assert.equal(kolom.verschillend !== null, true);
  }
  // Een gewone kolom laat zijn waarden gewoon zien.
  assert.deepEqual(check.kolommen.find((k) => k.naam === "MERK")!.waarden, [
    { waarde: "Audi", aantal: 2 },
  ]);
});

test("herkent de namen van persoonskolommen ongeacht hoofdletters", () => {
  assert.equal(isPersoonsgegeven("MAIL"), true);
  assert.equal(isPersoonsgegeven("VDUVEHICLES_LICENSE_PLATE"), true);
  assert.equal(isPersoonsgegeven("Geslacht"), true);
  assert.equal(isPersoonsgegeven("CUSTOMER_ID"), false);
  assert.equal(isPersoonsgegeven("VDUVEHICLES_BRAND"), false);
});

test("slaat rijen met een afwijkend aantal velden over en meldt hoeveel", () => {
  const check = berekenDatacheck('"A";"B"\n"1";"2"\n"3";"4";"5"\n"6";"7"\n', BESTAND);
  assert.equal(check.rijen, 2);
  assert.equal(check.overgeslagenRijen, 1);
});

test("rekent een kolom met veel verschillende waarden wel, maar toont ze niet", () => {
  const regels = ["\"NR\""];
  for (let i = 0; i < 60; i++) regels.push(`"n${i}"`);
  const check = berekenDatacheck(regels.join("\n") + "\n", BESTAND);
  const nr = check.kolommen[0];
  assert.equal(nr.verschillend, 60);
  assert.deepEqual(nr.waarden, []);
  assert.equal(nr.waardenVerborgen, "te-veel-verschillend");
});
