import assert from "node:assert/strict";
import { test } from "node:test";
import {
  deelOpInLopendEnAfgelopen,
  doorstroom,
  formatWaarde,
  isAfgelopen,
  leesBedrag,
  bedrijvenLabel,
  leesCampagneInvoer,
  leesPaginas,
  paginaKort,
  paginaSleutel,
  sorteerVoorstellen,
  leesDoelGetal,
  doelVraagtSyntec,
  leadBron,
  overzichtCijfers,
  leesOpzetInvoer,
  rapportageNaam,
  sorteerOpzetten,
  leesModellen,
  merkSleutel,
  merkSleutels,
  merkenVoorMail,
  STANDAARD_MERKEN,
  leesSemantiek,
  looptijdLabel,
  normaliseerResultaat,
  actiesUitTabbladen,
  syntecVanToepassing,
  tabbladenVoor,
  vandaagNL,
  versieLabel,
} from "@/lib/marketingAnalyse/rekenen";
import { ANALYSE_TABBLADEN, SEMANTIEK_BLOKKEN } from "@/lib/marketingAnalyse/types";


const CAMPAGNE = { id: "c", formulier: "campagne" as const, bedrijven: [] as string[] };
const VDU_MAAND = { id: "r", formulier: "rapportage" as const, bedrijven: ["Van den Udenhout"] };

test("bedragen in Nederlandse en Engelse notatie", () => {
  assert.equal(leesBedrag("5000"), 5000);
  assert.equal(leesBedrag("5.000"), 5000);
  assert.equal(leesBedrag("€ 5.000,50"), 5000.5);
  assert.equal(leesBedrag("2500.5"), 2500.5);
  assert.equal(leesBedrag(1200), 1200);
  assert.equal(leesBedrag(""), null);
  assert.equal(leesBedrag("veel"), null);
  assert.equal(leesBedrag("-10"), null);
});

test("modellen uit tekst of lijst, zonder dubbele", () => {
  assert.deepEqual(leesModellen("A2 e-tron, Q4\nq4 ; Q6"), ["A2 e-tron", "Q4", "Q6"]);
  assert.deepEqual(leesModellen(["A2", " ", 3, "A2"]), ["A2"]);
  assert.deepEqual(leesModellen(undefined), []);
});

test("naam en bedrijf zijn verplicht", () => {
  assert.equal(leesCampagneInvoer({ naam: " ", bedrijf: "Van den Udenhout" }, CAMPAGNE).ok, false);
  assert.equal(leesCampagneInvoer({ naam: "Audi A2" }, CAMPAGNE).ok, false);
  const u = leesCampagneInvoer({ naam: " Audi A2 ", bedrijf: "Van den Udenhout" }, CAMPAGNE);
  assert.ok(u.ok);
  if (u.ok) {
    assert.equal(u.invoer.naam, "Audi A2");
    assert.deepEqual(u.invoer.modellen, []);
    assert.equal(u.invoer.dataCorrectie, null);
  }
});

test("een volledige briefing wordt opgeschoond", () => {
  const u = leesCampagneInvoer({
    naam: "Audi A2",
    bedrijf: "Van den Udenhout",
    merk: "Audi",
    modellen: "A2 e-tron",
    startdatum: "2026-09-18",
    einddatum: "2026-12-31",
    doel: "20 proefritaanvragen",
    budget: "5.000",
    omschrijving: "Introductie.",
    dataCorrectie: "De post van 3 oktober hoort er niet bij.",
  }, CAMPAGNE);
  assert.ok(u.ok);
  if (u.ok) {
    assert.equal(u.invoer.budget, 5000);
    assert.deepEqual(u.invoer.modellen, ["A2 e-tron"]);
    assert.equal(u.invoer.dataCorrectie, "De post van 3 oktober hoort er niet bij.");
  }
});

test("einddatum vóór de start en een onleesbaar budget worden geweigerd", () => {
  const basis = { naam: "X", bedrijf: "PGZ" };
  assert.equal(leesCampagneInvoer({ ...basis, startdatum: "2026-10-01", einddatum: "2026-09-01" }, CAMPAGNE).ok, false);
  assert.equal(leesCampagneInvoer({ ...basis, budget: "vijfduizend" }, CAMPAGNE).ok, false);
  const u = leesCampagneInvoer({ ...basis, startdatum: "18-09-2026" }, CAMPAGNE);
  assert.ok(u.ok && u.invoer.startdatum === null);
});

