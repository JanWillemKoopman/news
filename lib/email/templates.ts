import { dagLabel, formatDatumNL, formatEuro } from '@/lib/bruiloft/format'

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

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
      <strong>${escapeHtml(p.uitnodigerNamen)}</strong> nodigt je uit om als <strong>${escapeHtml(p.rolLabel)}</strong>
      mee te helpen plannen op Ons Trouwplan.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
      Klik op de knop hieronder om de uitnodiging te accepteren en toegang te krijgen
      tot het trouwplan.
    </p>
    ${ctaKnop(p.accepteerUrl, 'Uitnodiging accepteren')}
    <p style="margin:0 0 8px;font-size:13px;color:#a8a29e;">
      Deze uitnodiging verloopt op <strong>${escapeHtml(p.verloopdatum)}</strong>.
    </p>
    <p style="margin:0;font-size:12px;color:#a8a29e;word-break:break-all;">
      Of kopieer deze link handmatig:<br />
      <a href="${p.accepteerUrl}" style="color:#be123c;">${p.accepteerUrl}</a>
    </p>
  `
  return { subject, html: baseHtml('Uitnodiging', inhoud) }
}

export interface PartnerInviteEmailProps {
  inviterNamen: string
  actionUrl: string
  heeftAccount: boolean
}

export function renderPartnerInviteEmail(p: PartnerInviteEmailProps): { subject: string; html: string } {
  const subject = p.heeftAccount
    ? 'Je hebt toegang gekregen tot het trouwplan — Ons Trouwplan'
    : 'Stel je wachtwoord in en plan mee — Ons Trouwplan'
  const intro = p.heeftAccount
    ? `<strong>${escapeHtml(p.inviterNamen)}</strong> heeft je toegevoegd aan het trouwplan op Ons Trouwplan.
       Je hebt volledige toegang om samen alles te regelen.`
    : `<strong>${escapeHtml(p.inviterNamen)}</strong> wil samen met jou het trouwplan beheren op Ons Trouwplan.
       Stel een wachtwoord in en je hebt direct volledige toegang om samen alles te regelen.`
  const inhoud = `
    <p style="margin:0 0 16px;font-size:16px;color:#1c1917;line-height:1.6;">${intro}</p>
    <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
      Klik op de knop hieronder om een wachtwoord in te stellen en aan de slag te gaan.
    </p>
    ${ctaKnop(p.actionUrl, 'Wachtwoord instellen')}
    <p style="margin:0;font-size:12px;color:#a8a29e;word-break:break-all;">
      Of kopieer deze link handmatig:<br />
      <a href="${p.actionUrl}" style="color:#be123c;">${p.actionUrl}</a>
    </p>
  `
  return { subject, html: baseHtml('Stel je wachtwoord in', inhoud) }
}

export function renderRsvpEmail(p: RsvpEmailProps): { subject: string; html: string } {
  const subject = `Uitnodiging — ${p.partnerNamen} vragen om jouw reactie`
  const datumRegel = p.trouwdatum
    ? `<p style="margin:0 0 8px;font-size:15px;color:#57534e;">📅 <strong>Datum:</strong> ${formatDatumNL(p.trouwdatum)}</p>`
    : ''
  const locatieRegel = p.locatie
    ? `<p style="margin:0 0 24px;font-size:15px;color:#57534e;">📍 <strong>Locatie:</strong> ${escapeHtml(p.locatie)}</p>`
    : '<p style="margin:0 0 24px;"></p>'
  const inhoud = `
    <p style="margin:0 0 16px;font-size:16px;color:#1c1917;line-height:1.6;">
      Beste <strong>${escapeHtml(p.gastVoornaam)}</strong>,
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#57534e;line-height:1.6;">
      Je bent uitgenodigd voor de bruiloft van <strong>${escapeHtml(p.partnerNamen)}</strong>!
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
  return { subject, html: baseHtml(`Bruiloft ${escapeHtml(p.partnerNamen)}`, inhoud) }
}

// --- Leverancierscontact (offerte-/contactaanvraag) ------------------------

