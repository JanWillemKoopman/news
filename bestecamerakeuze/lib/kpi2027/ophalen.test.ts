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

test("uitgesloten hosts tellen niet mee, '(not set)' wel", () => {
  const pgz = vindWebsite("pgz")!;
  const stand = standUitRijen(pgz, {
    events: [
      { date: "2026-10-12", event_name: "generate_lead_offerte", hostname: "www.pgz.nl", event_count: 1 },
      { date: "2026-10-12", event_name: "generate_lead_offerte", hostname: "staging.pgz.nl", event_count: 5 },
      { date: "2026-10-12", event_name: "click_tel", hostname: "www.pgz.nl", event_count: 9 },
    ],
    padEvents: {},
    verkeer: [
      { date: "2026-10-12", hostname: "www.pgz.nl", sessions: 40 },
      { date: "2026-10-12", hostname: "(not set)", sessions: 25 },
      { date: "2026-10-12", hostname: "staging.pgz.nl", sessions: 3 },
    ],
    gebruikers: [{ year_month: "202610", active_users: 800 }],
  });
  assert.deepEqual(stand.dagen["event:generate_lead_offerte"], { "2026-10-12": 1 });
  assert.equal(stand.dagen["event:click_tel"], undefined);
  assert.deepEqual(stand.dagen.sessies, { "2026-10-12": 65 });
  assert.equal(stand.gebruikers[9], 800);
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
    if (velden.includes("sessions")) return [{ date: "2026-01-01", hostname: "www.bentley-maastricht.nl", sessions: 10 }];
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
