import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GEEN_KANAALGROEP,
  OVERIGE_MERKEN,
  ONBEKEND,
  deelMerkIn,
  herkomstVan,
  kanaalgroepLabel,
} from "@/lib/leadsSyntec/indeling";

test("online is alleen kanaalgroep Internet; de rest en leeg is offline", () => {
  assert.equal(herkomstVan("Internet"), "online");
  assert.equal(herkomstVan(" Internet "), "online");
  for (const groep of ["Showroom", "Acquisitie", "Mail", "Telefoon", ""]) {
    assert.equal(herkomstVan(groep), "offline", groep);
  }
  assert.equal(kanaalgroepLabel(""), GEEN_KANAALGROEP);
  // In Syntec heet de kanaalgroep "Internet"; op het scherm heet hij Online.
  assert.equal(kanaalgroepLabel("Internet"), "Online");
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
