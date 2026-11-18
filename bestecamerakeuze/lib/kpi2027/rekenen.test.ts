import assert from "node:assert/strict";
import { test } from "node:test";
import { KPI_DEFINITIES, kpiEvents } from "@/lib/kpi2027/definities";
import {
  berekenKpi,
  dagenTussen,
  datumInNederland,
  eventTotalen,
  kpiOverzicht,
  maandwaardenVoor,
  peildatumVoor,
  volgendeUpdate,
  type KpiStand,
} from "@/lib/kpi2027/rekenen";

function bijna(werkelijk: number, verwacht: number, marge = 1e-9) {
  assert.ok(Math.abs(werkelijk - verwacht) < marge, `${werkelijk} ≠ ${verwacht}`);
}

test("dagenTussen telt beide grenzen mee", () => {
  assert.equal(dagenTussen("2026-01-01", "2026-01-01"), 1);
  assert.equal(dagenTussen("2026-01-01", "2026-12-31"), 365);
  assert.equal(dagenTussen("2026-02-01", "2026-01-31"), 0);
});

test("de peildatum is de laatste zaterdag vóór vandaag", () => {
  // Woensdag 18 november 2026 → zaterdag 14 november.
  assert.equal(peildatumVoor(new Date("2026-11-18T12:00:00Z")), "2026-11-14");
  // Zondag 15 november → gisteren.
  assert.equal(peildatumVoor(new Date("2026-11-15T09:00:00Z")), "2026-11-14");
  // Zaterdag 21 november zelf is nog niet af → de zaterdag ervoor.
  assert.equal(peildatumVoor(new Date("2026-11-21T20:00:00Z")), "2026-11-14");
  // Maandag 16 november → nog steeds 14 november: midden in de week verandert er niets.
  assert.equal(peildatumVoor(new Date("2026-11-16T08:00:00Z")), "2026-11-14");
});

test("de peildatum volgt de Nederlandse kalender, niet UTC", () => {
  // Zondag 22 november 00:30 in Nederland is zaterdag 23:30 UTC.
  const nu = new Date("2026-11-21T23:30:00Z");
  assert.equal(datumInNederland(nu), "2026-11-22");
  assert.equal(peildatumVoor(nu), "2026-11-21");
});

test("na de jaarwisseling blijft de peildatum op 31 december staan", () => {
  // Zondag 3 januari 2027 → zaterdag 2 januari, afgekapt op 31 december.
  assert.equal(peildatumVoor(new Date("2027-01-03T10:00:00Z")), "2026-12-31");
  assert.equal(peildatumVoor(new Date("2027-06-01T10:00:00Z")), "2026-12-31");
  // Zondag 27 december → zaterdag 26 december.
  assert.equal(peildatumVoor(new Date("2026-12-27T10:00:00Z")), "2026-12-26");
});

test("vóór de eerste zaterdag van het jaar valt er niets te rekenen", () => {
  // Vrijdag 2 januari 2026: de laatste zaterdag is 27 december 2025.
  assert.equal(peildatumVoor(new Date("2026-01-02T10:00:00Z")), null);
});

test("verwachting = gerealiseerd + gemiddelde per dag × resterende dagen; target = +5%", () => {
  // Elke dag precies 10, t/m zaterdag 14 november (318 dagen).
  const peildatum = "2026-11-14";
  const maanden = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 14, 0].map((d) => d * 10);
  const u = berekenKpi(maanden, peildatum);

  assert.equal(u.dagenGemeten, 318);
  assert.equal(u.gerealiseerd, 3180);
  bijna(u.perDag, 10);
  assert.equal(u.dagenBijgeschat, 47);
  bijna(u.verwacht, 3650);
  bijna(u.target, 3650 * 1.05);
  bijna(u.targetPerMaand, (3650 * 1.05) / 12);
  assert.equal(u.definitief, false);
});

test("de maanden: voorbij is gerealiseerd, de lopende deels, de rest verwachting", () => {
  const maanden = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 14, 0].map((d) => d * 10);
  const u = berekenKpi(maanden, "2026-11-14");

  assert.equal(u.maanden[9].soort, "gerealiseerd");
  assert.equal(u.maanden[9].verwacht, 310);
  assert.equal(u.maanden[10].soort, "deels");
  assert.equal(u.maanden[10].gerealiseerd, 140);
  bijna(u.maanden[10].verwacht, 300); // 140 gemeten + 16 dagen × 10
  assert.equal(u.maanden[11].soort, "verwachting");
  assert.equal(u.maanden[11].gerealiseerd, null);
  bijna(u.maanden[11].verwacht, 310);

  // De maanden tellen samen precies op tot de jaarverwachting.
  bijna(
    u.maanden.reduce((t, m) => t + m.verwacht, 0),
    u.verwacht,
    1e-6,
  );
});

test("een peildatum op de laatste dag van een maand maakt die maand gerealiseerd", () => {
  const u = berekenKpi([310, 280, 310, 0, 0, 0, 0, 0, 0, 0, 0, 0], "2026-03-31");
  assert.equal(u.maanden[2].soort, "gerealiseerd");
  assert.equal(u.maanden[3].soort, "verwachting");
  assert.equal(u.dagenGemeten, 90);
});

