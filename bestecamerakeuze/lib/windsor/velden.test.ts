import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ACCOUNT_STATISTIEKEN,
  ADVERTENTIE_STATISTIEKEN,
  POST_STATISTIEKEN,
  isConversieActie,
  labelVoorConversie,
  type Statistiek,
} from "./velden.ts";

// De maatwerkconversies heten per account anders en komen erbij zodra marketing er een
// aanzet. De sync herkent ze aan hun naam, dus deze twee functies bepalen of een nieuwe
// conversie-actie in het dashboard verschijnt of stilletjes verdwijnt.

test("maatwerkconversies van Meta worden herkend", () => {
  assert.equal(isConversieActie("actions_proefrit_aanvraag", "facebook"), true);
  assert.equal(isConversieActie("actions_werkplaatsplanner", "facebook"), true);
  assert.equal(isConversieActie("actions_pce_klik_op_whatsapp", "facebook"), true);
});

test("de vaste Meta-statistieken tellen niet als maatwerkconversie", () => {
  // Deze halen we al op als gewone kolom; zouden ze óók in de jsonb belanden, dan telt
  // het conversietotaal ze dubbel.
  assert.equal(isConversieActie("actions_lead", "facebook"), false);
  assert.equal(isConversieActie("actions_link_click", "facebook"), false);
  assert.equal(isConversieActie("actions_post_engagement", "facebook"), false);
  assert.equal(isConversieActie("actions_video_view", "facebook"), false);
});

test("maatwerkconversies van Google worden herkend, waardevelden niet", () => {
  assert.equal(isConversieActie("conversions_ud_macro_proefrit_aanvraag", "google_ads"), true);
  assert.equal(
    isConversieActie("conversions_ga4_https_udenhout_nl_web_generate_lead_offerte", "google_ads"),
    true,
  );
  // conversions_value_* is de waarde van dezelfde actie, geen tweede actie.
  assert.equal(isConversieActie("conversions_value_ud_macro_proefrit_aanvraag", "google_ads"), false);
  assert.equal(isConversieActie("conversions_value", "google_ads"), false);
  assert.equal(isConversieActie("conversions_by_conversion_date", "google_ads"), false);
});

// Windsor biedt naast elke conversie-actie ook zijn percentage aan. Die stonden tussen
// de acties in de catalogus en waren dus aan te vinken als lead — waarna er percentages
// bij aantallen werden opgeteld. Een aantal en een verhouding horen nooit in één kolom.
test("percentages tellen niet als conversie-actie", () => {
  assert.equal(isConversieActie("conversions_from_interactions_rate", "google_ads"), false);
  assert.equal(isConversieActie("conversions_all_from_interactions_rate", "google_ads"), false);
  assert.equal(isConversieActie("actions_omni_rate", "facebook"), false);
  assert.equal(isConversieActie("actions_klik_ratio", "facebook"), false);

  // Een echte actie met "rate" middenin de naam blijft gewoon een actie.
  assert.equal(isConversieActie("conversions_ud_macro_rate_my_visit", "google_ads"), true);
});

test("connectoren zonder maatwerkconversies leveren niets op", () => {
  assert.equal(isConversieActie("share_impression_count", "linkedin_organic"), false);
  assert.equal(isConversieActie("media_reach", "instagram"), false);
});

test("veldnamen worden leesbare labels", () => {
  assert.equal(labelVoorConversie("actions_proefrit_aanvraag"), "Proefrit aanvraag");
  assert.equal(labelVoorConversie("actions_werkplaatsplanner"), "Werkplaatsplanner");
  assert.equal(
    labelVoorConversie("conversions_ga4_https_udenhout_nl_web_generate_lead_offerte"),
    "Offerte",
  );
  assert.equal(labelVoorConversie("conversions_ud_macro_inruilvoorstel"), "Inruilvoorstel");
  assert.equal(
    labelVoorConversie("conversions_vacatures_2_udenhout_nl_losse_conversies_b_"),
    "Vacatures",
  );
});

test("een veldnaam die nergens op past blijft leesbaar in plaats van leeg", () => {
  assert.equal(labelVoorConversie("actions_"), "actions_");
  assert.equal(labelVoorConversie("conversions_winkelbezoeken"), "Winkelbezoeken");
});

// Een afgeleide statistiek (CTR, kosten per klik) mag nooit worden opgeteld of
// gemiddeld: hij hoort ná het aggregeren uit twee sommen te worden berekend. Dat werkt
// alleen als teller en noemer zélf optelbare velden zijn. Deze test bewaakt dat — een
// afgeleide die naar een andere afgeleide wijst, levert stilstaand onzin op.
function controleerAfgeleiden(naam: string, statistieken: Statistiek[]) {
  const optelbaar = new Set(statistieken.filter((s) => !s.afgeleid).map((s) => s.id));
  // kijktijd_ms wordt wel opgeslagen maar niet als losse statistiek getoond.
  optelbaar.add("kijktijd_ms");

  for (const s of statistieken) {
    if (!s.afgeleid) continue;
    assert.ok(
      optelbaar.has(s.afgeleid.teller),
      `${naam}: teller "${s.afgeleid.teller}" van ${s.id} is niet optelbaar`,
    );
    assert.ok(
      optelbaar.has(s.afgeleid.noemer),
      `${naam}: noemer "${s.afgeleid.noemer}" van ${s.id} is niet optelbaar`,
    );
  }
}

