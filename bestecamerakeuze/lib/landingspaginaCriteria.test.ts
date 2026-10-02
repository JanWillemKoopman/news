import assert from "node:assert/strict";
import { test } from "node:test";
import { normaliseerGewichten } from "./landingspaginaCriteria.ts";

const som = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

test("een weging die al 100 is, blijft gelijk", () => {
  assert.deepEqual(normaliseerGewichten([10, 15, 25, 15, 20, 10, 5]), [10, 15, 25, 15, 20, 10, 5]);
});

test("een weging die niet op 100 uitkomt, wordt geschaald naar precies 100", () => {
  const uit = normaliseerGewichten([1, 1, 1]);
  assert.equal(som(uit), 100);
  assert.deepEqual(uit, [34, 33, 33]);
  assert.equal(som(normaliseerGewichten([20, 20, 30, 20, 20, 10, 5])), 100);
});

test("zonder bruikbare weging telt alles even zwaar", () => {
  assert.deepEqual(normaliseerGewichten([0, 0, 0, 0]), [25, 25, 25, 25]);
  assert.equal(som(normaliseerGewichten([-5, Number.NaN, 0, 10])), 100);
});

test("gelijke verdeling over zeven criteria komt ook precies op 100", () => {
  assert.equal(som(normaliseerGewichten(Array(7).fill(0))), 100);
});
