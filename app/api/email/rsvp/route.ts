import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { FROM_ADDRESS, getResend } from '@/lib/email/resend'
import { renderRsvpEmail } from '@/lib/email/templates'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const rawBody = await request.json().catch(() => null)
  const parsed = z.object({
    guestId: z.string().uuid(),
    email: z.string().email(),
    weddingId: z.string().uuid(),
  }).safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const { guestId, email, weddingId } = parsed.data

  const admin = createAdminClient()

  // Verifieer dat de aanroeper lid is van deze bruiloft.
  const { data: membership } = await admin
    .from('wedding_members')
    .select('role')
    .eq('wedding_id', weddingId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  // Haal gastgegevens op.
  const { data: guest } = await admin
    .from('guests')
    .select('voornaam, rsvp_token, rsvp_token_revoked')
    .eq('id', guestId)
    .eq('wedding_id', weddingId)
    .single()
  if (!guest) {
    return NextResponse.json({ error: 'Gast niet gevonden' }, { status: 404 })
  }
  if (!guest.rsvp_token) {
    return NextResponse.json({ error: 'Geen RSVP-token beschikbaar' }, { status: 400 })
  }
  if (guest.rsvp_token_revoked) {
    return NextResponse.json({ error: 'RSVP-token ingetrokken' }, { status: 400 })
  }

  // Haal bruiloftsinformatie op.
  const { data: wedding } = await admin
    .from('weddings')
    .select('partner1_naam, partner2_naam, trouwdatum, locatie')
    .eq('id', weddingId)
    .single()
  if (!wedding) {
    return NextResponse.json({ error: 'Bruiloft niet gevonden' }, { status: 404 })
  }

  const partnerNamen =
    wedding.partner1_naam && wedding.partner2_naam
      ? `${wedding.partner1_naam} & ${wedding.partner2_naam}`
      : wedding.partner1_naam || wedding.partner2_naam || 'Het bruidspaar'

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const rsvpUrl = `${siteUrl}/rsvp/${guest.rsvp_token}`

  const { subject, html } = renderRsvpEmail({
    gastVoornaam: guest.voornaam,
    partnerNamen,
    trouwdatum: wedding.trouwdatum,
    locatie: wedding.locatie,
    rsvpUrl,
  })

  try {
    const resend = getResend()
    const { error: sendError } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject,
      html,
    })
    if (sendError) {
      console.error('[email/rsvp] Resend fout:', sendError)
      return NextResponse.json({ ok: true, emailSent: false })
    }
  } catch (err) {
    console.error('[email/rsvp] Onverwachte fout:', err)
    return NextResponse.json({ ok: true, emailSent: false })
  }

  return NextResponse.json({ ok: true, emailSent: true })
}