test("vandaag in Nederland, ook rond middernacht UTC", () => {
  assert.equal(vandaagNL(new Date("2026-11-23T23:30:00Z")), "2026-11-24");
  assert.equal(vandaagNL(new Date("2026-07-01T21:59:00Z")), "2026-07-01");
});

test("afgelopen pas na de einddatum; lopend bovenaan op startdatum", () => {
  assert.equal(isAfgelopen("2026-11-24", "2026-11-24"), false);
  assert.equal(isAfgelopen("2026-11-23", "2026-11-24"), true);
  assert.equal(isAfgelopen(null, "2026-11-24"), false);
  const { lopend, afgelopen } = deelOpInLopendEnAfgelopen(
    [
      { naam: "oud", startdatum: "2026-01-01", einddatum: "2026-02-01" },
      { naam: "nieuw", startdatum: "2026-11-01", einddatum: null },
      { naam: "a2", startdatum: "2026-09-18", einddatum: "2026-12-31" },
      { naam: "zonder", startdatum: null, einddatum: null },
      { naam: "net-af", startdatum: "2026-06-01", einddatum: "2026-11-23" },
    ],
    "2026-11-24",
  );
  assert.deepEqual(lopend.map((c) => c.naam), ["nieuw", "a2", "zonder"]);
  assert.deepEqual(afgelopen.map((c) => c.naam), ["net-af", "oud"]);
});

test("semantic layer: alle blokken aanwezig, terugval voor wat ontbreekt", () => {
  const terugval = leesSemantiek({
    bedrijven: ["Van den Udenhout", "PGZ"],
    blokken: Object.fromEntries(SEMANTIEK_BLOKKEN.map((b) => [b.sleutel, `standaard ${b.sleutel}`])),
  });
  const s = leesSemantiek({ blokken: { ga4: "Eigen tekst\r\nregel 2" } }, terugval);
  assert.equal(s.blokken.ga4, "Eigen tekst\nregel 2");
  assert.equal(s.blokken.algemeen, "standaard algemeen");
  assert.deepEqual(s.bedrijven, ["Van den Udenhout", "PGZ"]);
  assert.equal(Object.keys(s.blokken).length, SEMANTIEK_BLOKKEN.length);
  // Een leeg blok mag bewust leeg blijven.
  assert.equal(leesSemantiek({ blokken: { meta_ads: "" } }, terugval).blokken.meta_ads, "");
});

test("waarden per eenheid", () => {
  assert.equal(formatWaarde(null), "—");
  assert.equal(formatWaarde(12345), "12.345");
  assert.equal(formatWaarde(3.456, "procent"), "3,5%");
  assert.equal(formatWaarde(95, "seconden"), "1:35 min");
  assert.match(formatWaarde(1960.8, "euro"), /1\.961/);
  assert.match(formatWaarde(0.15, "euro"), /0,15/);
  assert.equal(formatWaarde("n.v.t."), "n.v.t.");
});

test("doorstroom alleen tussen twee aantallen en niet boven 100%", () => {
  const d = doorstroom([
    { label: "Kosten", waarde: 1960, eenheid: "euro" },
    { label: "Vertoningen", waarde: 100_000, eenheid: "aantal" },
    { label: "Klikken", waarde: 2_000, eenheid: "aantal" },
    { label: "Sessies", waarde: null, eenheid: "aantal" },
    { label: "Lead-events", waarde: 23, eenheid: "aantal" },
    { label: "Leads Syntec", waarde: 61, eenheid: "aantal" },
  ]);
  assert.deepEqual(d, [null, null, 2, null, null, null]);
});

test("labels voor versie en looptijd", () => {
  assert.equal(versieLabel(2, "2026-11-23T10:00:00Z"), "v2 · 23 nov 2026");
  assert.equal(looptijdLabel("2026-09-18", "2026-12-31"), "18 sep – 31 dec 2026");
  assert.equal(looptijdLabel("2026-11-01", "2027-01-31"), "1 nov 2026 – 31 jan 2027");
  assert.equal(looptijdLabel(null, null), "Geen looptijd");
});

