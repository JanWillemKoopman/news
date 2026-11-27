/**
 * Marketing analyse — de mail bij een nieuw Maandrapport (formaat 4). Pure functies (geen database,
 * geen verzending), net als `mail.ts`; getest in `mailMaandrapport.test.ts`. Verzenden gebeurt in
 * `notificatie.ts`.
 *
 * Opzet: een kop met de maand, per bedrijf een blok met de vier hoofdcijfers naast die van de maand ervoor, de
 * forecast van de leads en drie of vier zinnen met de belangrijkste uitkomsten (`mailPunten`), en een knop naar het
 * volledige rapport. Alleen tabellen en inline stijlen, want mailprogramma's kennen geen moderne CSS; geen
 * afbeeldingen, want die laden niet overal.
 */
import { maandNaam, maandrapportForecast } from "./maandrapport";
import { ontsnap, type Mail, type MailBijlage } from "./mail";
import { logoSleutelVoor, MAIL_LOGOS } from "./mailLogos";
import { formatWaarde, vergelijkingVerschil, type VergelijkingOordeel } from "./rekenen";
import type { Eenheid, MaMaandrapport, MrBedrijf, MrWaarde } from "./types";

export interface MaandrapportMailInvoer {
  campagneNaam: string;
  versie: number;
  rapport: MaMaandrapport;
  analyseUrl: string;
  afmeldUrl: string;
}

/**
 * Porsche-stijl (verzoek van de eigenaar, 27 november 2026): zwart en wit, scherpe hoeken, dunne lijnen, veel ruimte,
 * kleine hoofdletterkoppen met brede letterafstand en één spaarzaam rood accent. Alleen de stijl: geen logo of
 * wapen. De kleuren volgen het Porsche Design System (zwart #010205, Guards Red #d5001c, succesgroen #018a16).
 */
export const KLEUR = {
  pagina: "#eeeff2",
  kaart: "#ffffff",
  zwart: "#010205",
  inkt: "#010205",
  tekst: "#27282d",
  gedempt: "#6b6d70",
  zacht: "#949498",
  lijn: "#e3e4e8",
  vlak: "#f6f6f8",
  kopTekst: "#a9abb0",
  accent: "#d5001c",
  goed: "#018a16",
  slecht: "#d5001c",
} as const;

// Porsche Next staat zelden in een mailprogramma; Helvetica en Arial komen er het dichtst bij.
const LETTERS = "font-family:'Porsche Next','Helvetica Neue',Helvetica,Arial,sans-serif;";

const VERSCHIL_KLEUR: Record<VergelijkingOordeel, string> = {
  gunstig: KLEUR.goed,
  ongunstig: KLEUR.slecht,
  neutraal: KLEUR.gedempt,
};

interface Cijfer {
  label: string;
  waarde: string;
  /** Het verschil met de vorige maand, bijv. "↑ +18%"; leeg als er geen vergelijking is. */
  verschil: string;
  kleur: string;
}

function pijl(richting: "hoger" | "lager" | "gelijk"): string {
  return richting === "hoger" ? "↑" : richting === "lager" ? "↓" : "→";
}

function cijfer(label: string, w: MrWaarde, eenheid: Eenheid, vorigeMaand: string, hogerIsBeter?: boolean, nietGemeten?: string): Cijfer {
  if (nietGemeten) return { label, waarde: "—", verschil: nietGemeten, kleur: KLEUR.zacht };
  const v = vergelijkingVerschil(w.waarde, { label: vorigeMaand, waarde: w.vorige ?? null, hogerIsBeter }, eenheid);
  return {
    label,
    waarde: formatWaarde(w.waarde, eenheid),
    verschil: v ? `${pijl(v.richting)} ${v.tekst === "gelijk" ? "gelijk" : v.tekst}` : "",
    kleur: v ? VERSCHIL_KLEUR[v.oordeel] : KLEUR.zacht,
  };
}

/** De vier hoofdcijfers van een bedrijf, zoals de tegels bovenaan het tabblad. */
export function hoofdcijfers(b: MrBedrijf, vorigeMaand: string): Cijfer[] {
  return [
    cijfer("Online leads", b.leads, "aantal", vorigeMaand, true, b.leads.nietGemeten),
    cijfer("Websitebezoeken", b.sessies, "aantal", vorigeMaand, true, b.sessies.nietGemeten),
    cijfer("Social bereik", b.bereik, "aantal", vorigeMaand, true, b.bereik.nietGemeten),
    cijfer("Uitgaven", b.uitgaven, "euro", vorigeMaand, undefined, b.uitgaven.nietGemeten),
  ];
}

/** "Forecast november: ± 73 leads", of null als er te weinig maanden zijn. */
export function forecastRegel(b: MrBedrijf, volgendeMaandNaam: string): string | null {
  const f = b.leads.reeks ? maandrapportForecast(b.leads.reeks.waarden) : null;
  return f ? `Forecast ${volgendeMaandNaam}: ± ${formatWaarde(f.verwachting, "aantal")} leads` : null;
}

