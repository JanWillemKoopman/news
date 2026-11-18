import assert from "node:assert/strict";
import { test } from "node:test";
import { haalKpiStand, kpiEventFilter, maandIndex, standUitRijen } from "@/lib/kpi2027/ophalen";
import { KPI_PROPERTY } from "@/lib/kpi2027/definities";
import type { WindsorRij } from "@/lib/windsor/api";

test("year_month wordt een maandindex, alleen in het basisjaar", () => {
  assert.equal(maandIndex("202601"), 0);
  assert.equal(maandIndex(202612), 11);
  assert.equal(maandIndex("2026-03"), 2);
  assert.equal(maandIndex("202512"), null);
  assert.equal(maandIndex("202613"), null);
  assert.equal(maandIndex(null), null);
});

test("het filter zet 'of' tussen de events en begint niet met een losse operator", () => {
  assert.deepEqual(kpiEventFilter(["a", "b"]), [["event_name", "eq", "a"], "or", ["event_name", "eq", "b"]]);
  assert.deepEqual(kpiEventFilter(["a"]), [["event_name", "eq", "a"]]);
});

test("rijen worden maandreeksen; onbekende events en andere jaren tellen niet", () => {
  const events: WindsorRij[] = [
    { year_month: "202601", event_name: "generate_lead_proefrit", event_count: 5 },
    { year_month: "202601", event_name: "generate_lead_proefrit", event_count: "3" },
    { year_month: "202611", event_name: "generate_lead_proefrit", event_count: 7 },
    { year_month: "202601", event_name: "page_view", event_count: 999 },
    { year_month: "202512", event_name: "generate_lead_proefrit", event_count: 100 },
  ];
  const verkeer: WindsorRij[] = [
    { year_month: "202601", sessions: 120005, totalusers: 71918 },
    { year_month: "202602", sessions: "104261", totalusers: 62133 },
  ];
  const stand = standUitRijen(events, verkeer, ["generate_lead_proefrit", "verhuur_aanvraag"]);
  assert.equal(stand.events.generate_lead_proefrit[0], 8);
  assert.equal(stand.events.generate_lead_proefrit[10], 7);
  assert.deepEqual(stand.events.verhuur_aanvraag, new Array(12).fill(0));
  assert.equal(stand.events.page_view, undefined);
  assert.equal(stand.sessies[1], 104261);
  assert.equal(stand.gebruikers[0], 71918);
});

test("de opvraging gaat over één property, van 1 januari t/m de peildatum", async () => {
  const aanroepen: { velden: string[]; van: string; tot: string; accounts?: string[] }[] = [];
  const haal = async (
    _connector: string,
    velden: string[],
    van: string,
    tot: string,
    _filter?: unknown,
    accounts?: string[],
  ): Promise<WindsorRij[]> => {
    aanroepen.push({ velden, van, tot, accounts });
    return velden.includes("sessions") ? [{ year_month: "202601", sessions: 10, totalusers: 5 }] : [];
  };
  const stand = await haalKpiStand("2026-11-14", haal as never);
  assert.equal(aanroepen.length, 2);
  for (const a of aanroepen) {
    assert.equal(a.van, "2026-01-01");
    assert.equal(a.tot, "2026-11-14");
    assert.deepEqual(a.accounts, [KPI_PROPERTY]);
    assert.ok(a.velden.includes("year_month"));
  }
  assert.equal(stand.sessies[0], 10);
});

test("een antwoord zonder sessies is een fout, geen jaar vol nullen", async () => {
  const haal = async (): Promise<WindsorRij[]> => [];
  await assert.rejects(haalKpiStand("2026-11-14", haal as never), /geen sessies/);
});
