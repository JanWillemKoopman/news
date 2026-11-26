import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dagNL,
  eersteVrijdag,
  periodeLabel,
  planningStand,
  rondeDag,
  volgendeRonde,
  volgendeVrijdag,
  volgendeWeergave,
  vrijdagKort,
  vrijdagVanWeek,
  type PlanningInvoer,
} from "./planning";

// Dezelfde testregels als bij het nalopen van dataloket.marketing_analyse_ronde (migratie 0049).
const T1: PlanningInvoer = { planning: "week", formulier: "campagne", startdatum: "2026-10-01", einddatum: "2026-12-31", laatsteAnalyse: "2026-11-20" };
const T2: PlanningInvoer = { planning: "maand", formulier: "campagne", startdatum: "2026-09-01", einddatum: "2026-12-15", laatsteAnalyse: "2026-11-06" };
const T3: PlanningInvoer = { planning: "maand", formulier: "rapportage", startdatum: null, einddatum: null, laatsteAnalyse: "2026-11-06" };
const T4: PlanningInvoer = { planning: "kwartaal", formulier: "rapportage", startdatum: null, einddatum: null, laatsteAnalyse: "2026-10-02" };
const T5: PlanningInvoer = { planning: "week", formulier: "campagne", startdatum: "2026-12-10", einddatum: "2027-01-31", laatsteAnalyse: null };
const T6: PlanningInvoer = { planning: "uit", formulier: "rapportage", startdatum: null, einddatum: null, laatsteAnalyse: null };

type Rij = [boolean, string, string | null, string | null, string | null];
const kort = (r: PlanningInvoer, d: string): Rij => {
  const s = planningStand(r, d);
  return [s.aanDeBeurt, s.reden, s.volgende, s.periodeVan, s.periodeTot];
};

test("datumhulpjes", () => {
  assert.equal(volgendeVrijdag("2026-11-25"), "2026-11-27");
  assert.equal(volgendeVrijdag("2026-11-27"), "2026-11-27");
  assert.equal(volgendeVrijdag("2026-11-28"), "2026-12-04");
  assert.equal(vrijdagVanWeek("2026-11-29"), "2026-11-27"); // zondag hoort bij de week ervoor
  assert.equal(vrijdagVanWeek("2026-11-30"), "2026-12-04");
  assert.equal(eersteVrijdag("2026-12-20"), "2026-12-04");
  assert.equal(eersteVrijdag("2027-01-15"), "2027-01-01");
  assert.equal(eersteVrijdag("2027-04-30"), "2027-04-02");
  assert.equal(rondeDag("2026-11-25"), "2026-11-27");
  assert.equal(dagNL("2026-11-25T23:30:00Z"), "2026-11-26"); // na middernacht in Nederland
});

test("woensdag 25 november 2026: gelijk aan de SQL-functie", () => {
  const d = "2026-11-25";
  assert.deepEqual(kort(T1, d), [true, "wekelijks", "2026-11-27", "2026-10-01", "2026-11-24"]);
  assert.deepEqual(kort(T2, d), [false, "gepland", "2026-12-04", null, null]);
  assert.deepEqual(kort(T3, d), [false, "gepland", "2026-12-04", "2026-11-01", "2026-11-30"]);
  assert.deepEqual(kort(T4, d), [false, "gepland", "2027-01-01", "2026-10-01", "2026-12-31"]);
  assert.deepEqual(kort(T5, d), [false, "nog niet gestart", "2026-12-11", null, null]);
  assert.deepEqual(kort(T6, d), [false, "uit", null, null, null]);
});

test("de ronde van 4 december mag ook op donderdag 3 december", () => {
  const d = "2026-12-03";
  assert.deepEqual(kort(T1, d), [true, "wekelijks", "2026-12-04", "2026-10-01", "2026-12-02"]);
  assert.deepEqual(kort(T2, d), [true, "maandelijks", "2026-12-04", "2026-09-01", "2026-12-02"]);
  assert.deepEqual(kort(T3, d), [true, "maandelijks", "2026-12-04", "2026-11-01", "2026-11-30"]);
  assert.deepEqual(kort(T4, d), [false, "gepland", "2027-01-01", "2026-10-01", "2026-12-31"]);
});

