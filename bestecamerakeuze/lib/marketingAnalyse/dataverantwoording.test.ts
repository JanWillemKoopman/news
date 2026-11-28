import assert from "node:assert/strict";
import { test } from "node:test";
import {
  aantalAanpassingen,
  groepeerHerkenning,
  groepVanBron,
  herkenningSleutel,
  leesCorrectie,
  maakRegel,
  metRegel,
  regelNaKlik,
  rijStand,
  telVerantwoording,
} from "./dataverantwoording.ts";
import type { Herkenning } from "./types.ts";

const campagne: Herkenning = {
  bron: "Meta Ads",
  soort: "campagne",
  naam: "A2 | Awareness",
  reden: "naam bevat A2",
  sleutel: "meta-ads:campagne:120211234567",
};
const post: Herkenning = {
  bron: "Instagram",
  soort: "post",
  naam: "Audi-weekend bij Van den Udenhout",
  reden: "noemt de A2 tussen vier modellen",
  sleutel: "instagram:post:178901234",
  opgenomen: false,
};

test("de sleutel: die van de analyse, anders afgeleid van bron, soort en naam", () => {
  assert.equal(herkenningSleutel(campagne), "meta-ads:campagne:120211234567");
  assert.equal(herkenningSleutel({ bron: "Google Analytics 4", soort: "Pagina", naam: "/acties/Škoda-Elroq" }), "google-analytics-4:pagina:/acties/skoda-elroq");
  // Haken zouden de vaste vorm breken.
  assert.equal(herkenningSleutel({ bron: "GA4", soort: "event", naam: "x", sleutel: " [ga4:event:x] " }), "ga4:event:x");
});

test("een regel heeft een vaste vorm en is weer te lezen", () => {
  const regel = maakRegel("weglaten", campagne);
  assert.equal(regel, "Weglaten: Meta Ads · campagne · A2 | Awareness [meta-ads:campagne:120211234567]");
  const { regels, vrij } = leesCorrectie(`${regel}\n\nDe post van 3 oktober hoort er niet bij.`);
  assert.deepEqual(regels.map((r) => [r.actie, r.sleutel]), [["weglaten", "meta-ads:campagne:120211234567"]]);
  assert.equal(vrij, "De post van 3 oktober hoort er niet bij.");
});

test("vrije tekst met een streepje of haken is geen vaste regel", () => {
  const { regels, vrij } = leesCorrectie("- de mailing van oktober mist\nWeglaten zonder sleutel\nZie [notitie]");
  assert.equal(regels.length, 0);
  assert.equal(vrij, "- de mailing van oktober mist\nWeglaten zonder sleutel\nZie [notitie]");
});

test("metRegel zet, vervangt en haalt weg; de vrije tekst blijft staan", () => {
  const vrij = "Pagina /acties/a2-roadshow hoort er ook bij.";
  let tekst = metRegel(vrij, herkenningSleutel(campagne), maakRegel("weglaten", campagne));
  assert.equal(tekst, `${maakRegel("weglaten", campagne)}\n\n${vrij}`);
  tekst = metRegel(tekst, herkenningSleutel(post), maakRegel("meenemen", post));
  assert.equal(leesCorrectie(tekst).regels.length, 2);
  // Dezelfde sleutel vervangt, niet erbij.
  tekst = metRegel(tekst, herkenningSleutel(campagne), maakRegel("meenemen", campagne));
  assert.deepEqual(leesCorrectie(tekst).regels.map((r) => r.actie), ["meenemen", "meenemen"]);
  tekst = metRegel(tekst, herkenningSleutel(campagne), null);
  tekst = metRegel(tekst, herkenningSleutel(post), null);
  assert.equal(tekst, vrij);
  assert.equal(metRegel(null, "x", null), "");
  assert.throws(() => metRegel("", "andere:sleutel", maakRegel("weglaten", campagne)));
});

