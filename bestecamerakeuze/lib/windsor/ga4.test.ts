import assert from "node:assert/strict";
import { test } from "node:test";
import { telSamen } from "@/lib/windsor/sync";
import { GA4_EVENTVELDEN, GA4_LANDINGSVELDEN, GA4_PAGINAVELDEN, OPHAALVELDEN } from "@/lib/windsor/velden";

/**
 * Het ontdubbelen van GA4-rijen.
 *
 * Dit is de plek waar dezelfde fout op de loer ligt die bij de advertenties een keer is
 * gemaakt: twee rijen met dezelfde sleutel zijn twee stukjes van hetzelfde cijfer, en wie
 * de laatste laat winnen gooit de eerste weg zonder dat iets dat meldt. GA4 levert die
 * dubbele sleutels zodra een dimensie leeg terugkomt naast een "(not set)" — precies de
 * twee waarden die de sync op dezelfde lege string afbeeldt.
 */
test("telSamen telt rijen met dezelfde sleutel op in plaats van ze te vervangen", () => {
  const uit = telSamen(
    [
      ["2026-09-01", "255949462", "Organic Search", 100, 80],
      ["2026-09-01", "255949462", "Organic Search", 40, 30],
      ["2026-09-01", "255949462", "Paid Search", 10, 9],
    ],
    [0, 1, 2],
    [3, 4],
  );

  assert.equal(uit.length, 2);
  assert.deepEqual(uit[0], ["2026-09-01", "255949462", "Organic Search", 140, 110]);
  assert.deepEqual(uit[1], ["2026-09-01", "255949462", "Paid Search", 10, 9]);
});

test("telSamen laat de dimensiewaarden van de eerste rij staan", () => {
  const uit = telSamen(
    [
      ["2026-09-01", "a", 1],
      ["2026-09-01", "a", 2],
    ],
    [0, 1],
    [2],
  );
  assert.deepEqual(uit, [["2026-09-01", "a", 3]]);
});

/**
 * Een sleutel die uit twee stukken bestaat mag niet samenvallen met een andere indeling
 * van dezelfde tekens. Vandaar de NUL-byte als scheidingsteken in `telSamen`: een
 * pagina-pad of campagnenaam mag zelf van alles bevatten.
 */
test("telSamen laat sleutels die op elkaar lijken niet samenvallen", () => {
  const uit = telSamen(
    [
      ["/auto", "merken", 1],
      ["/auto merken", "", 1],
    ],
    [0, 1],
    [2],
  );
  assert.equal(uit.length, 2);
});

test("telSamen leest getallen die als tekst binnenkomen", () => {
  // Windsor levert getallen soms als string; dan hoort er 3 uit te komen en niet "12".
  const uit = telSamen(
    [
      ["a", "1"],
      ["a", "2"],
    ],
    [0],
    [1],
  );
  assert.deepEqual(uit, [["a", 3]]);
});

/**
 * De vier opvragingen moeten alle vier de kanaalgroep meenemen.
 *
 * Zonder die kolom filtert een keuze als "Paid Search" wél de grafiek en niet de tabellen
 * eronder, en dan staat er een half gefilterd scherm zonder dat iets uitlegt waarom. Dat
 * is geen detail van de opbouw maar de afspraak waar de hele pagina op rust, dus hij hoort
 * vast te liggen in plaats van in een veldlijst te kunnen wegvallen.
 */
test("elke GA4-opvraging draagt de kanaalgroep mee", () => {
  for (const velden of [
    OPHAALVELDEN.googleanalytics4,
    GA4_LANDINGSVELDEN,
    GA4_PAGINAVELDEN,
    GA4_EVENTVELDEN,
  ]) {
    assert.ok(velden.includes("session_default_channel_group"));
    assert.ok(velden.includes("date"));
    assert.ok(velden.includes("account_id"));
  }
});
