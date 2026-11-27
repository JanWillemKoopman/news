import assert from "node:assert/strict";
import { test } from "node:test";
import { kanaalVan, reeksKleuren } from "./kanaalKleur.ts";

const PALET = ["blauw", "oranje", "teal", "rood", "paars", "oker"];

test("kanaalVan herkent de namen zoals de analyses ze schrijven", () => {
  assert.equal(kanaalVan("Meta Ads (facebook / paid)"), "meta");
  assert.equal(kanaalVan("Google Ads (Demand Gen)"), "google");
  assert.equal(kanaalVan("LinkedIn Ads"), "linkedin");
  assert.equal(kanaalVan("E-mail"), "email");
  assert.equal(kanaalVan("Organisch zoeken"), "zoeken");
  assert.equal(kanaalVan("Organische social"), "social");
  assert.equal(kanaalVan("Verwijzingen en overig"), "overig");
  assert.equal(kanaalVan("Proefritten"), null);
});

test("een kanaal heeft overal dezelfde kleur, ook alleen", () => {
  assert.deepEqual(reeksKleuren(["Meta Ads", "Google Ads"], PALET, "grijs", "inkt"), ["blauw", "oranje"]);
  assert.deepEqual(reeksKleuren(["Google Ads"], PALET, "grijs", "inkt"), ["oranje"]);
  assert.deepEqual(reeksKleuren(["Meta Ads", "Google Ads", "E-mail", "Overig"], PALET, "grijs"), ["blauw", "oranje", "teal", "grijs"]);
});

test("een reeks die geen kanaal is krijgt nooit een kanaalkleur", () => {
  assert.deepEqual(reeksKleuren(["Proefritten"], PALET, "grijs", "inkt"), ["inkt"]);
  assert.deepEqual(reeksKleuren(["Cumulatief", "Doel"], PALET, "grijs", "inkt"), ["inkt", "grijs"]);
});

test("twee keer de contextkleur of een mengsel: de gewone volgorde", () => {
  assert.deepEqual(reeksKleuren(["Direct", "Overig"], PALET, "grijs", "inkt"), ["blauw", "oranje"]);
  assert.deepEqual(reeksKleuren(["Meta Ads", "Proefritten"], PALET, "grijs", "inkt"), ["blauw", "oranje"]);
});
