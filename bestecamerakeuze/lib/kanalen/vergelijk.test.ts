import assert from "node:assert/strict";
import { test } from "node:test";
import { verschilVan, verschilTekst } from "./vergelijk.ts";
import { vorigePeriode, dagenIn } from "./periode.ts";
import { waardeVan } from "./kubus.ts";
import { ADVERTENTIE_STATISTIEKEN } from "../windsor/velden.ts";

function statistiek(id: string) {
  const s = ADVERTENTIE_STATISTIEKEN.find((x) => x.id === id);
  assert.ok(s, `statistiek ${id} bestaat niet`);
  return s;
}

test("de vorige periode is even lang en eindigt de dag ervoor", () => {
  const nu = { van: "2026-08-15", tot: "2026-09-13" };
  const toen = vorigePeriode(nu);
  assert.deepEqual(toen, { van: "2026-07-16", tot: "2026-08-14" });
  assert.equal(dagenIn(toen), dagenIn(nu));
});

test("een schrikkeljaar verandert daar niets aan", () => {
  // Maart telt 31 dagen; de 31 dagen ervoor eindigen op 29 februari (2028 is een
  // schrikkeljaar) en beginnen dus op 30 januari, niet op 31 januari.
  const nu = { van: "2028-03-01", tot: "2028-03-31" };
  const toen = vorigePeriode(nu);
  assert.deepEqual(toen, { van: "2028-01-30", tot: "2028-02-29" });
  assert.equal(dagenIn(toen), 31);
});

test("meer leads is gunstig, minder is dat niet", () => {
  const omhoog = verschilVan(statistiek("leads"), 120, 100);
  assert.equal(omhoog.relatief, 0.2);
  assert.equal(omhoog.gunstig, true);

  const omlaag = verschilVan(statistiek("leads"), 80, 100);
  assert.equal(omlaag.gunstig, false);
});

test("bij kosten per lead is een dáling het goede nieuws", () => {
  // De valkuil die dit afvangt: kleuren op "hoger is groen" maakt van een duurdere lead
  // een succes. Let op dat de afgeleide uit de sommen komt, niet uit een gemiddelde.
  const cpl = statistiek("cpl");
  const goedkoper = verschilVan(
    cpl,
    waardeVan(cpl, { uitgaven: 800, leads: 100 }),
    waardeVan(cpl, { uitgaven: 1000, leads: 100 }),
  );
  assert.equal(goedkoper.nu, 8);
  assert.equal(goedkoper.toen, 10);
  assert.equal(goedkoper.gunstig, true);
});

test("uitgaven krijgen geen oordeel", () => {
  // Een budget dat stijgt is niet goed of fout; dat hangt af van wat het opleverde.
  const meer = verschilVan(statistiek("uitgaven"), 1200, 1000);
  assert.equal(meer.relatief, 0.2);
  assert.equal(meer.gunstig, null);
});

test("van nul naar iets is geen oneindig percentage", () => {
  const uitNiets = verschilVan(statistiek("leads"), 40, 0);
  assert.equal(uitNiets.relatief, null);
  assert.equal(verschilTekst(uitNiets), "nieuw t.o.v. vorige periode");
});

test("zonder vorige periode is er geen verschil om te tonen", () => {
  const geen = verschilVan(statistiek("klikken"), 40, null);
  assert.equal(geen.toen, null);
  assert.equal(verschilTekst(geen), null);
});

test("een verveelvoudiging leest als een factor, niet als een percentage", () => {
  const explosie = verschilVan(statistiek("klikken"), 4300, 100);
  assert.equal(verschilTekst(explosie), "+42× t.o.v. vorige periode");
});
