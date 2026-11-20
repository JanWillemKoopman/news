import assert from "node:assert/strict";
import { test } from "node:test";
import { SOCIAL_MERKEN, keuzesVoor, vindSocialKpi } from "@/lib/kpi2027social/definities";
import {
  achterstand,
  berekenNieuweVolgers,
  berekenVertoningen,
  ontbrekendeDagen,
  berekenVolgers,
  merkOverzicht,
  metSocialGroei,
  pasSocialGroeiToe,
  realisatieVoor,
  voortgangStand,
  type SocialStand,
} from "@/lib/kpi2027social/rekenen";
import { inStukken, standenUitAanwas, somPerDag } from "@/lib/kpi2027social/ophalen";
import type { WindsorRij } from "@/lib/windsor/api";

function dagen(van: string, tot: string, waarde: (d: string, i: number) => number): Record<string, number> {
  const uit: Record<string, number> = {};
  let i = 0;
  for (let t = Date.parse(`${van}T00:00:00Z`); t <= Date.parse(`${tot}T00:00:00Z`); t += 86_400_000) {
    const d = new Date(t).toISOString().slice(0, 10);
    uit[d] = waarde(d, i++);
  }
  return uit;
}

test("de percentages van het team staan per merk zoals aangeleverd", () => {
  const verwacht: Record<string, Record<string, number>> = {
    udenhout: {
      "facebook-volgers": 0.01,
      "facebook-vertoningen": 0.08,
      "instagram-volgers": 0.07,
      "instagram-vertoningen": 0.19,
      "linkedin-volgers": 0.05,
      "linkedin-vertoningen": 0.09,
      "tiktok-volgers": 0.15,
      "youtube-volgers": 0.04,
    },
    veloo: {
      "facebook-volgers": 0.05,
      "facebook-vertoningen": -0.06,
      "instagram-volgers": 0.17,
      "instagram-vertoningen": 0.17,
      "linkedin-volgers": 0.07,
      "linkedin-vertoningen": 0.21,
    },
    "audi-sport": {
      "facebook-volgers": 0.05,
      "facebook-vertoningen": 0.33,
      "instagram-volgers": 0.02,
      "instagram-vertoningen": 0.15,
    },
  };
  for (const merk of SOCIAL_MERKEN) {
    assert.deepEqual(Object.fromEntries(merk.kpis.map((k) => [k.sleutel, k.groei])), verwacht[merk.sleutel]);
    // Elke KPI heeft een account op zijn kanaal (gekoppeld of met een reden waarom niet).
    for (const k of merk.kpis) {
      const account = merk.accounts.find((a) => a.kanaal === k.kanaal);
      assert.ok(account, `${merk.sleutel} ${k.sleutel}`);
      assert.ok(account.accountId || account.nietGekoppeld, `${merk.sleutel} ${k.sleutel}`);
    }
  }
  assert.equal(vindSocialKpi("veloo", "linkedin-vertoningen")?.groei, 0.21);
  assert.equal(vindSocialKpi("veloo", "tiktok-volgers"), undefined);
});

test("elke KPI heeft keuzes onder de grafiek, met zijn eigen percentage en de besluiten van zijn kanaal", () => {
  for (const merk of SOCIAL_MERKEN) {
    for (const kpi of merk.kpis) {
      const keuzes = keuzesVoor(merk, kpi);
      assert.ok(keuzes.length >= 2, `${merk.sleutel} ${kpi.sleutel}`);
      const procent = `${kpi.groei >= 0 ? "+" : "−"}${String(Math.round(Math.abs(kpi.groei) * 1000) / 10).replace(".", ",")}%`;
      assert.ok(keuzes[0].startsWith(procent), `${merk.sleutel} ${kpi.sleutel}: ${keuzes[0]}`);
    }
  }
  const udenhout = SOCIAL_MERKEN.find((m) => m.sleutel === "udenhout")!;
  const kpi = (s: string) => udenhout.kpis.find((k) => k.sleutel === s)!;
  assert.ok(keuzesVoor(udenhout, kpi("instagram-volgers")).some((k) => k.includes("20 november")));
  assert.ok(keuzesVoor(udenhout, kpi("facebook-volgers")).some((k) => k.includes("page_follows")));
  assert.ok(keuzesVoor(udenhout, kpi("instagram-vertoningen")).some((k) => k.includes("views")));
  assert.ok(keuzesVoor(udenhout, kpi("tiktok-volgers")).some((k) => k.includes("niet gekoppeld")));
  const veloo = SOCIAL_MERKEN.find((m) => m.sleutel === "veloo")!;
  assert.ok(keuzesVoor(veloo, veloo.kpis.find((k) => k.sleutel === "facebook-vertoningen")!)[0].startsWith("−6%"));
});

