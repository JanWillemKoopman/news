import { NextRequest, NextResponse } from 'next/server'

import { FROM_ADDRESS, getResend } from '@/lib/email/resend'
import { renderInviteEmail } from '@/lib/email/templates'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Eigenaar (bruidspaar)',
  planner: 'Planner',
  helper: 'Helper',
  viewer: 'Kijker',
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body?.token || !body?.email || !body?.weddingId) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }
  const { token, email, weddingId, role } = body as {
    token: string
    email: string
    weddingId: string
    role?: string
  }

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

  // Haal bruiloftsnamen op voor de e-mailtekst.
  const { data: wedding } = await admin
    .from('weddings')
    .select('partner1_naam, partner2_naam')
    .eq('id', weddingId)
    .single()
  if (!wedding) {
    return NextResponse.json({ error: 'Bruiloft niet gevonden' }, { status: 404 })
  }

  // Verifieer dat het invite-token bestaat en nog niet geaccepteerd is.
  const { data: invite } = await admin
    .from('wedding_invites')
    .select('expires_at')
    .eq('token', token)
    .eq('wedding_id', weddingId)
    .is('accepted_at', null)
    .single()
  if (!invite) {
    return NextResponse.json({ error: 'Uitnodiging niet gevonden' }, { status: 404 })
  }

  const uitnodigerNamen =
    wedding.partner1_naam && wedding.partner2_naam
      ? `${wedding.partner1_naam} & ${wedding.partner2_naam}`
      : wedding.partner1_naam || wedding.partner2_naam || 'Het bruidspaar'

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const accepteerUrl = `${siteUrl}/uitnodiging/${token}`
  const verloopdatum = new Date(invite.expires_at).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const { subject, html } = renderInviteEmail({
    uitnodigerNamen,
    rolLabel: ROLE_LABELS[role ?? ''] ?? role ?? 'Medewerker',
    accepteerUrl,
    verloopdatum,
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
      console.error('[email/invite] Resend fout:', sendError)
      return NextResponse.json({ ok: true, emailSent: false })
    }
  } catch (err) {
    console.error('[email/invite] Onverwachte fout:', err)
    return NextResponse.json({ ok: true, emailSent: false })
  }

  return NextResponse.json({ ok: true, emailSent: true })
}
