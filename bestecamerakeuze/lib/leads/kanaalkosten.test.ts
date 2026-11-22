import assert from "node:assert/strict";
import { test } from "node:test";
import {
  leesBedrag,
  maandAandeel,
  maandenInVenster,
  pasKanaalkostenToe,
} from "@/lib/leads/kanaalkosten";
import { koppelLeads, type LeadInvoer } from "@/lib/leads/koppel";
import { kostenPerLeadTotaal, telTotalen } from "@/lib/leads/samenvatting";

function lead(over: Partial<LeadInvoer> = {}): LeadInvoer {
  return {
    datum: "2026-11-01",
    event: "generate_lead_proefrit",
    bronMedium: "gaspedaal.nl / referral",
    campagne: "(referral)",
    merk: "",
    model: "",
    formulier: "",
    aantal: 1,
    ...over,
  };
}

const VAN = "2026-10-23";
const TOT = "2026-11-21";

test("maandAandeel telt de dagen van de maand die in het venster vallen", () => {
  assert.equal(maandAandeel("2026-10", VAN, TOT), 9 / 31);
  assert.equal(maandAandeel("2026-11", VAN, TOT), 21 / 30);
  assert.equal(maandAandeel("2026-12", VAN, TOT), 0);
  assert.equal(maandAandeel("2026-09", VAN, TOT), 0);
  assert.equal(maandAandeel("2026-02", "2026-01-01", "2026-12-31"), 1);
});

test("maandenInVenster loopt over de jaargrens", () => {
  assert.deepEqual(maandenInVenster(VAN, TOT), ["2026-10", "2026-11"]);
  assert.deepEqual(maandenInVenster("2026-12-20", "2027-01-18"), ["2026-12", "2027-01"]);
});

test("een maandbedrag gaat naar rato over de leads van die bron/medium in die maand", () => {
  const koppeling = koppelLeads(
    [
      lead({ datum: "2026-10-25", aantal: 3 }),
      lead({ datum: "2026-11-02", aantal: 2 }),
      lead({ datum: "2026-11-10", aantal: 2 }),
      lead({ bronMedium: "google / organic", campagne: "(organic)", aantal: 4 }),
    ],
    [],
  );
  const uit = pasKanaalkostenToe(
    koppeling,
    [
      { bronMedium: "gaspedaal.nl / referral", maand: "2026-10", bedrag: 31_000 },
      { bronMedium: "Gaspedaal.nl / referral ", maand: "2026-11", bedrag: 30_000 },
    ],
    VAN,
    TOT,
  );

  // Oktober: 9/31 × 31.000 = 9.000 over 3 leads; november: 21/30 × 30.000 = 21.000 over 4.
  const okt = uit.regels[0];
  assert.equal(okt.platform, "handmatig");
  assert.equal(okt.status, "toegerekend");
  assert.ok(Math.abs((okt.kosten ?? 0) - 9_000) < 1e-6);
  assert.ok(Math.abs((uit.regels[1].kosten ?? 0) - 10_500) < 1e-6);
  assert.ok(Math.abs((uit.regels[2].kosten ?? 0) - 10_500) < 1e-6);
  // Organisch blijft onbetaald en gratis.
  assert.equal(uit.regels[3].platform, null);
  assert.equal(uit.regels[3].kosten, 0);

  assert.ok(Math.abs(uit.uitgavenTotaal - 30_000) < 1e-6);
  assert.ok(Math.abs((uit.uitgavenPerPlatform.handmatig ?? 0) - 30_000) < 1e-6);

  // Geen euro erbij of eraf: wat aan leads hangt is precies wat er in het venster telt.
  const t = telTotalen(uit.regels);
  assert.ok(Math.abs(t.kosten - 30_000) < 1e-6);
  assert.equal(t.betaald, 7);
  assert.equal(t.kostenbronLeads, 7);
  assert.ok(Math.abs((kostenPerLeadTotaal(t, uit.uitgavenTotaal, false) ?? 0) - 30_000 / 7) < 1e-6);

  // De campagnetabel krijgt één regel per bron/medium.
  const rij = uit.campagnes.find((c) => c.platform === "handmatig");
  assert.equal(rij?.campagne, "gaspedaal.nl / referral");
  assert.equal(rij?.leads, 7);
});

test("een bedrag zonder lead telt mee in het totaal en in zonder lead", () => {
  const koppeling = koppelLeads([lead({ bronMedium: "google / organic" })], []);
  const uit = pasKanaalkostenToe(
    koppeling,
    [{ bronMedium: "gaspedaal.nl / referral", maand: "2026-11", bedrag: 3_000 }],
    VAN,
    TOT,
  );
  assert.ok(Math.abs(uit.zonderLead.uitgaven - 2_100) < 1e-6);
  assert.equal(uit.zonderLead.campagnes, 1);
  assert.ok(Math.abs(uit.uitgavenTotaal - 2_100) < 1e-6);
  assert.equal(telTotalen(uit.regels).kosten, 0);
});

test("betaald verkeer houdt zijn platform: Google krijgt het erbij, Bing krijgt bekende kosten", () => {
  const koppeling = koppelLeads(
    [
      lead({ bronMedium: "google / cpc", campagne: "T | Branding VDU", aantal: 2 }),
      lead({ bronMedium: "bing / cpc", campagne: "T | Branding VDU", aantal: 1 }),
    ],
    [{ bron: "google", campagne: "T | Branding VDU", uitgaven: 100, klikken: 1, vertoningen: 1 }],
  );
  const uit = pasKanaalkostenToe(
    koppeling,
    [
      { bronMedium: "google / cpc", maand: "2026-11", bedrag: 300 },
      { bronMedium: "bing / cpc", maand: "2026-11", bedrag: 300 },
    ],
    "2026-11-01",
    "2026-11-30",
  );
  const [google, bing] = uit.regels;
  assert.equal(google.platform, "google");
  assert.equal(google.kosten, 100 + 300);
  assert.equal(bing.platform, "microsoft");
  assert.equal(bing.status, "toegerekend");
  assert.equal(bing.kosten, 300);
  assert.equal(uit.uitgavenTotaal, 700);
  assert.equal(telTotalen(uit.regels).kostenbronLeads, 3);
});

test("zonder bedragen verandert er niets", () => {
  const koppeling = koppelLeads([lead()], []);
  const uit = pasKanaalkostenToe(koppeling, [], VAN, TOT);
  assert.deepEqual(uit.regels, koppeling.regels);
  assert.equal(uit.uitgavenTotaal, koppeling.uitgavenTotaal);
  assert.deepEqual(uit.handmatig, []);
});

test("leesBedrag leest Nederlandse notatie; leeg en nul zijn geen bedrag", () => {
  assert.equal(leesBedrag("20.000"), 20_000);
  assert.equal(leesBedrag("€ 1.234,56"), 1_234.56);
  assert.equal(leesBedrag(20000), 20_000);
  assert.equal(leesBedrag(""), null);
  assert.equal(leesBedrag("0"), null);
  assert.equal(leesBedrag("-5"), "ongeldig");
  assert.equal(leesBedrag("abc"), "ongeldig");
});
