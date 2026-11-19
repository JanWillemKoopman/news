import assert from "node:assert/strict";
import { test } from "node:test";
import { magBeperkteTabbladenZien, magTabbladZien } from "@/lib/beperkteTabbladen";
import { VERGRENDELDE_EMAILS } from "@/lib/gebruikersbeheer";

const EIGENAAR = ["koopman.janwillem@gmail.com", "JKoopman@Udenhout.nl"];
const ANDEREN = ["collega@udenhout.nl", null, undefined, ""];

test("Leads, Landingspagina en Instellingen alleen voor de eigenaar", () => {
  for (const view of ["leads", "landingspagina", "instellingen"]) {
    for (const email of EIGENAAR) assert.equal(magTabbladZien(view, email), true, `${view} ${email}`);
    for (const email of ANDEREN) assert.equal(magTabbladZien(view, email), false, `${view} ${email}`);
  }
});

test("Scores, Kennis en acties, Budget beheer, Koppeltabel en Kosten voor niemand", () => {
  for (const view of ["scores", "kennisacties", "budget-beheer", "koppeltabel", "kosten"]) {
    for (const email of [...EIGENAAR, ...ANDEREN]) assert.equal(magTabbladZien(view, email), false, `${view} ${email}`);
  }
});

test("de rest voor iedereen", () => {
  for (const view of ["campagnes", "tijdlijn", "campagnebeheer", "kpi-overzicht", "kpi-2027", "website", "selligent"]) {
    for (const email of [...EIGENAAR, ...ANDEREN]) assert.equal(magTabbladZien(view, email), true, `${view} ${email}`);
  }
});

test("dezelfde accounts als de beheerders", () => {
  for (const email of VERGRENDELDE_EMAILS) assert.equal(magBeperkteTabbladenZien(email), true, email);
});
