import assert from "node:assert/strict";
import { test } from "node:test";
import { SYNTEC_KPIS, beschrijfRegel, classificeerLead } from "@/lib/kpi2027syntec/definities";
import { pasSyntecGroeiToe, syntecOverzicht, voortgang, type SyntecTelling } from "@/lib/kpi2027syntec/rekenen";

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

test("inruilvoorstel en contact rekenen vanaf april: januari t/m maart bijgeschat met dat gemiddelde", () => {
  const tellingen: SyntecTelling[] = [
    { kanaal: "Udenhout.nl inruilvoorstel", onderwerp: "", maand: 1, aantal: 1 },
    { kanaal: "Udenhout.nl inruilvoorstel", onderwerp: "", maand: 2, aantal: 1 },
    // april t/m juni: 91 dagen, 91 inruilvoorstellen → één per dag.
    { kanaal: "Udenhout.nl", onderwerp: "inruilvoorstel", maand: 4, aantal: 30 },
    { kanaal: "Udenhout.nl", onderwerp: "inruilvoorstel", maand: 5, aantal: 31 },
    { kanaal: "Udenhout.nl", onderwerp: "inruilvoorstel", maand: 6, aantal: 30 },
    { kanaal: "Seat.nl", onderwerp: "", maand: 1, aantal: 181 },
  ];
  const o = syntecOverzicht(tellingen, "2026-06-30");
  const eigen = o.groepen.find((g) => g.sleutel === "eigen-website")!;
  const inruil = eigen.kpis.find((k) => k.sleutel === "inruil")!;
  const u = inruil.uitkomst;

  // De twee oude inruilvoorstellen van januari en februari tellen niet mee.
  assert.equal(u.gerealiseerd, 91);
  assert.equal(u.perDag, 1);
  assert.equal(u.verwacht, 365);
  assert.equal(u.dagenNietGemeten, 90);
  assert.deepEqual(u.maanden.slice(0, 4).map((m) => m.soort), ["bijgeschat", "bijgeschat", "bijgeschat", "gerealiseerd"]);
  assert.equal(u.maanden[0].verwacht, 31);
  // De tooltip legt uit waarom de maand bijgeschat is — niet met de tekst over websitesessies.
  assert.match(u.maanden[0].toelichting ?? "", /rekent vanaf 1 april 2026/);
  assert.equal(u.maanden[3].toelichting ?? null, null);
  // "Wat telt mee" toont alleen wat in de verwachting zit.
  assert.deepEqual(inruil.bron.map((b) => b.aantal), [0, 91]);
  assert.ok(inruil.keuzes[0].startsWith("Rekent vanaf 1 april 2026"));
  // Het onderwerp van een andere KPI rekent gewoon vanaf januari.
  const seat = o.groepen.find((g) => g.sleutel === "pah")!.kpis.find((k) => k.sleutel === "seat-nl")!;
  assert.equal(seat.uitkomst.dagenNietGemeten, 0);
});

