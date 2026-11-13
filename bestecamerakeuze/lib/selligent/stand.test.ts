import assert from "node:assert/strict";
import { test } from "node:test";
import { LEEG_OPTIE, groepeerVelden, selectie, standVan, veldenVan } from "./stand.ts";
import { bouwTabel, type Tabel } from "./tabel.ts";

const META = { pad: "output/test.csv", bytes: 0, gewijzigdOp: null, etag: null };

/**
 * Drie contacten, waarvan er één twee auto's heeft — precies de vorm van de echte export
 * (169.290 rijen op 137.424 id's).
 */
function proeftabel(): Tabel {
  return bouwTabel(
    '"ID";"MERK";"MAIL";"CREATED_DT";"VDUVEHICLES_VEHICLE_ID";"VDUVEHICLES_DELIVERY_DT";"PREFERENCES_VDU"\n' +
      '"1";"Volkswagen";"a@b.nl";"3/02/2021 6:00:22";"100";"5/01/2022 0:00:00";"True"\n' +
      '"1";"Audi";"a@b.nl";"3/02/2021 6:00:22";"101";"6/03/2022 0:00:00";"True"\n' +
      '"2";"Volkswagen";"c@d.nl";"15/02/2021 0:00:00";"102";"7/01/2022 0:00:00";"False"\n' +
      '"3";"";"e@f.nl";"1/05/2021 0:00:00";"";"";""\n',
    META,
  );
}

test("contacten telt verschillende id's, niet rijen", () => {
  const stand = standVan(proeftabel(), []);
  assert.equal(stand.rijen, 4);
  assert.equal(stand.contacten, 3);
  assert.equal(stand.contactKolom, "ID");
});

test("een contact met twee auto's staat één keer in de maandgrafiek", () => {
  const stand = standVan(proeftabel(), []);
  assert.equal(stand.creatieKolom, "CREATED_DT");
  // Februari heeft twee contacten (id 1 met twee auto's, en id 2), niet drie rijen.
  assert.deepEqual(stand.maanden, [
    { maand: "2021-02", aantal: 2 },
    { maand: "2021-03", aantal: 0 },
    { maand: "2021-04", aantal: 0 },
    { maand: "2021-05", aantal: 1 },
  ]);
});

test("een lijstfilter houdt alleen de aangevinkte waarden over", () => {
  const stand = standVan(proeftabel(), [{ kolom: "MERK", waarden: ["Audi"] }]);
  assert.equal(stand.rijen, 1);
  assert.equal(stand.contacten, 1);
  // Het totaal blijft het totaal, zodat de UI "1 van 3" kan zeggen.
  assert.equal(stand.contactenTotaal, 3);
});

test("meerdere waarden in één filter zijn een of, meerdere filters een en", () => {
  const tabel = proeftabel();
  assert.equal(standVan(tabel, [{ kolom: "MERK", waarden: ["Audi", "Volkswagen"] }]).rijen, 3);
  assert.equal(
    standVan(tabel, [
      { kolom: "MERK", waarden: ["Volkswagen"] },
      { kolom: "ID", waarden: ["2"] },
    ]).rijen,
    1,
  );
});

test("op leeg filteren kan, en is iets anders dan niet filteren", () => {
  const tabel = proeftabel();
  assert.equal(standVan(tabel, [{ kolom: "MERK", waarden: [LEEG_OPTIE] }]).rijen, 1);
  assert.equal(standVan(tabel, [{ kolom: "MERK", waarden: [] }]).rijen, 4);
});

test("een tekstfilter zoekt hoofdletterongevoelig op een stuk van de waarde", () => {
  const tabel = proeftabel();
  assert.equal(standVan(tabel, [{ kolom: "MAIL", bevat: "C@D" }]).rijen, 1);
  assert.equal(standVan(tabel, [{ kolom: "MAIL", bevat: "@" }]).rijen, 4);
  assert.equal(standVan(tabel, [{ kolom: "MAIL", bevat: "bestaat niet" }]).rijen, 0);
});

test("een datumfilter werkt op van en tot, allebei inclusief", () => {
  const tabel = proeftabel();
  assert.equal(standVan(tabel, [{ kolom: "CREATED_DT", van: "2021-02-15" }]).contacten, 2);
  assert.equal(standVan(tabel, [{ kolom: "CREATED_DT", tot: "2021-02-15" }]).contacten, 2);
  assert.equal(
    standVan(tabel, [{ kolom: "CREATED_DT", van: "2021-02-15", tot: "2021-02-15" }]).contacten,
    1,
  );
});

