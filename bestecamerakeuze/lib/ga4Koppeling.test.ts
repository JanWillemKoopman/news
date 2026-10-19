import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bouwTelQuery,
  controleerRegels,
  gisteren,
  omschrijfRegel,
  regelsSql,
  telPeriode,
  verwerkTelling,
  zoekEvents,
  type Regel,
} from "@/lib/ga4Koppeling";

function bouw(regels: Regel[]) {
  const params: unknown[] = [];
  const sql = regelsSql(regels, (w) => {
    params.push(w);
    return `$${params.length}`;
  });
  return { sql, params };
}

test("het voorbeeld: proefrit of offerte, op een pagina die /audi bevat", () => {
  const { sql, params } = bouw([
    {
      events: ["generate_lead_proefrit", "generate_lead_offerte"],
      voorwaarden: [{ veld: "pagina", operator: "bevat", waarde: "/audi" }],
    },
  ]);
  assert.equal(sql, "((event_naam = any($1::text[]) and pagina ilike $2))");
  assert.deepEqual(params, [["generate_lead_proefrit", "generate_lead_offerte"], "%/audi%"]);
});

test("twee regels staan in één or, zodat een rij die allebei matcht één keer telt", () => {
  const { sql } = bouw([
    { events: ["a"], voorwaarden: [] },
    { events: ["b"], voorwaarden: [{ veld: "querystring", operator: "bevat", waarde: "merk=audi" }] },
  ]);
  assert.equal(
    sql,
    "((event_naam = any($1::text[])) or (event_naam = any($2::text[]) and querystring ilike $3))",
  );
});

test("geen regels betekent niets tellen, niet alles", () => {
  assert.equal(bouw([]).sql, null);
});

test("% en _ in een zoekwaarde zijn letterlijk, geen wildcard", () => {
  const { params } = bouw([
    { events: ["x"], voorwaarden: [{ veld: "pagina", operator: "begint_met", waarde: "/100%_actie" }] },
  ]);
  assert.equal(params[1], "/100\\%\\_actie%");
});

test("bevat niet, is en is niet", () => {
  const { sql } = bouw([
    {
      events: ["x"],
      voorwaarden: [
        { veld: "kanaalgroep", operator: "bevat_niet", waarde: "Organic" },
        { veld: "website", operator: "is", waarde: "udenhout.nl" },
        { veld: "campagne", operator: "is_niet", waarde: "" },
      ],
    },
  ]);
  assert.match(sql!, /kanaalgroep not ilike \$2/);
  assert.match(sql!, /lower\(coalesce\(website, ''\)\) = lower\(\$3\)/);
  assert.match(sql!, /lower\(campagne\) <> lower\(\$4\)/);
});

test("de controle weigert een regel zonder events en een onbekend veld", () => {
  assert.equal(controleerRegels([{ events: [], voorwaarden: [] }]).ok, false);
  assert.equal(
    controleerRegels([{ events: ["x"], voorwaarden: [{ veld: "pagina; drop table", operator: "bevat", waarde: "a" }] }]).ok,
    false,
  );
  assert.equal(
    controleerRegels([{ events: ["x"], voorwaarden: [{ veld: "pagina", operator: "bevat", waarde: "  " }] }]).ok,
    false,
  );
  assert.equal(controleerRegels("geen lijst").ok, false);
});

test("de controle trimt en ontdubbelt events", () => {
  const c = controleerRegels([{ events: [" a ", "a", "b", ""], voorwaarden: [] }]);
  assert.ok(c.ok);
  assert.deepEqual(c.ok && c.waarde, [{ events: ["a", "b"], voorwaarden: [] }]);
});

test("de telquery slaat campagnes zonder regels of met een lege periode over", () => {
  const q = bouwTelQuery([
    { campagneNaam: "A", van: "2026-09-01", tot: "2026-09-30", regels: [{ events: ["x"], voorwaarden: [] }] },
    { campagneNaam: "B", van: "2026-09-01", tot: "2026-09-30", regels: [] },
    { campagneNaam: "C", van: "2026-10-20", tot: "2026-10-18", regels: [{ events: ["x"], voorwaarden: [] }] },
  ]);
  assert.ok(q);
  assert.equal(q.sql.split("union all").length, 1);
  assert.deepEqual(q.params, [["x"], "A", "2026-09-01", "2026-09-30"]);
  assert.equal(bouwTelQuery([]), null);
});

test("de telling telt per campagne op en sorteert de events op aantal", () => {
  const t = verwerkTelling([
    { campagne: "A", event_naam: "x", aantal: "3" },
    { campagne: "A", event_naam: "y", aantal: "10" },
    { campagne: "B", event_naam: "x", aantal: 1 },
  ]);
  assert.equal(t.A.totaal, 13);
  assert.deepEqual(t.A.perEvent.map((e) => e.event), ["y", "x"]);
  assert.equal(t.B.totaal, 1);
});

test("de periode loopt tot en met gisteren en nooit voorbij de einddatum", () => {
  assert.deepEqual(telPeriode("2026-10-01", "2026-12-31", "2026-10-18"), { van: "2026-10-01", tot: "2026-10-18" });
  assert.deepEqual(telPeriode("2026-09-01", "2026-09-30", "2026-10-18"), { van: "2026-09-01", tot: "2026-09-30" });
  assert.deepEqual(telPeriode("2026-09-01", null, "2026-10-18"), { van: "2026-09-01", tot: "2026-10-18" });
  assert.equal(telPeriode(null, "2026-09-30", "2026-10-18"), null);
});

test("omschrijving voor in de tabel", () => {
  assert.equal(
    omschrijfRegel({
      events: ["proefrit", "offerte"],
      voorwaarden: [{ veld: "pagina", operator: "bevat", waarde: "/audi" }],
    }),
    "proefrit, offerte · paginapad bevat “/audi”",
  );
});

test("zoekEvents geeft zonder zoekterm de top 10 en telt de rest", () => {
  const opties = Array.from({ length: 15 }, (_, i) => ({ event: `event_${i}` }));
  const { top, meer } = zoekEvents(opties, "");
  assert.equal(top.length, 10);
  assert.equal(top[0].event, "event_0");
  assert.equal(meer, 5);
});

test("zoekEvents zoekt per woord en negeert streepjes en hoofdletters", () => {
  const opties = [
    { event: "session_start" },
    { event: "generate_lead_proefrit" },
    { event: "generate_lead_offerte" },
    { event: "click_cta_vdp" },
  ];
  assert.deepEqual(zoekEvents(opties, "Lead Proefrit").top.map((o) => o.event), ["generate_lead_proefrit"]);
  assert.deepEqual(zoekEvents(opties, "generate_lead").top.map((o) => o.event), [
    "generate_lead_proefrit",
    "generate_lead_offerte",
  ]);
  assert.deepEqual(zoekEvents(opties, "bestaatniet"), { top: [], meer: 0 });
});

test("gisteren rekent in Nederlandse tijd, ook vlak na middernacht", () => {
  // 19 okt 2026 00:30 in Amsterdam is 18 okt 22:30 UTC.
  assert.equal(gisteren(new Date("2026-10-18T22:30:00Z")), "2026-10-18");
  assert.equal(gisteren(new Date("2026-10-19T12:00:00Z")), "2026-10-18");
});
