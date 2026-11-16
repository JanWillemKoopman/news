import assert from "node:assert/strict";
import { test } from "node:test";
import { leesConnectionString, tekstOmTeOndertekenen } from "./verbinding.ts";

test("leest de connection string zoals Azure hem geeft", () => {
  const delen = leesConnectionString(
    "DefaultEndpointsProtocol=https;AccountName=voorbeeld;AccountKey=YWJj;EndpointSuffix=core.windows.net",
  );
  assert.equal(delen.account, "voorbeeld");
  assert.equal(delen.sleutel, "YWJj");
  assert.equal(delen.suffix, "core.windows.net");
  assert.equal(delen.protocol, "https");
});

test("houdt de = aan het eind van een base64-sleutel heel", () => {
  // Een echte accountsleutel eindigt op "=="; splitsen op elke "=" sloopt hem.
  const delen = leesConnectionString("AccountName=a;AccountKey=cGxhYXRzaG91ZGVyc2xldXRlbA==");
  assert.equal(delen.sleutel, "cGxhYXRzaG91ZGVyc2xldXRlbA==");
});

test("klaagt begrijpelijk als de connection string incompleet is", () => {
  assert.throws(() => leesConnectionString("AccountName=a"), /AccountName of AccountKey/);
});

test("zet de tekst om te ondertekenen in de vorm die Azure eist", () => {
  const tekst = tekstOmTeOndertekenen("GET", "mijnaccount", "/output/map/bestand.csv", {
    "x-ms-date": "Mon, 01 Jan 2026 00:00:00 GMT",
    "x-ms-version": "2021-08-06",
  });
  assert.equal(
    tekst,
    [
      "GET",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "x-ms-date:Mon, 01 Jan 2026 00:00:00 GMT",
      "x-ms-version:2021-08-06",
      "/mijnaccount/output/map/bestand.csv",
    ].join("\n"),
  );
});
