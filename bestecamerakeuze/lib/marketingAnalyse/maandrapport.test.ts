import assert from "node:assert/strict";
import { test } from "node:test";
import {
  budgetAandeel,
  campagnesTotaal,
  kanaalAandelen,
  leesMaandrapport,
  maandNaam,
  maandrapportForecast,
  sorteerCampagnes,
  tijdelijkJaarbudget,
  trendPunten,
  volgendeMaand,
} from "@/lib/marketingAnalyse/maandrapport";
import { normaliseerResultaat } from "@/lib/marketingAnalyse/rekenen";
import type { MrCampagne } from "@/lib/marketingAnalyse/types";

test("forecast: een rechte lijn wordt precies doorgetrokken, zonder marge", () => {
  const f = maandrapportForecast([100, 110, 120, 130, 140, 150]);
  assert.deepEqual(f, { verwachting: 160, marge: 0, gebruikt: 6 });
});

test("forecast: alleen de laatste zes maanden tellen", () => {
  // Eerst een dip, daarna een rechte stijging: de dip ligt buiten het venster.
  const f = maandrapportForecast([500, 50, 100, 110, 120, 130, 140, 150]);
  assert.equal(f?.verwachting, 160);
  assert.equal(f?.gebruikt, 6);
});

test("forecast: een maand zonder meting blijft op zijn plaats en telt niet mee", () => {
  const f = maandrapportForecast([100, null, 120, 130, 140]);
  assert.equal(f?.gebruikt, 4);
  assert.equal(f?.verwachting, 150);
});

test("forecast: minder dan drie maanden of een dalende trend onder nul", () => {
  assert.equal(maandrapportForecast([10, 20]), null);
  assert.equal(maandrapportForecast([null, null, 5]), null);
  assert.equal(maandrapportForecast([30, 20, 10])?.verwachting, 0);
});

test("forecast: de marge is de spreiding rond de lijn", () => {
  const f = maandrapportForecast([100, 120, 100, 120, 100, 120]);
  assert.ok(f && f.marge > 0);
});

test("trendpunten: de stippellijn sluit aan op de laatste maand en loopt naar de volgende", () => {
  const f = maandrapportForecast([10, 20, 30]);
  const p = trendPunten(["2026-09", "2026-10", "2026-11"], [10, 20, 30], f);
  assert.equal(p.length, 4);
  assert.equal(p[2].forecast, 30);
  assert.deepEqual(p[3], { x: "2026-12", werkelijk: null, forecast: 40 });
  assert.equal(p[0].forecast, null);
});

test("maanden: naam en volgende maand, ook over de jaargrens", () => {
  assert.equal(maandNaam("2026-10"), "oktober 2026");
  assert.equal(volgendeMaand("2026-10"), "2026-11");
  assert.equal(volgendeMaand("2026-12"), "2027-01");
  assert.equal(maandNaam("onzin"), "onzin");
});

test("kanaalaandelen: percentages, verschil in procentpunten, hoog naar laag", () => {
  const a = kanaalAandelen([
    { kanaal: "Direct", waarde: 300, vorige: 400 },
    { kanaal: "Organisch zoeken", waarde: 700, vorige: 600 },
    { kanaal: "Meta Ads", waarde: 0, vorige: 100 },
  ]);
  assert.deepEqual(a.map((k) => k.kanaal), ["Organisch zoeken", "Direct"]);
  assert.equal(a[0].aandeel, 70);
  assert.ok(Math.abs((a[0].verschilPunten ?? 0) - (70 - (600 / 1100) * 100)) < 1e-9);
});

test("kanaalaandelen: zonder vorige maand geen verschil", () => {
  const a = kanaalAandelen([{ kanaal: "Direct", waarde: 10 }]);
  assert.equal(a[0].verschilPunten, null);
});

const camp = (campagne: string, u: number | null, l: number | null, ul = 0, ll = 0): MrCampagne => ({
  campagne,
  platform: "Meta Ads",
  uitgaven: { waarde: u, vorige: ul },
  leads: { waarde: l, vorige: ll },
  cpl: { waarde: null, vorige: null },
});

