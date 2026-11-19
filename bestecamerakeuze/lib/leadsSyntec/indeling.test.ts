import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GEEN_KANAALGROEP,
  OVERIGE_MERKEN,
  ONBEKEND,
  deelMerkIn,
  herkomstVan,
  kanaalgroepLabel,
  modelFamilie,
} from "@/lib/leadsSyntec/indeling";

test("internet is alleen kanaalgroep Internet; de rest en leeg is offline", () => {
  assert.equal(herkomstVan("Internet"), "internet");
  assert.equal(herkomstVan(" Internet "), "internet");
  for (const groep of ["Showroom", "Acquisitie", "Mail", "Telefoon", ""]) {
    assert.equal(herkomstVan(groep), "offline", groep);
  }
  assert.equal(kanaalgroepLabel(""), GEEN_KANAALGROEP);
  assert.equal(kanaalgroepLabel("Mail"), "Mail");
});

test("merk: eigen merken, overige merken en opvulwaarden", () => {
  assert.deepEqual(deelMerkIn("Škoda"), { merk: "Škoda", detail: "Škoda" });
  assert.equal(deelMerkIn("Volkswagen Bedrijfswagens").merk, "Volkswagen Bedrijfswagens");
  assert.equal(deelMerkIn("?Volkswagen").merk, "Volkswagen");
  assert.equal(deelMerkIn("CUPRA").merk, "CUPRA");
  assert.deepEqual(deelMerkIn("FORD"), { merk: OVERIGE_MERKEN, detail: "FORD" });
  for (const leeg of ["", "  ", "Z", "Y", "ZZZ", "P", "Onbekend"]) {
    assert.equal(deelMerkIn(leeg).merk, ONBEKEND, JSON.stringify(leeg));
  }
});

test("model: schrijfwijzen van hetzelfde model vallen samen", () => {
  const vw = (m: string) => modelFamilie("Volkswagen", m);
  for (const m of ["POLO", "Polo (6) GP", "VOLKSWAGEN POLO", "Polo (5)", "POLO GTI"]) assert.equal(vw(m), "Polo", m);
  for (const m of ["ID. Polo (1)", "ID. Polo", "ID.Polo"]) assert.equal(vw(m), "ID. Polo", m);
  for (const m of ["ID.7", "ID.7 Tourer (1)"]) assert.equal(vw(m), "ID.7", m);
  for (const m of ["Golf Variant (8) GP", "GOLF SPORTSVAN", "e-Golf 36kWh / 136pk"]) assert.equal(vw(m), "Golf", m);
  for (const m of ["up!", "e-up! (2) GP", "up"]) assert.equal(vw(m), "up!", m);
  assert.equal(vw("T-ROC (1)"), "T-Roc");
  assert.equal(vw("TIGUAN"), "Tiguan");
  assert.equal(vw("ID. Cross (1)"), "ID. Cross");
});

test("model: Audi, Škoda, SEAT, CUPRA en Bedrijfswagens", () => {
  assert.equal(modelFamilie("Audi", "Q4 Sportback e-tron (A1)"), "Q4 e-tron");
  assert.equal(modelFamilie("Audi", "A6 Avant e-tron"), "A6 e-tron");
  assert.equal(modelFamilie("Audi", "A6 AVANT"), "A6");
  assert.equal(modelFamilie("Audi", "Q8 e-tron Sportback"), "Q8 e-tron");
  assert.equal(modelFamilie("Audi", "Q8 (C2)"), "Q8");
  assert.equal(modelFamilie("Audi", "RS5"), "RS 5");
  assert.equal(modelFamilie("Audi", "RS e-tron GT"), "e-tron GT");
  assert.equal(modelFamilie("Audi", "AUDI Q3"), "Q3");
  assert.equal(modelFamilie("Škoda", "Enyaq coup? iv (1)"), "Enyaq");
  assert.equal(modelFamilie("Škoda", "Octavia Combi (4) FL"), "Octavia");
  assert.equal(modelFamilie("SEAT", "SEAT LEON SP E-HYBRID150"), "Leon");
  assert.equal(modelFamilie("CUPRA", "FORMENTOR VZ E-HYBRID"), "Formentor");
  assert.equal(modelFamilie("Volkswagen Bedrijfswagens", "ID. Buzz Cargo"), "ID. Buzz Cargo");
  assert.equal(modelFamilie("Volkswagen Bedrijfswagens", "ID. Buzz(grijs)"), "ID. Buzz");
  assert.equal(modelFamilie("Volkswagen Bedrijfswagens", "e-Transporter Bestelwagen (7)"), "Transporter");
});

test("model: leeg of alleen een merknaam is onbekend; onbekende namen blijven leesbaar", () => {
  assert.equal(modelFamilie("Škoda", ""), ONBEKEND);
  assert.equal(modelFamilie("Škoda", "Skoda"), ONBEKEND);
  assert.equal(modelFamilie("Volkswagen Bedrijfswagens", "Volkswagen"), ONBEKEND);
  assert.equal(modelFamilie("Volkswagen", "CORRADO"), "Corrado");
  assert.equal(modelFamilie("Škoda", "ASTRA STATION WAGON; H Z16XEP"), "Astra Station Wagon");
  // Bij een merk dat Udenhout niet verkoopt blijft het model zoals het er staat.
  assert.equal(modelFamilie(OVERIGE_MERKEN, "POLO"), "POLO");
});
