import assert from "node:assert/strict";
import { test } from "node:test";
import { toonWaarde, weergaveNamen } from "./weergave.ts";

test("een gewone waarde komt onveranderd op het scherm", () => {
  assert.equal(toonWaarde("Volkswagen"), "Volkswagen");
  assert.equal(toonWaarde("B"), "B");
  assert.equal(toonWaarde(""), "");
});

test("witruimte wordt zichtbaar gemaakt zonder hem weg te halen", () => {
  assert.equal(toonWaarde(" "), '" "');
  assert.equal(toonWaarde("Golf "), '"Golf "');
  assert.equal(toonWaarde(" Golf"), '" Golf"');
});

test("de weergavemap blijft leeg als er niets bijzonders in staat", () => {
  assert.equal(weergaveNamen(["Volkswagen", "Audi"]), undefined);
  assert.deepEqual(weergaveNamen(["B", " ", "Golf "]), { " ": '" "', "Golf ": '"Golf "' });
});
