import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { FROM_ADDRESS, getResend } from '@/lib/email/resend'
import { renderPartnerInviteEmail } from '@/lib/email/templates'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  weddingId: z.string().uuid(),
  email: z.string().email(),
})

// Nodigt de partner uit met een eigen, volwaardig account. We maken het account
// direct aan (admin generateLink), voegen de partner toe als eigenaar (volledige
// toegang) en mailen een link waarmee ze een wachtwoord kunnen instellen.
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
  const weddingId = parsed.data.weddingId
  const email = parsed.data.email.trim().toLowerCase()

  if (user.email && email === user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Je kunt jezelf niet uitnodigen.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Alleen de eigenaar mag een partner uitnodigen.
  const { data: membership } = await admin
    .from('wedding_members')
    .select('role')
    .eq('wedding_id', weddingId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership || membership.role !== 'owner') {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  const { data: wedding } = await admin
    .from('weddings')
    .select('partner1_naam, partner2_naam')
    .eq('id', weddingId)
    .single()
  if (!wedding) {
    return NextResponse.json({ error: 'Bruiloft niet gevonden' }, { status: 404 })
  }

  const inviterNamen =
    wedding.partner1_naam && wedding.partner2_naam
      ? `${wedding.partner1_naam} & ${wedding.partner2_naam}`
      : wedding.partner1_naam || wedding.partner2_naam || 'Je partner'

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')
  const redirectTo = `${siteUrl}/auth/callback?next=/wachtwoord-resetten`
  // Best-effort naam voor het partnerprofiel.
  const partnerNaam = wedding.partner2_naam || wedding.partner1_naam || ''

  let actionUrl: string | null = null
  let heeftAccount = false
  let partnerUserId: string | null = null

  // Probeer een uitnodiging te genereren die meteen een account aanmaakt.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      redirectTo,
      data: { display_name: partnerNaam },
    },
  })

  if (linkError) {
    // Bestaat het account al? Voeg de partner dan direct toe als eigenaar en stuur
    // een herstel-link zodat ze (opnieuw) een wachtwoord kunnen instellen.
    const alreadyExists = /already|registered|exist/i.test(linkError.message)
    if (!alreadyExists) {
      console.error('[partner/invite] generateLink fout:', linkError)
      return NextResponse.json({ error: 'Uitnodigen mislukt' }, { status: 500 })
    }
    heeftAccount = true
    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    partnerUserId = existing?.id ?? null
    const { data: recData } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })
    actionUrl = recData?.properties?.action_link ?? `${siteUrl}/login`
  } else {
    partnerUserId = linkData.user?.id ?? null
    actionUrl = linkData.properties?.action_link ?? null
  }

  if (!partnerUserId) {
    return NextResponse.json({ error: 'Kon de partner niet toevoegen' }, { status: 500 })
  }

  // Voeg de partner toe als volwaardig lid (eigenaar = volledige toegang).
  const { error: memberError } = await admin
    .from('wedding_members')
    .upsert(
      { wedding_id: weddingId, user_id: partnerUserId, role: 'owner' },
      { onConflict: 'wedding_id,user_id' }
    )
  if (memberError) {
    console.error('[partner/invite] lidmaatschap fout:', memberError)
    return NextResponse.json({ error: 'Kon de partner niet toevoegen' }, { status: 500 })
  }

  if (!actionUrl) {
    return NextResponse.json({ ok: true, emailSent: false })
  }

  const { subject, html } = renderPartnerInviteEmail({ inviterNamen, actionUrl, heeftAccount })
  try {
    const resend = getResend()
    const { error: sendError } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject,
      html,
    })
    if (sendError) {
      console.error('[partner/invite] Resend fout:', sendError)
      return NextResponse.json({ ok: true, emailSent: false })
    }
  } catch (err) {
    console.error('[partner/invite] Onverwachte fout:', err)
    return NextResponse.json({ ok: true, emailSent: false })
  }

  return NextResponse.json({ ok: true, emailSent: true })
}