test("een totaal is precies de som van zijn kaarten, ook als een KPI vanaf april rekent", () => {
  const tellingen: SyntecTelling[] = [
    { kanaal: "Udenhout.nl proefritaanv.", onderwerp: "", maand: 1, aantal: 100 },
    { kanaal: "Udenhout.nl", onderwerp: "Proefrit aanvraag", maand: 5, aantal: 120 },
    { kanaal: "Udenhout.nl", onderwerp: "Algemeen contactformulier", maand: 5, aantal: 20 },
  ];
  const o = syntecOverzicht(tellingen, "2026-06-30");
  const eigen = o.groepen.find((g) => g.sleutel === "eigen-website")!;
  const somTarget = eigen.kpis.reduce((t, k) => t + k.uitkomst.target, 0);
  const somVerwacht = eigen.kpis.reduce((t, k) => t + k.uitkomst.verwacht, 0);
  assert.ok(Math.abs(eigen.totaal.uitkomst.target - somTarget) < 1e-9);
  assert.ok(Math.abs(eigen.totaal.uitkomst.verwacht - somVerwacht) < 1e-9);
  for (let i = 0; i < 12; i++) {
    const som = eigen.kpis.reduce((t, k) => t + k.uitkomst.maanden[i].verwacht, 0);
    assert.ok(Math.abs(eigen.totaal.uitkomst.maanden[i].verwacht - som) < 1e-9);
  }
  // Januari: proefrit gemeten, contact bijgeschat → in het totaal bijgeschat, met uitleg.
  assert.equal(eigen.totaal.uitkomst.maanden[0].soort, "bijgeschat");
  assert.match(eigen.totaal.uitkomst.maanden[0].toelichting ?? "", /waarvan 100 gemeten; .*contact.* bijgeschat/);
  assert.ok(eigen.totaal.keuzes.some((k) => k.includes("rekenen vanaf 1 april 2026")));
  // Bij de PAH zit geen KPI die vanaf april rekent, dus ook geen regel daarover.
  const pah = o.groepen.find((g) => g.sleutel === "pah")!;
  assert.ok(!pah.totaal.keuzes.some((k) => k.includes("1 april")));
  assert.equal(pah.totaal.uitkomst.maanden[0].soort, "gerealiseerd");
});

test("meetVanaf is altijd de eerste van een maand (de tellingen staan per maand)", () => {
  for (const kpi of SYNTEC_KPIS) {
    if (kpi.meetVanaf) assert.match(kpi.meetVanaf, /^\d{4}-\d{2}-01$/, kpi.naam);
  }
});

test("offerte + private lease is de som van beide, met hun eigen doel, en telt niet mee in het totaal", () => {
  const tellingen: SyntecTelling[] = [
    { kanaal: "Udenhout.nl offerteaanv.", onderwerp: "Offerte aanvraag", maand: 2, aantal: 300 },
    { kanaal: "Udenhout.nl offerteaanv.", onderwerp: "Module.Car.Index.Mail.Request.Subject.growLease", maand: 2, aantal: 100 },
    { kanaal: "Udenhout.nl", onderwerp: "Offerte private lease", maand: 6, aantal: 150 },
    { kanaal: "Udenhout.nl", onderwerp: "Proefrit aanvraag", maand: 6, aantal: 50 },
  ];
  const o = syntecOverzicht(tellingen, "2026-12-31");
  const eigen = o.groepen.find((g) => g.sleutel === "eigen-website")!;
  const samen = eigen.combinaties.find((c) => c.sleutel === "offerte-en-private-lease")!;
  assert.equal(samen.uitkomst.verwacht, 550);
  assert.equal(samen.doel2026, 3250 + 500);
  assert.deepEqual(samen.onderdelen, ["Udenhout.nl offerteaanvraag", "Udenhout.nl private lease aanvraag"]);
  assert.ok(samen.keuzes[0].startsWith("Offerteaanvraag en private lease aanvraag samen"));
  // Het groepstotaal telt de losse KPI's, niet de combinatie erbij.
  assert.equal(eigen.totaal.uitkomst.verwacht, 600);
  assert.equal(o.groepen.find((g) => g.sleutel === "pah")!.combinaties.length, 0);
});

test("voortgang: realisatie tegen het lineaire target tot vandaag", () => {
  // 365 per jaar, peildatum 10 januari → 10 hoort binnen te zijn.
  const v = voortgang(365, { waarde: 12, peildatum: "2027-01-10" })!;
  assert.equal(v.dagen, 10);
  assert.ok(Math.abs(v.targetTotNu - 10) < 1e-9);
  assert.ok(Math.abs(v.afwijking - 0.2) < 1e-9);
  assert.ok(Math.abs(voortgang(365, { waarde: 8, peildatum: "2027-01-10" })!.afwijking + 0.2) < 1e-9);
  // 2027 nog niet begonnen, of geen target: geen voortgang.
  assert.equal(voortgang(365, { waarde: 0, peildatum: null }), null);
  assert.equal(voortgang(0, { waarde: 5, peildatum: "2027-01-10" }), null);
});

