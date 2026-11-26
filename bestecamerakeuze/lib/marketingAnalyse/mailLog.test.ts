import assert from "node:assert/strict";
import { test } from "node:test";
import { filterMails, mailOverzicht, type LogRij, type VersieRij } from "./mailLog";

const versie = (id: string, nr: number, extra: Partial<VersieRij>): VersieRij => ({
  id,
  campagne_id: "c1",
  campagne_naam: "Audi A2",
  versie: nr,
  label: "tussentijds",
  geanalyseerd_op: `2026-11-2${nr}T10:00:00.000Z`,
  notificatie_verstuurd_op: null,
  notificatie_aantal: null,
  notificatie_fout: null,
  ...extra,
});

const log: LogRij[] = [
  { id: "l1", versie_id: "v5", campagne_id: "c1", campagne_naam: "Audi A2", versie: 5, label: "tussentijds", email: "a@udenhout.nl", verstuurd_op: "2026-11-27T10:00:05.000Z", gelukt: true, fout: null },
  { id: "l2", versie_id: "v5", campagne_id: "c1", campagne_naam: "Audi A2", versie: 5, label: "tussentijds", email: "b@udenhout.nl", verstuurd_op: "2026-11-27T10:00:06.000Z", gelukt: false, fout: "Mailbox vol" },
];

test("logregels per adres en versies zonder logboek", () => {
  const regels = mailOverzicht(log, [
    versie("v1", 1, { notificatie_verstuurd_op: "2026-11-21T10:00:00.000Z", notificatie_aantal: 0 }),
    versie("v2", 2, { notificatie_fout: "GMAIL_GEBRUIKER ontbreekt" }),
    versie("v3", 3, { notificatie_verstuurd_op: "2026-11-25T11:20:00.000Z", notificatie_aantal: 1 }),
    versie("v5", 5, { notificatie_verstuurd_op: "2026-11-27T10:00:00.000Z", notificatie_aantal: 1, notificatie_fout: "b@: Mailbox vol" }),
  ]);
  assert.deepEqual(
    regels.map((r) => [r.versie, r.email, r.status]),
    [
      [5, "b@udenhout.nl", "mislukt"],
      [5, "a@udenhout.nl", "verstuurd"],
      [3, null, "adressen-onbekend"],
      [2, null, "niet-verstuurd"],
      [1, null, "geen-volgers"],
    ],
  );
  assert.equal(regels[0].toelichting, "Mailbox vol");
  assert.match(regels[2].toelichting ?? "", /1 adres\. Welke is niet bewaard/);
  assert.equal(regels[3].toelichting, "GMAIL_GEBRUIKER ontbreekt");
});

test("een versie die nog verstuurd moet worden", () => {
  const [r] = mailOverzicht([], [versie("v9", 9, {})]);
  assert.equal(r.status, "niet-verstuurd");
  assert.equal(r.toelichting, "Nog niet verstuurd.");
});

test("zoeken op adres of campagne", () => {
  const regels = mailOverzicht(log, [versie("v3", 3, { campagne_naam: "Škoda herfst", notificatie_verstuurd_op: "2026-11-25T11:20:00.000Z", notificatie_aantal: 2 })]);
  assert.deepEqual(filterMails(regels, "A@UDEN").map((r) => r.id), ["l1"]);
  assert.deepEqual(filterMails(regels, "škoda").map((r) => r.id), ["versie-v3"]);
  assert.equal(filterMails(regels, "  ").length, 3);
});
