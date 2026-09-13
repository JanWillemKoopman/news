import assert from "node:assert/strict";
import { test } from "node:test";
import { eenheidVan } from "./eenheid.ts";
import { formatteer } from "../../components/chat/chartTheme.ts";
import { ADVERTENTIE_STATISTIEKEN, POST_STATISTIEKEN } from "../windsor/velden.ts";

function statistiek(lijst: typeof ADVERTENTIE_STATISTIEKEN, id: string) {
  const s = lijst.find((x) => x.id === id);
  assert.ok(s, `statistiek ${id} bestaat niet`);
  return s;
}

test("een bedrag krijgt hele euro's, een prijs per iets altijd twee decimalen", () => {
  // Dit was de klacht: in dezelfde kolom stond "€ 9,80" naast "€ 10".
  const cpl = eenheidVan(statistiek(ADVERTENTIE_STATISTIEKEN, "cpl"));
  assert.equal(formatteer(9.8, cpl), "€ 9,80");
  assert.equal(formatteer(10, cpl), "€ 10,00");

  const uitgaven = eenheidVan(statistiek(ADVERTENTIE_STATISTIEKEN, "uitgaven"));
  assert.equal(formatteer(9.8, uitgaven), "€ 10");
  assert.equal(formatteer(8950.4, uitgaven), "€ 8.950");
});

test("een prijs per klik van vijf cent blijft vijf cent en wordt geen nul", () => {
  const cpc = eenheidVan(statistiek(ADVERTENTIE_STATISTIEKEN, "cpc"));
  assert.equal(formatteer(0.05, cpc), "€ 0,05");
});

test("percentages hebben altijd één decimaal, zodat een kolom uitlijnt", () => {
  const ctr = eenheidVan(statistiek(ADVERTENTIE_STATISTIEKEN, "ctr"));
  assert.equal(formatteer(3, ctr), "3,0%");
  assert.equal(formatteer(2.84, ctr), "2,8%");
});

test("kijktijd wordt in seconden en minuten getoond, niet als kaal getal", () => {
  const kijktijd = eenheidVan(statistiek(POST_STATISTIEKEN, "gemiddelde_kijktijd"));
  assert.equal(kijktijd, "seconden");
  assert.equal(formatteer(12.4, kijktijd), "12,4 s");
  assert.equal(formatteer(125, kijktijd), "2 m 05 s");
});

test("de gewone euro-eenheid verandert niet — die deelt het kostentabblad en de chat", () => {
  assert.equal(formatteer(9.8, "euro"), "€ 9,80");
  assert.equal(formatteer(10, "euro"), "€ 10");
  assert.equal(formatteer(128400, "euro", true), "€ 128,4k");
});
