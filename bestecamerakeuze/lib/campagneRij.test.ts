import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bezetteKolommen,
  celAdres,
  kolomLetter,
  nieuweCampagneRij,
  rijVanCampagne,
} from "./campagneRij.ts";

const KOP = [
  "Campagne naam",
  "Budget",
  "Uitgaven",
  "Doel leads",
  "Doel orders",
  "Startdatum",
  "Einddatum",
  "Status",
  "Order totaal",
  "Orders campagne",
  "Resultaat",
  "Merk",
  "Model",
  "Lead type",
  "Ordersoort",
  "Klantgroep orders (indien van toepassing)",
  "Doel leads marketing",
  "Doel orders marketing",
  "Campagnepagina",
  "Leads",
  "Definitie lead",
  "Leads marketing",
];

/** Kolomindexen zoals ze in de kopregel staan. */
const NAAM = 0;
const STARTDATUM = 5;
const MERK = 11;
const LEADS = 19;
const LEADS_MARKETING = 21;

function rij(waarden: Record<number, string>): string[] {
  const hoogste = Math.max(...Object.keys(waarden).map(Number));
  return Array.from({ length: hoogste + 1 }, (_, i) => waarden[i] ?? "");
}

/**
 * De sheet zoals hij er echt uitziet: een kopregel, campagnes waarvan de eerste kolommen
 * na de naam vaak leeg zijn (geen budget ingevuld), en daaronder lege rijen die tóch
 * gevuld zijn — de formules in "Leads" en "Leads marketing" lopen door tot ver onder de
 * laatste campagne en geven daar 0 terug.
 */
function sheetMetLegeFormulerijen(aantalCampagnes: number, aantalLegeRijen: number): string[][] {
  const rijen = [KOP];
  for (let i = 0; i < aantalCampagnes; i += 1) {
    rijen.push(
      rij({
        [NAAM]: `Campagne ${i + 1}`,
        [STARTDATUM]: "2026-01-01",
        [MERK]: "Porsche",
        [LEADS]: "0",
        [LEADS_MARKETING]: "0",
      }),
    );
  }
  for (let i = 0; i < aantalLegeRijen; i += 1) {
    rijen.push(rij({ [LEADS]: "0", [LEADS_MARKETING]: "0" }));
  }
  return rijen;
}

test("kolomletters lopen door na Z", () => {
  assert.equal(kolomLetter(0), "A");
  assert.equal(kolomLetter(5), "F");
  assert.equal(kolomLetter(21), "V");
  assert.equal(kolomLetter(25), "Z");
  assert.equal(kolomLetter(26), "AA");
  assert.equal(kolomLetter(27), "AB");
  assert.equal(kolomLetter(51), "AZ");
  assert.equal(kolomLetter(52), "BA");
});

test("een celadres combineert kolomletter en rijnummer", () => {
  assert.equal(celAdres(NAAM, 41), "A41");
  assert.equal(celAdres(STARTDATUM, 41), "F41");
});

test("een nieuwe campagne komt direct onder de laatste campagne", () => {
  // 39 campagnes op rij 2 t/m 40 → de volgende hoort op rij 41.
  const rijen = sheetMetLegeFormulerijen(39, 962);
  assert.equal(nieuweCampagneRij(rijen, NAAM), 41);
});

test("de doorlopende formules onder de campagnes tellen niet als campagne", () => {
  // Precies dit ging fout: de rijen onder de laatste campagne zijn niet leeg (Leads
  // geeft er 0 terug), dus "de eerste rij zonder inhoud" zou honderden rijen te laag
  // uitkomen. De naamkolom is wat telt.
  const metFormules = sheetMetLegeFormulerijen(3, 500);
  const zonderFormules = sheetMetLegeFormulerijen(3, 0);
  assert.equal(nieuweCampagneRij(metFormules, NAAM), 5);
  assert.equal(nieuweCampagneRij(zonderFormules, NAAM), 5);
});

test("in een sheet met alleen een kopregel begint de eerste campagne op rij 2", () => {
  assert.equal(nieuweCampagneRij([KOP], NAAM), 2);
  assert.equal(nieuweCampagneRij(sheetMetLegeFormulerijen(0, 20), NAAM), 2);
});

test("de campagnenaam belandt in kolom A en de startdatum in kolom F", () => {
  // De regressie: de rij kwam vijf kolommen te ver naar rechts te staan, met de naam in
  // F ("Startdatum") in plaats van in A.
  const rijen = sheetMetLegeFormulerijen(39, 962);
  const doelRij = nieuweCampagneRij(rijen, NAAM);
  assert.equal(celAdres(NAAM, doelRij), "A41");
  assert.equal(celAdres(STARTDATUM, doelRij), "F41");
  assert.equal(celAdres(MERK, doelRij), "L41");
});

test("een rij met alleen formulewaarden is vrij om in te schrijven", () => {
  const rijen = sheetMetLegeFormulerijen(3, 5);
  // Leads en Leads marketing geven we niet mee: die kolommen schrijven we niet.
  assert.deepEqual(bezetteKolommen(rijen, 5, [NAAM, STARTDATUM, MERK]), []);
});

test("een rij waar al iets in staat, geeft de bezette kolommen terug", () => {
  const rijen = sheetMetLegeFormulerijen(3, 5);
  rijen[4] = rij({ [STARTDATUM]: "Audi A2 e-tron", [MERK]: "2026-11-30", [LEADS]: "0" });
  assert.deepEqual(bezetteKolommen(rijen, 5, [NAAM, STARTDATUM, MERK]), ["F", "L"]);
});

test("een campagne wordt op naam gevonden, ongeacht hoofdletters en spaties", () => {
  const rijen = sheetMetLegeFormulerijen(3, 5);
  assert.equal(rijVanCampagne(rijen, NAAM, "Campagne 2"), 3);
  assert.equal(rijVanCampagne(rijen, NAAM, "  campagne 2  "), 3);
  assert.equal(rijVanCampagne(rijen, NAAM, "Campagne 9"), 0);
});

test("een lege naam matcht geen lege rij", () => {
  const rijen = sheetMetLegeFormulerijen(3, 5);
  assert.equal(rijVanCampagne(rijen, NAAM, ""), 0);
});
