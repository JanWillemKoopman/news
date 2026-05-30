import { dagLabel, formatDatumNL, formatEuro } from '@/lib/bruiloft/format'

export interface InviteEmailProps {
  uitnodigerNamen: string
  rolLabel: string
  accepteerUrl: string
  verloopdatum: string
}

export interface RsvpEmailProps {
  gastVoornaam: string
  partnerNamen: string
  trouwdatum: string | null
  locatie: string
  rsvpUrl: string
}

function baseHtml(titel: string, inhoud: string): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${titel}</title>
</head>
<body style="margin:0;padding:0;background:#f9f5f2;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f5f2;padding:32px 0;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#be123c;padding:28px 40px;text-align:center;">
            <p style="margin:0;font-size:13px;color:#fecdd3;letter-spacing:0.12em;text-transform:uppercase;">Ons Trouwplan</p>
            <h1 style="margin:6px 0 0;font-size:28px;color:#ffffff;font-weight:normal;letter-spacing:0.02em;">${titel}</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            ${inhoud}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#fdf2f4;padding:20px 40px;text-align:center;border-top:1px solid #fce7f3;">
            <p style="margin:0;font-size:12px;color:#9f6271;">Met vriendelijke groet, het Ons Trouwplan-team</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

function ctaKnop(url: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td align="center">
      <a href="${url}" style="display:inline-block;padding:14px 32px;background:#be123c;color:#ffffff;text-decoration:none;border-radius:8px;font-family:Georgia,serif;font-size:15px;letter-spacing:0.02em;">${label}</a>
    </td>
  </tr>
</table>`
}

export function renderInviteEmail(p: InviteEmailProps): { subject: string; html: string } {
  const subject = 'Je bent uitgenodigd om mee te plannen — Ons Trouwplan'
  const inhoud = `
    <p style="margin:0 0 16px;font-size:16px;color:#1c1917;line-height:1.6;">
      <strong>${p.uitnodigerNamen}</strong> nodigt je uit om als <strong>${p.rolLabel}</strong>
      mee te helpen plannen op Ons Trouwplan.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
      Klik op de knop hieronder om de uitnodiging te accepteren en toegang te krijgen
      tot het trouwplan.
    </p>
    ${ctaKnop(p.accepteerUrl, 'Uitnodiging accepteren')}
    <p style="margin:0 0 8px;font-size:13px;color:#a8a29e;">
      Deze uitnodiging verloopt op <strong>${p.verloopdatum}</strong>.
    </p>
    <p style="margin:0;font-size:12px;color:#a8a29e;word-break:break-all;">
      Of kopieer deze link handmatig:<br />
      <a href="${p.accepteerUrl}" style="color:#be123c;">${p.accepteerUrl}</a>
    </p>
  `
  return { subject, html: baseHtml('Uitnodiging', inhoud) }
}

export function renderRsvpEmail(p: RsvpEmailProps): { subject: string; html: string } {
  const subject = `Uitnodiging — ${p.partnerNamen} vragen om jouw reactie`
  const datumRegel = p.trouwdatum
    ? `<p style="margin:0 0 8px;font-size:15px;color:#57534e;">📅 <strong>Datum:</strong> ${formatDatumNL(p.trouwdatum)}</p>`
    : ''
  const locatieRegel = p.locatie
    ? `<p style="margin:0 0 24px;font-size:15px;color:#57534e;">📍 <strong>Locatie:</strong> ${p.locatie}</p>`
    : '<p style="margin:0 0 24px;"></p>'
  const inhoud = `
    <p style="margin:0 0 16px;font-size:16px;color:#1c1917;line-height:1.6;">
      Beste <strong>${p.gastVoornaam}</strong>,
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#57534e;line-height:1.6;">
      Je bent uitgenodigd voor de bruiloft van <strong>${p.partnerNamen}</strong>!
      We horen graag of je erbij kunt zijn.
    </p>
    ${datumRegel}
    ${locatieRegel}
    ${ctaKnop(p.rsvpUrl, 'Reageren op de uitnodiging')}
    <p style="margin:0;font-size:12px;color:#a8a29e;word-break:break-all;">
      Of kopieer deze link handmatig:<br />
      <a href="${p.rsvpUrl}" style="color:#be123c;">${p.rsvpUrl}</a>
    </p>
    <p style="margin:16px 0 0;font-size:12px;color:#a8a29e;">
      Deze link is persoonlijk en uniek voor jou.
    </p>
  `
  return { subject, html: baseHtml(`Bruiloft ${p.partnerNamen}`, inhoud) }
}

// --- Herinneringen-digest --------------------------------------------------

export interface ReminderTaakItem {
  titel: string
  deadline: string // ISO 'YYYY-MM-DD'
  dagen: number // dagen tot deadline (negatief = te laat)
}

export interface ReminderBetalingItem {
  omschrijving: string
  bedrag: number
  vervaldatum: string // ISO 'YYYY-MM-DD'
  dagen: number // dagen tot vervaldatum (negatief = te laat)
}

export interface ReminderDigestProps {
  ontvangerNaam: string
  partnerNamen: string
  taken: ReminderTaakItem[]
  betalingen: ReminderBetalingItem[]
  dashboardUrl: string
}

function reminderRegel(hoofd: string, sub: string): string {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #f3e8eb;">
      <p style="margin:0;font-size:15px;color:#1c1917;">${hoofd}</p>
      <p style="margin:2px 0 0;font-size:13px;color:#9f6271;">${sub}</p>
    </td>
  </tr>`
}