test("impressies: gemeten t/m de peildatum plus het gemiddelde per dag, × (1 + groei)", () => {
  // 10 per dag over 2026 t/m zaterdag 14 november (318 dagen).
  const u = berekenVertoningen(dagen("2026-01-01", "2026-11-14", () => 10), "2026-11-14", 2026, 0.19);
  assert.equal(u.gerealiseerd, 3180);
  assert.equal(u.verwacht, 3650);
  assert.ok(Math.abs(u.target - 3650 * 1.19) < 1e-9);
  assert.ok(Math.abs(u.targetPerMaand - (3650 * 1.19) / 12) < 1e-9);
});

test("impressies: hooguit drie lege dagen vóór de peildatum zijn nog niet binnen", () => {
  const reeks = dagen("2026-01-01", "2026-11-12", () => 10);
  assert.deepEqual(achterstand(reeks, "2026-11-14", 2026), [{ van: "2026-11-13", tot: "2026-11-14" }]);
  const u = berekenVertoningen(reeks, "2026-11-14", 2026, 0);
  assert.equal(u.verwacht, 3650); // het gemiddelde blijft 10, niet gedrukt door twee nullen
  // Langer stil is geen vertraging: die dagen tellen als gemeten nul.
  assert.deepEqual(achterstand(dagen("2026-01-01", "2026-11-01", () => 10), "2026-11-14", 2026), []);
});

test("nieuwe volgers: alleen gemeten dagen tellen, een ontbrekende dag wordt bijgeschat, een 0 niet", () => {
  // Gemeten vanaf 16 augustus (zoals Instagram), 3 per dag, met één dag 0.
  const reeks = dagen("2026-08-16", "2026-11-14", (d) => (d === "2026-09-01" ? 0 : 3));
  assert.deepEqual(ontbrekendeDagen(reeks, "2026-11-14", 2026), [{ van: "2026-01-01", tot: "2026-08-15" }]);
  const u = berekenNieuweVolgers(reeks, "2026-11-14", 2026, 0.07)!;
  assert.equal(u.dagenGemeten, 91);
  assert.equal(u.gerealiseerd, 270); // 91 dagen, waarvan één met 0
  assert.ok(Math.abs(u.verwacht - (270 / 91) * 365) < 1e-9);
  assert.ok(Math.abs(u.target - u.verwacht * 1.07) < 1e-9);
  assert.equal(u.maanden[0].soort, "bijgeschat");
  assert.match(u.maanden[0].toelichting ?? "", /Niet gemeten/);
  assert.equal(u.maanden[7].soort, "bijgeschat"); // augustus: 16 van 31 dagen gemeten
  assert.match(u.maanden[7].toelichting ?? "", /16 van 31/);
  assert.equal(u.maanden[8].soort, "gerealiseerd");
  // Niets gemeten: geen uitkomst (de kaart zegt dan "nog geen stand").
  assert.equal(berekenNieuweVolgers({}, "2026-11-14", 2026, 0), null);
});

test("volgers: de laatste stand plus de trend tot 31 december, × (1 + groei)", () => {
  // Van 1000 op 1 januari naar 1318 op 15 november: +1 per dag.
  const reeks = dagen("2026-01-01", "2026-11-15", (_, i) => 1000 + i);
  const u = berekenVolgers(reeks, "2026-11-14", 2026, 0.07)!;
  assert.equal(u.standDatum, "2026-11-14"); // niet voorbij de peildatum
  assert.equal(u.gerealiseerd, 1317);
  assert.equal(u.perDag, 1);
  assert.equal(u.verwacht, 1364); // 31 december: dag 364
  assert.ok(Math.abs(u.target - 1364 * 1.07) < 1e-9);
  assert.equal(u.targetPerMaand, u.target); // een stand: de lijn is het doel eind 2027
  assert.equal(u.maanden[0].verwacht, 1030); // stand eind januari
  assert.equal(u.maanden[0].soort, "gerealiseerd");
  assert.equal(u.maanden[10].soort, "deels");
  assert.equal(u.maanden[11].soort, "verwachting");
  assert.equal(u.maanden[11].verwacht, 1364);
});

