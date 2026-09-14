import assert from "node:assert/strict";
import { test } from "node:test";
import { bouwRegel, type HerkomstActie } from "./bron.ts";

/**
 * Het herkomstblok op de Koppeltabel moet één ding waarmaken: het getal dat het dashboard
 * toont uit elkaar trekken zonder er een nieuw getal bij te verzinnen. `totaal` is dus
 * altijd platform + koppeltabel, en de regel "niet verklaard" rekent na of de getoonde
 * onderdelen ook echt optellen tot wat het platform zegt.
 */

const META_LEADS: HerkomstActie[] = [
  {
    bron: "meta",
    veld: "actions_onsite_conversion_lead_grouped",
    label: "Leadformulieren",
    teltAlsLead: false,
    teltAlsConversie: false,
    aantal: 1127,
  },
  {
    bron: "meta",
    veld: "actions_offsite_conversion_fb_pixel_lead",
    label: "Via de pixel",
    teltAlsLead: false,
    teltAlsConversie: false,
    aantal: 227,
  },
];

test("Meta's leadveld wordt uitgesplitst en telt precies op", () => {
  const regel = bouwRegel("meta", 1354, META_LEADS, "leads");

  assert.equal(regel.vanPlatform, 1354);
  assert.equal(regel.viaKoppeltabel, 0);
  assert.equal(regel.totaal, 1354);
  assert.equal(regel.onderdelen.length, 2);
  assert.ok(regel.onderdelen.every((o) => o.herkomst === "platform"));
  assert.equal(regel.onverklaard, 0, "1127 + 227 = 1354, dus er blijft niets over");
});

test("wijkt het platformgetal af, dan staat dat er als verschil bij", () => {
  // Meta voegt een derde soort lead toe die wij niet kennen: dan hoort het blok dat te
  // laten zien in plaats van een uitsplitsing te tonen die niet klopt.
  const regel = bouwRegel("meta", 1400, META_LEADS, "leads");
  assert.equal(regel.onverklaard, 46);
});

test("aangewezen acties komen bovenop het platformgetal en zijn als zodanig gemerkt", () => {
  const acties: HerkomstActie[] = [
    ...META_LEADS,
    {
      bron: "meta",
      veld: "actions_werkplaatsplanner",
      label: "Werkplaatsplanner",
      teltAlsLead: false,
      teltAlsConversie: true,
      aantal: 3,
    },
  ];
  const regel = bouwRegel("meta", 0, acties, "conversies");

  assert.equal(regel.vanPlatform, 0, "Meta levert geen conversietotaal");
  assert.equal(regel.viaKoppeltabel, 3);
  assert.equal(regel.totaal, 3);
  assert.deepEqual(
    regel.onderdelen.map((o) => [o.label, o.herkomst]),
    [["Werkplaatsplanner", "koppeltabel"]],
  );
  assert.equal(regel.onverklaard, null, "zonder uitsplitsing valt er niets na te rekenen");
});

// Google levert zelf al een conversietotaal waar zijn acties in zitten. Een Google-actie
// aanvinken zou hem dus dubbel tellen; bron.ts negeert die keuze, en dit blok hoort
// hetzelfde te doen — anders staan er cijfers op de pagina die de query niet gebruikt.
test("een aangevinkte Google-actie telt niet mee als conversie", () => {
  const acties: HerkomstActie[] = [
    {
      bron: "google",
      veld: "conversions_ud_macro_proefrit",
      label: "Proefrit",
      teltAlsLead: false,
      teltAlsConversie: true,
      aantal: 61,
    },
  ];
  const regel = bouwRegel("google", 14125.7, acties, "conversies");

  assert.equal(regel.viaKoppeltabel, 0);
  assert.equal(regel.totaal, 14125.7);
});

test("Google's conversietotaal wordt uitgesplitst, met het verschil erbij", () => {
  const acties: HerkomstActie[] = [
    { bron: "google", veld: "c_a", label: "Winkelbezoeken", teltAlsLead: false, teltAlsConversie: false, aantal: 10838 },
    { bron: "google", veld: "c_b", label: "Werkplaatsplanner", teltAlsLead: false, teltAlsConversie: false, aantal: 2624 },
    // Een actie zonder volume hoort niet als lege regel in beeld te komen.
    { bron: "google", veld: "c_c", label: "Ongebruikt", teltAlsLead: false, teltAlsConversie: false, aantal: 0 },
  ];
  const regel = bouwRegel("google", 14125.7, acties, "conversies");

  assert.equal(regel.onderdelen.length, 2);
  assert.deepEqual(
    regel.onderdelen.map((o) => o.label),
    ["Winkelbezoeken", "Werkplaatsplanner"],
    "aflopend op aantal, zodat het grootste blok bovenaan staat",
  );
  // 14125,7 − 13462 = 663,7: precies wat buiten "Opnemen in conversies" valt.
  assert.equal(regel.onverklaard, 663.7);
});

test("een platform zonder losse acties krijgt geen uitsplitsing", () => {
  const regel = bouwRegel("linkedin", 25, [], "conversies");
  assert.equal(regel.totaal, 25);
  assert.deepEqual(regel.onderdelen, []);
  assert.equal(regel.onverklaard, null);
});
