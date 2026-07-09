import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { FROM_ADDRESS, getResend } from '@/lib/email/resend'
import { renderVendorReplyEmail } from '@/lib/email/templates'
import { checkRateLimit } from '@/lib/rateLimit'
import { createRawAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Publieke reageer-flow voor leveranciers (geen account): de token uit de
// e-mail (messages.reply_token, zie /api/leveranciers/contact) is de
// identiteit — zelfde model als de persoonlijke RSVP-links. Alle toegang
// loopt via de service-role; RLS-policies blijven dicht voor anon.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Haalt het uitgaande bericht bij een reply_token op, incl. context voor de
// reactiepagina. Retourneert null bij een onbekende/ongeldige token.
async function vindGesprek(token: string) {
  const admin = createRawAdminClient()
  const { data: bericht, error } = await admin
    .from('messages')
    .select('id, wedding_id, vendor_id, type, onderwerp, inhoud, created_at, afzender_naam')
    .eq('reply_token', token)
    .eq('direction', 'outbound')
    .maybeSingle()
  if (error || !bericht) return null

  const [{ data: wedding }, { data: vendor }, { data: reacties }] = await Promise.all([
    admin.from('weddings').select('partner1_naam, partner2_naam').eq('id', bericht.wedding_id).maybeSingle(),
    bericht.vendor_id
      ? admin.from('vendors').select('naam').eq('id', bericht.vendor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    admin
      .from('messages')
      .select('inhoud, created_at')
      .eq('parent_message_id', bericht.id)
      .order('created_at', { ascending: true }),
  ])

  return {
    bericht,
    partnerNamen:
      [wedding?.partner1_naam, wedding?.partner2_naam].filter(Boolean).join(' & ') || 'het bruidspaar',
    vendorNaam: (vendor?.naam as string | undefined) ?? '',
    reacties: (reacties ?? []).map((r: { inhoud: string; created_at: string }) => ({
      inhoud: r.inhoud,
      createdAt: r.created_at,
    })),
  }
}

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  if (!UUID_RE.test(params.token)) {
    return NextResponse.json({ error: 'Ongeldige link' }, { status: 404 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rateLimit = await checkRateLimit(`reactie:context:${ip}`, 30, 15 * 60)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' }, { status: 429 })
  }

  const gesprek = await vindGesprek(params.token)
  if (!gesprek) {
    return NextResponse.json({ error: 'Ongeldige link' }, { status: 404 })
  }

  // Bewust minimaal: geen ids, e-mailadressen of wedding-gegevens naar buiten.
  return NextResponse.json({
    ok: true,
    onderwerp: gesprek.bericht.onderwerp,
    bericht: gesprek.bericht.inhoud,
    verzondenOp: gesprek.bericht.created_at,
    partnerNamen: gesprek.partnerNamen,
    vendorNaam: gesprek.vendorNaam,
    reacties: gesprek.reacties,
  })
}

const replySchema = z.object({
  bericht: z.string().trim().min(1, 'Schrijf eerst een bericht.').max(5000),
})

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  if (!UUID_RE.test(params.token)) {
    return NextResponse.json({ error: 'Ongeldige link' }, { status: 404 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rateLimit = await checkRateLimit(`reactie:plaats:${ip}:${params.token}`, 5, 15 * 60)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Te veel reacties kort achter elkaar. Probeer het later opnieuw.' }, { status: 429 })
  }

  const raw = await request.json().catch(() => null)
  const parsed = replySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }

  const gesprek = await vindGesprek(params.token)
  if (!gesprek) {
    return NextResponse.json({ error: 'Ongeldige link' }, { status: 404 })
  }

  const admin = createRawAdminClient()
  const { error } = await admin.from('messages').insert({
    wedding_id: gesprek.bericht.wedding_id,
    direction: 'inbound',
    type: 'leverancier_reactie',
    vendor_id: gesprek.bericht.vendor_id,
    onderwerp: `Re: ${gesprek.bericht.onderwerp}`,
    inhoud: parsed.data.bericht,
    afzender_naam: gesprek.vendorNaam || 'Leverancier',
    afzender_type: 'leverancier',
    status: 'verzonden',
    parent_message_id: gesprek.bericht.id,
  })
  if (error) {
    console.error('[reactie] Insert mislukt:', error)
    return NextResponse.json({ error: 'Versturen mislukt. Probeer het opnieuw.' }, { status: 500 })
  }

  // Best-effort e-mailnotificatie aan eigenaren + planners: de reactie staat
  // al in het berichtencentrum (realtime), dus een mislukte mail mag de
  // leverancier geen foutmelding geven.
  await stuurReactieNotificatie(gesprek, parsed.data.bericht).catch((err) =>
    console.error('[reactie] Notificatie-mail mislukt:', err)
  )

  return NextResponse.json({ ok: true })
}

async function stuurReactieNotificatie(
  gesprek: NonNullable<Awaited<ReturnType<typeof vindGesprek>>>,
  reactie: string
) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')
  if (!siteUrl) return // zonder site-URL geen werkende knop in de mail

  const admin = createRawAdminClient()
  const { data: members } = await admin
    .from('wedding_members')
    .select('user_id, role')
    .eq('wedding_id', gesprek.bericht.wedding_id)
    .in('role', ['owner', 'planner'])
  const userIds = (members ?? []).map((m: { user_id: string }) => m.user_id)
  if (userIds.length === 0) return

  // Zelfde afmeld-voorkeur als de herinneringen-digest: wie e-mails van de
  // app heeft uitgezet, krijgt ook deze notificatie niet.
  const { data: profielen } = await admin
    .from('profiles')
    .select('email, email_herinneringen')
    .in('id', userIds)
  const ontvangers = Array.from(
    new Set(
      (profielen ?? [])
        .filter((p: { email_herinneringen: boolean | null }) => p.email_herinneringen !== false)
        .map((p: { email: string | null }) => p.email)
        .filter((email: string | null): email is string => Boolean(email))
    )
  )
  if (ontvangers.length === 0) return

  const { subject, html } = renderVendorReplyEmail({
    vendorNaam: gesprek.vendorNaam || 'Een leverancier',
    onderwerp: gesprek.bericht.onderwerp,
    fragment: reactie.length > 400 ? `${reactie.slice(0, 400)}…` : reactie,
    berichtenUrl: `${siteUrl}/bruiloft/berichten`,
  })
  const resend = getResend()
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: ontvangers,
    subject,
    html,
  })
  if (error) console.error('[reactie] Resend-fout bij notificatie:', error)
}