test("elke afgeleide statistiek rekent met optelbare velden", () => {
  controleerAfgeleiden("advertenties", ADVERTENTIE_STATISTIEKEN);
  controleerAfgeleiden("posts", POST_STATISTIEKEN);
  controleerAfgeleiden("account", ACCOUNT_STATISTIEKEN);
});

test("elke statistiek heeft een uitleg in gewone taal", () => {
  // "Zo lees je dit" toont deze zin onder het kolomlabel; een nieuwe statistiek zonder
  // uitleg valt daardoor meteen op in plaats van als lege regel in de UI te belanden.
  for (const lijst of [ADVERTENTIE_STATISTIEKEN, POST_STATISTIEKEN, ACCOUNT_STATISTIEKEN]) {
    for (const s of lijst) {
      assert.ok(s.uitleg.length > 10, `${s.id} heeft geen bruikbare uitleg`);
      assert.ok(s.label.length > 0, `${s.id} heeft geen label`);
    }
  }
});

test("statistiek-id's zijn uniek binnen een pagina", () => {
  for (const lijst of [ADVERTENTIE_STATISTIEKEN, POST_STATISTIEKEN, ACCOUNT_STATISTIEKEN]) {
    const ids = lijst.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length, `dubbele id's: ${ids.join(", ")}`);
  }
});

// Bereik ontdubbelt het platform per opgevraagde dag; wij bewaren dagcijfers, dus élke
// optelling die wij maken komt hoger uit dan wat de advertentiebeheerder over dezelfde
// periode toont. Daarom staat het op géén enkele kanaalpagina meer. Deze test is er zodat
// het niet per ongeluk terugkomt via een nieuwe statistiek of een nieuwe afgeleide.
test("bereik staat op geen enkele kanaalpagina", () => {
  for (const lijst of [ADVERTENTIE_STATISTIEKEN, POST_STATISTIEKEN, ACCOUNT_STATISTIEKEN]) {
    for (const s of lijst) {
      assert.notEqual(s.id, "bereik", "bereik is per periode niet te reproduceren");
      if (!s.afgeleid) continue;
      assert.notEqual(s.afgeleid.teller, "bereik", `${s.id} rekent met bereik`);
      assert.notEqual(s.afgeleid.noemer, "bereik", `${s.id} rekent met bereik`);
    }
  }
});

// De uitleg is wat een marketeer leest voordat hij een cijfer met Ads Manager
// vergelijkt. Waar onze definitie afwijkt van wat het platform meet, moet dat er staan —
// anders is het dashboard precies zo betrouwbaar als het niet is.
test("de uitleg noemt de afwijking waar die er is", () => {
  const bij = (id: string) => {
    const s = ADVERTENTIE_STATISTIEKEN.find((s) => s.id === id);
    assert.ok(s, `${id} ontbreekt`);
    return s.uitleg.toLowerCase();
  };

  // Meta's post_engagement telt klikken en videoweergaven mee; wie hier alleen
  // "reacties, likes en delen" leest, vergelijkt appels met peren.
  assert.match(bij("interacties"), /klik/);
  // Meta telt een videoweergave vanaf 3 seconden, LinkedIn al vanaf 2.
  assert.match(bij("videoweergaven"), /twee|2 seconden/);
  // Voor Meta halen we geen conversiewaarde op, dus roas is daar per definitie leeg.
  assert.match(bij("conversiewaarde"), /meta/);
});

test("omni-acties tellen niet als maatwerkconversie bij Meta", () => {
  // Meta weigert deze velden zodra je uitsplitst naar plaatsing, en die uitsplitsing
  // wint. Zonder deze uitzondering mislukte de hele Meta-sync met één foutmelding
  // waarin alle veertien omni-velden werden opgesomd.
  assert.equal(isConversieActie("actions_omni_purchase", "facebook"), false);
  assert.equal(isConversieActie("actions_omni_add_to_cart", "facebook"), false);
  assert.equal(isConversieActie("actions_omni_app_install", "facebook"), false);

  // Een echte maatwerkconversie blijft er gewoon in.
  assert.equal(isConversieActie("actions_proefrit_aanvraag", "facebook"), true);
  assert.equal(isConversieActie("actions_offerte_aanvraag", "facebook"), true);

  // En een vast veld blijft een gewone statistiek.
  assert.equal(isConversieActie("actions_lead", "facebook"), false);
});