test("een onvolledig resultaat laat de weergave niet vastlopen", () => {
  const r = normaliseerResultaat({
    samenvatting: { kop: "Goed op weg", regels: ["1", "2", "3", "4", "5", "6"] },
    secties: [
      { stap: 3, titel: "Leads" },
      { stap: 1, titel: "Bereik" },
    ],
  });
  assert.equal(r.samenvatting.regels.length, 5);
  assert.deepEqual(r.funnel, []);
  assert.deepEqual(r.correcties, []);
  assert.deepEqual(r.semantiekVoorstellen, []);
  assert.deepEqual(r.secties.map((s) => s.titel), ["Bereik", "Leads"]);
  assert.deepEqual(normaliseerResultaat(null).secties, []);
});

test("rapportage: vast bedrijf, periode verplicht, campagnevelden vallen weg", () => {
  assert.equal(leesCampagneInvoer({ naam: "VDU maand" }, VDU_MAAND).ok, false);
  const u = leesCampagneInvoer(
    { naam: "VDU maandrapportage november", bedrijf: "PGZ", periodeTekst: " Afgelopen 3 maanden ", merk: "Audi", budget: "5000" },
    VDU_MAAND,
  );
  assert.ok(u.ok);
  if (u.ok) {
    assert.deepEqual(u.invoer.bedrijven, ["Van den Udenhout"]);
    assert.equal(u.invoer.periodeTekst, "Afgelopen 3 maanden");
    assert.equal(u.invoer.merk, null);
    assert.equal(u.invoer.budget, null);
    assert.equal(u.invoer.opzetId, "r");
  }
  const c = leesCampagneInvoer({ naam: "A2", bedrijf: "VELOO", periodeTekst: "x" }, CAMPAGNE);
  assert.ok(c.ok && c.invoer.periodeTekst === null && c.invoer.opzetId === "c");
});

test("opzetten: naam, sortering en invoer", () => {
  assert.equal(rapportageNaam("VDU maandrapportage", " november 2026 "), "VDU maandrapportage november 2026");
  assert.equal(rapportageNaam("VDU maandrapportage", ""), "VDU maandrapportage");
  const lijst = sorteerOpzetten([
    { naam: "B", volgorde: 10, actief: false },
    { naam: "C", volgorde: 20, actief: true },
    { naam: "A", volgorde: 0, actief: true },
  ]);
  assert.deepEqual(lijst.map((o) => o.naam), ["A", "C", "B"]);
  assert.equal(leesOpzetInvoer({ naam: "X" }).ok, false);
  const o = leesOpzetInvoer({ naam: " Social rapportage ", formulier: "rapportage", bedrijven: [] });
  assert.ok(o.ok && o.invoer.bedrijven.length === 0 && o.invoer.actief);
  const m = leesOpzetInvoer({ naam: "PGZ + VELOO", formulier: "rapportage", bedrijven: ["PGZ", "VELOO", "pgz"] });
  assert.ok(m.ok && m.invoer.bedrijven.join("|") === "PGZ|VELOO");
  // Standaardplanning: alleen de vier standen, anders Uit.
  assert.ok(o.ok && o.invoer.standaardPlanning === "uit");
  const p = leesOpzetInvoer({ naam: "VDU maand", formulier: "rapportage", standaardPlanning: "maand" });
  assert.ok(p.ok && p.invoer.standaardPlanning === "maand");
  const q = leesOpzetInvoer({ naam: "VDU jaar", formulier: "rapportage", standaardPlanning: "jaar" });
  assert.ok(q.ok && q.invoer.standaardPlanning === "uit");
});

test("doel als getal uit vrije tekst", () => {
  assert.equal(leesDoelGetal("20 proefritten"), 20);
  assert.equal(leesDoelGetal("Minimaal 1.000 leads in Q4"), 1000);
  assert.equal(leesDoelGetal("Naamsbekendheid vergroten"), null);
  assert.equal(leesDoelGetal(null), null);
});