export interface VendorContactEmailProps {
  type: 'offerte' | 'contact'
  onderwerp: string
  bericht: string // vrije tekst, alinea's gescheiden door een lege regel
  // "Anna & Tom" — de afzenders zoals de leverancier ze te zien krijgt.
  afzenderNamen: string
  // Publieke reageer-link (token). null = geen knop tonen (site-URL onbekend).
  replyUrl: string | null
}

// Zet vrije tekst (zoals bewerkt in de compose-modal) om naar veilige HTML:
// alinea's op lege regels, enkele regeleinden binnen een alinea als <br/>.
function berichtNaarHtml(bericht: string): string {
  return bericht
    .split(/\n\s*\n/)
    .map((alinea) => alinea.trim())
    .filter(Boolean)
    .map(
      (alinea) =>
        `<p style="margin:0 0 16px;font-size:15px;color:#1c1917;line-height:1.6;">${escapeHtml(alinea).replace(/\n/g, '<br />')}</p>`
    )
    .join('')
}

export function renderVendorContactEmail(p: VendorContactEmailProps): { subject: string; html: string } {
  const introRegel =
    p.type === 'offerte'
      ? `<strong>${escapeHtml(p.afzenderNamen)}</strong> ${p.afzenderNamen.includes('&') ? 'vragen' : 'vraagt'} via Ons Trouwplan een offerte bij je aan.`
      : `<strong>${escapeHtml(p.afzenderNamen)}</strong> ${p.afzenderNamen.includes('&') ? 'sturen' : 'stuurt'} je een bericht via Ons Trouwplan.`

  const snelreactieHint =
    p.type === 'offerte'
      ? ' Geen plek op de gewenste datum? Ook dat laat je daar met één klik weten.'
      : ''
  const reageerBlok = p.replyUrl
    ? `${ctaKnop(p.replyUrl, 'Reageer op dit bericht')}
    <p style="margin:0 0 8px;font-size:13px;color:#a8a29e;line-height:1.6;">
      Reageren kan direct online — je hebt geen account nodig. Je reactie komt
      rechtstreeks in het trouwplan van ${escapeHtml(p.afzenderNamen)} terecht.${snelreactieHint}
    </p>
    <p style="margin:0 0 16px;font-size:12px;color:#a8a29e;word-break:break-all;">
      Of kopieer deze link handmatig:<br />
      <a href="${p.replyUrl}" style="color:#be123c;">${p.replyUrl}</a>
    </p>
    <p style="margin:0;font-size:12px;color:#a8a29e;line-height:1.6;">
      <strong>Let op:</strong> een antwoord op deze e-mail komt niet bij
      ${escapeHtml(p.afzenderNamen)} aan — gebruik de knop hierboven.
    </p>`
    : ''

  const inhoud = `
    <p style="margin:0 0 20px;font-size:16px;color:#1c1917;line-height:1.6;">${introRegel}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="background:#faf9f8;border-left:3px solid #be123c;border-radius:0 8px 8px 0;padding:20px 24px;">
          <p style="margin:0 0 12px;font-size:13px;color:#9f6271;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(p.onderwerp)}</p>
          ${berichtNaarHtml(p.bericht)}
        </td>
      </tr>
    </table>
    ${reageerBlok}
  `
  return {
    subject: p.onderwerp,
    html: baseHtml(p.type === 'offerte' ? 'Offerteaanvraag' : 'Nieuw bericht', inhoud),
  }
}

// --- Leveranciersreactie (notificatie aan het bruidspaar) -------------------

export interface VendorReplyEmailProps {
  vendorNaam: string
  onderwerp: string // onderwerp van het oorspronkelijke bericht
  fragment: string // eerste stuk van de reactie
  berichtenUrl: string
}

