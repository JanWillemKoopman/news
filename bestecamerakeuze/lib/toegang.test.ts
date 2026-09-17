import assert from "node:assert/strict";
import { test } from "node:test";
import { bepaalToegang, veiligVerder } from "./toegang.ts";

function besluit(pad: string, ingelogd: boolean, zoek = "") {
  return bepaalToegang({ pad, zoek, ingelogd });
}

test("zonder sessie gaat elke pagina naar het inlogscherm", () => {
  assert.equal(besluit("/", false).soort, "naar-login");
  assert.equal(besluit("/wat-dan-ook", false).soort, "naar-login");
});

test("het open tabblad blijft bewaard om na het inloggen naar terug te keren", () => {
  assert.deepEqual(besluit("/", false, "?tab=kosten"), {
    soort: "naar-login",
    verder: "/?tab=kosten",
  });
  // Het dashboard zelf is de standaardbestemming; daar valt niets te onthouden.
  assert.deepEqual(besluit("/", false), { soort: "naar-login", verder: null });
});

test("een API-route zonder sessie krijgt een weigering, geen omleiding", () => {
  assert.equal(besluit("/api/kosten", false).soort, "weiger");
  assert.equal(besluit("/api/gebruikers/abc", false).soort, "weiger");
});

test("de cron-routes blijven bereikbaar zonder sessie", () => {
  assert.equal(besluit("/api/sync", false).soort, "door");
  assert.equal(besluit("/api/windsor-sync", false).soort, "door");
});

test("de auth-routes blijven bereikbaar zonder sessie", () => {
  assert.equal(besluit("/auth/callback", false).soort, "door");
  assert.equal(besluit("/auth/signout", false).soort, "door");
});

test("het inlogscherm is zonder sessie bereikbaar en met sessie overbodig", () => {
  assert.equal(besluit("/login", false).soort, "door");
  assert.equal(besluit("/login", true).soort, "naar-dashboard");
});

test("met sessie mag alles door", () => {
  assert.equal(besluit("/", true).soort, "door");
  assert.equal(besluit("/api/kosten", true).soort, "door");
});

test("veiligVerder laat alleen een pad binnen deze app door", () => {
  assert.equal(veiligVerder("/?tab=scores"), "/?tab=scores");
  assert.equal(veiligVerder(null), "/");
  assert.equal(veiligVerder(""), "/");
  assert.equal(veiligVerder("//kwaadaardig.nl"), "/");
  assert.equal(veiligVerder("/\\kwaadaardig.nl"), "/");
  assert.equal(veiligVerder("https://kwaadaardig.nl"), "/");
});
