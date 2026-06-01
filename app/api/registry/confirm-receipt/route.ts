import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient, createRawAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { renderRegistryContributionConfirmedEmail } from '@/lib/email/templates'
import { getResend, FROM_ADDRESS } from '@/lib/email/resend'

const bodySchema = z.object({
  contribution_id: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const raw = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }

  const { contribution_id } = parsed.data
  const admin = createAdminClient()
  const rawAdmin = createRawAdminClient()

  const { data: contribution } = await rawAdmin
    .from('registry_contributions')
    .select('id, guest_name, guest_email, amount, item_id')
    .eq('id', contribution_id)
    .maybeSingle()

  if (!contribution) return NextResponse.json({ error: 'Bijdrage niet gevonden' }, { status: 404 })

  const { data: item } = await rawAdmin
    .from('registry_items')
    .select('id, title, wedding_id')
    .eq('id', contribution.item_id)
    .maybeSingle()

  if (!item) return NextResponse.json({ error: 'Item niet gevonden' }, { status: 404 })

  // Permission check
  const { data: member } = await admin
    .from('wedding_members')
    .select('role')
    .eq('wedding_id', item.wedding_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member || !['owner', 'planner'].includes(member.role)) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  const now = new Date().toISOString()
  await rawAdmin
    .from('registry_contributions')
    .update({ payment_status: 'confirmed', confirmed_at: now })
    .eq('id', contribution_id)

  const { data: wedding } = await admin
    .from('weddings')
    .select('partner1_naam, partner2_naam')
    .eq('id', item.wedding_id)
    .single()

  const coupleNames = wedding ? `${wedding.partner1_naam} & ${wedding.partner2_naam}` : 'het bruidspaar'

  const resend = getResend()
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: contribution.guest_email,
    subject: 'Je bijdrage is bevestigd!',
    html: renderRegistryContributionConfirmedEmail({
      guestName: contribution.guest_name,
      itemTitle: item.title,
      amountCents: contribution.amount,
      coupleNames,
    }),
  }).catch((err) => console.error('[confirm-receipt] email error:', err))

  return NextResponse.json({ success: true })
}
