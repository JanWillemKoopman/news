import assert from "node:assert/strict";
import { test } from "node:test";
import { SYNTEC_KPIS, beschrijfRegel, classificeerLead } from "@/lib/kpi2027syntec/definities";
import { syntecOverzicht, type SyntecTelling } from "@/lib/kpi2027syntec/rekenen";

function kpiVan(kanaal: string, onderwerp: string): string | null {
  return classificeerLead(kanaal, onderwerp)?.kpi.sleutel ?? null;
}

test("het oude offertekanaal is offerte, behalve de groeilease en doorgestuurde mails", () => {
  assert.equal(kpiVan("Udenhout.nl offerteaanv.", "Offerte aanvraag"), "offerte");
  assert.equal(kpiVan("Udenhout.nl offerteaanv.", ""), "offerte");
  assert.equal(kpiVan("Udenhout.nl offerteaanv.", "Module.Car.Index.Mail.Request.Subject.growLease"), "private-lease");
  assert.equal(kpiVan("Udenhout.nl offerteaanv.", "FW: contactformulier"), null);
  assert.equal(kpiVan("Udenhout.nl offerteaanv.", "fw: een viabovag.nl bezoeker met interesse"), null);
});

test("het nieuwe kanaal Udenhout.nl deelt in op onderwerp", () => {
  assert.equal(kpiVan("Udenhout.nl", "Offerte aanvraag"), "offerte");
  assert.equal(kpiVan("Udenhout.nl", "Offerteaanvraag"), "offerte");
  assert.equal(kpiVan("Udenhout.nl", "Proefrit aanvraag"), "proefrit");
  assert.equal(kpiVan("Udenhout.nl", "Proefritaanvraag"), "proefrit");
  assert.equal(kpiVan("Udenhout.nl", "Proefrit Raval Breda"), "proefrit");
  assert.equal(kpiVan("Udenhout.nl", "Offerte private lease"), "private-lease");
  assert.equal(kpiVan("Udenhout.nl", "Offerte private lease Volkswagen ID.Polo"), "private-lease");
  assert.equal(kpiVan("Udenhout.nl", "Private lease offerte"), "private-lease");
  assert.equal(kpiVan("Udenhout.nl", "inruilvoorstel"), "inruil");
  assert.equal(kpiVan("Udenhout.nl", "Inruilaanvraag"), "inruil");
  assert.equal(kpiVan("Udenhout.nl", "Algemeen contactformulier"), "contact");
  // Een offerte met de modelnaam erachter is net zo goed een offerte.
  assert.equal(kpiVan("Udenhout.nl", "Offerte aanvraag Volkswagen ID.4"), "offerte");
  assert.equal(kpiVan("Udenhout.nl", "Online offerte aanvraag Audi A5 via Private Lease"), null);
  assert.equal(kpiVan("Udenhout.nl", ""), null);
});

test("hoofdletters en spaties aan de randen maken niet uit", () => {
  assert.equal(kpiVan("  udenhout.nl  ", "  PROEFRIT AANVRAAG "), "proefrit");
  assert.equal(kpiVan("VIABOVAG.NL_TB", ""), "viabovag");
});

test("merksites en portals gaan op kanaal; uitzonderingen zoals afgesproken", () => {
  assert.equal(kpiVan("Volkswagen.nl", ""), "volkswagen-nl");
  assert.equal(kpiVan("Audi Proefritmodule", "Audi Proefritmodule"), "audi-nl");
  assert.equal(kpiVan("VWPFS private lease aanvraag", "Private lease aanvraag VWPFS"), "vwpfs");
  assert.equal(kpiVan("VWPFS private lease aanvraag", "VWPFS Retentie financiering | contractnummer: 1"), null);
  assert.equal(kpiVan("Autotrader.nl", ""), "autoscout24");
  // Bij de merksites tellen doorgestuurde mails gewoon mee: daar beslist het kanaal.
  assert.equal(kpiVan("Skoda.nl", "FW: aanvraag"), "skoda-nl");
  // Buiten alle KPI's.
  assert.equal(kpiVan("ID.Polo Reservering (PAH)", ""), null);
  assert.equal(kpiVan("Udenhout.nl CHAT aanvr.", ""), null);
  assert.equal(kpiVan("SaySimple whatsapp", "Nieuwe lead"), null);
  assert.equal(kpiVan("Udenhout.nl bel-me-terug", ""), null);
});

test("geen lead telt bij twee KPI's", () => {
  // Voor elke regel een lead die er precies aan voldoet, en die mag maar één KPI raken.
  for (const kpi of SYNTEC_KPIS) {
    for (const regel of kpi.regels) {
      const onderwerp = regel.onderwerpIs?.[0] ?? regel.onderwerpBegintMet?.[0] ?? regel.onderwerpBevat?.[0] ?? "";
      for (const kanaal of regel.kanalen) {
        const treffers = SYNTEC_KPIS.filter((k) => classificeerLead(kanaal, onderwerp, [k]) !== null);
        assert.deepEqual(
          treffers.map((k) => k.sleutel),
          [kpi.sleutel],
          `${kanaal} / ${onderwerp} raakt ${treffers.map((k) => k.sleutel).join(", ")}`,
        );
      }
    }
  }
});

