import { metDienstVerbinding } from "@/lib/marketingAnalyse/notificatie";
import { ontsnap } from "@/lib/marketingAnalyse/mail";

export const dynamic = "force-dynamic";

/**
 * Marketing analyse — afmelden via de link in de mail, zonder inloggen.
 *
 * GET  ?token=… → een pagina met een knop "Afmelden" (geen wijziging: virusscanners en
 *                 linkvoorbeelden openen links in mails vaak automatisch)
 * POST ?token=… → de volger is weg
 *
 * Staat buiten de inlog (`lib/toegang.ts`); het token is een willekeurige uuid per volger.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pagina(titel: string, inhoud: string, status = 200): Response {
  const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${ontsnap(titel)}</title></head>
<body style="margin:0;padding:40px 16px;background:#f7f6f3;font-family:Arial,Helvetica,sans-serif;color:#0f1115;">
<div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e6e3dc;border-radius:12px;padding:28px;">
<p style="margin:0 0 4px 0;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#6b6f76;">Marketing analyse</p>
<h1 style="margin:0 0 12px 0;font-size:20px;">${ontsnap(titel)}</h1>${inhoud}</div></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

function leesToken(request: Request): string | null {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  return UUID.test(token) ? token : null;
}

async function zoekVolger(token: string) {
  return metDienstVerbinding(async (client) => {
    const r = await client.query<{ email: string; naam: string }>(
      `select v.email, c.naam from dataloket.marketing_analyse_volgers v
         join dataloket.marketing_analyse_campagnes c on c.id = v.campagne_id
        where v.afmeld_token = $1`,
      [token],
    );
    return r.rows[0] ?? null;
  });
}

const ONBEKEND = pagina(
  "Al afgemeld",
  `<p style="margin:0;font-size:14px;line-height:1.5;">Deze afmeldlink is niet (meer) geldig. Waarschijnlijk ben je al afgemeld.</p>`,
);

export async function GET(request: Request) {
  const token = leesToken(request);
  if (!token) return ONBEKEND;
  try {
    const volger = await zoekVolger(token);
    if (!volger) return ONBEKEND;
    return pagina(
      "Afmelden",
      `<p style="margin:0 0 20px 0;font-size:14px;line-height:1.5;">Wil je <strong>${ontsnap(volger.email)}</strong> afmelden voor de mails over nieuwe analyses van <strong>${ontsnap(volger.naam)}</strong>?</p>
<form method="post"><button type="submit" style="background:#003da5;color:#fff;border:0;padding:10px 18px;border-radius:999px;font-size:14px;font-weight:bold;cursor:pointer;">Afmelden</button></form>`,
    );
  } catch {
    return pagina("Er ging iets mis", `<p style="margin:0;font-size:14px;">Probeer het later opnieuw.</p>`, 500);
  }
}

export async function POST(request: Request) {
  const token = leesToken(request);
  if (!token) return ONBEKEND;
  try {
    const weg = await metDienstVerbinding(async (client) => {
      const r = await client.query<{ email: string; naam: string }>(
        `delete from dataloket.marketing_analyse_volgers v
          using dataloket.marketing_analyse_campagnes c
          where v.afmeld_token = $1 and c.id = v.campagne_id
          returning v.email, c.naam`,
        [token],
      );
      return r.rows[0] ?? null;
    });
    if (!weg) return ONBEKEND;
    return pagina(
      "Afgemeld",
      `<p style="margin:0;font-size:14px;line-height:1.5;">${ontsnap(weg.email)} krijgt geen mails meer over nieuwe analyses van ${ontsnap(weg.naam)}. Je kunt de campagne altijd weer volgen in het dashboard.</p>`,
    );
  } catch {
    return pagina("Er ging iets mis", `<p style="margin:0;font-size:14px;">Probeer het later opnieuw.</p>`, 500);
  }
}
