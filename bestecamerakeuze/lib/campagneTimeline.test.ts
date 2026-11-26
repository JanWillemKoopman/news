import assert from "node:assert/strict";
import { test } from "node:test";
import {
  balkPositie,
  bedrijfOpties,
  filterTimeline,
  isoWeken,
  jarenBereik,
  looptijdDagen,
  maandBlokken,
  merkOpties,
  sorteerTimeline,
  telStatussen,
  timelineStatus,
  vandaagPositie,
  verstrekenPct,
  type TimelineInvoer,
} from "./campagneTimeline.ts";

function c(naam: string, extra: Partial<TimelineInvoer> = {}): TimelineInvoer {
  return { naam, bedrijven: ["Van den Udenhout"], merk: null, startdatum: null, einddatum: null, ...extra };
}

test("isoWeken: 2026 heeft 53 weken, 2027 heeft er 52", () => {
  const w26 = isoWeken(2026);
  assert.equal(w26.length, 53);
  assert.equal(w26[0].start.toISOString().slice(0, 10), "2025-12-29");
  assert.equal(w26[52].start.toISOString().slice(0, 10), "2026-12-28");
  const w27 = isoWeken(2027);
  assert.equal(w27.length, 52);
  assert.equal(w27[0].start.toISOString().slice(0, 10), "2027-01-04");
});

test("maandBlokken: alle weken verdeeld over twaalf maanden", () => {
  const blokken = maandBlokken(isoWeken(2026));
  assert.equal(blokken.length, 12);
  assert.equal(blokken[0].label, "jan");
  assert.equal(blokken[11].label, "dec");
  assert.equal(blokken.reduce((som, b) => som + b.aantalWeken, 0), 53);
});

test("timelineStatus volgt de looptijd tegen vandaag", () => {
  assert.equal(timelineStatus("2026-12-01", "2026-12-31", "2026-11-26"), "gepland");
  assert.equal(timelineStatus("2026-11-01", "2026-12-31", "2026-11-26"), "actief");
  assert.equal(timelineStatus("2026-11-01", "2026-11-30", "2026-11-26"), "bijna-af");
  assert.equal(timelineStatus("2026-11-01", "2026-11-26", "2026-11-26"), "bijna-af");
  assert.equal(timelineStatus("2026-10-01", "2026-11-25", "2026-11-26"), "afgelopen");
  // Zonder einddatum loopt hij door.
  assert.equal(timelineStatus("2026-10-01", null, "2026-11-26"), "actief");
  assert.equal(timelineStatus(null, "2026-12-01", "2026-11-26"), null);
});

test("balkPositie: op de dag nauwkeurig, start en einde tellen mee", () => {
  const weken = isoWeken(2026); // week 1 begint maandag 29 december 2025
  const b = balkPositie("2026-01-05", "2026-01-11", weken); // precies week 2
  assert.ok(b);
  assert.equal(b.van, 1);
  assert.equal(b.tot, 2);
  assert.equal(b.doorVoor, false);
  assert.equal(b.doorNa, false);

  const eenDag = balkPositie("2026-01-05", "2026-01-05", weken);
  assert.ok(eenDag);
  assert.ok(Math.abs(eenDag.tot - eenDag.van - 1 / 7) < 1e-9);
});

test("balkPositie: over de jaargrens en zonder einddatum", () => {
  const weken = isoWeken(2026);
  const over = balkPositie("2026-12-01", "2027-02-28", weken);
  assert.ok(over);
  assert.equal(over.doorNa, true);
  assert.equal(over.tot, 53);

  const vorig = balkPositie("2025-11-01", "2026-01-10", weken);
  assert.ok(vorig);
  assert.equal(vorig.doorVoor, true);
  assert.equal(vorig.van, 0);

  const open = balkPositie("2026-10-01", null, weken);
  assert.ok(open);
  assert.equal(open.openEinde, true);
  assert.equal(open.doorNa, true);
  assert.equal(open.tot, 53);

  assert.equal(balkPositie("2027-02-01", "2027-03-01", weken), null);
  assert.equal(balkPositie("2025-01-01", "2025-03-01", weken), null);
  assert.equal(balkPositie(null, "2026-03-01", weken), null);
});