test("leadbron: standaard Google Analytics, Syntec alleen als het doel dat expliciet zegt", () => {
  const vdu = ["Van den Udenhout"];
  assert.equal(leadBron({ bedrijven: vdu, doel: "20 proefritten" }), "ga4");
  assert.equal(leadBron({ bedrijven: vdu, doel: null }), "ga4");
  assert.equal(leadBron({ bedrijven: vdu, doel: "20 proefritten uit Syntec" }), "syntec");
  assert.equal(leadBron({ bedrijven: vdu, doel: "30 offertes, gemeten in SYNTEC" }), "syntec");
  // Syntec bestaat alleen voor Van den Udenhout: dan toch GA4.
  assert.equal(leadBron({ bedrijven: ["PGZ"], doel: "10 proefritten uit Syntec" }), "ga4");
  assert.equal(leadBron({ bedrijven: ["Van den Udenhout", "PGZ"], doel: "Syntec: 10 leads" }), "ga4");
  assert.equal(doelVraagtSyntec("20 proefritten"), false);
  assert.equal(doelVraagtSyntec("20 proefritten (Syntec)"), true);
});

test("overzichtcijfers: uitgaven tegen budget, leads uit één bron tegen het doel", () => {
  const a2 = { bedrijven: ["Van den Udenhout"], budget: 3150, doel: "20 proefritten" };
  const o = overzichtCijfers(a2, {
    kosten: 3189.79, leadEvents: 30, leadsSyntec: 12, leadBron: "ga4", leadsDoel: 9, leadsDoelSoort: "proefritten",
  });
  assert.equal(o.bron, "ga4");
  // Het leadcijfer is leadsDoel (alleen proefritten), niet alle lead-events en niet Syntec.
  assert.equal(o.leads, 9);
  assert.equal(o.leadSoort, "proefritten");
  assert.equal(o.oudeTelling, false);
  assert.equal(o.doelLeads, 20);
  assert.equal(Math.round(o.besteedPct!), 101);
  assert.equal(o.gehaaldPct, 45);
  // De analyse kan het doel anders lezen dan de eerste regex: die wint.
  assert.equal(overzichtCijfers(a2, { doelLeads: 25 }).doelLeads, 25);
  assert.equal(overzichtCijfers({ ...a2, budget: null }, { kosten: 100 }).besteedPct, null);
  assert.equal(overzichtCijfers(a2, null).gehaaldPct, null);
});

test("overzichtcijfers: Syntec alleen als het doel het zegt, en nooit uit de verkeerde bron", () => {
  const syntec = { bedrijven: ["Van den Udenhout"], budget: null, doel: "20 proefritten uit Syntec" };
  const o = overzichtCijfers(syntec, { leadEvents: 30, leadBron: "syntec", leadsDoel: 14 });
  assert.equal(o.bron, "syntec");
  assert.equal(o.leads, 14);
  assert.equal(o.gehaaldPct, 70);
  // Telde de analyse uit GA4 terwijl het doel nu Syntec zegt: niets tonen tot de volgende analyse.
  assert.equal(overzichtCijfers(syntec, { leadBron: "ga4", leadsDoel: 30 }).leads, null);
  // Een oude analyse zonder leadsDoel: bij Syntec niets (die telling volgde de regel niet) …
  assert.equal(overzichtCijfers(syntec, { leadsSyntec: 12, leadEvents: 30 }).leads, null);
  // … bij GA4 de lead-events als oude telling.
  const oud = overzichtCijfers({ ...syntec, doel: "20 proefritten" }, { leadsSyntec: 12, leadEvents: 30 });
  assert.equal(oud.leads, 30);
  assert.equal(oud.oudeTelling, true);
  // Syntec gevraagd bij een ander bedrijf: GA4, met een melding.
  const pgz = overzichtCijfers({ bedrijven: ["PGZ"], budget: null, doel: "5 proefritten uit Syntec" }, { leadBron: "ga4", leadsDoel: 4 });
  assert.equal(pgz.bron, "ga4");
  assert.equal(pgz.syntecNietMogelijk, true);
  assert.equal(pgz.leads, 4);
});

