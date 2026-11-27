import assert from "node:assert/strict";
import { test } from "node:test";
import {
  filterOpOnline,
  isCampagneAnalyse,
  samenvatting,
  telOnline,
  tijdVoortgang,
} from "./campagneAnalyseOverzicht.ts";
import { STANDAARD_OPZET_ID } from "./marketingAnalyse/types.ts";

const VANDAAG = "2026-11-27";

function c(extra: Record<string, unknown> = {}) {
  return {
    opzetId: STANDAARD_OPZET_ID,
    bedrijven: ["Van den Udenhout"],
    budget: null as number | null,
    doel: null as string | null,
    merk: null as string | null,
    modellen: [] as string[],
    startdatum: null as string | null,
    einddatum: null as string | null,
    laatsteAnalyse: null as { kerncijfers: Record<string, number | null> } | null,
    ...extra,
  };
}

test("isCampagneAnalyse: alleen opzetten met het formulier campagne; zonder bekende opzet telt de standaard", () => {
  const opzetten = new Map([
    ["a", { formulier: "campagne" }],
    ["b", { formulier: "rapportage" }],
  ]);
  assert.equal(isCampagneAnalyse({ opzetId: "a" }, opzetten), true);
  assert.equal(isCampagneAnalyse({ opzetId: "b" }, opzetten), false);
  assert.equal(isCampagneAnalyse({ opzetId: STANDAARD_OPZET_ID }, new Map()), true);
  assert.equal(isCampagneAnalyse({ opzetId: "onbekend" }, new Map()), false);
});

test("filterOpOnline: online = vandaag binnen de looptijd, offline = de rest", () => {
  const lopend = c({ startdatum: "2026-10-01", einddatum: "2026-12-31" });
  const afgelopen = c({ startdatum: "2026-01-01", einddatum: "2026-02-01" });
  const komend = c({ startdatum: "2026-12-07", einddatum: "2027-01-31" });
  const alle = [lopend, afgelopen, komend];
  assert.deepEqual(filterOpOnline(alle, null, VANDAAG), alle);
  assert.deepEqual(filterOpOnline(alle, "online", VANDAAG), [lopend]);
  assert.deepEqual(filterOpOnline(alle, "offline", VANDAAG), [afgelopen, komend]);
  assert.deepEqual(telOnline(alle, VANDAAG), { online: 1, offline: 2 });
});

test("tijdVoortgang: dag x van y en het verstreken deel", () => {
  const v = tijdVoortgang("2026-11-01", "2026-11-30", "2026-11-15");
  assert.ok(v);
  assert.equal(v.dagen, 30);
  assert.equal(v.dag, 15);
  assert.equal(Math.round(v.pct), 50);
  // Nog niet begonnen, en zonder datums.
  assert.equal(tijdVoortgang("2026-12-01", "2026-12-31", VANDAAG)?.dag, 0);
  assert.equal(tijdVoortgang(null, "2026-12-31", VANDAAG), null);
});

test("samenvatting telt kosten, budget, bezoekers en leads op over de campagnes met een analyse", () => {
  const a = c({
    budget: 2100,
    startdatum: "2026-09-28",
    einddatum: "2026-12-07",
    laatsteAnalyse: { kerncijfers: { kosten: 1783, sessies: 2366, leadsGa4: 1 } },
  });
  const b = c({
    budget: 3150,
    startdatum: "2026-09-18",
    einddatum: "2026-12-31",
    laatsteAnalyse: { kerncijfers: { kosten: 2017, sessies: 4306, leadsGa4: 20 } },
  });
  // Nog niet geanalyseerd: telt mee als campagne, niet in de sommen (ook zijn budget niet).
  const nog = c({ budget: 1000, startdatum: "2026-11-11", einddatum: "2026-12-31" });
  const s = samenvatting([a, b, nog], VANDAAG);
  assert.equal(s.aantal, 3);
  assert.equal(s.online, 3);
  assert.equal(s.kosten, 3800);
  assert.equal(s.budget, 5250);
  assert.equal(Math.round(s.besteedPct ?? 0), 72);
  assert.equal(s.bezoekers, 6672);
  assert.equal(s.leads, 21);
});

test("samenvatting zonder enige analyse geeft null in plaats van nul", () => {
  const s = samenvatting([c({ budget: 500 })], VANDAAG);
  assert.equal(s.kosten, null);
  assert.equal(s.budget, null);
  assert.equal(s.besteedPct, null);
  assert.equal(s.bezoekers, null);
  assert.equal(s.leads, null);
});
