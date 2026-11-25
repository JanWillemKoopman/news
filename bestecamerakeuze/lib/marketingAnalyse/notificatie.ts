/**
 * Marketing analyse — volgers mailen bij een nieuwe analyse.
 *
 * Aangeroepen door /api/marketing-analyse/notificatie (die de database-trigger uit migratie
 * 0043 na elke nieuwe versie aanroept) en door de nachtelijke sync als vangnet. Verstuurt via
 * het gedeelde Gmail-account: GMAIL_GEBRUIKER (het adres) en GMAIL_APP_WACHTWOORD (een
 * app-wachtwoord uit de Google-accountinstellingen, nooit het gewone wachtwoord).
 *
 * Elke versie wordt maar één keer verstuurd: de route claimt hem eerst
 * (notificatie_verstuurd_op van leeg naar nu). Lukt geen enkele mail, dan gaat de claim terug
 * met de fout erbij en probeert de sync het later opnieuw — hoogstens zeven dagen lang.
 */
import { Client } from "pg";
import nodemailer from "nodemailer";
import { controleerVerbindingssnaar } from "@/lib/verbindingssnaar";
import { bouwMail } from "./mail";
import { bedrijvenLabel } from "./rekenen";
import type { DoelOordeel, Label } from "./types";

const PRODUCTIE_URL = "https://news-ten-chi.vercel.app";

/** Het adres van het dashboard voor de links in de mail. */
export function dashboardUrl(): string {
  const eigen = process.env.DASHBOARD_URL?.trim();
  if (eigen) return eigen.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return vercel ? `https://${vercel}` : PRODUCTIE_URL;
}