export function renderVendorReplyEmail(p: VendorReplyEmailProps): { subject: string; html: string } {
  const subject = `${p.vendorNaam} heeft gereageerd — Ons Trouwplan`
  const inhoud = `
    <p style="margin:0 0 20px;font-size:16px;color:#1c1917;line-height:1.6;">
      <strong>${escapeHtml(p.vendorNaam)}</strong> heeft gereageerd op jullie bericht
      &ldquo;${escapeHtml(p.onderwerp)}&rdquo;.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="background:#faf9f8;border-left:3px solid #be123c;border-radius:0 8px 8px 0;padding:20px 24px;">
          ${berichtNaarHtml(p.fragment)}
        </td>
      </tr>
    </table>
    ${ctaKnop(p.berichtenUrl, 'Lees de reactie')}
    <p style="margin:0;font-size:13px;color:#a8a29e;line-height:1.6;">
      Je vindt de volledige reactie in het berichtencentrum van jullie trouwplan.
    </p>
  `
  return { subject, html: baseHtml('Nieuwe reactie', inhoud) }
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
             reminderRegel(escapeHtml(t.titel), `Deadline ${formatDatumNL(t.deadline)} · ${dagLabel(t.dagen)}`)
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
               `${escapeHtml(b.omschrijving || 'Betaaltermijn')} — ${formatEuro(b.bedrag)}`,
               `Vervalt ${formatDatumNL(b.vervaldatum)} · ${dagLabel(b.dagen)}`
             )
           )
           .join('')}
       </table>`
    : ''

  const inhoud = `
    <p style="margin:0 0 8px;font-size:16px;color:#1c1917;line-height:1.6;">
      Hoi <strong>${escapeHtml(p.ontvangerNaam || 'daar')}</strong>,
    </p>
    <p style="margin:0 0 8px;font-size:15px;color:#57534e;line-height:1.6;">
      Een vriendelijke herinnering voor de planning van de bruiloft van
      <strong>${escapeHtml(p.partnerNamen)}</strong>. Dit staat er binnenkort aan te komen:
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

// --- Cadeaulijst (Registry) templates -------------------------------------

export interface RegistryReservationGuestEmailProps {
  guestName: string
  itemTitle: string
  coupleNames: string
  weddingDate: string | null
  shopUrl: string | null
  cancelUrl: string
}

export function renderRegistryReservationGuestEmail(p: RegistryReservationGuestEmailProps): string {
  const datumRegel = p.weddingDate
    ? `op <strong>${formatDatumNL(p.weddingDate)}</strong>`
    : ''
  const safeShopUrl = p.shopUrl && /^https?:\/\//i.test(p.shopUrl) ? p.shopUrl : null
  const shopLink = safeShopUrl
    ? `<p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">
        Je kunt het cadeau hier bestellen: <a href="${escapeHtml(safeShopUrl)}" style="color:#be123c;">Bekijk cadeau →</a>
       </p>`
    : ''
  const inhoud = `
    <p style="margin:0 0 16px;font-size:16px;color:#1c1917;line-height:1.6;">
      Hoi <strong>${escapeHtml(p.guestName)}</strong>,
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">
      Je hebt <strong>${escapeHtml(p.itemTitle)}</strong> gereserveerd voor de bruiloft van <strong>${escapeHtml(p.coupleNames)}</strong>${datumRegel ? ' ' + datumRegel : ''}.
    </p>
    ${shopLink}
    <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
      Wil je jouw reservering annuleren? Klik dan op onderstaande link:
    </p>
    ${ctaKnop(p.cancelUrl, 'Reservering annuleren')}
    <p style="margin:16px 0 0;font-size:13px;color:#9f6271;line-height:1.6;">
      Hartelijk bedankt — <strong>${escapeHtml(p.coupleNames)}</strong> zijn blij met jullie betrokkenheid!
    </p>
  `
  return baseHtml('Cadeau gereserveerd', inhoud)
}

export interface RegistryNewReservationCoupleEmailProps {
  guestName: string
  itemTitle: string
  dashboardUrl: string
}

export function renderRegistryNewReservationCoupleEmail(p: RegistryNewReservationCoupleEmailProps): string {
  const inhoud = `
    <p style="margin:0 0 16px;font-size:16px;color:#1c1917;line-height:1.6;">
      Goed nieuws!
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
      <strong>${escapeHtml(p.guestName)}</strong> heeft <strong>${escapeHtml(p.itemTitle)}</strong> gereserveerd op jullie cadeaulijst.
    </p>
    ${ctaKnop(p.dashboardUrl, 'Bekijk cadeaulijst')}
  `
  return baseHtml('Nieuw cadeau gereserveerd', inhoud)
}