export function renderReminderDigestEmail(p: ReminderDigestProps): { subject: string; html: string } {
  const aantal = p.taken.length + p.betalingen.length
  const subject =
    aantal === 1
      ? 'Herinnering voor jullie bruiloft — Ons Trouwplan'
      : `${aantal} herinneringen voor jullie bruiloft — Ons Trouwplan`

  const takenBlok = p.taken.length
    ? `<p style="margin:24px 0 8px;font-size:13px;color:#9f6271;letter-spacing:0.08em;text-transform:uppercase;">Taken</p>
       <table width="100%" cellpadding="0" cellspacing="0">
         ${p.taken
           .map((t) =>
             reminderRegel(t.titel, `Deadline ${formatDatumNL(t.deadline)} · ${dagLabel(t.dagen)}`)
           )
           .join('')}
       </table>`
    : ''

  const betalingenBlok = p.betalingen.length
    ? `<p style="margin:24px 0 8px;font-size:13px;color:#9f6271;letter-spacing:0.08em;text-transform:uppercase;">Betaaltermijnen</p>
       <table width="100%" cellpadding="0" cellspacing="0">
         ${p.betalingen
           .map((b) =>
             reminderRegel(
               `${b.omschrijving || 'Betaaltermijn'} — ${formatEuro(b.bedrag)}`,
               `Vervalt ${formatDatumNL(b.vervaldatum)} · ${dagLabel(b.dagen)}`
             )
           )
           .join('')}
       </table>`
    : ''

  const inhoud = `
    <p style="margin:0 0 8px;font-size:16px;color:#1c1917;line-height:1.6;">
      Hoi <strong>${p.ontvangerNaam || 'daar'}</strong>,
    </p>
    <p style="margin:0 0 8px;font-size:15px;color:#57534e;line-height:1.6;">
      Een vriendelijke herinnering voor de planning van de bruiloft van
      <strong>${p.partnerNamen}</strong>. Dit staat er binnenkort aan te komen:
    </p>
    ${takenBlok}
    ${betalingenBlok}
    ${ctaKnop(p.dashboardUrl, 'Naar het trouwplan')}
    <p style="margin:8px 0 0;font-size:12px;color:#a8a29e;">
      Geen herinneringen meer ontvangen? Dit kun je uitzetten bij je account-instellingen.
    </p>
  `
  return { subject, html: baseHtml('Herinnering', inhoud) }
}