function volgendeMaandNaam(maand: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(maand);
  if (!m) return "";
  const j = Number(m[1]);
  const n = Number(m[2]);
  return maandNaam(n >= 12 ? `${j + 1}-01` : `${j}-${String(n + 1).padStart(2, "0")}`, false);
}

function statsRij(cijfers: Cijfer[]): string {
  const cellen = cijfers
    .map(
      (c, i) => `<td width="25%" valign="top" style="padding:14px ${i === 3 ? "0" : "10px"} 14px ${i === 0 ? "0" : "14px"};${i > 0 ? `border-left:1px solid ${KLEUR.lijn};` : ""}">
<div style="${LETTERS}font-size:10px;line-height:14px;letter-spacing:.14em;text-transform:uppercase;color:${KLEUR.zacht};">${ontsnap(c.label)}</div>
<div style="${LETTERS}font-size:24px;line-height:30px;font-weight:700;color:${KLEUR.inkt};padding-top:4px;letter-spacing:-.01em;">${ontsnap(c.waarde)}</div>
<div style="${LETTERS}font-size:12px;line-height:18px;font-weight:700;color:${c.kleur};">${c.verschil ? ontsnap(c.verschil) : "&nbsp;"}</div>
</td>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid ${KLEUR.lijn};border-bottom:1px solid ${KLEUR.lijn};"><tr>${cellen}</tr></table>`;
}

/** De titel van een bedrijf: het logo van zijn eigen website links, de naam rechts; zonder logo alleen de naam. */
function titel(naam: string): string {
  const sleutel = logoSleutelVoor(naam);
  const tekst = `<span style="${LETTERS}font-size:24px;line-height:30px;font-weight:700;color:${KLEUR.inkt};letter-spacing:-.015em;">${ontsnap(naam)}</span>`;
  if (!sleutel) return tekst;
  const l = MAIL_LOGOS[sleutel];
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>
<td valign="middle" style="padding:0 20px 0 0;width:${l.breedte + 20}px;"><img src="cid:logo-${sleutel}" alt="${ontsnap(naam)}" width="${l.breedte}" height="${l.hoogte}" style="display:block;border:0;outline:none;width:${l.breedte}px;height:${l.hoogte}px;"></td>
<td valign="middle" style="padding:0 0 0 20px;border-left:1px solid ${KLEUR.lijn};">${tekst}</td>
</tr></table>`;
}

function bedrijfBlok(b: MrBedrijf, nr: number, totaal: number, vorigeMaand: string, volgende: string, laatste: boolean): string {
  const punten = (b.mailPunten ?? []).filter(Boolean);
  const forecast = forecastRegel(b, volgende);
  const lijst = punten
    .map(
      (p) => `<tr><td width="20" valign="top" style="padding:0 0 11px 0;${LETTERS}font-size:9px;line-height:23px;color:${KLEUR.zwart};">&#9632;</td>
<td valign="top" style="padding:0 0 11px 0;${LETTERS}font-size:14.5px;line-height:23px;color:${KLEUR.tekst};">${ontsnap(p)}</td></tr>`,
    )
    .join("");
  return `<tr><td style="padding:36px 36px ${laatste ? "36px" : "34px"} 36px;${laatste ? "" : `border-bottom:1px solid ${KLEUR.lijn};`}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
<tr><td style="padding:0 0 14px 0;${LETTERS}font-size:10px;line-height:14px;letter-spacing:.2em;text-transform:uppercase;color:${KLEUR.accent};font-weight:700;">${String(nr).padStart(2, "0")} / ${String(totaal).padStart(2, "0")}</td></tr>
<tr><td style="padding:0 0 20px 0;">${titel(b.naam)}</td></tr>
<tr><td>${statsRij(hoofdcijfers(b, vorigeMaand))}</td></tr>
${forecast ? `<tr><td style="padding:14px 0 0 0;${LETTERS}font-size:12px;line-height:18px;color:${KLEUR.gedempt};"><span style="color:${KLEUR.inkt};font-weight:700;">${ontsnap(forecast)}</span> &nbsp;&middot;&nbsp; trend doorgezet</td></tr>` : ""}
${lijst ? `<tr><td style="padding:26px 0 14px 0;${LETTERS}font-size:10px;line-height:14px;letter-spacing:.2em;text-transform:uppercase;color:${KLEUR.inkt};font-weight:700;">Analyse</td></tr>
<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${lijst}</table></td></tr>` : ""}
</table>
</td></tr>`;
}

/** Een knop in Porsche-stijl: scherpe hoeken, zwart op licht en wit op donker. Bulletproof voor Outlook. */
function knop(url: string, donker: boolean): string {
  const bg = donker ? "#ffffff" : KLEUR.zwart;
  const kleur = donker ? KLEUR.zwart : "#ffffff";
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr><td bgcolor="${bg}" style="background:${bg};">
<a href="${ontsnap(url)}" style="display:inline-block;padding:16px 34px;${LETTERS}font-size:14px;line-height:20px;font-weight:700;color:${kleur};text-decoration:none;letter-spacing:.02em;">Ga naar rapportage &nbsp;&rarr;</a>
</td></tr></table>`;
}

/** De mail bij een nieuw Maandrapport: onderwerp, HTML en platte tekst. */
export function bouwMaandrapportMail(i: MaandrapportMailInvoer): Mail {
  const r = i.rapport;
  const maand = maandNaam(r.maand);
  const vorige = maandNaam(r.vorigeMaand, false);
  const volgende = volgendeMaandNaam(r.maand);
  const onderwerp = `${i.campagneNaam}: ${maand}${i.versie > 1 ? ` (v${i.versie})` : ""}`;
  const namen = r.bedrijven.map((b) => b.naam);
  const eerste = r.bedrijven.find((b) => (b.mailPunten?.length ?? 0) > 0)?.mailPunten?.[0] ?? "";
  const preheader = eerste ? `${r.bedrijven[0].naam}: ${eerste}` : `De resultaten van ${maand}, vergeleken met ${vorige}.`;

  const tekst = [
    `${i.campagneNaam.toUpperCase()} — ${maand}`,
    `Resultaten van ${namen.join(", ")}, vergeleken met ${vorige}.`,
    "",
    `Ga naar rapportage: ${i.analyseUrl}`,
    "",
    ...r.bedrijven.flatMap((b) => {
      const c = hoofdcijfers(b, vorige);
      const forecast = forecastRegel(b, volgende);
      return [
        b.naam.toUpperCase(),
        c.map((x) => `${x.label}: ${x.waarde}${x.verschil ? ` (${x.verschil})` : ""}`).join(" · "),
        ...(forecast ? [forecast] : []),
        ...(b.mailPunten ?? []).length > 0 ? ["Analyse:"] : [],
        ...(b.mailPunten ?? []).map((p) => `- ${p}`),
        "",
      ];
    }),
    `Ga naar rapportage: ${i.analyseUrl}`,
    "",
    `Je krijgt deze mail omdat je dit rapport volgt in het marketing dashboard. Afmelden: ${i.afmeldUrl}`,
  ].join("\n");

  const blokken = r.bedrijven.map((b, n) => bedrijfBlok(b, n + 1, r.bedrijven.length, vorige, volgende, n === r.bedrijven.length - 1)).join("\n");
  const html = `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${ontsnap(onderwerp)}</title></head>
<body style="margin:0;padding:0;background:${KLEUR.pagina};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${ontsnap(preheader)}&#8199;&zwnj;&#8199;&zwnj;&#8199;&zwnj;&#8199;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${KLEUR.pagina}" style="background:${KLEUR.pagina};"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;border-collapse:collapse;">
<tr><td height="4" bgcolor="${KLEUR.accent}" style="background:${KLEUR.accent};height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td bgcolor="${KLEUR.zwart}" style="background:${KLEUR.zwart};padding:44px 36px 40px 36px;">
<div style="${LETTERS}font-size:11px;line-height:16px;letter-spacing:.26em;text-transform:uppercase;color:${KLEUR.kopTekst};font-weight:700;">${ontsnap(i.campagneNaam)}</div>
<div style="${LETTERS}font-size:44px;line-height:48px;font-weight:700;color:#ffffff;letter-spacing:-.03em;padding-top:14px;">${ontsnap(maand)}</div>
<div style="${LETTERS}font-size:14px;line-height:22px;color:${KLEUR.kopTekst};padding-top:20px;">${ontsnap(namen.join("  /  "))}</div>
<div style="${LETTERS}font-size:13px;line-height:20px;color:${KLEUR.zacht};padding:2px 0 30px 0;">Alle cijfers vergeleken met ${ontsnap(vorige)}</div>
${knop(i.analyseUrl, true)}
</td></tr>
<tr><td bgcolor="${KLEUR.kaart}" style="background:${KLEUR.kaart};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
${blokken}
</table>
</td></tr>
<tr><td bgcolor="${KLEUR.vlak}" style="background:${KLEUR.vlak};border-top:1px solid ${KLEUR.lijn};padding:36px 36px 38px 36px;">
${knop(i.analyseUrl, false)}
<div style="${LETTERS}font-size:12px;line-height:18px;color:${KLEUR.gedempt};padding-top:16px;">Met grafieken, toppost, kanalen en alle campagnes per bedrijf.</div>
</td></tr>
<tr><td bgcolor="${KLEUR.zwart}" style="background:${KLEUR.zwart};padding:22px 36px 24px 36px;${LETTERS}font-size:11.5px;line-height:17px;color:${KLEUR.zacht};">
Je krijgt deze mail omdat je dit rapport volgt in het marketing dashboard. <a href="${ontsnap(i.afmeldUrl)}" style="color:#ffffff;text-decoration:underline;">Afmelden</a>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  const gebruikt = [...new Set(r.bedrijven.map((b) => logoSleutelVoor(b.naam)).filter((x): x is NonNullable<typeof x> => x !== null))];
  const bijlagen: MailBijlage[] = gebruikt.map((k) => ({
    cid: `logo-${k}`,
    bestandsnaam: `logo-${k}.png`,
    contentType: MAIL_LOGOS[k].contentType,
    base64: MAIL_LOGOS[k].base64,
  }));

  return { onderwerp, html, tekst, bijlagen };
}