/** Een schrijvende databaseverbinding (dezelfde als de nachtelijke sync), netjes afgesloten. */
export async function metDienstVerbinding<T>(werk: (client: Client) => Promise<T>): Promise<T> {
  const snaar = process.env.SYNC_DATABASE_URL;
  if (!snaar) throw new Error("SYNC_DATABASE_URL ontbreekt.");
  const snaarFout = controleerVerbindingssnaar(snaar, "SYNC_DATABASE_URL");
  if (snaarFout) throw new Error(snaarFout);
  const client = new Client({ connectionString: snaar, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    return await werk(client);
  } finally {
    await client.end().catch(() => {});
  }
}

export type NotificatieUitkomst =
  | { status: "verstuurd"; aantal: number; mislukt: number }
  | { status: "geen-volgers" }
  | { status: "overgeslagen"; reden: string }
  | { status: "mislukt"; fout: string };

function gmailInstellingen(): { gebruiker: string; wachtwoord: string } | null {
  const gebruiker = process.env.GMAIL_GEBRUIKER?.trim();
  // Google toont het app-wachtwoord in blokjes van vier met spaties; die horen er niet bij.
  const wachtwoord = process.env.GMAIL_APP_WACHTWOORD?.replace(/\s+/g, "");
  return gebruiker && wachtwoord ? { gebruiker, wachtwoord } : null;
}

function kort(fout: unknown): string {
  return (fout instanceof Error ? fout.message : String(fout)).slice(0, 500);
}

/**
 * Eén regel in het logboek Verzonden e-mails (migratie 0050), ook als het versturen mislukte.
 * Een fout bij het loggen mag het mailen nooit stoppen: dan ontbreekt alleen die regel.
 */
async function logMail(
  client: Client,
  regel: { versieId: string; campagneId: string; campagneNaam: string; versie: number; label: Label | null; email: string; onderwerp: string; gelukt: boolean; fout: string | null },
) {
  await client
    .query(
      `insert into dataloket.marketing_analyse_mail_log
         (versie_id, campagne_id, campagne_naam, versie, label, email, onderwerp, gelukt, fout)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [regel.versieId, regel.campagneId, regel.campagneNaam, regel.versie, regel.label, regel.email, regel.onderwerp, regel.gelukt, regel.fout],
    )
    .catch(() => {});
}

/** Mailt de volgers van de campagne van deze versie, als dat nog niet gebeurd is. */
export async function verstuurNotificaties(client: Client, analyseId: string): Promise<NotificatieUitkomst> {
  const gmail = gmailInstellingen();
  if (!gmail) {
    await client.query(
      `update dataloket.marketing_analyse_versies set notificatie_fout = $2
        where id = $1 and notificatie_verstuurd_op is null`,
      [analyseId, "GMAIL_GEBRUIKER of GMAIL_APP_WACHTWOORD ontbreekt in Vercel."],
    );
    return { status: "overgeslagen", reden: "Gmail is niet ingesteld." };
  }

  // De claim: alleen een bestaande, nog niet verstuurde versie van hoogstens zeven dagen oud.
  const claim = await client.query<{
    campagne_id: string;
    versie: number;
    label: Label | null;
    geanalyseerd_op: Date;
    resultaat: { samenvatting?: { kop?: unknown; regels?: unknown }; doel?: DoelOordeel | null } | null;
    samenvatting: string | null;
  }>(
    `update dataloket.marketing_analyse_versies
        set notificatie_verstuurd_op = now(), notificatie_fout = null
      where id = $1 and notificatie_verstuurd_op is null and geanalyseerd_op > now() - interval '7 days'
      returning campagne_id, versie, label, geanalyseerd_op, resultaat, samenvatting`,
    [analyseId],
  );
  const versie = claim.rows[0];
  if (!versie) return { status: "overgeslagen", reden: "Onbekend, al verstuurd of ouder dan zeven dagen." };

  try {
    const [campagne, volgers] = await Promise.all([
      client.query<{ naam: string; bedrijven: string[] }>(
        `select naam, bedrijven from dataloket.marketing_analyse_campagnes where id = $1`,
        [versie.campagne_id],
      ),
      client.query<{ email: string; afmeld_token: string }>(
        `select email, afmeld_token from dataloket.marketing_analyse_volgers where campagne_id = $1 order by toegevoegd_op`,
        [versie.campagne_id],
      ),
    ]);
    const c = campagne.rows[0];
    if (!c) throw new Error("Campagne niet gevonden.");
    if (volgers.rows.length === 0) {
      await client.query(`update dataloket.marketing_analyse_versies set notificatie_aantal = 0 where id = $1`, [analyseId]);
      return { status: "geen-volgers" };
    }

    const basis = dashboardUrl();
    const s = versie.resultaat?.samenvatting;
    const kop = typeof s?.kop === "string" && s.kop.trim() ? s.kop : (versie.samenvatting ?? "Nieuwe analyse");
    const regels = Array.isArray(s?.regels) ? s.regels.filter((r): r is string => typeof r === "string") : [];

    const transport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: gmail.gebruiker, pass: gmail.wachtwoord },
    });

    let aantal = 0;
    const fouten: string[] = [];
    const logBasis = { versieId: analyseId, campagneId: versie.campagne_id, campagneNaam: c.naam, versie: versie.versie, label: versie.label };
    for (const v of volgers.rows) {
      const mail = bouwMail({
        campagneNaam: c.naam,
        bedrijf: bedrijvenLabel(c.bedrijven),
        versie: versie.versie,
        label: versie.label,
        geanalyseerdOp: versie.geanalyseerd_op.toISOString(),
        kop,
        regels,
        doel: versie.resultaat?.doel ?? null,
        analyseUrl: `${basis}/?tab=marketing-analyse&analyse=${encodeURIComponent(versie.campagne_id)}`,
        afmeldUrl: `${basis}/api/marketing-analyse/afmelden?token=${encodeURIComponent(v.afmeld_token)}`,
      });
      try {
        await transport.sendMail({
          from: { name: "Marketing analyse", address: gmail.gebruiker },
          to: v.email,
          subject: mail.onderwerp,
          text: mail.tekst,
          html: mail.html,
        });
        aantal++;
        await logMail(client, { ...logBasis, email: v.email, onderwerp: mail.onderwerp, gelukt: true, fout: null });
      } catch (err) {
        fouten.push(`${v.email}: ${kort(err)}`);
        await logMail(client, { ...logBasis, email: v.email, onderwerp: mail.onderwerp, gelukt: false, fout: kort(err) });
      }
    }
    transport.close();

    if (aantal === 0) throw new Error(fouten.join(" | ") || "Geen mail verstuurd.");
    // Deels gelukt: de claim blijft staan, anders krijgen de geslaagde adressen hem dubbel.
    await client.query(
      `update dataloket.marketing_analyse_versies set notificatie_aantal = $2, notificatie_fout = $3 where id = $1`,
      [analyseId, aantal, fouten.length ? fouten.join(" | ").slice(0, 2000) : null],
    );
    return { status: "verstuurd", aantal, mislukt: fouten.length };
  } catch (err) {
    const fout = kort(err);
    await client
      .query(
        `update dataloket.marketing_analyse_versies set notificatie_verstuurd_op = null, notificatie_fout = $2 where id = $1`,
        [analyseId, fout],
      )
      .catch(() => {});
    return { status: "mislukt", fout };
  }
}

/** Vangnet voor de nachtelijke sync: alle nog niet verstuurde versies van de laatste zeven dagen. */
export async function verstuurOpenstaande(client: Client): Promise<{ versies: number; verstuurd: number; fouten: string[] }> {
  if (!gmailInstellingen()) return { versies: 0, verstuurd: 0, fouten: [] };
  const open = await client.query<{ id: string }>(
    `select id from dataloket.marketing_analyse_versies
      where notificatie_verstuurd_op is null and geanalyseerd_op > now() - interval '7 days'
      order by geanalyseerd_op`,
  );
  let verstuurd = 0;
  const fouten: string[] = [];
  for (const { id } of open.rows) {
    const uitkomst = await verstuurNotificaties(client, id);
    if (uitkomst.status === "verstuurd") verstuurd += uitkomst.aantal;
    if (uitkomst.status === "mislukt") fouten.push(uitkomst.fout);
  }
  return { versies: open.rows.length, verstuurd, fouten };
}
