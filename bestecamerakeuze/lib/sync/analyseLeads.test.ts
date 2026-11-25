import assert from "node:assert/strict";
import { test } from "node:test";
import {
  analyseLeadRecords,
  eersteDag,
  isDoorgestuurd,
  isWebsiteLead,
  leesAangelegd,
  soortWebsiteLead,
} from "@/lib/sync/analyseLeads";

function rij(waarden: Record<string, string>, rijnummer = 2) {
  return { rijnummer, waarden: { Kanaal: "Udenhout.nl", Lead: "x", ...waarden } };
}

test("Aangelegd lezen, met de Nederlandse tijdzone", () => {
  assert.deepEqual(leesAangelegd("23-11-2026 7:40"), { datum: "2026-11-23", tijdstip: "2026-11-23T07:40:00+01:00" });
  assert.deepEqual(leesAangelegd("1-7-2026 14:05"), { datum: "2026-07-01", tijdstip: "2026-07-01T14:05:00+02:00" });
  assert.deepEqual(leesAangelegd("5-1-2026"), { datum: "2026-01-05", tijdstip: "2026-01-05T00:00:00+01:00" });
  assert.equal(leesAangelegd(""), null);
  assert.equal(leesAangelegd("gisteren"), null);
  assert.equal(leesAangelegd("40-13-2026"), null);
});

test("zomertijd begint op de laatste zondag van maart", () => {
  assert.equal(leesAangelegd("28-3-2026 12:00")?.tijdstip.endsWith("+01:00"), true);
  assert.equal(leesAangelegd("29-3-2026 12:00")?.tijdstip.endsWith("+02:00"), true);
  assert.equal(leesAangelegd("25-10-2026 12:00")?.tijdstip.endsWith("+01:00"), true);
});

test("365 dagen terug", () => {
  assert.equal(eersteDag("2026-11-24"), "2025-11-24");
});

test("FW: ergens in het onderwerp, hoofdletterongevoelig", () => {
  assert.equal(isDoorgestuurd("FW: offerte A2"), true);
  assert.equal(isDoorgestuurd("Re: fw: vraag"), true);
  assert.equal(isDoorgestuurd("Offerte A2"), false);
  assert.equal(isDoorgestuurd(null), false);
});

test("alleen de zeven kolommen, 1-op-1, binnen 365 dagen en zonder FW:", () => {
  const rijen = [
    rij({ Ordersoort: "Nieuw", Onderwerp: "Proefrit A2", Kanaalgroep: "Internet", Merk: "Audi", Model: "A2 e-tron", Aangelegd: "23-11-2026 7:40", Sluitreden: "Dubbel" }),
    rij({ Onderwerp: "FW: Proefrit A2", Kanaalgroep: "Internet", Aangelegd: "23-11-2026 8:00" }),
    rij({ Onderwerp: "Oud", Aangelegd: "23-11-2025 9:00" }),
    rij({ Onderwerp: "Precies 365 dagen", Aangelegd: "24-11-2025 9:00" }),
    rij({ Onderwerp: "Geen datum", Aangelegd: "" }),
    rij({ Onderwerp: "Toekomst", Aangelegd: "25-11-2026 9:00" }),
  ];
  const uit = analyseLeadRecords(rijen, "2026-11-24");
  assert.deepEqual(uit.map((r) => r.onderwerp), ["Proefrit A2", "Precies 365 dagen"]);
  assert.deepEqual(uit[0], {
    kanaal: "Udenhout.nl",
    ordersoort: "Nieuw",
    onderwerp: "Proefrit A2",
    kanaalgroep: "Internet",
    merk: "Audi",
    model: "A2 e-tron",
    aangelegd: "23-11-2026 7:40",
    aangelegd_op: "2026-11-23T07:40:00+01:00",
  });
  assert.equal(uit[1].merk, null);
});

test("websitelead: kanaalgroep Internet én udenhout.nl in Kanaal of Onderwerp", () => {
  assert.equal(isWebsiteLead({ kanaalgroep: "Internet", kanaal: "Udenhout.nl", onderwerp: "Proefrit aanvraag" }), true);
  assert.equal(isWebsiteLead({ kanaalgroep: "Internet", kanaal: "Udenhout.nl proefritaanv.", onderwerp: null }), true);
  assert.equal(isWebsiteLead({ kanaalgroep: "Internet", kanaal: "Audi.nl", onderwerp: "Aanvraag via udenhout.nl" }), true);
  // Niet: een ander kanaal, een andere kanaalgroep, of een naam die alleen op udenhout lijkt.
  assert.equal(isWebsiteLead({ kanaalgroep: "Internet", kanaal: "Volkswagen.nl", onderwerp: "Proefrit" }), false);
  assert.equal(isWebsiteLead({ kanaalgroep: "Showroom", kanaal: "Udenhout.nl", onderwerp: "Proefrit" }), false);
  assert.equal(isWebsiteLead({ kanaalgroep: null, kanaal: "Udenhout.nl", onderwerp: null }), false);
  assert.equal(isWebsiteLead({ kanaalgroep: "Internet", kanaal: "UdenhoutPrivateLease.nl", onderwerp: null }), false);
});

test("soort websitelead uit Onderwerp en Kanaal, proefrit eerst", () => {
  assert.equal(soortWebsiteLead({ kanaal: "Udenhout.nl", onderwerp: "Proefrit aanvraag" }), "proefrit");
  assert.equal(soortWebsiteLead({ kanaal: "Udenhout.nl proefritaanv.", onderwerp: null }), "proefrit");
  assert.equal(soortWebsiteLead({ kanaal: "Udenhout.nl", onderwerp: "Offerte private lease" }), "private lease");
  assert.equal(soortWebsiteLead({ kanaal: "Udenhout.nl privatelease aanv.", onderwerp: "Aanvraag" }), "private lease");
  assert.equal(soortWebsiteLead({ kanaal: "Udenhout.nl offerteaanv.", onderwerp: "Module.Car.Index.Mail.Request.Subject.growLease" }), "offerte");
  assert.equal(soortWebsiteLead({ kanaal: "Udenhout.nl", onderwerp: "inruilvoorstel" }), "inruil");
  assert.equal(soortWebsiteLead({ kanaal: "Udenhout.nl contact", onderwerp: "Algemeen contactformulier" }), "overig");
});
