import type { Label } from "./types";

/**
 * Het overzicht Verzonden e-mails (migratie 0050, alleen de eigenaar): per adres wie wanneer
 * welke analyse per mail kreeg. Het logboek per adres bestaat pas sinds 25 november 2026; een
 * versie van daarvoor staat erin met alleen het aantal uit de versie zelf. Een versie zonder
 * mail (geen volgers, een fout, nog niet verstuurd) staat er ook in, zodat te zien is waarom
 * iemand niets kreeg.
 */

export type MailStatus = "verstuurd" | "mislukt" | "adressen-onbekend" | "geen-volgers" | "niet-verstuurd";

export interface MaMailRegel {
  id: string;
  /** Wanneer de mail ging (of, zonder mail, wanneer de analyse gemaakt is). */
  op: string;
  /** Null als het adres niet bekend is (geen mail, of van vóór het logboek). */
  email: string | null;
  campagneId: string | null;
  campagneNaam: string;
  versie: number;
  label: Label | null;
  status: MailStatus;
  toelichting: string | null;
}

export interface LogRij {
  id: string;
  versie_id: string | null;
  campagne_id: string | null;
  campagne_naam: string;
  versie: number;
  label: string | null;
  email: string;
  verstuurd_op: string | Date;
  gelukt: boolean;
  fout: string | null;
}

export interface VersieRij {
  id: string;
  campagne_id: string;
  campagne_naam: string;
  versie: number;
  label: string | null;
  geanalyseerd_op: string | Date;
  notificatie_verstuurd_op: string | Date | null;
  notificatie_aantal: number | null;
  notificatie_fout: string | null;
}

const tijd = (x: string | Date) => (x instanceof Date ? x.toISOString() : x);
const label = (x: string | null): Label | null => (x === "tussentijds" || x === "eind" ? x : null);

/** Logregels en versies samen, nieuwste eerst. */
export function mailOverzicht(log: readonly LogRij[], versies: readonly VersieRij[]): MaMailRegel[] {
  const metLog = new Set(log.map((r) => r.versie_id).filter(Boolean));
  const regels: MaMailRegel[] = log.map((r) => ({
    id: r.id,
    op: tijd(r.verstuurd_op),
    email: r.email,
    campagneId: r.campagne_id,
    campagneNaam: r.campagne_naam,
    versie: r.versie,
    label: label(r.label),
    status: r.gelukt ? "verstuurd" : "mislukt",
    toelichting: r.gelukt ? null : r.fout,
  }));

  for (const v of versies) {
    if (metLog.has(v.id)) continue;
    const basis = { id: `versie-${v.id}`, email: null, campagneId: v.campagne_id, campagneNaam: v.campagne_naam, versie: v.versie, label: label(v.label) };
    const aantal = v.notificatie_aantal;
    if (v.notificatie_verstuurd_op && aantal !== null && aantal > 0) {
      regels.push({
        ...basis,
        op: tijd(v.notificatie_verstuurd_op),
        status: "adressen-onbekend",
        toelichting: `Verstuurd aan ${aantal} ${aantal === 1 ? "adres" : "adressen"}. Welke is niet bewaard: dit was vóór het logboek.`,
      });
    } else if (aantal === 0) {
      regels.push({ ...basis, op: tijd(v.notificatie_verstuurd_op ?? v.geanalyseerd_op), status: "geen-volgers", toelichting: "Geen volgers, dus geen mail." });
    } else {
      regels.push({
        ...basis,
        op: tijd(v.geanalyseerd_op),
        status: "niet-verstuurd",
        toelichting: v.notificatie_fout ?? (v.notificatie_verstuurd_op ? "Bezig met versturen, of afgebroken." : "Nog niet verstuurd."),
      });
    }
  }

  return regels.sort((a, b) => b.op.localeCompare(a.op));
}

/** Zoeken op adres of campagne, zonder hoofdletters. */
export function filterMails(regels: readonly MaMailRegel[], zoek: string): MaMailRegel[] {
  const z = zoek.trim().toLowerCase();
  if (!z) return [...regels];
  return regels.filter((r) => (r.email ?? "").toLowerCase().includes(z) || r.campagneNaam.toLowerCase().includes(z));
}