test("het overzicht telt per KPI, per groep en in totaal op, en rekent +5%", () => {
  const tellingen: SyntecTelling[] = [
    { kanaal: "Udenhout.nl offerteaanv.", onderwerp: "Offerte aanvraag", maand: 1, aantal: 100 },
    { kanaal: "Udenhout.nl offerteaanv.", onderwerp: "Module.Car.Index.Mail.Request.Subject.growLease", maand: 1, aantal: 40 },
    { kanaal: "Udenhout.nl", onderwerp: "Offerte aanvraag", maand: 5, aantal: 60 },
    { kanaal: "Volkswagen.nl", onderwerp: "", maand: 2, aantal: 30 },
    { kanaal: "Autotrack.nl", onderwerp: "", maand: 3, aantal: 10 },
    { kanaal: "SaySimple whatsapp", onderwerp: "Nieuwe lead", maand: 4, aantal: 7 },
  ];
  // Peildatum 31 december: alles gemeten, de verwachting is de realisatie.
  const o = syntecOverzicht(tellingen, "2026-12-31");
  const eigen = o.groepen.find((g) => g.sleutel === "eigen-website")!;
  const offerte = eigen.kpis.find((k) => k.sleutel === "offerte")!;
  const pl = eigen.kpis.find((k) => k.sleutel === "private-lease")!;

  assert.equal(offerte.uitkomst.verwacht, 160);
  assert.equal(offerte.uitkomst.maanden[0].verwacht, 100);
  assert.equal(offerte.uitkomst.maanden[4].verwacht, 60);
  assert.deepEqual(offerte.bron.map((b) => b.aantal), [100, 60]);
  assert.equal(pl.uitkomst.verwacht, 40);
  assert.equal(eigen.totaal.uitkomst.verwacht, 200);
  assert.equal(eigen.totaal.doel2026, 3250 + 1875 + 500 + 7 + 122);
  assert.equal(o.totaal.uitkomst.verwacht, 240);
  assert.equal(o.totaal.doel2026, 11157);
  assert.ok(Math.abs(o.totaal.uitkomst.target - 252) < 1e-9);
  assert.equal(o.nietIngedeeld, 7);
});

test("de verwachting trekt het daggemiddelde door, net als KPI's 2027", () => {
  // 318 leads t/m 14 november (318 dagen) → één per dag, dus 365 over het hele jaar.
  const o = syntecOverzicht([{ kanaal: "Seat.nl", onderwerp: "", maand: 1, aantal: 318 }], "2026-11-14");
  const seat = o.groepen.find((g) => g.sleutel === "pah")!.kpis.find((k) => k.sleutel === "seat-nl")!;
  assert.equal(seat.uitkomst.gerealiseerd, 318);
  assert.ok(Math.abs(seat.uitkomst.verwacht - 365) < 1e-9);
  assert.ok(Math.abs(seat.uitkomst.target - 365 * 1.05) < 1e-9);
});

test("de bronregel is leesbaar", () => {
  assert.equal(
    beschrijfRegel({ kanalen: ["Udenhout.nl"], onderwerpIs: ["Offerte aanvraag", "Offerteaanvraag"] }),
    "kanaal ‘Udenhout.nl’, onderwerp ‘Offerte aanvraag’ of ‘Offerteaanvraag’",
  );
});

test("elke KPI legt zijn keuzes uit, en elke regel van de eigen website zegt over welke periode hij gaat", () => {
  for (const kpi of SYNTEC_KPIS) {
    assert.ok(kpi.keuzes.length > 0, `${kpi.naam} heeft geen keuzes`);
    if (kpi.groep === "eigen-website") {
      for (const r of kpi.regels) assert.ok(r.periode, `${kpi.naam}: regel zonder periode`);
    }
  }
});

test("de controle op 2025 telt per KPI en per totaal, en de bron draagt de periode", () => {
  const vorigJaar: SyntecTelling[] = [
    { kanaal: "Udenhout.nl proefritaanv.", onderwerp: "Proefrit aanvraag", maand: 3, aantal: 1500 },
    { kanaal: "Udenhout.nl proefritaanv.", onderwerp: "Proefrit aanvraag", maand: 9, aantal: 82 },
    { kanaal: "Skoda.nl", onderwerp: "", maand: 6, aantal: 1068 },
    { kanaal: "SaySimple whatsapp", onderwerp: "", maand: 6, aantal: 5 },
  ];
  const o = syntecOverzicht([], "2026-11-14", { vorigJaar });
  const eigen = o.groepen.find((g) => g.sleutel === "eigen-website")!;
  const proefrit = eigen.kpis.find((k) => k.sleutel === "proefrit")!;
  assert.equal(proefrit.vorigJaar, 1582);
  assert.equal(proefrit.bron[0].periode, "t/m maart 2026, eigen kanaal per formulier");
  assert.equal(eigen.totaal.vorigJaar, 1582);
  assert.equal(o.totaal.vorigJaar, 1582 + 1068);
  assert.ok(o.totaal.keuzes.length > 0);
  // Zonder 2025 is er geen controle, en dat is geen nul.
  assert.equal(syntecOverzicht([], "2026-11-14").totaal.vorigJaar, null);
});

test("de realisatie van 2027 telt per KPI en per totaal, en is nul zolang 2027 niet begonnen is", () => {
  const doeljaar = {
    tellingen: [
      { kanaal: "Udenhout.nl", onderwerp: "Proefrit aanvraag", maand: 1, aantal: 12 },
      { kanaal: "Seat.nl", onderwerp: "", maand: 1, aantal: 3 },
    ],
    peildatum: "2027-01-09",
  };
  const o = syntecOverzicht([], "2026-12-31", { doeljaar });
  const proefrit = o.groepen[0].kpis.find((k) => k.sleutel === "proefrit")!;
  assert.deepEqual(proefrit.realisatie, { waarde: 12, peildatum: "2027-01-09" });
  assert.deepEqual(o.totaal.realisatie, { waarde: 15, peildatum: "2027-01-09" });
  assert.deepEqual(syntecOverzicht([], "2026-11-14").totaal.realisatie, { waarde: 0, peildatum: null });
});
