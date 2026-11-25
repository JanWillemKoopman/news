import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { isBeheerder } from "@/lib/gebruikersbeheer";
import { mailOverzicht, type LogRij, type VersieRij } from "@/lib/marketingAnalyse/mailLog";
import { metDienstVerbinding } from "@/lib/marketingAnalyse/notificatie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Hoeveel logregels het overzicht hoogstens toont (nieuwste eerst). */
const MAX_REGELS = 2000;

/**
 * Marketing analyse — Verzonden e-mails (migratie 0050), alleen voor de eigenaar.
 *
 * GET → per adres wie wanneer welke analyse per mail kreeg, plus de versies zonder logregel
 *       (van vóór het logboek, zonder volgers of niet verstuurd). Leest via de dienstverbinding:
 *       het logboek heeft bewust geen leesrecht voor ingelogde collega's.
 */
export async function GET() {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  if (!isBeheerder(gebruiker.email)) {
    return NextResponse.json({ fout: "Alleen de eigenaar kan de verzonden e-mails bekijken." }, { status: 403 });
  }
  try {
    const { log, versies } = await metDienstVerbinding(async (client) => {
      const [log, versies] = await Promise.all([
        client.query<LogRij>(
          `select id, versie_id, campagne_id, campagne_naam, versie, label, email, verstuurd_op, gelukt, fout
             from dataloket.marketing_analyse_mail_log
            order by verstuurd_op desc
            limit ${MAX_REGELS}`,
        ),
        client.query<VersieRij>(
          `select v.id, v.campagne_id, c.naam as campagne_naam, v.versie, v.label, v.geanalyseerd_op,
                  v.notificatie_verstuurd_op, v.notificatie_aantal, v.notificatie_fout
             from dataloket.marketing_analyse_versies v
             join dataloket.marketing_analyse_campagnes c on c.id = v.campagne_id`,
        ),
      ]);
      return { log: log.rows, versies: versies.rows };
    });
    return NextResponse.json({ regels: mailOverzicht(log, versies), afgekapt: log.length >= MAX_REGELS });
  } catch (err) {
    return NextResponse.json({ fout: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
