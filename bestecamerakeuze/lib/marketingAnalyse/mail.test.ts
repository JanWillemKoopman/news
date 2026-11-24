import assert from "node:assert/strict";
import { test } from "node:test";
import { bouwMail, leesEmail, ontsnap } from "@/lib/marketingAnalyse/mail";

test("e-mailadressen opschonen en controleren", () => {
  assert.equal(leesEmail("  Collega@Udenhout.nl "), "collega@udenhout.nl");
  assert.equal(leesEmail("marketing.team@gmail.com"), "marketing.team@gmail.com");
  assert.equal(leesEmail("geen-adres"), null);
  assert.equal(leesEmail("a@b"), null);
  assert.equal(leesEmail("twee@a.nl, drie@b.nl"), null);
  assert.equal(leesEmail("<x@y.nl>"), null);
  assert.equal(leesEmail(42), null);
});

test("HTML-tekens worden onschadelijk gemaakt", () => {
  assert.equal(ontsnap(`<script>"x" & 'y'</script>`), "&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;");
});

const invoer = {
  campagneNaam: "Audi A2",
  bedrijf: "Van den Udenhout",
  versie: 2,
  label: "tussentijds" as const,
  geanalyseerdOp: "2026-11-25T08:00:00Z",
  kop: "Op schema, e-mail levert de meeste leads <b>",
  regels: ["Regel 1", "Regel 2", "", "Regel 3", "Regel 4", "Regel 5", "Regel 6"],
  doel: { status: "achter" as const, toelichting: "14 van 20" },
  analyseUrl: "https://dashboard.test/?tab=marketing-analyse&analyse=abc",
  afmeldUrl: "https://dashboard.test/api/marketing-analyse/afmelden?token=t1",
};

test("de mail heeft onderwerp, regels, doel en links", () => {
  const m = bouwMail(invoer);
  assert.equal(m.onderwerp, "Nieuwe marketing analyse: Audi A2 (v2, tussentijdse evaluatie)");
  assert.match(m.tekst, /- Regel 5/);
  assert.doesNotMatch(m.tekst, /Regel 6/);
  assert.match(m.tekst, /Doel: Achter op schema — 14 van 20/);
  assert.match(m.tekst, /afmelden\?token=t1/);
  assert.match(m.html, /tab=marketing-analyse&amp;analyse=abc/);
  assert.match(m.html, /&lt;b&gt;/);
  assert.doesNotMatch(m.html, /<b>/);
  assert.match(m.html, /25 november 2026/);
});

test("zonder doel geen doelregel", () => {
  const m = bouwMail({ ...invoer, doel: null, label: "eind" });
  assert.doesNotMatch(m.tekst, /Doel:/);
  assert.match(m.onderwerp, /eindevaluatie/);
});