export interface RegistryContributionPendingEmailProps {
  guestName: string
  itemTitle: string
  amountCents: number
  paymentMethod: 'bank_transfer' | 'payment_link'
  paymentReference: string
  coupleNames: string
}

export function renderRegistryContributionPendingEmail(p: RegistryContributionPendingEmailProps): string {
  const bedrag = formatEuro(p.amountCents / 100)
  const betalingsinstructie = p.paymentMethod === 'bank_transfer'
    ? `<p style="margin:0 0 8px;font-size:15px;color:#57534e;line-height:1.6;">
        Vergeet niet te betalen via bankoverschrijving met als omschrijving:<br />
        <strong style="font-size:16px;">${escapeHtml(p.paymentReference)}</strong>
       </p>`
    : `<p style="margin:0 0 8px;font-size:15px;color:#57534e;line-height:1.6;">
        Je hebt aangegeven via de betaallink te betalen.
       </p>`
  const inhoud = `
    <p style="margin:0 0 16px;font-size:16px;color:#1c1917;line-height:1.6;">
      Hoi <strong>${escapeHtml(p.guestName)}</strong>,
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">
      Bedankt! Je bijdrage van <strong>${bedrag}</strong> aan <strong>'${escapeHtml(p.itemTitle)}'</strong> is geregistreerd.
    </p>
    ${betalingsinstructie}
    <p style="margin:16px 0 0;font-size:13px;color:#9f6271;line-height:1.6;">
      Het koppel bevestigt jouw bijdrage zodra ze de betaling hebben ontvangen.
    </p>
  `
  return baseHtml('Bijdrage geregistreerd', inhoud)
}

export interface RegistryContributionConfirmedEmailProps {
  guestName: string
  itemTitle: string
  amountCents: number
  coupleNames: string
}

export function renderRegistryContributionConfirmedEmail(p: RegistryContributionConfirmedEmailProps): string {
  const bedrag = formatEuro(p.amountCents / 100)
  const inhoud = `
    <p style="margin:0 0 16px;font-size:16px;color:#1c1917;line-height:1.6;">
      Hoi <strong>${escapeHtml(p.guestName)}</strong>,
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">
      <strong>${escapeHtml(p.coupleNames)}</strong> hebben je bijdrage van <strong>${bedrag}</strong> aan
      <strong>'${escapeHtml(p.itemTitle)}'</strong> bevestigd. Dankjewel!
    </p>
    <p style="margin:0;font-size:15px;color:#57534e;line-height:1.6;">
      Jullie bijdrage wordt enorm gewaardeerd.
    </p>
  `
  return baseHtml('Bijdrage bevestigd!', inhoud)
}

export interface RegistryNewContributionCoupleEmailProps {
  guestName: string
  itemTitle: string
  amountCents: number
  totalCents: number
  dashboardUrl: string
}

export function renderRegistryNewContributionCoupleEmail(p: RegistryNewContributionCoupleEmailProps): string {
  const bedrag = formatEuro(p.amountCents / 100)
  const totaal = formatEuro(p.totalCents / 100)
  const inhoud = `
    <p style="margin:0 0 16px;font-size:16px;color:#1c1917;line-height:1.6;">
      Nieuwe bijdrage ontvangen!
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">
      <strong>${escapeHtml(p.guestName)}</strong> heeft <strong>${bedrag}</strong> bijgedragen aan
      <strong>'${escapeHtml(p.itemTitle)}'</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
      Totaal voor dit fonds: <strong>${totaal}</strong>
    </p>
    <p style="margin:0 0 24px;font-size:13px;color:#9f6271;line-height:1.6;">
      Vergeet niet de ontvangst te bevestigen in je dashboard zodra je de betaling hebt ontvangen.
    </p>
    ${ctaKnop(p.dashboardUrl, 'Bevestig ontvangst')}
  `
  return baseHtml('Nieuwe bijdrage', inhoud)
}
