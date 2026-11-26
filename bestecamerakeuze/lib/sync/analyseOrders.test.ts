import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ANALYSE_ORDERS_BRON,
  analyseOrderRecords,
  GEEN_KLANTGROEP,
  isKlantOrder,
  klantgroepNaam,
  leesOrderdatum,
  ordertypeVan,
} from "@/lib/sync/analyseOrders";

function rij(waarden: Record<string, string>, rijnummer = 2) {
  return { rijnummer, waarden: { Brandstof: "Benzine", "Autoline Magic": "348489", ...waarden } };
}

test("Orderdatum lezen", () => {
  assert.equal(leesOrderdatum("18-9-2026"), "2026-09-18");
  assert.equal(leesOrderdatum("1-1-2026"), "2026-01-01");
  assert.equal(leesOrderdatum(" 05-11-2026 "), "2026-11-05");
  assert.equal(leesOrderdatum("2026-11-05"), "2026-11-05");
  assert.equal(leesOrderdatum("18-9-2026 10:15"), "2026-09-18");
  assert.equal(leesOrderdatum(""), null);
  assert.equal(leesOrderdatum("202638"), null);
  assert.equal(leesOrderdatum("40-13-2026"), null);
});

test("de bron is het tabblad Data orders met de vijf kolommen", () => {
  assert.equal(ANALYSE_ORDERS_BRON.tabblad, "Data orders");
  assert.deepEqual(Object.keys(ANALYSE_ORDERS_BRON.kolommen), ["Ordersoort", "Klantgroep", "Merk", "Model", "Orderdatum"]);
});

test("alleen de vijf kolommen, 1-op-1, binnen 365 dagen; Handel blijft erin", () => {
  const rijen = [
    rij({ Ordersoort: "Nieuw", Klantgroep: "Private Groeilease", Merk: "Volkswagen", Model: "T-ROC (1)", Orderdatum: "11-6-2026", Campagnes: "Private Groeilease" }),
    rij({ Ordersoort: "Handel", Klantgroep: "", Merk: "Škoda", Model: "Fabia", Orderdatum: "16-5-2026" }),
    rij({ Ordersoort: "Gebruikt", Klantgroep: "Koop Particulier (BM)", Merk: "Audi", Model: "A3", Orderdatum: "23-11-2025" }),
    rij({ Ordersoort: "Gebruikt", Klantgroep: "Rent", Merk: "Audi", Model: "Precies 365 dagen", Orderdatum: "24-11-2025" }),
    rij({ Ordersoort: "Nieuw", Klantgroep: "Demo", Merk: "SEAT", Model: "Geen datum", Orderdatum: "" }),
    rij({ Ordersoort: "Nieuw", Klantgroep: "Demo", Merk: "SEAT", Model: "Toekomst", Orderdatum: "25-11-2026" }),
  ];
  const uit = analyseOrderRecords(rijen, "2026-11-24");
  assert.deepEqual(uit.map((r) => r.model), ["T-ROC (1)", "Fabia", "Precies 365 dagen"]);
  assert.deepEqual(uit[0], {
    ordersoort: "Nieuw",
    klantgroep: "Private Groeilease",
    merk: "Volkswagen",
    model: "T-ROC (1)",
    orderdatum: "11-6-2026",
    orderdatum_op: "2026-06-11",
  });
  assert.equal(uit[1].klantgroep, null);
});

test("verkoop aan klanten: Nieuw en Gebruikt, niet Handel", () => {
  assert.equal(isKlantOrder({ ordersoort: "Nieuw" }), true);
  assert.equal(isKlantOrder({ ordersoort: "Gebruikt" }), true);
  assert.equal(isKlantOrder({ ordersoort: "Handel" }), false);
  assert.equal(isKlantOrder({ ordersoort: null }), false);
});

test("een lege klantgroep heet Geen klantgroep", () => {
  assert.equal(klantgroepNaam({ klantgroep: null }), GEEN_KLANTGROEP);
  assert.equal(klantgroepNaam({ klantgroep: "Dealer Lease" }), "Dealer Lease");
});

test("Ordertype: Handel op ordersoort, de rest op klantgroep", () => {
  assert.equal(ordertypeVan({ ordersoort: "Handel", klantgroep: null }), "Handel");
  assert.equal(ordertypeVan({ ordersoort: "Handel", klantgroep: "Dealer Lease" }), "Handel");
  assert.equal(ordertypeVan({ ordersoort: "Nieuw", klantgroep: "Handel" }), "Handel");
  assert.equal(ordertypeVan({ ordersoort: "Nieuw", klantgroep: "Rent" }), "Verhuur (Rent)");
  assert.equal(ordertypeVan({ ordersoort: "Nieuw", klantgroep: "Rentals ext" }), "Verhuur (Rent)");
  assert.equal(ordertypeVan({ ordersoort: "Nieuw", klantgroep: "Private Groeilease" }), "Private lease");
  assert.equal(ordertypeVan({ ordersoort: "Nieuw", klantgroep: "Dealer Lease" }), "Zakelijke lease");
  assert.equal(ordertypeVan({ ordersoort: "Gebruikt", klantgroep: "Koop Particulier (BM)" }), "Koop particulier");
  assert.equal(ordertypeVan({ ordersoort: "Nieuw", klantgroep: "BEDRIJF_TB" }), "Koop zakelijk");
  assert.equal(ordertypeVan({ ordersoort: "Nieuw", klantgroep: "Demo" }), "Demo");
  assert.equal(ordertypeVan({ ordersoort: "Nieuw", klantgroep: "Restmarge deal" }), "Overig");
  assert.equal(ordertypeVan({ ordersoort: "Nieuw", klantgroep: null }), "Overig");
});
