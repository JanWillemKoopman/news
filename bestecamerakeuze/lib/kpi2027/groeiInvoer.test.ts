import assert from "node:assert/strict";
import { test } from "node:test";
import { leesPercentage, percentageInvoer } from "@/lib/kpi2027/groeiInvoer";

test("een getypt percentage wordt een fractie, met komma, punt, plus of procentteken", () => {
  assert.equal(leesPercentage("5"), 0.05);
  assert.equal(leesPercentage("7,5"), 0.075);
  assert.equal(leesPercentage(" 7.5 % "), 0.075);
  assert.equal(leesPercentage("+10"), 0.1);
  assert.equal(leesPercentage("-3"), -0.03);
  assert.equal(leesPercentage("−3"), -0.03);
  assert.equal(leesPercentage("0"), 0);
  assert.equal(leesPercentage("7,1"), 0.071);
});

test("geen getal of buiten de grenzen is null", () => {
  assert.equal(leesPercentage(""), null);
  assert.equal(leesPercentage("abc"), null);
  assert.equal(leesPercentage("5,5,5"), null);
  assert.equal(leesPercentage("-100"), null);
  assert.equal(leesPercentage("1001"), null);
  assert.equal(leesPercentage("1000"), 10);
});

test("een fractie terug naar het veld", () => {
  assert.equal(percentageInvoer(0.05), "5");
  assert.equal(percentageInvoer(0.075), "7,5");
  assert.equal(percentageInvoer(-0.03), "-3");
});
