import assert from "node:assert/strict";
import { test } from "node:test";
import { bouwActieSql, metingenSom, type ActieKeuze } from "./bron.ts";

/**
 * De conversie-acties die het team aanwijst worden als parameter in de query gezet, en de
 * nummering daarvan moet meelopen met wat er daadwerkelijk aan argumenten meegaat.
 * Postgres weigert een query waarin een `$n` staat die nergens gebruikt wordt ("could not
 * determine data type of parameter"), en telt een verkeerd genummerde plaatshouder
 * gewoon de verkeerde lijst op. Allebei kun je niet zien aan het getal dat eruit komt.
 */

const LEEG: ActieKeuze = { leads: [], conversies: [] };

test("zonder aangewezen acties staan er geen joins en geen extra parameters", () => {
  const argumenten: unknown[] = ["2026-09-01", "2026-09-30", ["meta"]];
  const { joins, sommen } = bouwActieSql(LEEG, argumenten);

  assert.equal(joins, "");
  assert.equal(argumenten.length, 3, "een ongebruikte $n laat Postgres de query weigeren");
  assert.match(sommen, /coalesce\(sum\(a\.leads\), 0\) as leads/);
  assert.match(sommen, /coalesce\(sum\(a\.conversies\), 0\) as conversies/);
  assert.doesNotMatch(sommen, /extra/);
});

test("alleen leads: één join op $4, en alleen de leadsom verandert", () => {
  const argumenten: unknown[] = ["2026-09-01", "2026-09-30", ["meta"]];
  const { joins, sommen } = bouwActieSql(
    { leads: ["actions_proefrit_aanvraag"], conversies: [] },
    argumenten,
  );

  assert.equal(argumenten.length, 4);
  assert.deepEqual(argumenten[3], ["actions_proefrit_aanvraag"]);
  assert.match(joins, /any\(\$4\)/);
  assert.equal(joins.match(/left join lateral/g)?.length, 1);
  assert.match(sommen, /sum\(a\.leads\), 0\) \+ coalesce\(sum\(l\.extra\), 0\) as leads/);
  assert.match(sommen, /coalesce\(sum\(a\.conversies\), 0\) as conversies/);
});

// De valkuil: bij alléén conversies is de plaatshouder $4 en niet $5. Hardcoderen op $5
// omdat leads "normaal gesproken" $4 is, levert een query op die Postgres afwijst.
test("alleen conversies: de plaatshouder is $4 en niet $5", () => {
  const argumenten: unknown[] = ["2026-09-01", "2026-09-30", ["meta"]];
  const { joins, sommen } = bouwActieSql(
    { leads: [], conversies: ["actions_offerte"] },
    argumenten,
  );

  assert.equal(argumenten.length, 4);
  assert.match(joins, /any\(\$4\)/);
  assert.doesNotMatch(joins, /\$5/);
  assert.match(sommen, /sum\(a\.conversies\), 0\) \+ coalesce\(sum\(c\.extra\), 0\) as conversies/);
  assert.match(sommen, /coalesce\(sum\(a\.leads\), 0\) as leads/);
});

test("allebei: twee joins, elk op hun eigen parameter en eigen alias", () => {
  const argumenten: unknown[] = ["2026-09-01", "2026-09-30", ["meta"]];
  const { joins, sommen } = bouwActieSql(
    { leads: ["actions_proefrit_aanvraag"], conversies: ["actions_offerte"] },
    argumenten,
  );

  assert.equal(argumenten.length, 5);
  assert.deepEqual(argumenten[3], ["actions_proefrit_aanvraag"]);
  assert.deepEqual(argumenten[4], ["actions_offerte"]);
  assert.equal(joins.match(/left join lateral/g)?.length, 2);
  assert.match(joins, /any\(\$4\)\n[\s\S]*\) l on true/);
  assert.match(joins, /any\(\$5\)\n[\s\S]*\) c on true/);
  assert.match(sommen, /sum\(l\.extra\), 0\) as leads/);
  assert.match(sommen, /sum\(c\.extra\), 0\) as conversies/);
});

test("bereik zit niet in de sommen", () => {
  // De kolom bestaat nog in de database, maar optellen over dagen levert een getal op dat
  // nooit met de advertentiebeheerder overeenkomt. Zie lib/windsor/velden.ts.
  assert.doesNotMatch(metingenSom(LEEG), /bereik/);
});
