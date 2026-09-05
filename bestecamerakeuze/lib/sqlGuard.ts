/**
 * Deterministische controle op de SQL die het model schrijft.
 *
 * Dit is bewust NIET de enige verdediging — de echte grenzen liggen in de database
 * (een rol met alleen SELECT-rechten op de v_-views, en een read-only transactie met
 * statement_timeout, zie dataQuery.ts). Deze laag vangt het er daarvóór al uit, zodat
 * een verkeerde query een nette foutmelding oplevert die het model kan herstellen in
 * plaats van een databasefout die naar de gebruiker lekt.
 *
 * Uitgangspunt: alles is verboden behalve één enkele SELECT (of WITH … SELECT).
 */

/** Maximum aantal rijen dat ooit naar het model of de browser gaat. */
export const MAX_ROWS = 1000;

export type GuardResult =
  | { ok: true; sql: string }
  | { ok: false; reden: string };

/**
 * Verwijdert commentaar en stringliteralen, zodat de trefwoordcontrole hieronder niet
 * afgaat op het woord "delete" in een merknaam of in een `-- toelichting`-regel.
 * De geretourneerde tekst is alleen bedoeld om te inspecteren, niet om uit te voeren.
 */
function stripLiteralsAndComments(sql: string): string {
  let out = "";
  let i = 0;
  while (i < sql.length) {
    const rest = sql.slice(i);
    if (rest.startsWith("--")) {
      const eind = sql.indexOf("\n", i);
      i = eind === -1 ? sql.length : eind;
      continue;
    }
    if (rest.startsWith("/*")) {
      const eind = sql.indexOf("*/", i + 2);
      i = eind === -1 ? sql.length : eind + 2;
      out += " ";
      continue;
    }
    if (sql[i] === "'" || sql[i] === '"') {
      const quote = sql[i];
      i++;
      while (i < sql.length) {
        // In SQL wordt een quote in een literal verdubbeld ('' of "").
        if (sql[i] === quote && sql[i + 1] === quote) {
          i += 2;
          continue;
        }
        if (sql[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      out += " '' ";
      continue;
    }
    out += sql[i];
    i++;
  }
  return out;
}

/** Alles wat data of schema kan wijzigen, plus een paar Postgres-specifieke ontsnappingen. */
const VERBODEN_TREFWOORDEN = [
  "insert", "update", "delete", "truncate", "drop", "alter", "create", "grant",
  "revoke", "comment", "copy", "vacuum", "analyze", "reindex", "cluster", "refresh",
  "call", "do", "execute", "prepare", "listen", "notify", "lock", "set", "reset",
  "begin", "commit", "rollback", "savepoint", "security", "pg_read_file",
  "pg_read_binary_file", "pg_ls_dir", "lo_import", "lo_export", "dblink", "pg_sleep",
];

/**
 * Controleert de query en geeft hem terug met een afgedwongen rijlimiet.
 * De limiet wordt er altíjd omheen gezet, ongeacht wat het model schreef — een
 * bestaande LIMIT in de query blijft gewoon werken en wint als hij lager is.
 */
export function guardSql(ruweSql: string): GuardResult {
  const sql = ruweSql.trim().replace(/;\s*$/, "");
  if (!sql) return { ok: false, reden: "Lege query." };
  if (sql.length > 20_000) {
    return { ok: false, reden: "Query is te lang (max 20.000 tekens)." };
  }

  const kaal = stripLiteralsAndComments(sql).toLowerCase();

  // Eén statement. Na het strippen van literalen mag er geen puntkomma meer in staan.
  if (kaal.includes(";")) {
    return {
      ok: false,
      reden: "Meerdere statements zijn niet toegestaan — stuur precies één SELECT.",
    };
  }

  // Moet met SELECT of WITH beginnen.
  if (!/^\s*(select|with)\b/.test(kaal)) {
    return {
      ok: false,
      reden: "Alleen SELECT-queries zijn toegestaan (eventueel met een WITH-clausule ervoor).",
    };
  }

  // Verboden trefwoorden, als heel woord.
  for (const woord of VERBODEN_TREFWOORDEN) {
    if (new RegExp(`\\b${woord}\\b`).test(kaal)) {
      return {
        ok: false,
        reden: `Het trefwoord "${woord}" is niet toegestaan. Deze verbinding kan alleen lezen.`,
      };
    }
  }

  // Systeemcatalogi en interne schema's zijn geen data van de gebruiker.
  if (/\b(pg_catalog|information_schema|pg_[a-z_]*)\s*\./.test(kaal)) {
    return {
      ok: false,
      reden:
        "Systeemtabellen zijn niet toegankelijk. Gebruik de views uit het datawoordenboek.",
    };
  }

  return { ok: true, sql: `select * from (${sql}) as begrensd limit ${MAX_ROWS}` };
}