test("met basisVanaf telt alleen de periode vanaf die dag, en de maanden ervoor worden bijgeschat", () => {
  // Januari t/m maart vrijwel niets (2 in maart), vanaf april 2 per dag.
  const peildatum = "2026-11-14";
  const maanden = [0, 0, 2, 60, 62, 60, 62, 62, 60, 62, 28, 0];
  const u = berekenKpi(maanden, peildatum, { basisVanaf: "2026-04-01" });

  const dagenVanafApril = 30 + 31 + 30 + 31 + 31 + 30 + 31 + 14; // 228
  assert.equal(u.dagenGemeten, dagenVanafApril);
  assert.equal(u.gerealiseerd, 456); // de 2 van maart tellen niet mee
  bijna(u.perDag, 2);
  bijna(u.verwacht, 2 * 365);
  assert.equal(u.maanden[0].soort, "bijgeschat");
  assert.equal(u.maanden[0].gerealiseerd, null);
  bijna(u.maanden[0].verwacht, 62);
  assert.equal(u.maanden[3].soort, "gerealiseerd");
  // Zonder volledige meting is de stand nooit definitief, ook niet op 31 december.
  assert.equal(berekenKpi(maanden, "2026-12-31", { basisVanaf: "2026-04-01" }).definitief, false);
});

test("basisVanaf midden in een maand wordt geweigerd: de cijfers staan per maand", () => {
  assert.throws(() => berekenKpi(new Array(12).fill(0), "2026-11-14", { basisVanaf: "2026-04-15" }));
});

test("op 31 december is alles gerealiseerd en is de stand definitief", () => {
  const maanden = new Array(12).fill(100);
  const u = berekenKpi(maanden, "2026-12-31");
  assert.equal(u.dagenBijgeschat, 0);
  assert.equal(u.verwacht, 1200);
  assert.equal(u.definitief, true);
  assert.ok(u.maanden.every((m) => m.soort === "gerealiseerd"));
});

test("zonder gemeten dagen is het gemiddelde nul in plaats van NaN", () => {
  const u = berekenKpi(new Array(12).fill(0), "2026-03-14", { basisVanaf: "2026-04-01" });
  assert.equal(u.perDag, 0);
  assert.equal(u.verwacht, 0);
  assert.equal(u.target, 0);
});

const stand: KpiStand = {
  peildatum: "2026-11-14",
  berekendOp: "2026-11-15T10:15:00Z",
  definitief: false,
  events: {
    generate_lead_proefrit_aanvraag: [69, 63, 60, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    generate_lead_proefrit: [0, 0, 8, 134, 114, 95, 87, 105, 92, 200, 70, 0],
  },
  sessies: [120005, 104261, 121828, 99690, 115192, 111505, 105515, 104351, 102579, 119878, 60000, 0],
  gebruikers: [71918, 62133, 72800, 58728, 73350, 71672, 66488, 64351, 61858, 68082, 40000, 0],
};

test("een KPI telt de maandcijfers van al zijn events bij elkaar op", () => {
  const proefrit = KPI_DEFINITIES.find((d) => d.sleutel === "proefritaanvragen")!;
  const reeks = maandwaardenVoor(proefrit, stand);
  assert.equal(reeks[0], 69);
  assert.equal(reeks[2], 68);
  assert.equal(reeks[3], 135);
  assert.equal(reeks[11], 0);
  assert.deepEqual(
    eventTotalen(proefrit, stand).map(({ naam, aantal }) => ({ naam, aantal })),
    [
      { naam: "generate_lead_proefrit_aanvraag", aantal: 193 },
      { naam: "generate_lead_proefrit", aantal: 905 },
    ],
  );
});

test("een event dat niet in de stand staat telt als nul", () => {
  const verhuur = KPI_DEFINITIES.find((d) => d.sleutel === "verhuur")!;
  assert.deepEqual(maandwaardenVoor(verhuur, stand), new Array(12).fill(0));
});

test("sessies en gebruikers komen uit hun eigen reeks", () => {
  const sessies = KPI_DEFINITIES.find((d) => d.sleutel === "sessies")!;
  const gebruikers = KPI_DEFINITIES.find((d) => d.sleutel === "gebruikers")!;
  assert.equal(maandwaardenVoor(sessies, stand)[0], 120005);
  assert.equal(maandwaardenVoor(gebruikers, stand)[0], 71918);
});

test("de volgende update is de zondag na de volgende zaterdag, tot 2026 gemeten is", () => {
  assert.equal(volgendeUpdate("2026-11-14"), "2026-11-22");
  assert.equal(volgendeUpdate("2026-12-26"), "2027-01-03");
  assert.equal(volgendeUpdate("2026-12-31"), null);
});

test("het overzicht levert alle negen KPI's met hun uitkomst", () => {
  const regels = kpiOverzicht(stand, KPI_DEFINITIES);
  assert.equal(regels.length, 9);
  const zakelijk = regels.find((r) => r.sleutel === "zakelijke-lease")!;
  assert.equal(zakelijk.uitkomst.basisVanaf, "2026-04-01");
  const sessies = regels.find((r) => r.sleutel === "sessies")!;
  assert.equal(sessies.events.length, 0);
  assert.ok(sessies.uitkomst.target > sessies.uitkomst.verwacht);
});

test("de definities: negen KPI's, unieke sleutels, en een basis altijd op de eerste van een maand", () => {
  assert.equal(KPI_DEFINITIES.length, 9);
  assert.equal(new Set(KPI_DEFINITIES.map((d) => d.sleutel)).size, 9);
  for (const d of KPI_DEFINITIES) {
    if (d.basisVanaf) assert.match(d.basisVanaf, /^\d{4}-\d{2}-01$/);
  }
  // Geen event bij twee KPI's: dan zou één aanvraag twee keer meetellen.
  const alle = KPI_DEFINITIES.flatMap((d) => (d.bron.soort === "events" ? d.bron.events.map((e) => e.naam) : []));
  assert.equal(new Set(alle).size, alle.length);
  assert.equal(kpiEvents().length, alle.length);
});
