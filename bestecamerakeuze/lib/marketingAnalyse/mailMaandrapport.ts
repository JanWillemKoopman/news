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
import { ontsnap, type Mail } from "./mail";
import { formatWaarde, vergelijkingVerschil, type VergelijkingOordeel } from "./rekenen";
import type { Eenheid, MaMaandrapport, MrBedrijf, MrWaarde } from "./types";

export interface MaandrapportMailInvoer {
  campagneNaam: string;
  versie: number;
  rapport: MaMaandrapport;
  analyseUrl: string;
  afmeldUrl: string;
}

const KLEUR = {
  pagina: "#efece6",
  kaart: "#ffffff",
  inkt: "#14171c",
  tekst: "#2b2f36",
  gedempt: "#6b707a",
  zacht: "#9a9ea6",
  lijn: "#e9e5dc",
  vlak: "#f7f5f0",
  kop: "#0b1f4d",
  kopTekst: "#b9c3dc",
  accent: "#c8b27a",
  knop: "#003da5",
  goed: "#17794a",
  slecht: "#b3312c",
} as const;

const LETTERS = "font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;";

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
      (c, i) => `<td width="25%" valign="top" style="padding:${i === 0 ? "0 8px 0 0" : "0 8px"};${i > 0 ? `border-left:1px solid ${KLEUR.lijn};` : ""}">
<div style="${LETTERS}font-size:10px;line-height:14px;letter-spacing:.09em;text-transform:uppercase;color:${KLEUR.zacht};">${ontsnap(c.label)}</div>
<div style="${LETTERS}font-size:21px;line-height:28px;font-weight:700;color:${KLEUR.inkt};padding-top:3px;">${ontsnap(c.waarde)}</div>
<div style="${LETTERS}font-size:12px;line-height:18px;font-weight:600;color:${c.kleur};">${c.verschil ? ontsnap(c.verschil) : "&nbsp;"}</div>
</td>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>${cellen}</tr></table>`;
}

