import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_AANTAL, isLeadEvent, leadRijenUitWindsor, schoonParameter, schoonWaarde } from "@/lib/leads/normaliseer";
import type { WindsorRij } from "@/lib/windsor/api";

function rij(over: Partial<Record<string, string | number>> = {}): WindsorRij {
  return {
    date: "2026-11-01",
    event_name: "generate_lead_proefrit",
    session_source_medium: "google / cpc",
    campaign: "T | Branding VDU",
    customevent_car_brand: "Audi",
    customevent_car_model: "Q4 e-tron",
    customevent_form_location: "stock",
    event_count: 2,
    ...over,
  };
}

test("een event telt als lead zodra 'lead' in de naam staat, in elke schrijfwijze", () => {
  assert.equal(isLeadEvent("generate_lead"), true);
  assert.equal(isLeadEvent("generate_lead_HMODH"), true);
  assert.equal(isLeadEvent("Lead_formulier"), true);
  assert.equal(isLeadEvent("page_view"), false);
  assert.equal(isLeadEvent("form_submit"), false);
});

test("(not set) en leeg zijn dezelfde toestand: een lege string", () => {
  assert.equal(schoonWaarde("(not set)"), "");
  assert.equal(schoonWaarde(""), "");
  assert.equal(schoonWaarde(null), "");
  assert.equal(schoonWaarde("  Tiguan  "), "Tiguan");
  assert.equal(schoonWaarde("ID.3   Neo"), "ID.3 Neo");
});

test("een niet-vervangen sjabloonwaarde is geen model", () => {
  assert.equal(schoonParameter("model_titel"), "");
  assert.equal(schoonParameter("Model_Titel"), "");
  assert.equal(schoonParameter("undefined"), "");
  assert.equal(schoonParameter("Tiguan"), "Tiguan");
});

test("het merk blijft staan als alleen het model een sjabloonwaarde is", () => {
  const [lead] = leadRijenUitWindsor([
    rij({ customevent_car_brand: "Škoda", customevent_car_model: "model_titel" }),
  ]);
  assert.equal(lead.merk, "Škoda");
  assert.equal(lead.model, "");
});

test("rijen die geen lead zijn, of zonder aantal, vallen weg", () => {
  const uit = leadRijenUitWindsor([
    rij({ event_name: "page_view" }),
    rij({ event_count: 0 }),
    rij({ date: "" }),
    rij({ event_name: "" }),
    rij(),
  ]);
  assert.equal(uit.length, 1);
});

test("rijen met dezelfde sleutel worden opgeteld, niet vervangen", () => {
  // "(not set)" en een lege waarde landen op dezelfde lege string: twee stukjes van één cijfer.
  const uit = leadRijenUitWindsor([
    rij({ customevent_car_brand: "(not set)", customevent_car_model: "(not set)", event_count: 3 }),
    rij({ customevent_car_brand: "", customevent_car_model: "", event_count: 4 }),
  ]);
  assert.equal(uit.length, 1);
  assert.equal(uit[0].aantal, 7);
});

test("het totaal aantal events blijft gelijk door de opschoning", () => {
  const invoer = [
    rij({ event_count: 5 }),
    rij({ customevent_car_model: "model_titel", event_count: 3 }),
    rij({ session_source_medium: "(direct) / (none)", campaign: "(direct)", event_count: 2 }),
    rij({ event_name: "page_view", event_count: 99 }),
  ];
  const uit = leadRijenUitWindsor(invoer);
  assert.equal(uit.reduce((t, r) => t + r.aantal, 0), 10);
});

test("aantal wordt begrensd op wat de smallint kan dragen", () => {
  const [lead] = leadRijenUitWindsor([rij({ event_count: 40_000 })]);
  assert.equal(lead.aantal, MAX_AANTAL);
});

test("de uitvoer staat op datum en event, ongeacht de volgorde van binnenkomst", () => {
  const uit = leadRijenUitWindsor([
    rij({ date: "2026-11-03", event_name: "generate_lead_offerte" }),
    rij({ date: "2026-11-01", event_name: "generate_lead_proefrit" }),
    rij({ date: "2026-11-01", event_name: "generate_lead_contact" }),
  ]);
  assert.deepEqual(
    uit.map((r) => `${r.datum} ${r.event}`),
    [
      "2026-11-01 generate_lead_contact",
      "2026-11-01 generate_lead_proefrit",
      "2026-11-03 generate_lead_offerte",
    ],
  );
});

test("getallen als tekst uit Windsor tellen gewoon mee", () => {
  const [lead] = leadRijenUitWindsor([rij({ event_count: "6" })]);
  assert.equal(lead.aantal, 6);
});