test("een rij met een onleesbare datum valt buiten elk datumbereik", () => {
  const tabel = bouwTabel(
    '"ID";"CREATED_DT"\n"1";"3/02/2021"\n"2";"onbekend"\n',
    META,
  );
  assert.equal(standVan(tabel, [{ kolom: "CREATED_DT", van: "1900-01-01" }]).contacten, 1);
  // Zonder datumfilter telt hij wel mee als contact, maar staat hij in geen enkele maand.
  const zonder = standVan(tabel, []);
  assert.equal(zonder.contacten, 2);
  assert.equal(zonder.zonderCreatiedatum, 1);
  assert.equal(zonder.maanden.reduce((s, m) => s + m.aantal, 0), 1);
});

test("een filter op een kolom die niet bestaat filtert niets weg", () => {
  // De kolommen van de export veranderen; een bewaarde selectie mag geen leeg scherm geven.
  assert.equal(standVan(proeftabel(), [{ kolom: "GENDER", waarden: ["M"] }]).rijen, 4);
});

test("rijen zonder id tellen niet als één gezamenlijk contact", () => {
  const tabel = bouwTabel('"ID";"MERK"\n"";"Audi"\n"";"Seat"\n"7";"Audi"\n', META);
  assert.equal(standVan(tabel, []).contacten, 1);
});

test("elke kolom krijgt een filter, en de soort volgt uit de data", () => {
  const velden = veldenVan(proeftabel());
  assert.deepEqual(
    velden.map((v) => v.naam),
    [
      "ID",
      "MERK",
      "MAIL",
      "CREATED_DT",
      "VDUVEHICLES_VEHICLE_ID",
      "VDUVEHICLES_DELIVERY_DT",
      "PREFERENCES_VDU",
    ],
  );
  assert.equal(velden.find((v) => v.naam === "CREATED_DT")!.soort, "datum");
  assert.equal(velden.find((v) => v.naam === "MERK")!.soort, "lijst");
  assert.deepEqual(velden.find((v) => v.naam === "MERK")!.opties, [
    "Volkswagen",
    "Audi",
    LEEG_OPTIE,
  ]);
});

test("een kolom met te veel verschillende waarden krijgt een zoekveld, geen optielijst", () => {
  // Zo gaat er nooit een lijst mailadressen of kentekens naar de browser: dat volgt uit
  // de vorm van de control, niet uit een aparte controle die iemand kan vergeten.
  const regels = ['"MAIL"'];
  for (let i = 0; i < 1200; i++) regels.push(`"nr${i}@voorbeeld.nl"`);
  const veld = veldenVan(bouwTabel(regels.join("\n") + "\n", META))[0];
  assert.equal(veld.soort, "tekst");
  assert.equal(veld.opties, undefined);
  assert.equal(veld.verschillend, 1200);
});

test("het datumbereik van een filter staat in yyyy-mm-dd", () => {
  const veld = veldenVan(proeftabel()).find((v) => v.naam === "CREATED_DT")!;
  assert.deepEqual(veld.bereik, { van: "2021-02-03", tot: "2021-05-01" });
});

test("selectie geeft een masker dat even lang is als het aantal rijen", () => {
  const { masker, rijen } = selectie(proeftabel(), [{ kolom: "MERK", waarden: ["Audi"] }]);
  assert.equal(masker.length, 4);
  assert.equal(rijen, 1);
  assert.equal([...masker].filter((m) => m === 1).length, 1);
});

test("auto's tellen verschillende voertuig-id's, los van het aantal contacten", () => {
  const stand = standVan(proeftabel(), []);
  // Drie auto's op drie contacten: id 1 heeft er twee, id 3 heeft er geen.
  assert.equal(stand.autos, 3);
  assert.equal(stand.autoKolom, "VDUVEHICLES_VEHICLE_ID");
  assert.equal(stand.contacten, 3);
});

test("de autografiek staat op dezelfde datum als de contacten, want beide tellen wat erbij kwam", () => {
  // Bewust niet op de afleverdatum: de grafiek heet "toegevoegd in Selligent", en een
  // auto die in 2022 is afgeleverd aan een contact van 2021 kwam in 2021 in Selligent.
  const stand = standVan(proeftabel(), []);
  assert.equal(stand.autoDatumKolom, "CREATED_DT");
  assert.deepEqual(stand.autoMaanden, [
    { maand: "2021-02", aantal: 3 },
  ]);
});

test("een opt-in telt contacten en niet rijen", () => {
  const stand = standVan(proeftabel(), []);
  const vdu = stand.optins.find((o) => o.kolom === "PREFERENCES_VDU")!;
  // Id 1 staat in twee rijen op True; dat is één contact met een opt-in.
  assert.equal(vdu.contacten, 1);
  // De noemer op het scherm is het totale aantal contacten, niet het aantal dat iets
  // invulde: 1 van 3, en niet 1 van 2.
  assert.equal(stand.contacten, 3);
});