test("meerdere bedrijven in de briefing en als label", () => {
  const u = leesCampagneInvoer({ naam: "Najaar", bedrijven: ["PGZ", " VELOO ", "PGZ"] }, CAMPAGNE);
  assert.ok(u.ok && u.invoer.bedrijven.join("|") === "PGZ|VELOO");
  // De oude vorm (één bedrijf als tekst) blijft werken.
  const oud = leesCampagneInvoer({ naam: "A2", bedrijf: "Van den Udenhout" }, CAMPAGNE);
  assert.ok(oud.ok && oud.invoer.bedrijven[0] === "Van den Udenhout");
  assert.equal(leesCampagneInvoer({ naam: "X", bedrijven: [] }, CAMPAGNE).ok, false);
  assert.equal(bedrijvenLabel(["PGZ"]), "PGZ");
  assert.equal(bedrijvenLabel(["PGZ", "VELOO", "Instra"]), "PGZ, VELOO en Instra");
  assert.equal(bedrijvenLabel([]), "Geen bedrijf");
});

test("overzichtcijfers: gezamenlijke CTR en bezoekers", () => {
  const c = { bedrijven: ["PGZ"], modellen: [], budget: null, doel: null };
  const o = overzichtCijfers(c, { klikken: 1500, vertoningenAds: 100000, vertoningen: 500000, sessies: 5777 });
  assert.equal(o.ctr, 1.5);
  assert.equal(o.bezoekers, 5777);
  // Zonder advertentievertoningen geen CTR: de vertoningen inclusief organisch tellen niet.
  assert.equal(overzichtCijfers(c, { klikken: 1500, vertoningen: 500000 }).ctr, null);
  assert.equal(overzichtCijfers(c, { klikken: 0, vertoningenAds: 1000 }).ctr, 0);
});

test("formaat 2: bevindingen, acties en oordeel worden opgeschoond", () => {
  const r = normaliseerResultaat({
    formaat: 2,
    secties: [
      {
        stap: 1,
        titel: "Investering",
        tab: "investering",
        oordeel: "raar",
        bevindingen: ["a", 3, "", "b", "c", "d", "e", "f"],
        acties: [{ titel: "Schuif budget", toelichting: "x", prioriteit: "urgent" }, { titel: "" }],
      },
    ],
    aanbevelingen: [{ titel: "Geheel", toelichting: "y", prioriteit: "hoog", tabs: ["email", "bestaat-niet"] }],
  });
  assert.equal(r.formaat, 2);
  const s = r.secties[0];
  assert.equal(s.oordeel, undefined);
  assert.deepEqual(s.bevindingen, ["a", "b", "c", "d", "e"]);
  assert.deepEqual(s.acties, [{ titel: "Schuif budget", toelichting: "x", prioriteit: "laag" }]);
  assert.deepEqual(r.aanbevelingen?.[0].tabs, ["email"]);
  assert.equal(normaliseerResultaat({ formaat: 7 }).formaat, 1);
});

test("tabbladen: vaste volgorde bij formaat 2, leeg met reden, losse sectie achteraan", () => {
  const resultaat = normaliseerResultaat({
    formaat: 2,
    secties: [
      { stap: 2, titel: "Kosten", tab: "investering", kerncijfers: [{ label: "Besteed", waarde: 1989, eenheid: "euro" }] },
      { stap: 1, titel: "Bereik", tab: "bereik", oordeel: "goed" },
      { stap: 4, titel: "Posts", tab: "organisch", oordeel: "geen-data" },
      { stap: 9, titel: "Iets anders" },
    ],
  });
  const tabs = tabbladenVoor(resultaat, { rapportage: false, bedrijven: ["Van den Udenhout"] });
  assert.deepEqual(
    tabs.map((t) => t.sleutel),
    [...ANALYSE_TABBLADEN.map((t) => t.sleutel), "sectie-1"],
  );
  const per = Object.fromEntries(tabs.map((t) => [t.sleutel, t]));
  assert.equal(per.investering.hoofdcijfer?.waarde, 1989);
  assert.equal(per.bereik.oordeel, "goed");
  assert.equal(per.bereik.leeg, false);
  assert.equal(per.organisch.leeg, true);
  assert.equal(per.organisch.reden, null);
  assert.equal(per.email.leeg, true);
  assert.match(per.email.reden ?? "", /geen onderdeel/);
  assert.match(per.syntec.reden ?? "", /geen onderdeel/);
  assert.match(per.orders.reden ?? "", /geen onderdeel/);
  assert.equal(per.orders.groep, "Resultaat");
  assert.equal(per["sectie-1"].naam, "Iets anders");
  assert.equal(per["sectie-1"].groep, null);

  const pgz = tabbladenVoor(resultaat, { rapportage: false, bedrijven: ["PGZ"] });
  assert.match(pgz.find((t) => t.sleutel === "syntec")?.reden ?? "", /Niet van toepassing/);
  assert.match(pgz.find((t) => t.sleutel === "orders")?.reden ?? "", /Niet van toepassing. Orders uit Syntec/);
});

