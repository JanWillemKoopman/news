import assert from "node:assert/strict";
import { test } from "node:test";
import { forecastRegel, hoofdcijfers, bouwMaandrapportMail } from "@/lib/marketingAnalyse/mailMaandrapport";
import { leesMaandrapport } from "@/lib/marketingAnalyse/maandrapport";

const x = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];
const bedrijf = (naam: string, punten: string[]) => ({
  naam,
  leads: { waarde: 104, vorige: 39, reeks: { x, waarden: [10, 20, 30, 40, 39, 104] } },
  sessies: { waarde: 24008, vorige: 24379 },
  bereik: { waarde: 1534335, vorige: 1172158 },
  uitgaven: { waarde: 7983.65, vorige: 6739.03 },
  mailPunten: punten,
});

const rapport = leesMaandrapport({
  maand: "2026-10",
  vorigeMaand: "2026-09",
  bedrijven: [bedrijf("Porsche Centrum Brabant", ["Eerste <punt> & meer", "Tweede punt"]), bedrijf("PGZ", [])],
})!;

const invoer = {
  campagneNaam: "Maandrapport Jana",
  versie: 1,
  rapport,
  analyseUrl: "https://dashboard.test/?tab=marketing-analyse&analyse=abc",
  afmeldUrl: "https://dashboard.test/api/marketing-analyse/afmelden?token=t1",
};

test("hoofdcijfers: waarde, verschil en kleur per tegel", () => {
  const c = hoofdcijfers(rapport.bedrijven[0], "september");
  assert.deepEqual(c.map((k) => k.label), ["Online leads", "Websitebezoeken", "Social bereik", "Uitgaven"]);
  assert.equal(c[0].waarde, "104");
  assert.equal(c[0].verschil, "↑ +167%");
  assert.equal(c[1].verschil, "↓ −1,5%");
  assert.equal(c[1].kleur, "#b3312c");
  assert.equal(c[0].kleur, "#17794a");
  // uitgaven hebben geen oordeel
  assert.match(c[3].waarde, /^€\s7\.984$/);
  assert.equal(c[3].kleur, "#6b707a");
});

test("een tegel zonder meting toont de reden in plaats van een cijfer", () => {
  const r = leesMaandrapport({ maand: "2026-10", vorigeMaand: "2026-09", bedrijven: [{ ...bedrijf("PGZ", []), leads: { waarde: null, nietGemeten: "niet gemeten" } }] })!;
  const c = hoofdcijfers(r.bedrijven[0], "september");
  assert.equal(c[0].waarde, "—");
  assert.equal(c[0].verschil, "niet gemeten");
});

test("forecastregel: trend doorgezet naar de volgende maand, geen regel bij te weinig maanden", () => {
  assert.match(forecastRegel(rapport.bedrijven[0], "november") ?? "", /^Forecast november: ± \d+ leads$/);
  const kort = leesMaandrapport({ bedrijven: [{ naam: "A", leads: { waarde: 1, reeks: { x: ["2026-09", "2026-10"], waarden: [1, 2] } } }] })!;
  assert.equal(forecastRegel(kort.bedrijven[0], "november"), null);
});

test("de mail heeft onderwerp, een blok per bedrijf, de punten en de links", () => {
  const m = bouwMaandrapportMail(invoer);
  assert.equal(m.onderwerp, "Maandrapport Jana: oktober 2026");
  assert.match(m.html, /Porsche Centrum Brabant/);
  assert.match(m.html, /PGZ/);
  assert.match(m.html, /Alle cijfers vergeleken met september/);
  assert.match(m.html, /Forecast november/);
  assert.match(m.html, /tab=marketing-analyse&amp;analyse=abc/);
  assert.match(m.html, /Afmelden/);
  assert.match(m.tekst, /PORSCHE CENTRUM BRABANT/);
  assert.match(m.tekst, /- Tweede punt/);
  assert.match(m.tekst, /afmelden\?token=t1/);
});

test("tekst uit het rapport komt onschadelijk in de HTML", () => {
  const m = bouwMaandrapportMail(invoer);
  assert.match(m.html, /Eerste &lt;punt&gt; &amp; meer/);
  assert.doesNotMatch(m.html, /<punt>/);
});

test("een nieuwe versie staat in het onderwerp", () => {
  assert.equal(bouwMaandrapportMail({ ...invoer, versie: 3 }).onderwerp, "Maandrapport Jana: oktober 2026 (v3)");
});

test("mailPunten: hoogstens zeven, lege weggelaten, ingekort", () => {
  const r = leesMaandrapport({ bedrijven: [{ naam: "A", mailPunten: ["a", " ", "b", "c", "d", "e", "f", "g", "h", 5] }] })!;
  assert.deepEqual(r.bedrijven[0].mailPunten, ["a", "b", "c", "d", "e", "f", "g"]);
  const lang = leesMaandrapport({ bedrijven: [{ naam: "A", mailPunten: ["x".repeat(900)] }] })!;
  assert.equal(lang.bedrijven[0].mailPunten?.[0].length, 600);
});
