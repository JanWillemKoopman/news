/**
 * Marketing analyse — de mail bij een nieuwe analyse. Pure functies (geen database, geen
 * verzending), zodat ze zonder bundler te testen zijn (`mail.test.ts`). Verzenden gebeurt in
 * `notificatie.ts`.
 */
import { DOEL_STATUS_NAAM, LABEL_NAAM, type DoelOordeel, type Label } from "./types";

const MAX_EMAIL = 254;

/** Een e-mailadres zoals iemand het intypt, opgeschoond; null als het geen geldig adres is. */
export function leesEmail(waarde: unknown): string | null {
  if (typeof waarde !== "string") return null;
  const s = waarde.trim().toLowerCase();
  if (!s || s.length > MAX_EMAIL) return null;
  return /^[^@\s,;<>"]+@[^@\s,;<>"]+\.[^@\s,;<>"]{2,}$/.test(s) ? s : null;
}

/** Tekst veilig in HTML zetten: alles uit de analyse is door een model geschreven. */
export function ontsnap(tekst: string): string {
  return tekst
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface MailInvoer {
  campagneNaam: string;
  bedrijf: string;
  versie: number;
  /** Null bij een rapportage. */
  label: Label | null;
  geanalyseerdOp: string;
  kop: string;
  regels: string[];
  doel?: DoelOordeel | null;
  analyseUrl: string;
  afmeldUrl: string;
}

export interface Mail {
  onderwerp: string;
  html: string;
  tekst: string;
}

function datum(op: string): string {
  const d = new Date(op);
  return Number.isNaN(d.getTime())
    ? op
    : new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Amsterdam" }).format(d);
}

/** De mail: kop, de vijf regels, het doeloordeel, een knop naar de analyse en een afmeldlink. */
export function bouwMail(i: MailInvoer): Mail {
  const label = i.label ? (LABEL_NAAM[i.label] ?? i.label) : null;
  const versieRegel = [`Versie ${i.versie}`, label, datum(i.geanalyseerdOp)].filter(Boolean).join(" · ");
  const regels = i.regels.filter((r) => typeof r === "string" && r.trim()).slice(0, 5);
  const doel = i.doel ? `${DOEL_STATUS_NAAM[i.doel.status] ?? i.doel.status}${i.doel.toelichting ? ` — ${i.doel.toelichting}` : ""}` : null;
  const onderwerp = `Nieuwe marketing analyse: ${i.campagneNaam} (v${i.versie}${label ? `, ${label.toLowerCase()}` : ""})`;

  const tekst = [
    `Er staat een nieuwe analyse klaar van ${i.campagneNaam} (${i.bedrijf}).`,
    versieRegel,
    "",
    i.kop,
    "",
    ...regels.map((r) => `- ${r}`),
    ...(doel ? ["", `Doel: ${doel}`] : []),
    "",
    `Bekijk de analyse: ${i.analyseUrl}`,
    "",
    `Je krijgt deze mail omdat je deze campagne volgt in het marketing dashboard. Afmelden: ${i.afmeldUrl}`,
  ].join("\n");

  const lijst = regels.map((r) => `<li style="margin:0 0 6px 0;">${ontsnap(r)}</li>`).join("");
  const html = `<!doctype html>
<html lang="nl"><body style="margin:0;padding:24px;background:#f7f6f3;font-family:Arial,Helvetica,sans-serif;color:#0f1115;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e6e3dc;border-radius:12px;">
<tr><td style="padding:24px 28px;">
<p style="margin:0 0 4px 0;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#6b6f76;">Marketing analyse · ${ontsnap(i.bedrijf)}</p>
<h1 style="margin:0 0 4px 0;font-size:20px;">${ontsnap(i.campagneNaam)}</h1>
<p style="margin:0 0 20px 0;font-size:13px;color:#6b6f76;">${ontsnap(versieRegel)}</p>
<p style="margin:0 0 12px 0;font-size:16px;font-weight:bold;line-height:1.4;">${ontsnap(i.kop)}</p>
${lijst ? `<ul style="margin:0 0 16px 0;padding-left:20px;font-size:14px;line-height:1.5;">${lijst}</ul>` : ""}
${doel ? `<p style="margin:0 0 20px 0;font-size:14px;line-height:1.5;"><span style="color:#6b6f76;">Doel:</span> ${ontsnap(doel)}</p>` : ""}
<p style="margin:0 0 8px 0;"><a href="${ontsnap(i.analyseUrl)}" style="display:inline-block;background:#003da5;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:999px;font-size:14px;font-weight:bold;">Bekijk de analyse</a></p>
</td></tr>
<tr><td style="padding:14px 28px;border-top:1px solid #eeebe5;font-size:12px;color:#8a8e95;line-height:1.5;">
Je krijgt deze mail omdat je deze campagne volgt in het marketing dashboard. <a href="${ontsnap(i.afmeldUrl)}" style="color:#8a8e95;">Afmelden</a>
</td></tr>
</table>
</body></html>`;

  return { onderwerp, html, tekst };
}