function bedrijfBlok(b: MrBedrijf, vorigeMaand: string, volgende: string, laatste: boolean): string {
  const punten = (b.mailPunten ?? []).filter(Boolean);
  const forecast = forecastRegel(b, volgende);
  const lijst = punten
    .map(
      (p) => `<tr><td width="18" valign="top" style="padding:0 0 9px 0;${LETTERS}font-size:15px;line-height:22px;color:${KLEUR.accent};font-weight:700;">&bull;</td>
<td valign="top" style="padding:0 0 9px 0;${LETTERS}font-size:14.5px;line-height:22px;color:${KLEUR.tekst};">${ontsnap(p)}</td></tr>`,
    )
    .join("");
  return `<tr><td style="padding:30px 32px ${laatste ? "30px" : "28px"} 32px;${laatste ? "" : `border-bottom:1px solid ${KLEUR.lijn};`}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
<tr><td style="padding:0 0 16px 0;${LETTERS}font-size:19px;line-height:24px;font-weight:700;color:${KLEUR.inkt};letter-spacing:-.01em;">
<span style="display:inline-block;width:4px;height:18px;background:${KLEUR.accent};vertical-align:-2px;margin-right:10px;border-radius:2px;"></span>${ontsnap(b.naam)}</td></tr>
<tr><td style="padding:0 0 ${forecast ? "12px" : "18px"} 0;">${statsRij(hoofdcijfers(b, vorigeMaand))}</td></tr>
${forecast ? `<tr><td style="padding:0 0 18px 0;"><span style="display:inline-block;background:${KLEUR.vlak};border:1px solid ${KLEUR.lijn};border-radius:999px;padding:4px 12px;${LETTERS}font-size:12px;line-height:16px;color:${KLEUR.gedempt};">${ontsnap(forecast)} <span style="color:${KLEUR.zacht};">· trend doorgezet</span></span></td></tr>` : ""}
${lijst ? `<tr><td style="padding:4px 0 10px 0;border-top:1px solid ${KLEUR.lijn};"><div style="padding-top:16px;${LETTERS}font-size:10px;line-height:14px;letter-spacing:.14em;text-transform:uppercase;color:${KLEUR.accent};font-weight:700;">Analyse</div></td></tr>
<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${lijst}</table></td></tr>` : ""}
</table>
</td></tr>`;
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
    `${i.campagneNaam} — ${maand}`,
    `Resultaten van ${namen.join(", ")}, vergeleken met ${vorige}.`,
    "",
    ...r.bedrijven.flatMap((b) => {
      const c = hoofdcijfers(b, vorige);
      const forecast = forecastRegel(b, volgende);
      return [
        b.naam.toUpperCase(),
        c.map((x) => `${x.label}: ${x.waarde}${x.verschil ? ` (${x.verschil})` : ""}`).join(" · "),
        ...(forecast ? [forecast] : []),
        ...(b.mailPunten ?? []).map((p) => `- ${p}`),
        "",
      ];
    }),
    `Bekijk het volledige rapport: ${i.analyseUrl}`,
    "",
    `Je krijgt deze mail omdat je dit rapport volgt in het marketing dashboard. Afmelden: ${i.afmeldUrl}`,
  ].join("\n");

  const blokken = r.bedrijven.map((b, n) => bedrijfBlok(b, vorige, volgende, n === r.bedrijven.length - 1)).join("\n");
  const html = `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${ontsnap(onderwerp)}</title></head>
<body style="margin:0;padding:0;background:${KLEUR.pagina};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${ontsnap(preheader)}&#8199;&zwnj;&#8199;&zwnj;&#8199;&zwnj;&#8199;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${KLEUR.pagina}" style="background:${KLEUR.pagina};"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;border-collapse:separate;">
<tr><td bgcolor="${KLEUR.kop}" style="background:${KLEUR.kop};border-radius:16px 16px 0 0;padding:38px 32px 34px 32px;">
<div style="${LETTERS}font-size:11px;line-height:16px;letter-spacing:.2em;text-transform:uppercase;color:${KLEUR.accent};font-weight:700;">${ontsnap(i.campagneNaam)}</div>
<div style="${LETTERS}font-size:34px;line-height:40px;font-weight:700;color:#ffffff;letter-spacing:-.02em;padding-top:10px;">${ontsnap(maand)}</div>
<div style="height:2px;width:44px;background:${KLEUR.accent};margin:18px 0 16px 0;font-size:0;line-height:0;">&nbsp;</div>
<div style="${LETTERS}font-size:14px;line-height:22px;color:${KLEUR.kopTekst};">${ontsnap(namen.join("  ·  "))}</div>
<div style="${LETTERS}font-size:13px;line-height:20px;color:${KLEUR.kopTekst};opacity:.8;padding-top:2px;">Alle cijfers vergeleken met ${ontsnap(vorige)}</div>
</td></tr>
<tr><td bgcolor="${KLEUR.kaart}" style="background:${KLEUR.kaart};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
${blokken}
</table>
</td></tr>
<tr><td bgcolor="${KLEUR.vlak}" align="center" style="background:${KLEUR.vlak};border-top:1px solid ${KLEUR.lijn};padding:30px 32px 32px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr><td bgcolor="${KLEUR.knop}" style="background:${KLEUR.knop};border-radius:999px;">
<a href="${ontsnap(i.analyseUrl)}" style="display:inline-block;padding:14px 30px;${LETTERS}font-size:14px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:.01em;">Bekijk het volledige rapport &rarr;</a>
</td></tr></table>
<div style="${LETTERS}font-size:12px;line-height:18px;color:${KLEUR.gedempt};padding-top:14px;">Met grafieken, toppost, kanalen en alle campagnes per bedrijf.</div>
</td></tr>
<tr><td style="padding:18px 20px 0 20px;${LETTERS}font-size:11.5px;line-height:17px;color:${KLEUR.zacht};text-align:center;">
Je krijgt deze mail omdat je dit rapport volgt in het marketing dashboard.<br><a href="${ontsnap(i.afmeldUrl)}" style="color:${KLEUR.zacht};text-decoration:underline;">Afmelden</a>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  return { onderwerp, html, tekst };
}