test("volgers zonder historie (Instagram): lege maanden vóór de eerste stand, geen trend uit één dag", () => {
  const u = berekenVolgers({ "2026-11-20": 3772 }, "2026-11-21", 2026, 0.07)!;
  assert.equal(u.perDag, 0);
  assert.equal(u.verwacht, 3772);
  assert.ok(u.maanden.slice(0, 10).every((m) => m.leeg));
  assert.equal(u.maanden[10].leeg, undefined);
  assert.equal(berekenVolgers({}, "2026-11-21", 2026, 0.07), null);
  // Pas vanaf zeven dagen tussen de standen een trend.
  const week = berekenVolgers({ "2026-11-20": 3772, "2026-11-27": 3786 }, "2026-11-28", 2026, 0)!;
  assert.equal(week.perDag, 2);
});

test("Instagram-volgers: vóór de eerste meting de eerste stand, daarna de echte; stand van zondag telt mee", () => {
  // Eerste meting vrijdag 20 november, de ophaalactie draait zondag 22 (peildatum zaterdag 21).
  const reeks = { "2026-11-20": 3772, "2026-11-21": 3775, "2026-11-22": 3776 };
  const u = berekenVolgers(reeks, "2026-11-21", 2026, 0.07, { standTot: "2026-11-22", aanvullen: true })!;
  assert.equal(u.standDatum, "2026-11-22"); // de momentopname van zondag wacht niet een week
  assert.equal(u.gerealiseerd, 3776);
  assert.equal(u.aangevuldTot, "2026-11-20");
  assert.equal(u.perDag, 0); // pas een trend vanaf zeven dagen echte metingen; de aanvulling telt niet
  assert.equal(u.verwacht, 3776);
  for (const m of u.maanden.slice(0, 10)) {
    assert.equal(m.soort, "bijgeschat");
    assert.equal(m.verwacht, 3772);
    assert.match(m.toelichting ?? "", /Aangenomen/);
  }
  assert.equal(u.maanden[10].soort, "deels");
  // Zonder aanvullen (LinkedIn, Facebook): lege maanden in plaats van een aanname.
  const zonder = berekenVolgers(reeks, "2026-11-21", 2026, 0, { standTot: "2026-11-22" })!;
  assert.equal(zonder.maanden[0].leeg, true);
  assert.equal(zonder.aangevuldTot, null);
});

test("volgers: de stand op elke dag teruggerekend uit de aanwas (LinkedIn)", () => {
  const aanwas = { "2026-11-18": 2, "2026-11-19": -1, "2026-11-20": 3 };
  const s = standenUitAanwas(6211, aanwas, "2026-11-17", "2026-11-19");
  assert.deepEqual(s, { "2026-11-19": 6208, "2026-11-18": 6209, "2026-11-17": 6207 });
  assert.deepEqual(standenUitAanwas(0, aanwas, "2026-11-17", "2026-11-19"), {});
});

test("voortgang van een stand: de groei sinds eind 2026 tegen het lineaire deel van de doelgroei", () => {
  // Basis 1000, target 1365: 1 volger per dag. Op 10 januari (dag 10) 1010 = op schema.
  const v = voortgangStand(1000, 1365, { waarde: 1010, peildatum: "2027-01-10" })!;
  assert.equal(v.dagen, 10);
  assert.ok(Math.abs(v.afwijking) < 1e-9);
  assert.ok(Math.abs(voortgangStand(1000, 1365, { waarde: 1020, peildatum: "2027-01-10" })!.afwijking - 1) < 1e-9);
  assert.equal(voortgangStand(1000, 1000, { waarde: 1010, peildatum: "2027-01-10" }), null);
  assert.equal(voortgangStand(1000, 1365, { waarde: 0, peildatum: null }), null);
});

test("realisatie: impressies opgeteld, volgers de laatste stand", () => {
  const stand: SocialStand = {
    sleutel: "instagram:1",
    jaar: 2027,
    peildatum: "2027-01-09",
    berekendOp: "2027-01-10T10:00:00Z",
    definitief: false,
    dagen: { vertoningen: { "2027-01-02": 5, "2027-01-09": 7, "2027-01-10": 99 }, volgers: { "2027-01-03": 10, "2027-01-08": 12 } },
  };
  assert.deepEqual(realisatieVoor("vertoningen", stand), { waarde: 12, peildatum: "2027-01-09" });
  assert.deepEqual(realisatieVoor("nieuwe-volgers", { ...stand, dagen: { "nieuwe-volgers": { "2027-01-02": 3, "2027-01-05": 4 } } }), {
    waarde: 7,
    peildatum: "2027-01-09",
  });
  assert.deepEqual(realisatieVoor("volgers", stand), { waarde: 12, peildatum: "2027-01-08" });
  assert.deepEqual(realisatieVoor("volgers", null), { waarde: 0, peildatum: null });
});

