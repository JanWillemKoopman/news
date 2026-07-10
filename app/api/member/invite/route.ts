import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { ROLE_DESCRIPTIONS, ROLE_LABELS, type WeddingRole } from '@/lib/bruiloft/permissions'
import { FROM_ADDRESS, getResend } from '@/lib/email/resend'
import { renderMemberInviteEmail } from '@/lib/email/templates'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  weddingId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['owner', 'planner', 'helper', 'viewer']),
})

// Nodigt een lid uit met een verplichte rol. Bestaat er nog geen account, dan
// wordt dat direct aangemaakt (admin generateLink) en ontvangt de genodigde een
// uitnodigingsmail met een knop om een wachtwoord in te stellen. Bestaat het
// account al, dan sturen we een herstel-link zodat inloggen altijd lukt.
// Alleen eigenaren van de bruiloft mogen uitnodigen.
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
  const { weddingId } = parsed.data
  const role = parsed.data.role as WeddingRole
  const email = parsed.data.email.trim().toLowerCase()

  if (user.email && email === user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Je kunt jezelf niet uitnodigen.' }, { status: 400 })
  }

  // Alleen de eigenaar mag leden uitnodigen (RLS op wedding_members dwingt
  // dit ook af; deze check geeft een nette foutmelding vóór het mailen).
  const { data: membership } = await supabase
    .from('wedding_members')
    .select('role')
    .eq('wedding_id', weddingId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership || membership.role !== 'owner') {
    return NextResponse.json({ error: 'Alleen eigenaren kunnen leden uitnodigen.' }, { status: 403 })
  }

  const { data: wedding, error: weddingError } = await supabase
    .from('weddings')
    .select('partner1_naam, partner2_naam')
    .eq('id', weddingId)
    .single()
  if (!wedding) {
    console.error('[member/invite] bruiloft ophalen mislukt:', weddingError)
    return NextResponse.json({ error: 'Bruiloft niet gevonden' }, { status: 404 })
  }

  const inviterNamen =
    wedding.partner1_naam && wedding.partner2_naam
      ? `${wedding.partner1_naam} & ${wedding.partner2_naam}`
      : wedding.partner1_naam || wedding.partner2_naam || 'Het bruidspaar'

  const admin = createAdminClient()
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')

  // Link via /auth/confirm (verifyOtp met token_hash): werkt cross-device,
  // in tegenstelling tot de PKCE-code-exchange (zie partner/invite).
  const confirmUrl = (tokenHash: string, type: 'invite' | 'recovery') =>
    `${siteUrl}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${type}&next=/wachtwoord-resetten`

  let actionUrl: string | null = null
  let heeftAccount = false
  let memberUserId: string | null = null

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    // `uitgenodigd` stuurt de eenmalige welkomstmail aan zodra dit account
    // straks een wachtwoord instelt (zie lib/email/welcome.ts).
    options: { data: { uitgenodigd: true } },
  })

  if (linkError) {
    const alreadyExists = /already|registered|exist/i.test(linkError.message)
    if (!alreadyExists) {
      console.error('[member/invite] generateLink fout (check SUPABASE_SERVICE_ROLE_KEY):', linkError)
      return NextResponse.json({ error: 'Uitnodigen mislukt' }, { status: 500 })
    }
    heeftAccount = true
    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    memberUserId = existing?.id ?? null
    const { data: recData } = await admin.auth.admin.generateLink({ type: 'recovery', email })
    const recHash = recData?.properties?.hashed_token
    actionUrl = recHash ? confirmUrl(recHash, 'recovery') : `${siteUrl}/login`
  } else {
    memberUserId = linkData.user?.id ?? null
    const inviteHash = linkData.properties?.hashed_token
    actionUrl = inviteHash ? confirmUrl(inviteHash, 'invite') : null
  }

  if (!memberUserId) {
    return NextResponse.json({ error: 'Kon het lid niet toevoegen' }, { status: 500 })
  }

  const { error: memberError } = await admin
    .from('wedding_members')
    .upsert(
      { wedding_id: weddingId, user_id: memberUserId, role },
      { onConflict: 'wedding_id,user_id' }
    )
  if (memberError) {
    console.error('[member/invite] lidmaatschap fout:', memberError)
    return NextResponse.json({ error: 'Kon het lid niet toevoegen' }, { status: 500 })
  }

  if (!actionUrl) {
    return NextResponse.json({ ok: true, emailSent: false })
  }

  const { subject, html } = renderMemberInviteEmail({
    inviterNamen,
    rolLabel: ROLE_LABELS[role],
    rolOmschrijving: ROLE_DESCRIPTIONS[role],
    actionUrl,
    heeftAccount,
  })
  try {
    const resend = getResend()
    const { error: sendError } = await resend.emails.send({ from: FROM_ADDRESS, to: email, subject, html })
    if (sendError) {
      console.error('[member/invite] Resend fout:', sendError)
      return NextResponse.json({ ok: true, emailSent: false })
    }
  } catch (err) {
    console.error('[member/invite] Onverwachte fout:', err)
    return NextResponse.json({ ok: true, emailSent: false })
  }

  return NextResponse.json({ ok: true, emailSent: true })
}