test("alleen booleaanse kolommen leveren een opt-in-tegel op", () => {
  const stand = standVan(proeftabel(), []);
  assert.deepEqual(
    stand.optins.map((o) => o.kolom),
    ["PREFERENCES_VDU"],
  );
});

test("de opt-ins volgen de filters, net als de metrics", () => {
  const stand = standVan(proeftabel(), [{ kolom: "MERK", waarden: ["Audi"] }]);
  assert.equal(stand.contacten, 1);
  assert.equal(stand.autos, 1);
  assert.equal(stand.optins.find((o) => o.kolom === "PREFERENCES_VDU")!.contacten, 1);
});

test("True wordt hoofdletterongevoelig en met spaties eromheen herkend", () => {
  // De waarde zelf blijft onbewerkt in de tabel staan; alleen de telling kijkt soepel.
  const tabel = bouwTabel(
    '"ID";"PREFERENCES_X"\n"1";"true"\n"2";"True "\n"3";"False"\n',
    META,
  );
  const optin = standVan(tabel, []).optins.find((o) => o.kolom === "PREFERENCES_X")!;
  assert.equal(optin.contacten, 2);
});

test("zonder voertuigkolom blijft de rest van de stand gewoon werken", () => {
  const tabel = bouwTabel('"ID";"MERK"\n"1";"Audi"\n', META);
  const stand = standVan(tabel, []);
  assert.equal(stand.autos, 0);
  assert.equal(stand.autoKolom, null);
  assert.deepEqual(stand.autoMaanden, []);
  assert.equal(stand.contacten, 1);
});

test("de filters groeperen op het voorvoegsel dat de kolomnamen delen", () => {
  const velden = veldenVan(
    bouwTabel(
      '"ID";"MAIL";"PREFERENCES_VW";"PREFERENCES_AUDI";"PREFERENCES_SEAT";' +
        '"VDUVEHICLES_BRAND";"VDUVEHICLES_MODEL";"VDUVEHICLES_FUEL_TYPE"\n' +
        '"1";"a@b.nl";"True";"False";"True";"Audi";"A3";"B"\n',
      META,
    ),
  );
  const groepen = groepeerVelden(velden);
  assert.deepEqual(
    groepen.map((g) => [g.voorvoegsel, g.velden.map((v) => v.naam)]),
    [
      // De losse velden eerst, zonder kopje.
      [null, ["ID", "MAIL"]],
      ["PREFERENCES", ["PREFERENCES_VW", "PREFERENCES_AUDI", "PREFERENCES_SEAT"]],
      ["VDUVEHICLES", ["VDUVEHICLES_BRAND", "VDUVEHICLES_MODEL", "VDUVEHICLES_FUEL_TYPE"]],
    ],
  );
});

test("onder de drempel blijft een voorvoegsel een los veld", () => {
  // Een kopje boven één of twee filters is geen indeling maar ruis.
  const velden = veldenVan(
    bouwTabel('"ID";"CREATED_DT";"MODIFIED_DT"\n"1";"3/02/2021";"4/02/2021"\n', META),
  );
  const groepen = groepeerVelden(velden);
  assert.equal(groepen.length, 1);
  assert.equal(groepen[0].voorvoegsel, null);
  assert.deepEqual(groepen[0].velden.map((v) => v.naam), ["ID", "CREATED_DT", "MODIFIED_DT"]);
});

test("zonder losse velden komt er geen leeg eerste blok", () => {
  const velden = veldenVan(
    bouwTabel('"P_A";"P_B";"P_C"\n"1";"2";"3"\n', META),
  );
  const groepen = groepeerVelden(velden);
  assert.deepEqual(groepen.map((g) => g.voorvoegsel), ["P"]);
});

test("e-mailadressen worden geteld als verschillende waarden", () => {
  const stand = standVan(proeftabel(), []);
  // Drie verschillende adressen op vier rijen: id 1 staat er met hetzelfde adres twee keer in.
  assert.equal(stand.emails, 3);
  assert.equal(stand.emailKolom, "MAIL");
});

test("een kolom met echte aantallen adressen levert geen optielijst op", () => {
  // Zo kan er nooit een lijst adressen naar de browser gaan; in de echte export staan er
  // 125.369 verschillende in, ver boven de drempel voor een aanvinklijst.
  const regels = ['"MAIL"'];
  for (let i = 0; i < 1200; i++) regels.push(`"nr${i}@voorbeeld.nl"`);
  const veld = veldenVan(bouwTabel(regels.join("\n") + "\n", META))[0];
  assert.equal(veld.soort, "tekst");
  assert.equal(veld.opties, undefined);
});

test("het aantal adressen volgt de filters, net als de andere metrics", () => {
  const stand = standVan(proeftabel(), [{ kolom: "MERK", waarden: ["Audi"] }]);
  assert.equal(stand.emails, 1);
  assert.equal(stand.emailsTotaal, 3);
});
