import assert from "node:assert/strict";
import { test } from "node:test";
import { campagneSleutel, heeftKostenbron, isKoppelbareCampagne, kanaalVan } from "@/lib/leads/kanaal";

test("betaald verkeer krijgt het platform waar de kosten te vinden zijn", () => {
  assert.deepEqual(kanaalVan("google / cpc"), { kanaal: "Google Ads", platform: "google" });
  assert.deepEqual(kanaalVan("facebook / paid"), { kanaal: "Meta Ads", platform: "meta" });
  assert.deepEqual(kanaalVan("ig / paid"), { kanaal: "Meta Ads", platform: "meta" });
});

test("Bing is betaald maar heeft geen kostenbron; LinkedIn wel", () => {
  const bing = kanaalVan("bing / cpc");
  const linkedin = kanaalVan("linkedin / paid");
  assert.equal(bing.platform, "microsoft");
  assert.equal(linkedin.platform, "linkedin");
  assert.equal(heeftKostenbron(bing.platform), false);
  assert.equal(heeftKostenbron(linkedin.platform), true);
  assert.equal(heeftKostenbron("google"), true);
  assert.equal(heeftKostenbron("meta"), true);
  assert.equal(heeftKostenbron(null), false);
});

test("onbetaald verkeer heeft geen platform", () => {
  const cases: [string, string][] = [
    ["google / organic", "Organisch zoeken"],
    ["bing / organic", "Organisch zoeken"],
    ["gmb / organic", "Google Bedrijfsprofiel"],
    ["(direct) / (none)", "Direct"],
    ["Nieuwsbrief / email", "E-mail"],
    ["gaspedaal.nl / referral", "Verwijzing"],
    ["l.facebook.com / referral", "Social (organisch)"],
    ["ig / social", "Social (organisch)"],
    ["claude.ai / ai-assistant", "AI-assistent"],
    ["chatgpt.com / organic", "AI-assistent"],
  ];
  for (const [bronMedium, kanaal] of cases) {
    assert.deepEqual(kanaalVan(bronMedium), { kanaal, platform: null }, bronMedium);
  }
});

test("een facebook-verwijzing is geen Meta Ads", () => {
  // Het medium bepaalt of het betaald is, niet de bron: m.facebook.com / referral is een
  // bezoeker die op een gewone link klikte.
  assert.equal(kanaalVan("m.facebook.com / referral").platform, null);
  assert.equal(kanaalVan("facebook.com / referral").platform, null);
});

test("onbekende of onleesbare bron/medium is 'Onbekend', ook (data not available)", () => {
  for (const waarde of ["", "(not set)", "(not set) / (not set)", "(data not available)"]) {
    assert.deepEqual(kanaalVan(waarde), { kanaal: "Onbekend", platform: null }, waarde);
  }
});

test("de schrijfwijze van een medium maakt niet uit", () => {
  assert.equal(kanaalVan("Google / CPC").platform, "google");
  assert.equal(kanaalVan("facebook / paid_social").platform, "meta");
  assert.equal(kanaalVan("google / paid-search").platform, "google");
});

test("campagneSleutel negeert hoofdletters, spaties en soort streepje", () => {
  assert.equal(
    campagneSleutel("4. Vacatures - Service Functies – Leads"),
    campagneSleutel("4. vacatures - service functies - leads"),
  );
  assert.equal(campagneSleutel("  T |  Branding   VDU "), campagneSleutel("t | branding vdu"));
});

test("campagnes die alleen in een echt woord verschillen blijven twee campagnes", () => {
  assert.notEqual(
    campagneSleutel("T | Sales - Modellen - Skoda - NEW"),
    campagneSleutel("T | Sales - Modellen - Skoda - Push"),
  );
});

test("GA4-vulwaarden zijn geen campagne om aan te koppelen", () => {
  for (const waarde of ["", "(not set)", "(direct)", "(organic)", "(referral)", "(cross-network)"]) {
    assert.equal(isKoppelbareCampagne(waarde), false, waarde);
  }
  assert.equal(isKoppelbareCampagne("T | Branding VDU"), true);
  // Haakjes in een echte naam zijn geen vulwaarde.
  assert.equal(isKoppelbareCampagne("T | Sales - Private (groei)lease - Algemeen"), true);
});
