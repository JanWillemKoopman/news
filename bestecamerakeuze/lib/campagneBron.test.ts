import assert from "node:assert/strict";
import { test } from "node:test";
import { bronVanCampagne } from "@/lib/campagneBron";

const leeg = { leads: null, doelLeads: null, doelOrders: null };
const regel = { events: ["generate_lead_proefrit"], voorwaarden: [] };

test("een GA-koppeling of GA-doel maakt de campagne Google Analytics", () => {
  assert.equal(bronVanCampagne(leeg, { regels: [regel], doelConversies: null }), "ga");
  assert.equal(bronVanCampagne(leeg, { regels: [], doelConversies: 105 }), "ga");
});

test("leads of een doel op leads of orders maakt hem Syntec", () => {
  assert.equal(bronVanCampagne({ ...leeg, leads: 1820 }, undefined), "syntec");
  assert.equal(bronVanCampagne({ ...leeg, doelLeads: 200 }, undefined), "syntec");
  assert.equal(bronVanCampagne({ ...leeg, doelOrders: 850 }, { regels: [], doelConversies: null }), "syntec");
});

test("nul leads telt niet als Syntec", () => {
  assert.equal(bronVanCampagne({ ...leeg, leads: 0 }, undefined), null);
});

test("allebei: Google Analytics wint", () => {
  assert.equal(bronVanCampagne({ leads: 40, doelLeads: 100, doelOrders: 20 }, { regels: [regel], doelConversies: null }), "ga");
});

test("niets ingevuld: geen bron, niets gedimd", () => {
  assert.equal(bronVanCampagne(leeg, undefined), null);
  assert.equal(bronVanCampagne(leeg, { regels: [], doelConversies: null }), null);
});