test("een klik: − weglaten, + meenemen, ongedaan maken zet de stand van de versie terug", () => {
  const bijVersie = maakRegel("weglaten", post);
  assert.equal(regelNaKlik(campagne, "min", ""), maakRegel("weglaten", campagne));
  assert.equal(regelNaKlik(post, "plus", bijVersie), maakRegel("meenemen", post));
  assert.equal(regelNaKlik(post, "ongedaan", bijVersie), bijVersie);
  assert.equal(regelNaKlik(campagne, "ongedaan", bijVersie), null);
});

test("de stand van een rij en het aantal aanpassingen tegen de versie", () => {
  const bijVersie = maakRegel("weglaten", post);
  const nu = `${maakRegel("weglaten", campagne)}\n${maakRegel("meenemen", post)}`;
  assert.deepEqual(rijStand(campagne, nu, bijVersie), { wens: "weglaten", klaar: true });
  assert.deepEqual(rijStand(post, bijVersie, bijVersie), { wens: "weglaten", klaar: false });
  assert.deepEqual(rijStand(post, nu, bijVersie), { wens: "meenemen", klaar: true });
  assert.equal(aantalAanpassingen(nu, bijVersie), 2);
  assert.equal(aantalAanpassingen(bijVersie, bijVersie), 0);
  assert.equal(aantalAanpassingen("alleen vrije tekst", null), 0);
});

test("elke bron in de groep van de funnel", () => {
  assert.equal(groepVanBron("Google Ads", "campagne"), "Advertenties");
  assert.equal(groepVanBron("Meta Ads", "advertentie"), "Advertenties");
  assert.equal(groepVanBron("LinkedIn Ads"), "Advertenties");
  assert.equal(groepVanBron("Instagram", "post"), "Organische social");
  assert.equal(groepVanBron("Facebook", "post"), "Organische social");
  assert.equal(groepVanBron("LinkedIn organisch", "post"), "Organische social");
  assert.equal(groepVanBron("Meta", "campagne"), "Advertenties");
  assert.equal(groepVanBron("GA4", "pagina"), "Website");
  assert.equal(groepVanBron("Google Analytics 4", "event"), "Website");
  assert.equal(groepVanBron("E-mail", "mailing"), "E-mail");
  assert.equal(groepVanBron("GA4", "mailing"), "E-mail");
  assert.equal(groepVanBron("Selligent", "mailing"), "E-mail");
  assert.equal(groepVanBron("Syntec leads", "filter"), "Syntec");
  assert.equal(groepVanBron("Syntec orders", "filter"), "Syntec");
  assert.equal(groepVanBron("Iets anders"), "Overig");
});

test("groeperen: meegenomen en niet meegenomen apart, groepen in funnelvolgorde, filter bij de bron", () => {
  const herkenning: Herkenning[] = [
    { bron: "GA4", soort: "pagina", naam: "/acties/audi-a2", reden: "campagnepagina" },
    campagne,
    post,
    { bron: "Meta Ads", soort: "campagne", naam: "A2 | Leads", reden: "naam bevat A2" },
    { bron: "Instagram", soort: "post", naam: "De nieuwe A2", reden: "over de A2" },
  ];
  const filters = [
    { bron: "meta ads", accounts: ["Van den Udenhout (69324444)"], filter: "campagnenaam bevat A2" },
    { bron: "LinkedIn Ads", filter: "campagnenaam bevat A2" },
  ];
  const mee = groepeerHerkenning(herkenning, filters, true);
  assert.deepEqual(mee.map((g) => g.groep), ["Advertenties", "Organische social", "Website"]);
  assert.deepEqual(mee[0].bronnen.map((b) => [b.bron, b.rijen.length, b.filter?.filter ?? null]), [
    ["Meta Ads", 2, "campagnenaam bevat A2"],
    ["LinkedIn Ads", 0, "campagnenaam bevat A2"],
  ]);
  const niet = groepeerHerkenning(herkenning, filters, false);
  assert.deepEqual(niet.map((g) => [g.groep, g.bronnen.map((b) => b.rijen.map((r) => r.naam))]), [
    ["Organische social", [["Audi-weekend bij Van den Udenhout"]]],
  ]);
  assert.deepEqual(telVerantwoording(herkenning), { meegenomen: 4, bronnen: 3, nietMeegenomen: 1 });
});
