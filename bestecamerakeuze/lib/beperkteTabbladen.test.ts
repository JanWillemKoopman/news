import assert from "node:assert/strict";
import { test } from "node:test";
import { magBeperkteTabbladenZien, magTabbladZien } from "@/lib/beperkteTabbladen";
import { VERGRENDELDE_EMAILS } from "@/lib/gebruikersbeheer";

test("Leads en Landingspagina alleen voor de eigenaar, de rest voor iedereen", () => {
  for (const email of ["koopman.janwillem@gmail.com", "JKoopman@Udenhout.nl"]) {
    assert.equal(magTabbladZien("leads", email), true, email);
    assert.equal(magTabbladZien("landingspagina", email), true, email);
  }
  for (const email of ["collega@udenhout.nl", null, undefined, ""]) {
    assert.equal(magTabbladZien("leads", email), false, String(email));
    assert.equal(magTabbladZien("landingspagina", email), false, String(email));
    assert.equal(magTabbladZien("website", email), true, String(email));
  }
});

test("dezelfde accounts als de beheerders", () => {
  for (const email of VERGRENDELDE_EMAILS) assert.equal(magBeperkteTabbladenZien(email), true, email);
});
