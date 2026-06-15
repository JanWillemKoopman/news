import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { FROM_ADDRESS, getResend } from '@/lib/email/resend'
import { renderPartnerInviteEmail } from '@/lib/email/templates'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  weddingId: z.string().uuid(),
  userId: z.string().uuid(),
})

// Verstuurt de "wachtwoord instellen"-e-mail opnieuw naar een bestaand lid dat
// zijn account nog niet heeft geactiveerd. Een magiclink werkt ongeacht of de
// e-mail al bevestigd is; na inloggen landt de partner op /wachtwoord-resetten.
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }
  const { weddingId, userId } = parsed.data

  const admin = createAdminClient()

  // Alleen de eigenaar mag opnieuw versturen.
  const { data: membership } = await supabase
    .from('wedding_members')
    .select('role')
    .eq('wedding_id', weddingId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership || membership.role !== 'owner') {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  // De ontvanger moet lid zijn van deze bruiloft.
  const { data: targetMember } = await admin
    .from('wedding_members')
    .select('user_id')
    .eq('wedding_id', weddingId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!targetMember) {
    return NextResponse.json({ error: 'Lid niet gevonden' }, { status: 404 })
  }

  const { data: targetProfile } = await admin
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle()
  const email = targetProfile?.email
  if (!email) {
    return NextResponse.json({ error: 'E-mailadres onbekend' }, { status: 404 })
  }

  const { data: wedding } = await admin
    .from('weddings')
    .select('partner1_naam, partner2_naam')
    .eq('id', weddingId)
    .single()
  const inviterNamen =
    wedding && wedding.partner1_naam && wedding.partner2_naam
      ? `${wedding.partner1_naam} & ${wedding.partner2_naam}`
      : wedding?.partner1_naam || wedding?.partner2_naam || 'Je partner'

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  const tokenHash = linkData?.properties?.hashed_token
  if (linkError || !tokenHash) {
    console.error('[partner/resend] generateLink fout:', linkError)
    return NextResponse.json({ error: 'Versturen mislukt' }, { status: 500 })
  }
  const actionUrl = `${siteUrl}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=/wachtwoord-resetten`

  const { subject, html } = renderPartnerInviteEmail({ inviterNamen, actionUrl, heeftAccount: false })
  try {
    const resend = getResend()
    const { error: sendError } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject,
      html,
    })
    if (sendError) {
      console.error('[partner/resend] Resend fout:', sendError)
      return NextResponse.json({ ok: true, emailSent: false })
    }
  } catch (err) {
    console.error('[partner/resend] Onverwachte fout:', err)
    return NextResponse.json({ ok: true, emailSent: false })
  }

  return NextResponse.json({ ok: true, emailSent: true })
}
