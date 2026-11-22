import assert from "node:assert/strict";
import { test } from "node:test";
import type { Client } from "pg";
import { LEADS_EXTRA_EVENTS, LEADS_GA4_PROPERTY } from "@/lib/leads/bereik";
import { leadEventFilter, syncGa4Leads } from "@/lib/windsor/sync";
import type { WindsorRij } from "@/lib/windsor/api";
import { GA4_LEADVELDEN } from "@/lib/windsor/velden";

/**
 * De nachtelijke leadsync, zonder netwerk en zonder database.
 *
 * Wat hier telt is de volgorde en de veiligheid: eerst ophalen, dan pas wissen; een leeg
 * antwoord laat de tabel staan; en wissen en schrijven vormen één transactie die bij een
 * fout helemaal wordt teruggedraaid.
 */

/**
 * `eerste` is wat `min(datum)` van de tabel teruggeeft: standaard staat het begin er al
 * (1 juni), dus haalt de sync alleen de laatste dertig dagen op. `null` = lege tabel.
 */
function nepClient(faalOp?: RegExp, eerste: string | null = "2026-06-01") {
  const queries: { sql: string; waarden: unknown[] }[] = [];
  const client = {
    async query(sql: string, waarden: unknown[] = []) {
      if (/min\(datum\)/.test(sql)) return { rowCount: 1, rows: [{ eerste }] };
      queries.push({ sql: sql.replace(/\s+/g, " ").trim(), waarden });
      if (faalOp && faalOp.test(sql)) throw new Error("insert mislukt");
      return { rowCount: 0, rows: [] };
    },
  } as unknown as Client;
  return { client, queries };
}

const NU = new Date("2026-11-17T05:10:00Z");

function windsorRij(over: Partial<Record<string, string | number>> = {}): WindsorRij {
  return {
    date: "2026-11-16",
    event_name: "generate_lead_proefrit",
    session_source_medium: "google / cpc",
    campaign: "T | Branding VDU",
    customevent_car_brand: "Audi",
    customevent_car_model: "Q4 e-tron",
    customevent_form_location: "stock",
    event_count: 2,
    ...over,
  };
}

test("vraagt alleen de property van udenhout.nl en alleen lead-events op, over de laatste dertig dagen", async () => {
  let aanroep: unknown[] = [];
  const { client } = nepClient();
  await syncGa4Leads(client, {
    nu: NU,
    haal: async (...args: unknown[]) => {
      aanroep = args;
      return [windsorRij()];
    },
  });
  const [connector, velden, van, tot, filter, accounts] = aanroep;
  assert.equal(connector, "googleanalytics4");
  assert.deepEqual(velden, GA4_LEADVELDEN);
  assert.equal(van, "2026-10-18");
  assert.equal(tot, "2026-11-16");
  assert.deepEqual(filter, leadEventFilter());
  assert.deepEqual(accounts, [LEADS_GA4_PROPERTY]);
});

test("het Windsor-filter vraagt alles met 'lead' én elk aangewezen extra event, met 'or'", () => {
  const filter = leadEventFilter();
  assert.deepEqual(filter[0], ["event_name", "contains", "lead"]);
  // Na het eerste element komen paren van "or" en een gelijkheidsvoorwaarde, in volgorde.
  assert.equal(filter.length, 1 + 2 * LEADS_EXTRA_EVENTS.length);
  LEADS_EXTRA_EVENTS.forEach((event, i) => {
    assert.equal(filter[1 + 2 * i], "or");
    assert.deepEqual(filter[2 + 2 * i], ["event_name", "eq", event]);
  });
  // Nergens een "and": dat zou van de lijst een lege verzameling maken.
  assert.equal(filter.includes("and"), false);
});

test("de extra events worden meegeschreven, ook als er 'lead' niet in de naam staat", async () => {
  const { client, queries } = nepClient();
  const uitkomst = await syncGa4Leads(client, {
    nu: NU,
    haal: async () => [
      windsorRij(),
      windsorRij({ event_name: "bedanktpagina_werkplaatsplanner", event_count: 150 }),
      windsorRij({ event_name: "page_view", event_count: 999 }),
    ],
  });
  assert.equal(uitkomst.geschreven, 2);
  const insert = queries.find((q) => q.sql.startsWith("insert"));
  const events = [insert?.waarden[1], insert?.waarden[9]];
  assert.deepEqual(events.sort(), ["bedanktpagina_werkplaatsplanner", "generate_lead_proefrit"]);
});