test("campagnes: hoogste uitgaven bovenaan, zonder bedrag onderaan", () => {
  const s = sorteerCampagnes([camp("a", 50, 1), camp("b", 900, 3), camp("c", null, null), camp("d", 400, 0)]);
  assert.deepEqual(s.map((c) => c.campagne), ["b", "d", "a", "c"]);
});

test("campagnes: totaal telt uitgaven en leads op en deelt ze, ook voor de vorige maand", () => {
  const t = campagnesTotaal([camp("a", 100, 4, 80, 2), camp("b", 300, 6, 120, 2)]);
  assert.equal(t.uitgaven.waarde, 400);
  assert.equal(t.leads.waarde, 10);
  assert.equal(t.cpl.waarde, 40);
  assert.equal(t.cpl.vorige, 50);
});

test("campagnes: zonder leads geen kosten per lead", () => {
  assert.equal(campagnesTotaal([camp("a", 100, 0)]).cpl.waarde, null);
  assert.equal(campagnesTotaal([camp("a", null, null)]).uitgaven.waarde, null);
});

test("jaarbudget: uitgaven sinds 1 januari plus 22%, dus de balk staat steeds op ruim 82%", () => {
  assert.equal(tijdelijkJaarbudget(10000), 12200);
  assert.equal(tijdelijkJaarbudget(null), null);
  assert.ok(Math.abs((budgetAandeel(10000, 12200) ?? 0) - 81.967) < 0.001);
  assert.equal(budgetAandeel(10000, null), null);
  assert.equal(budgetAandeel(10000, 0), null);
});

test("leesMaandrapport: onzin valt weg, een geldig bedrijf blijft staan", () => {
  assert.equal(leesMaandrapport(null), undefined);
  assert.equal(leesMaandrapport({ bedrijven: [{ geen: "naam" }] }), undefined);
  const r = leesMaandrapport({
    maand: "2026-10",
    vorigeMaand: "2026-09",
    bedrijven: [
      {
        naam: "PGZ",
        leads: { waarde: 12, vorige: "x", uitsplitsing: [{ label: "Proefrit", waarde: 5 }, { geen: 1 }] },
        topContent: { kanaal: "Instagram", titel: "t", afbeelding: "javascript:alert(1)", metriek: { label: "ER", waarde: 3, eenheid: "procent" } },
        campagnes: [{ campagne: "A", uitgaven: { waarde: 5 } }, { platform: "x" }],
      },
    ],
  });
  assert.ok(r);
  assert.equal(r.bedrijven[0].leads.vorige, null);
  assert.equal(r.bedrijven[0].leads.uitsplitsing?.length, 1);
  assert.equal(r.bedrijven[0].topContent?.afbeelding, null);
  assert.equal(r.bedrijven[0].campagnes.length, 1);
});

test("leesMaandrapport: alleen een data-URL of https-adres is een afbeelding", () => {
  const maak = (afbeelding: string) =>
    leesMaandrapport({ bedrijven: [{ naam: "PGZ", topContent: { kanaal: "Instagram", titel: "t", afbeelding } }] })?.bedrijven[0].topContent
      ?.afbeelding;
  assert.equal(maak("data:image/jpeg;base64,AAAA"), "data:image/jpeg;base64,AAAA");
  assert.equal(maak("https://cdn.example.com/a.jpg"), "https://cdn.example.com/a.jpg");
  assert.equal(maak("http://cdn.example.com/a.jpg"), null);
  assert.equal(maak("data:image/svg+xml;base64,AAAA"), null);
});

test("normaliseerResultaat: formaat 4 houdt het maandrapport, andere formaten niet", () => {
  const bedrijven = [{ naam: "PGZ", leads: { waarde: 1 } }];
  const vier = normaliseerResultaat({ formaat: 4, maandrapport: { maand: "2026-10", bedrijven } });
  assert.equal(vier.formaat, 4);
  assert.equal(vier.maandrapport?.bedrijven[0].naam, "PGZ");
  const drie = normaliseerResultaat({ formaat: 3, maandrapport: { bedrijven } });
  assert.equal(drie.maandrapport, undefined);
});