test("18 december: inhalen, eindevaluatie en eerste analyse na de start", () => {
  const d = "2026-12-18";
  assert.deepEqual(kort(T2, d), [true, "eindevaluatie", "2026-12-18", "2026-09-01", "2026-12-15"]);
  assert.deepEqual(kort(T3, d), [true, "ingehaald", "2026-12-18", "2026-11-01", "2026-11-30"]);
  assert.deepEqual(kort(T5, d), [true, "eerste analyse", "2026-12-18", "2026-12-10", "2026-12-17"]);
});

test("donderdag 31 december hoort bij de ronde van vrijdag 1 januari 2027", () => {
  const d = "2026-12-31";
  assert.deepEqual(kort(T3, d), [true, "maandelijks", "2027-01-01", "2026-12-01", "2026-12-30"]);
  assert.deepEqual(kort(T4, d), [true, "per kwartaal", "2027-01-01", "2026-10-01", "2026-12-30"]);
});

test("1 januari overgeslagen: de ronde van 8 januari haalt in", () => {
  const d = "2027-01-08";
  assert.deepEqual(kort(T1, d), [true, "eindevaluatie", "2027-01-08", "2026-10-01", "2026-12-31"]);
  assert.deepEqual(kort(T3, d), [true, "ingehaald", "2027-01-08", "2026-12-01", "2026-12-31"]);
  assert.deepEqual(kort(T4, d), [true, "ingehaald", "2027-01-08", "2026-10-01", "2026-12-31"]);
});

test("twee keer in dezelfde week maakt niets dubbel", () => {
  const vanochtend: PlanningInvoer = { ...T3, laatsteAnalyse: "2026-12-04" };
  assert.deepEqual(kort(vanochtend, "2026-12-04"), [false, "gepland", "2027-01-01", "2026-12-01", "2026-12-31"]);
  const week: PlanningInvoer = { ...T1, laatsteAnalyse: "2026-11-23" };
  assert.deepEqual(kort(week, "2026-11-27"), [false, "gepland", "2026-12-04", null, null]);
});

test("einddatum vóór de volgende geplande ronde: eindevaluatie gepland", () => {
  const s = planningStand({ ...T1, einddatum: "2026-11-28", laatsteAnalyse: "2026-11-27" }, "2026-11-27");
  assert.equal(s.reden, "eindevaluatie gepland");
  assert.equal(s.volgende, "2026-12-04");
  // Einddatum op de rondedag zelf: nog tussentijds.
  const t = planningStand({ ...T1, einddatum: "2026-12-04", laatsteAnalyse: "2026-11-27" }, "2026-11-27");
  assert.equal(t.reden, "gepland");
});

test("weergave onder het uitklapmenu", () => {
  const d = "2026-11-25";
  assert.deepEqual(volgendeWeergave(T1, d), { datum: "vr 27 nov", toelichting: null, toon: "klaar" });
  assert.deepEqual(volgendeWeergave(T3, d), { datum: "vr 4 dec", toelichting: "over november", toon: "gewoon" });
  assert.deepEqual(volgendeWeergave(T4, d), { datum: "vr 1 jan 2027", toelichting: "over Q4 2026", toon: "gewoon" });
  assert.deepEqual(volgendeWeergave(T5, d), { datum: "vr 11 dec", toelichting: "eerste analyse", toon: "gewoon" });
  assert.deepEqual(volgendeWeergave(T6, d), { datum: null, toelichting: null, toon: "uit" });
  assert.deepEqual(volgendeWeergave({ ...T3, laatsteAnalyse: null }, d), { datum: "vr 27 nov", toelichting: "over oktober", toon: "klaar" });
  assert.deepEqual(volgendeWeergave({ ...T1, einddatum: "2026-11-26" }, d), { datum: "vr 27 nov", toelichting: "eindevaluatie", toon: "eind" });
});

test("labels", () => {
  assert.equal(vrijdagKort("2026-12-04", "2026-11-25"), "vr 4 dec");
  assert.equal(periodeLabel("maand", "2026-12-01", "2027-01-08"), "over december 2026");
  assert.equal(periodeLabel("kwartaal", "2026-10-01", "2026-11-25"), "over Q4 2026");
  assert.equal(periodeLabel("week", "2026-10-01", "2026-11-25"), null);
});

test("de volgende ronde: alleen wat op die vrijdag draait", () => {
  const lijst = volgendeRonde([T1, T2, T3, T4, T5, T6], "2026-11-25");
  assert.deepEqual(lijst.map((x) => x.regel), [T1]);
  const dec = volgendeRonde([T1, T2, T3, T4, T5, T6], "2026-11-28");
  assert.deepEqual(dec.map((x) => x.regel), [T1, T2, T3]);
});