test("tabbladen: formaat 1 en rapportage krijgen een tabblad per sectie", () => {
  const oud = normaliseerResultaat({ secties: [{ stap: 1, titel: "Investering" }, { stap: 2, titel: "Bereik" }] });
  assert.deepEqual(
    tabbladenVoor(oud, { rapportage: false, bedrijven: [] }).map((t) => t.naam),
    ["Investering", "Bereik"],
  );
  const rapportage = normaliseerResultaat({ formaat: 2, secties: [{ stap: 1, titel: "Verkeer", tab: "verkeer" }] });
  assert.deepEqual(
    tabbladenVoor(rapportage, { rapportage: true, bedrijven: [] }).map((t) => t.sleutel),
    ["sectie-1"],
  );
});

test("acties uit de tabbladen: op prioriteit, verder in tabvolgorde", () => {
  const resultaat = normaliseerResultaat({
    formaat: 2,
    secties: [
      { stap: 1, titel: "Bereik", tab: "bereik", acties: [{ titel: "A", prioriteit: "laag" }, { titel: "B", prioriteit: "hoog" }] },
      { stap: 2, titel: "Investering", tab: "investering", acties: [{ titel: "C", prioriteit: "hoog" }, { titel: "D", prioriteit: "middel" }] },
    ],
  });
  const acties = actiesUitTabbladen(tabbladenVoor(resultaat, { rapportage: false, bedrijven: [] }));
  assert.deepEqual(
    acties.map((a) => `${a.actie.titel}:${a.tabSleutel}`),
    ["B:bereik", "C:investering", "D:investering", "A:bereik"],
  );
});

test("Syntec alleen als de analyse uitsluitend over Van den Udenhout gaat", () => {
  assert.equal(syntecVanToepassing(["Van den Udenhout"]), true);
  assert.equal(syntecVanToepassing(["Van den Udenhout", "PGZ"]), false);
  assert.equal(syntecVanToepassing([]), false);
  assert.equal(syntecVanToepassing(null), false);
});

test("paginasleutel: zelfde regel als de database (0046)", () => {
  assert.equal(paginaSleutel("https://www.Udenhout.nl/acties/a2-e-tron/?utm_source=x#top"), "udenhout.nl/acties/a2-e-tron");
  assert.equal(paginaSleutel("udenhout.nl/acties/a2-e-tron"), "udenhout.nl/acties/a2-e-tron");
  assert.equal(paginaSleutel("  "), null);
});

test("campagnepagina's uit tekst: https erbij, zonder query, zonder dubbele", () => {
  assert.deepEqual(
    leesPaginas("www.udenhout.nl/acties/a2-e-tron/?utm_source=meta\nhttps://udenhout.nl/acties/a2-e-tron\nhttps://www.pgz.nl/lease#x, geen-url"),
    ["https://www.udenhout.nl/acties/a2-e-tron", "https://www.pgz.nl/lease"],
  );
  assert.deepEqual(leesPaginas(["ftp://udenhout.nl/x", "https://Udenhout.NL/Acties"]), ["https://udenhout.nl/Acties"]);
  assert.deepEqual(leesPaginas(undefined), []);
  assert.equal(paginaKort("https://www.udenhout.nl/acties/a2-e-tron/"), "udenhout.nl/acties/a2-e-tron");
});

