import { strict as assert } from "node:assert";
import { test } from "node:test";
import { controleerVerbindingssnaar, eisVerbindingssnaar } from "@/lib/verbindingssnaar";

test("een gewone verbindingssnaar komt er zonder klacht doorheen", () => {
  assert.equal(
    controleerVerbindingssnaar("postgresql://rol:wachtwoord@db.ref.supabase.co:5432/postgres", "X"),
    null,
  );
  assert.equal(controleerVerbindingssnaar("postgres://rol:pw@host:6543/postgres", "X"), null);
});

test("een spatie ervoor wordt gemeld, want die maakt de snaar onleesbaar", () => {
  // Dit is precies het geval dat pg als host "base" laat opzoeken.
  const fout = controleerVerbindingssnaar(" postgresql://rol:pw@host/postgres", "DATAQUERY_DATABASE_URL");
  assert.match(String(fout), /spatie of regeleinde/);
  assert.match(String(fout), /DATAQUERY_DATABASE_URL/);
});

test("een regeleinde erachter telt net zo goed", () => {
  assert.match(String(controleerVerbindingssnaar("postgres://rol:pw@host/db\n", "X")), /spatie of regeleinde/);
});

test("de naam van de variabele ervoor geplakt wordt herkend", () => {
  const fout = controleerVerbindingssnaar("DATAQUERY_DATABASE_URL=postgres://rol:pw@host/db", "X");
  assert.match(String(fout), /postgres:\/\/ of postgresql:\/\//);
  // De melding laat zien wat er dan wél staat, anders zoek je in het duister.
  assert.match(String(fout), /DATAQUERY_DATABASE_UR/);
});

test("aanhalingstekens eromheen worden herkend", () => {
  assert.match(String(controleerVerbindingssnaar('"postgres://rol:pw@host/db"', "X")), /begint met/);
});

test("een placeholder die nog is blijven staan", () => {
  assert.notEqual(controleerVerbindingssnaar("your database url", "X"), null);
});

test("eisVerbindingssnaar werpt met dezelfde tekst", () => {
  assert.throws(() => eisVerbindingssnaar(" postgres://rol:pw@host/db", "X"), /spatie of regeleinde/);
  assert.doesNotThrow(() => eisVerbindingssnaar("postgres://rol:pw@host/db", "X"));
});