test("merkoverzicht: niet gekoppelde kanalen zonder uitkomst, groei per KPI aan te passen", () => {
  const merk = SOCIAL_MERKEN.find((m) => m.sleutel === "udenhout")!;
  const standen: SocialStand[] = [
    {
      sleutel: "instagram:17841400383959539",
      jaar: 2026,
      peildatum: "2026-11-14",
      berekendOp: "2026-11-15T10:00:00Z",
      definitief: false,
      dagen: {
        vertoningen: dagen("2026-01-01", "2026-11-14", () => 100),
        "nieuwe-volgers": dagen("2026-08-16", "2026-11-14", () => 2),
        volgers: { "2026-11-14": 3772 },
      },
    },
  ];
  const o = merkOverzicht(merk, standen, (k) => (k === "instagram-vertoningen" ? 0.25 : undefined));
  assert.deepEqual(o.kanalen.map((g) => g.kanaal), ["facebook", "instagram", "linkedin", "tiktok", "youtube"]);
  const ig = o.kanalen.find((g) => g.kanaal === "instagram")!.kpis;
  assert.equal(ig[0].sleutel, "instagram-volgers");
  assert.equal(ig[0].maat, "volgers");
  assert.equal(ig[0].uitkomst?.verwacht, 3772);
  assert.equal(ig[0].uitkomst?.aangevuldTot, "2026-11-14"); // januari t/m 13 november aangevuld
  assert.equal(ig[0].uitkomst?.maanden[0].soort, "bijgeschat");
  assert.equal(ig[1].uitkomst?.groei, 0.25);
  assert.equal(ig[1].groeiAangepast, true);
  const fb = o.kanalen.find((g) => g.kanaal === "facebook")!.kpis;
  assert.deepEqual(fb.map((k) => k.maat), ["volgers", "vertoningen"]);
  const tiktok = o.kanalen.find((g) => g.kanaal === "tiktok")!.kpis[0];
  assert.equal(tiktok.uitkomst, null);
  assert.ok(tiktok.nietGekoppeld);
  assert.equal(o.peildatum, "2026-11-14");

  // Terug naar het percentage van het team.
  const terug = pasSocialGroeiToe([o], "udenhout", "instagram-vertoningen", null)[0];
  assert.equal(terug.kanalen.find((g) => g.kanaal === "instagram")!.kpis[1].uitkomst?.groei, 0.19);
  const li = o.kanalen.find((g) => g.kanaal === "linkedin")!.kpis[0];
  assert.equal(li.maat, "volgers");
  assert.equal(li.uitkomst, null); // geen LinkedIn-stand in dit voorbeeld
  const stand = ig[0].uitkomst!;
  assert.equal(metSocialGroei(stand, 0.1).targetPerMaand, metSocialGroei(stand, 0.1).target);
  assert.ok(Math.abs(metSocialGroei(ig[1].uitkomst!, 0.1).targetPerMaand - (36500 * 1.1) / 12) < 1e-9);
});

test("ophalen: stukken en optellen per dag", () => {
  assert.deepEqual(inStukken("2026-01-01", "2026-01-10", 4), [
    { van: "2026-01-01", tot: "2026-01-04" },
    { van: "2026-01-05", tot: "2026-01-08" },
    { van: "2026-01-09", tot: "2026-01-10" },
  ]);
  // LinkedIn levert twee soorten rijen per dag; die tellen op.
  const rijen: WindsorRij[] = [
    { date: "2026-03-04", followers_gain_organic: 2, followers_gain_paid: 1 },
    { date: "2026-03-04", account_analytics_impression_count: 50 },
    { date: "20260305", followers_gain_organic: "-1" },
    { date: "2025-12-31", followers_gain_organic: 9 },
  ];
  assert.deepEqual(somPerDag(rijen, ["followers_gain_organic", "followers_gain_paid"], "2026-01-01", "2026-12-31"), {
    "2026-03-04": 3,
    "2026-03-05": -1,
  });
});