test("briefing: campagnepagina's bij een campagne, leeg bij een rapportage", () => {
  const c = leesCampagneInvoer({ naam: "A2", bedrijf: "Van den Udenhout", campagnePaginas: "udenhout.nl/acties/a2-e-tron" }, CAMPAGNE);
  assert.ok(c.ok && c.invoer.campagnePaginas[0] === "https://udenhout.nl/acties/a2-e-tron");
  const r = leesCampagneInvoer({ naam: "VDU", periodeTekst: "november", campagnePaginas: "udenhout.nl/x" }, VDU_MAAND);
  assert.ok(r.ok && r.invoer.campagnePaginas.length === 0);
});

test("merkSleutel: zonder hoofdletters en accenten", () => {
  assert.equal(merkSleutel("Škoda"), "skoda");
  assert.equal(merkSleutel(" SEAT "), "seat");
  assert.equal(merkSleutel("Volkswagen  Bedrijfswagens"), "volkswagen bedrijfswagens");
  assert.equal(merkSleutel("Mercedes-Benz"), "mercedes benz");
  assert.equal(merkSleutel(""), null);
  assert.equal(merkSleutel(null), null);
});

test("merkSleutels: een merkveld met meer merken telt voor elk merk", () => {
  assert.deepEqual(merkSleutels("Volkswagen, Audi"), ["volkswagen", "audi"]);
  assert.deepEqual(merkSleutels("Audi en Škoda"), ["audi", "skoda"]);
  assert.deepEqual(merkSleutels("SEAT / CUPRA"), ["seat", "cupra"]);
  assert.deepEqual(merkSleutels("Audi, audi"), ["audi"]);
  assert.deepEqual(merkSleutels("Volkswagen Bedrijfswagens"), ["volkswagen bedrijfswagens"]);
  assert.deepEqual(merkSleutels(null), []);
});

test("merkenVoorMail: standaardmerken eerst, daarna de rest alfabetisch en zonder dubbele", () => {
  const lijst = merkenVoorMail(["Skoda", "Kia"], ["Audi", "Volkswagen, Ford", null]);
  assert.deepEqual(lijst.slice(0, STANDAARD_MERKEN.length), [...STANDAARD_MERKEN]);
  assert.deepEqual(lijst.slice(STANDAARD_MERKEN.length), ["Ford", "Kia"]);
});

test("voorstellen op Live sinds, nieuw naar oud, zonder datum achteraan", () => {
  const lijst = [
    { naam: "B", startdatum: "2026-10-07" },
    { naam: "C", startdatum: null },
    { naam: "A", startdatum: "2026-11-11" },
    { naam: "D", startdatum: "2026-10-07" },
  ];
  assert.deepEqual(sorteerVoorstellen(lijst).map((v) => v.naam), ["A", "B", "D", "C"]);
});

test("voortgangVanAnalyse: dag 68 van 105 bij de A2, doel en budget tegen de looptijd", async () => {
  const { voortgangVanAnalyse } = await import("./rekenen");
  const v = voortgangVanAnalyse({
    briefing: { bedrijven: ["Van den Udenhout"], budget: 3150, doel: "20 proefritten", startdatum: "2026-09-18", einddatum: "2026-12-31" },
    periodeTot: "2026-11-24",
    kerncijfers: { kosten: 2016.82, leadsDoel: 20, leadBron: "ga4", doelLeads: 20, leadsDoelSoort: "proefritten" },
  });
  assert.equal(v.dag, 68);
  assert.equal(v.dagen, 105);
  assert.ok(Math.abs((v.tijdPct ?? 0) - 64.76) < 0.01);
  assert.equal(v.leads, 20);
  assert.equal(v.gehaaldPct, 100);
  assert.equal(v.leadSoort, "proefritten");
  assert.equal(v.tempo, "op-schema");
});

test("voortgangVanAnalyse: zonder looptijd of na de einddatum", async () => {
  const { voortgangVanAnalyse } = await import("./rekenen");
  const zonder = voortgangVanAnalyse({ briefing: { budget: null, doel: null }, periodeTot: null, kerncijfers: null });
  assert.equal(zonder.tijdPct, null);
  assert.equal(zonder.tempo, null);
  const erna = voortgangVanAnalyse({
    briefing: { startdatum: "2026-01-01", einddatum: "2026-01-10", budget: 100 },
    periodeTot: "2026-02-01",
    kerncijfers: { kosten: 50 },
  });
  assert.equal(erna.dag, 10);
  assert.equal(erna.tijdPct, 100);
  assert.equal(erna.tempo, "te-langzaam");
});

