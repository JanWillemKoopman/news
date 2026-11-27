import assert from "node:assert/strict";
import { test } from "node:test";
import { aandeel, kostenPer, leesUitsplitsing, prognoseBijHuidigTempo } from "./uitsplitsing.ts";
import type { MaKerncijfers } from "./types.ts";

/** De cijfers van Audi A2 (versie 5), met de uitsplitsing zoals de analyse hem hoort mee te geven. */
function audi(extra: Partial<MaKerncijfers> = {}): MaKerncijfers {
  return {
    kosten: 2016.82,
    vertoningenAds: 531896,
    klikken: 12926,
    sessies: 4306,
    leadEvents: 27,
    leadsGa4: 20,
    leadsInternet: 14,
    ordersSyntec: 26,
    uitsplitsing: {
      platforms: [
        { naam: "Meta Ads", kosten: 1014.87, vertoningen: 191674, klikken: 6134 },
        { naam: "Google Ads", kosten: 1001.95, vertoningen: 340222, klikken: 6792 },
      ],
      sessies: [
        { naam: "Meta Ads", aantal: 3053 },
        { naam: "Direct en e-mail", aantal: 407 },
        { naam: "Overig", aantal: 846 },
      ],
      leadsGa4: [
        { naam: "Proefrit", detail: "generate_lead_proefrit", aantal: 20, telt: true },
        { naam: "Offerte", detail: "generate_lead_offerte", aantal: 3, telt: false },
        { naam: "Overig", aantal: 4, telt: false },
      ],
      leadsInternet: [
        { naam: "Offerte", aantal: 6 },
        { naam: "Private lease", aantal: 6 },
        { naam: "Proefrit", aantal: 1 },
        { naam: "Inruil", aantal: 1 },
      ],
      orders: [
        { naam: "Koop Particulier (BM)", aantal: 10 },
        { naam: "Private Groeilease", aantal: 8 },
        { naam: "Dealer Lease", aantal: 2 },
        { naam: "Demo", aantal: 2 },
        { naam: "Koop Zakelijk (BM)", aantal: 2 },
        { naam: "Lease", aantal: 2 },
      ],
    },
    ...extra,
  };
}

test("een uitsplitsing die optelt tot het cijfer wordt getoond, grootste eerst", () => {
  const u = leesUitsplitsing(audi());
  assert.deepEqual(u.kosten?.map((p) => p.naam), ["Meta Ads", "Google Ads"]);
  assert.equal(u.ctr?.length, 2);
  // CTR per platform: klikken ÷ vertoningen.
  assert.equal(Math.round((u.ctr?.find((p) => p.naam === "Meta Ads")?.ctr ?? 0) * 10) / 10, 3.2);
  assert.equal(Math.round((u.ctr?.find((p) => p.naam === "Google Ads")?.ctr ?? 0) * 10) / 10, 2);
  assert.deepEqual(u.sessies?.map((r) => r.aantal), [3053, 846, 407]);
  assert.equal(u.leadsGa4?.length, 3);
  assert.deepEqual(u.leadsInternet?.map((r) => r.naam), ["Offerte", "Private lease", "Proefrit", "Inruil"]);
  assert.equal(u.orders?.[0].naam, "Koop Particulier (BM)");
});

test("kosten mogen een euro afwijken (afronding), klikken en vertoningen niet", () => {
  const ok = leesUitsplitsing(audi({ kosten: 2017.5 }));
  assert.ok(ok.kosten);
  const teVeel = leesUitsplitsing(audi({ kosten: 2020 }));
  assert.equal(teVeel.kosten, null);
  const anderKlik = leesUitsplitsing(audi({ klikken: 12927 }));
  assert.equal(anderKlik.ctr, null);
  // Het ene blok valt weg, het andere blijft.
  assert.ok(anderKlik.kosten);
});

test("een blok dat niet optelt of waarvan het cijfer onbekend is, wordt niet getoond", () => {
  assert.equal(leesUitsplitsing(audi({ sessies: 4000 })).sessies, null);
  assert.equal(leesUitsplitsing(audi({ sessies: null })).sessies, null);
  assert.equal(leesUitsplitsing(audi({ leadsInternet: 15 })).leadsInternet, null);
  assert.equal(leesUitsplitsing(audi({ ordersSyntec: undefined })).orders, null);
  // De andere blokken staan er nog.
  assert.ok(leesUitsplitsing(audi({ ordersSyntec: undefined })).sessies);
});

test("lead-events: de regels die meetellen moeten optellen tot leadsGa4", () => {
  assert.equal(leesUitsplitsing(audi({ leadsGa4: 19 })).leadsGa4, null);
  // Tellen alle regels niet op tot leadEvents, dan blijven alleen de regels die meetellen staan.
  const u = leesUitsplitsing(audi({ leadEvents: 40 }));
  assert.deepEqual(u.leadsGa4?.map((e) => e.naam), ["Proefrit"]);
  // Zonder cijfer voor alle events blijven alle regels staan.
  assert.equal(leesUitsplitsing(audi({ leadEvents: null })).leadsGa4?.length, 3);
});

test("rommel van het model geeft geen uitsplitsing en geen fout", () => {
  assert.deepEqual(leesUitsplitsing(undefined).orders, null);
  assert.equal(leesUitsplitsing({}).kosten, null);
  assert.equal(leesUitsplitsing(audi({ uitsplitsing: "kapot" as never })).sessies, null);
  const rommel = audi({
    uitsplitsing: {
      sessies: [{ naam: "", aantal: 4306 }],
      orders: [{ naam: "Koop", aantal: -26 }],
      leadsInternet: [{ naam: "Offerte", aantal: "14" as never }],
      platforms: [],
    },
  });
  const u = leesUitsplitsing(rommel);
  assert.equal(u.sessies, null);
  assert.equal(u.orders, null);
  assert.equal(u.leadsInternet, null);
  assert.equal(u.kosten, null);
});

test("aandeel, kostenPer en prognoseBijHuidigTempo", () => {
  assert.equal(aandeel(50, 200), 25);
  assert.equal(aandeel(1, 0), null);
  assert.equal(aandeel(null, 10), null);
  assert.equal(Math.round((kostenPer(2016.82, 20) ?? 0) * 100) / 100, 100.84);
  assert.equal(kostenPer(100, 0), null);
  assert.equal(kostenPer(null, 5), null);
  // Een rechte lijn: 20 leads na 71 van 105 dagen → ruim 29 aan het einde.
  assert.equal(Math.round(prognoseBijHuidigTempo(20, 71, 105) ?? 0), 30);
  // Te kort bezig om iets te zeggen.
  assert.equal(prognoseBijHuidigTempo(5, 2, 30), null);
  assert.equal(prognoseBijHuidigTempo(5, null, 30), null);
});
