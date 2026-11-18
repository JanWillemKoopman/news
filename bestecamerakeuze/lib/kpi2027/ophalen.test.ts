import assert from "node:assert/strict";
import { test } from "node:test";
import { datumUit, eventFilter, haalWebsiteStand, hostUitsluiting, maandIndex, standUitRijen } from "@/lib/kpi2027/ophalen";
import { vindWebsite } from "@/lib/kpi2027/definities";
import { opdrachtenVoor } from "@/lib/kpi2027/bijwerken";
import type { WindsorFilter, WindsorRij } from "@/lib/windsor/api";

test("datums en maanden alleen uit het gevraagde jaar", () => {
  assert.equal(datumUit("2026-03-04", 2026), "2026-03-04");
  assert.equal(datumUit("20260304", 2026), "2026-03-04");
  assert.equal(datumUit("2025-12-31", 2026), null);
  assert.equal(maandIndex("202601"), 0);
  assert.equal(maandIndex(202612), 11);
  assert.equal(maandIndex("202512"), null);
});

test("de filters zijn plat: alleen 'of' tussen events, alleen 'en' tussen hosts", () => {
  assert.deepEqual(eventFilter(["a", "b"]), [["event_name", "eq", "a"], "or", ["event_name", "eq", "b"]]);
  assert.deepEqual(hostUitsluiting(["x", "y"]), [["hostname", "neq", "x"], "and", ["hostname", "neq", "y"]]);
  assert.equal(hostUitsluiting([]), undefined);
});

test("bij events vallen uitgesloten hosts in de code weg, '(not set)' telt mee", () => {
  const pgz = vindWebsite("pgz")!;
  const stand = standUitRijen(pgz, {
    events: [
      { date: "2026-10-12", event_name: "generate_lead_offerte", hostname: "www.pgz.nl", event_count: 1 },
      { date: "2026-10-12", event_name: "generate_lead_offerte", hostname: "(not set)", event_count: 1 },
      { date: "2026-10-12", event_name: "generate_lead_offerte", hostname: "staging.pgz.nl", event_count: 5 },
      { date: "2026-10-12", event_name: "click_tel", hostname: "www.pgz.nl", event_count: 9 },
    ],
    padEvents: {},
    // Sessies komen al gefilterd en zonder hostname binnen (zie de volgende test).
    verkeer: [{ date: "2026-10-12", sessions: 40 }],
    gebruikers: [{ year_month: "202610", active_users: 800 }],
  });
  assert.deepEqual(stand.dagen["event:generate_lead_offerte"], { "2026-10-12": 2 });
  assert.equal(stand.dagen["event:click_tel"], undefined);
  assert.deepEqual(stand.dagen.sessies, { "2026-10-12": 40 });
  assert.equal(stand.gebruikers[9], 800);
});

test("sessies en gebruikers worden door GA4 gefilterd, nooit per hostname opgeteld", async () => {
  // Per hostname optellen telt een sessie met een hostnameloos session_start dubbel
  // (udenhout.nl: 1,57 miljoen opgeteld tegen 1,16 miljoen echt).
  const aanroepen: { velden: string[]; filter?: WindsorFilter }[] = [];
  const haal = async (_c: string, velden: string[], _v: string, _t: string, filter?: WindsorFilter) => {
    aanroepen.push({ velden, filter });
    return velden.includes("sessions") ? [{ date: "2026-01-01", sessions: 10 }] : [];
  };
  await haalWebsiteStand(vindWebsite("pgz")!, "2026-11-14", 2026, haal as never);
  for (const a of aanroepen.filter((a) => a.velden.includes("sessions") || a.velden.includes("active_users"))) {
    assert.equal(a.velden.includes("hostname"), false);
    assert.deepEqual(a.filter, [["hostname", "neq", "staging.pgz.nl"]]);
  }
  // Zonder uitgesloten hosts ook geen filter.
  aanroepen.length = 0;
  await haalWebsiteStand(vindWebsite("udenhout")!, "2026-11-14", 2026, haal as never);
  assert.equal(aanroepen.find((a) => a.velden.includes("sessions"))!.filter, undefined);
});

test("per website precies de opvragingen die zijn KPI's nodig hebben", async () => {
  const aanroepen: { velden: string[]; filter?: WindsorFilter; accounts?: string[]; van: string; tot: string }[] = [];
  const haal = async (
    _c: string,
    velden: string[],
    van: string,
    tot: string,
    filter?: WindsorFilter,
    accounts?: string[],
  ): Promise<WindsorRij[]> => {
    aanroepen.push({ velden, filter, accounts, van, tot });
    if (velden.includes("sessions")) return [{ date: "2026-01-01", sessions: 10 }];
    if (velden.includes("event_name")) return [];
    if (velden.includes("active_users")) return [{ year_month: "202601", active_users: 7 }];
    return [{ date: "2026-03-04", hostname: "www.bentley-maastricht.nl", event_count: 1 }];
  };
  const bentley = vindWebsite("bentley")!;
  const stand = await haalWebsiteStand(bentley, "2026-11-14", 2026, haal as never);
  assert.equal(aanroepen.length, 4); // events, één padevent, verkeer, gebruikers
  for (const a of aanroepen) {
    assert.deepEqual(a.accounts, ["435349999"]);
    assert.equal(a.van, "2026-01-01");
    assert.equal(a.tot, "2026-11-14");
  }
  const pad = aanroepen.find((a) => JSON.stringify(a.filter).includes("page_path"))!;
  assert.deepEqual(pad.filter, [["event_name", "eq", "Contactaanvraag"], "and", ["page_path", "contains", "/caw-bedankt/offerte/"]]);
  const gebruikers = aanroepen.find((a) => a.velden.includes("active_users"))!;
  assert.equal(JSON.stringify(gebruikers.filter).includes("hostname"), true);
  assert.deepEqual(stand.dagen["event:Contactaanvraag@/caw-bedankt/offerte/"], { "2026-03-04": 1 });
  assert.equal(stand.gebruikers[0], 7);
  // Alleen VELOO haalt aankopen op.
  assert.equal(aanroepen.find((a) => a.velden.includes("sessions"))!.velden.includes("ecommerce_purchases"), false);
});

test("een antwoord zonder sessies is een fout, geen jaar vol nullen", async () => {
  const haal = async (): Promise<WindsorRij[]> => [];
  await assert.rejects(haalWebsiteStand(vindWebsite("veloo")!, "2026-11-14", 2026, haal as never), /geen sessies/);
});

test("in 2026 alleen de basis; vanaf de eerste zondag van 2027 ook de realisatie", () => {
  assert.deepEqual(opdrachtenVoor(new Date("2026-11-18T12:00:00Z")), [{ jaar: 2026, peildatum: "2026-11-14" }]);
  assert.deepEqual(opdrachtenVoor(new Date("2027-01-03T10:00:00Z")), [
    { jaar: 2026, peildatum: "2026-12-31" },
    { jaar: 2027, peildatum: "2027-01-02" },
  ]);
  assert.deepEqual(opdrachtenVoor(new Date("2028-02-01T10:00:00Z"))[1], { jaar: 2027, peildatum: "2027-12-31" });
  assert.deepEqual(opdrachtenVoor(new Date("2026-01-02T10:00:00Z")), []);
});