test("budgetTempo: binnen 10 procentpunt op schema", async () => {
  const { budgetTempo } = await import("./rekenen");
  assert.equal(budgetTempo(64, 65), "op-schema");
  assert.equal(budgetTempo(80, 65), "te-snel");
  assert.equal(budgetTempo(40, 65), "te-langzaam");
  assert.equal(budgetTempo(null, 65), null);
});

test("leesBenchmark: alleen bruikbare verdelingen", async () => {
  const { leesBenchmark } = await import("./rekenen");
  const goed = { groep: "18 posts van dezelfde accounts", aantal: 18, mediaan: 900, p25: 600, p75: 1400, min: 200, max: 3300 };
  assert.deepEqual(leesBenchmark(goed), { ...goed, hogerIsBeter: true });
  assert.equal(leesBenchmark({ ...goed, aantal: 4 }), null, "te weinig items");
  assert.equal(leesBenchmark({ ...goed, p25: 1000 }), null, "kwartielen lopen niet op");
  assert.equal(leesBenchmark({ ...goed, groep: "" }), null, "zonder groep");
  assert.equal(leesBenchmark("x"), null);
  const zonderMin = leesBenchmark({ ...goed, min: 700, hogerIsBeter: false });
  assert.equal(zonderMin?.min, undefined, "min boven het eerste kwart vervalt");
  assert.equal(zonderMin?.hogerIsBeter, false);
});

test("benchmarkOordeel: kwartielen, en omgekeerd bij kosten", async () => {
  const { benchmarkOordeel } = await import("./rekenen");
  const b = { groep: "g", aantal: 10, mediaan: 2, p25: 1.5, p75: 3 };
  assert.equal(benchmarkOordeel(3.5, b), "beter");
  assert.equal(benchmarkOordeel(2.2, b), "gemiddeld");
  assert.equal(benchmarkOordeel(1, b), "slechter");
  assert.equal(benchmarkOordeel(3.5, { ...b, hogerIsBeter: false }), "slechter");
  assert.equal(benchmarkOordeel(1, { ...b, hogerIsBeter: false }), "beter");
  assert.equal(benchmarkOordeel("n.v.t.", b), null);
});

test("benchmarkSchaal: rechts is altijd beter", async () => {
  const { benchmarkSchaal } = await import("./rekenen");
  const b = { groep: "g", aantal: 10, mediaan: 50, p25: 25, p75: 75, min: 0, max: 100 };
  assert.deepEqual(benchmarkSchaal(90, b), { bandVan: 25, bandTot: 75, mediaan: 50, waarde: 90 });
  const kosten = benchmarkSchaal(90, { ...b, hogerIsBeter: false });
  assert.equal(kosten.waarde, 10);
  assert.equal(kosten.bandVan, 25);
  // Een cijfer buiten de groep rekt de schaal op in plaats van van de balk te vallen.
  assert.equal(benchmarkSchaal(200, b).waarde, 100);
});

test("normaliseerResultaat: een onbruikbare benchmark valt weg, de rest blijft", async () => {
  const { normaliseerResultaat } = await import("./rekenen");
  const r = normaliseerResultaat({
    formaat: 2,
    secties: [{ stap: 1, titel: "Organisch", kerncijfers: [
      { label: "Vertoningen per post", waarde: 1100, eenheid: "aantal", benchmark: { groep: "posts", aantal: 3, mediaan: 1, p25: 0, p75: 2 } },
      { label: "Engagement", waarde: 2.1, eenheid: "procent", benchmark: { groep: "posts", aantal: 20, mediaan: 1.4, p25: 0.9, p75: 2 } },
    ] }],
  });
  const k = r.secties[0].kerncijfers ?? [];
  assert.equal(k[0].benchmark, undefined);
  assert.equal(k[0].waarde, 1100);
  assert.equal(k[1].benchmark?.aantal, 20);
});