test("een aangepast percentage telt door in totaal en combinatie, en de browser rekent hetzelfde als de server", () => {
  const tellingen: SyntecTelling[] = [
    { kanaal: "Udenhout.nl offerteaanv.", onderwerp: "Offerte aanvraag", maand: 2, aantal: 300 },
    { kanaal: "Udenhout.nl", onderwerp: "Offerte private lease", maand: 6, aantal: 150 },
    { kanaal: "Udenhout.nl", onderwerp: "Proefrit aanvraag", maand: 6, aantal: 50 },
    { kanaal: "Volkswagen.nl", onderwerp: "", maand: 2, aantal: 30 },
  ];
  const server = syntecOverzicht(tellingen, "2026-12-31", { groei: new Map([["offerte", 0.2]]) });
  const eigen = server.groepen.find((g) => g.sleutel === "eigen-website")!;
  const offerte = eigen.kpis.find((k) => k.sleutel === "offerte")!;
  assert.equal(offerte.groeiAangepast, true);
  assert.ok(Math.abs(offerte.uitkomst.target - 360) < 1e-9);
  // Totaal: 360 + 150 × 1,05 + 50 × 1,05 = 570; groei = 570 / 500 − 1.
  assert.ok(Math.abs(eigen.totaal.uitkomst.target - 570) < 1e-9);
  assert.ok(Math.abs(eigen.totaal.uitkomst.groei - 0.14) < 1e-9);
  const samen = eigen.combinaties.find((c) => c.sleutel === "offerte-en-private-lease")!;
  assert.ok(Math.abs(samen.uitkomst.target - (360 + 157.5)) < 1e-9);
  assert.ok(Math.abs(server.totaal.uitkomst.target - (570 + 31.5)) < 1e-9);

  const browser = pasSyntecGroeiToe(syntecOverzicht(tellingen, "2026-12-31"), "offerte", 0.2);
  assert.deepEqual(browser, server);
  // En terug naar de standaard.
  assert.deepEqual(pasSyntecGroeiToe(server, "offerte", null), syntecOverzicht(tellingen, "2026-12-31"));
});

test("eerdere jaren: per KPI en per totaal de maanden met dezelfde definitie, zonder meetVanaf", () => {
  const eerdereJaren = [
    {
      jaar: 2025,
      tellingen: [
        { kanaal: "Udenhout.nl inruilvoorstel", onderwerp: "", maand: 1, aantal: 2 },
        { kanaal: "Udenhout.nl offerteaanv.", onderwerp: "Offerte aanvraag", maand: 3, aantal: 40 },
        { kanaal: "Udenhout.nl offerteaanv.", onderwerp: "FW: contactformulier", maand: 3, aantal: 9 },
        { kanaal: "Skoda.nl", onderwerp: "", maand: 12, aantal: 7 },
      ],
    },
    { jaar: 2024, tellingen: [{ kanaal: "Skoda.nl", onderwerp: "", maand: 5, aantal: 11 }] },
  ];
  const o = syntecOverzicht([], "2026-11-14", { eerdereJaren });
  const eigen = o.groepen.find((g) => g.sleutel === "eigen-website")!;
  const inruil = eigen.kpis.find((k) => k.sleutel === "inruil")!;
  // Oudste jaar eerst; inruil telt januari 2025 gewoon mee (meetVanaf geldt alleen voor 2026).
  assert.deepEqual(inruil.eerdereJaren.map((j) => j.jaar), [2024, 2025]);
  assert.equal(inruil.eerdereJaren[1].maanden[0], 2);
  // Doorgestuurde mails tellen ook in eerdere jaren niet mee.
  assert.equal(eigen.kpis.find((k) => k.sleutel === "offerte")!.eerdereJaren[1].totaal, 40);
  assert.equal(eigen.totaal.eerdereJaren[1].totaal, 42);
  assert.deepEqual(o.totaal.eerdereJaren.map((j) => j.totaal), [11, 49]);
  // Zonder eerdere jaren: geen lijnen.
  assert.deepEqual(syntecOverzicht([], "2026-11-14").totaal.eerdereJaren, []);
});