test("vandaagPositie: binnen het jaar, anders null", () => {
  const weken = isoWeken(2026);
  const pos = vandaagPositie("2026-01-05", weken);
  assert.ok(pos !== null && pos > 1 && pos < 1.2);
  assert.equal(vandaagPositie("2027-06-01", weken), null);
});

test("jarenBereik: van eerste start tot laatste einde, met het huidige jaar", () => {
  const lijst = [c("A", { startdatum: "2026-09-01", einddatum: "2027-01-31" }), c("B")];
  assert.deepEqual(jarenBereik(lijst, "2026-11-26"), { van: 2026, tot: 2027 });
  assert.deepEqual(jarenBereik([], "2026-11-26"), { van: 2026, tot: 2026 });
  // 29 december 2025 valt in ISO-week 1 van 2026.
  assert.deepEqual(jarenBereik([c("C", { startdatum: "2025-12-29", einddatum: "2026-01-02" })], "2026-11-26"), {
    van: 2026,
    tot: 2026,
  });
});

test("merkOpties: gesplitst, ontdubbeld op sleutel, alfabetisch", () => {
  const lijst = [c("A", { merk: "Škoda" }), c("B", { merk: "Volkswagen, Audi" }), c("C", { merk: "Skoda" }), c("D")];
  assert.deepEqual(merkOpties(lijst), ["Audi", "Škoda", "Volkswagen"]);
});

test("bedrijfOpties: elk bedrijf één keer", () => {
  const lijst = [c("A", { bedrijven: ["PGZ", "VELOO"] }), c("B", { bedrijven: ["PGZ"] })];
  assert.deepEqual(bedrijfOpties(lijst), ["PGZ", "VELOO"]);
});

test("filterTimeline: bedrijf en merk, merk via de sleutel", () => {
  const lijst = [
    c("Herfst", { merk: "Škoda", bedrijven: ["Van den Udenhout"] }),
    c("A2", { merk: "Audi", bedrijven: ["Van den Udenhout"] }),
    c("Duo", { merk: "Volkswagen, Audi", bedrijven: ["PGZ"] }),
  ];
  assert.deepEqual(
    filterTimeline(lijst, { bedrijven: [], merken: ["Audi"] }).map((x) => x.naam),
    ["A2", "Duo"],
  );
  assert.deepEqual(
    filterTimeline(lijst, { bedrijven: ["PGZ"], merken: ["Audi"] }).map((x) => x.naam),
    ["Duo"],
  );
  assert.deepEqual(
    filterTimeline(lijst, { bedrijven: [], merken: ["Skoda"] }).map((x) => x.naam),
    ["Herfst"],
  );
  assert.equal(filterTimeline(lijst, { bedrijven: [], merken: [] }).length, 3);
});

test("sorteerTimeline: op start, zonder start achteraan", () => {
  const lijst = [
    c("Geen"),
    c("Later", { startdatum: "2026-11-01" }),
    c("Eerder", { startdatum: "2026-09-15", einddatum: "2026-12-31" }),
  ];
  assert.deepEqual(sorteerTimeline(lijst).map((x) => x.naam), ["Eerder", "Later", "Geen"]);
});

test("telStatussen", () => {
  assert.deepEqual(telStatussen(["actief", "actief", "gepland", null]), {
    actief: 2,
    "bijna-af": 0,
    gepland: 1,
    afgelopen: 0,
  });
});

test("looptijdDagen en verstrekenPct", () => {
  assert.equal(looptijdDagen("2026-11-01", "2026-11-30"), 30);
  assert.equal(looptijdDagen("2026-11-01", null), null);
  assert.equal(verstrekenPct("2026-11-01", "2026-11-30", "2026-11-15"), 50);
  assert.equal(verstrekenPct("2026-11-01", "2026-11-30", "2026-10-01"), 0);
  assert.equal(verstrekenPct("2026-11-01", "2026-11-30", "2027-01-01"), 100);
});