test("wist en schrijft in één transactie, in die volgorde", async () => {
  const { client, queries } = nepClient();
  const uitkomst = await syncGa4Leads(client, {
    nu: NU,
    haal: async () => [windsorRij(), windsorRij({ event_name: "generate_lead_offerte" })],
  });

  assert.equal(uitkomst.fout, undefined);
  assert.equal(uitkomst.geschreven, 2);
  assert.deepEqual(
    queries.map((q) => q.sql.split(" ")[0]),
    ["begin", "delete", "insert", "commit"],
  );
  // Acht waarden per rij, in de volgorde van de kolommen.
  assert.equal(queries[2].waarden.length, 16);
  assert.deepEqual(queries[2].waarden.slice(0, 8), [
    "2026-11-16",
    "generate_lead_offerte",
    "google / cpc",
    "T | Branding VDU",
    "Audi",
    "Q4 e-tron",
    "stock",
    2,
  ]);
});

test("een leeg antwoord van Windsor laat de tabel ongemoeid", async () => {
  const { client, queries } = nepClient();
  const uitkomst = await syncGa4Leads(client, { nu: NU, haal: async () => [] });
  assert.equal(queries.length, 0, "er is niets gewist of geschreven");
  assert.equal(uitkomst.geschreven, 0);
  assert.match(uitkomst.fout ?? "", /ongemoeid/);
});

test("een antwoord zonder één lead-event telt ook als leeg", async () => {
  const { client, queries } = nepClient();
  const uitkomst = await syncGa4Leads(client, {
    nu: NU,
    haal: async () => [windsorRij({ event_name: "page_view" })],
  });
  assert.equal(queries.length, 0);
  assert.ok(uitkomst.fout);
});

test("faalt Windsor, dan is er nog niets gewist", async () => {
  const { client, queries } = nepClient();
  await assert.rejects(
    syncGa4Leads(client, {
      nu: NU,
      haal: async () => {
        throw new Error("windsor stuk");
      },
    }),
    /windsor stuk/,
  );
  assert.equal(queries.length, 0);
});

test("faalt het schrijven, dan wordt alles teruggedraaid", async () => {
  const { client, queries } = nepClient(/^\s*insert/i);
  await assert.rejects(
    syncGa4Leads(client, { nu: NU, haal: async () => [windsorRij()] }),
    /insert mislukt/,
  );
  const stappen = queries.map((q) => q.sql.split(" ")[0]);
  assert.deepEqual(stappen, ["begin", "delete", "insert", "rollback"]);
  assert.ok(!stappen.includes("commit"));
});

test("een grote ronde gaat in batches van vijfhonderd rijen", async () => {
  const rijen = Array.from({ length: 1200 }, (_, i) =>
    windsorRij({ campaign: `Campagne ${i}`, event_count: 1 }),
  );
  const { client, queries } = nepClient();
  const uitkomst = await syncGa4Leads(client, { nu: NU, haal: async () => rijen });
  const inserts = queries.filter((q) => q.sql.startsWith("insert"));
  assert.equal(uitkomst.geschreven, 1200);
  assert.deepEqual(
    inserts.map((q) => q.waarden.length / 8),
    [500, 500, 200],
  );
});

test("staat het begin er nog niet, dan vult hij eenmalig aan vanaf 1 juni, in stukken van een maand", async () => {
  const aanroepen: [string, string][] = [];
  const { client, queries } = nepClient(undefined, "2026-10-18");
  await syncGa4Leads(client, {
    nu: NU,
    haal: async (_c: unknown, _v: unknown, van: string, tot: string) => {
      aanroepen.push([van, tot]);
      return [windsorRij({ date: van })];
    },
  });
  assert.equal(aanroepen[0][0], "2026-06-01");
  assert.equal(aanroepen[aanroepen.length - 1][1], "2026-11-16");
  // Aansluitend, zonder gat en zonder overlap.
  for (let i = 1; i < aanroepen.length; i++) {
    const vorige = new Date(`${aanroepen[i - 1][1]}T00:00:00Z`);
    vorige.setUTCDate(vorige.getUTCDate() + 1);
    assert.equal(aanroepen[i][0], vorige.toISOString().slice(0, 10));
  }
  const wis = queries.find((q) => q.sql.startsWith("delete"));
  assert.deepEqual(wis?.waarden, ["2026-06-01", "2026-06-01"]);
});

test("een lege tabel vult ook aan vanaf 1 juni", async () => {
  let eersteVan = "";
  const { client } = nepClient(undefined, null);
  await syncGa4Leads(client, {
    nu: NU,
    haal: async (_c: unknown, _v: unknown, van: string) => {
      eersteVan ||= van;
      return [windsorRij()];
    },
  });
  assert.equal(eersteVan, "2026-06-01");
});

test("staat het begin er al, dan wist hij alleen de laatste dertig dagen", async () => {
  const { client, queries } = nepClient();
  await syncGa4Leads(client, { nu: NU, haal: async () => [windsorRij()] });
  const wis = queries.find((q) => q.sql.startsWith("delete"));
  assert.match(wis?.sql ?? "", /datum >= \$1::date or datum < \$2::date/);
  assert.deepEqual(wis?.waarden, ["2026-10-18", "2026-06-01"]);
});
