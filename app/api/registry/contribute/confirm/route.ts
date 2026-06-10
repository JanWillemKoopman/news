import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { checkRateLimit } from '@/lib/rateLimit'
import { createAdminClient, createRawAdminClient } from '@/lib/supabase/admin'
import {
  renderRegistryContributionPendingEmail,
  renderRegistryNewContributionCoupleEmail,
} from '@/lib/email/templates'
import { getResend, FROM_ADDRESS } from '@/lib/email/resend'

const bodySchema = z.object({
  contribution_id: z.string().uuid(),
  confirmation_token: z.string().min(1),
  payment_method: z.enum(['bank_transfer', 'payment_link']),
})

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rateLimit = await checkRateLimit(`registry:confirm:${ip}`, 5, 60 * 60)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Te veel verzoeken' }, { status: 429 })
  }

  const raw = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }

  const { contribution_id, confirmation_token, payment_method } = parsed.data

  const admin = createAdminClient()
  const rawAdmin = createRawAdminClient()

  const { data: contribution } = await rawAdmin
    .from('registry_contributions')
    .select('id, guest_name, guest_email, amount, payment_reference, item_id, confirmation_token')
    .eq('id', contribution_id)
    .maybeSingle()

  if (!contribution) return NextResponse.json({ error: 'Bijdrage niet gevonden' }, { status: 404 })

  // Verify the caller is the one who created the contribution
  if (!contribution.confirmation_token || contribution.confirmation_token !== confirmation_token) {
    return NextResponse.json({ error: 'Ongeldige bevestigingscode' }, { status: 403 })
  }

  const { data: item } = await rawAdmin
    .from('registry_items')
    .select('id, title, wedding_id')
    .eq('id', contribution.item_id)
    .maybeSingle()

  if (!item) return NextResponse.json({ error: 'Item niet gevonden' }, { status: 404 })

  // Update payment_method
  await rawAdmin
    .from('registry_contributions')
    .update({ payment_method })
    .eq('id', contribution_id)

  const { data: wedding } = await admin
    .from('weddings')
    .select('partner1_naam, partner2_naam')
    .eq('id', item.wedding_id)
    .single()

  const coupleNames = wedding ? `${wedding.partner1_naam} & ${wedding.partner2_naam}` : 'het bruidspaar'
  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/bruiloft/cadeaulijst`

  // Aggregate total for this fund item
  const { data: allContribs } = await rawAdmin
    .from('registry_contributions')
    .select('amount')
    .eq('item_id', item.id)
    .neq('payment_status', 'cancelled')

  const totalCents = (allContribs ?? []).reduce((s: number, c: { amount: number }) => s + c.amount, 0)

  const resend = getResend()
  const emailPromises: Promise<unknown>[] = [
    resend.emails.send({
      from: FROM_ADDRESS,
      to: contribution.guest_email,
      subject: `Bedankt voor je bijdrage aan ${item.title}`,
      html: renderRegistryContributionPendingEmail({
        guestName: contribution.guest_name,
        itemTitle: item.title,
        amountCents: contribution.amount,
        paymentMethod: payment_method,
        paymentReference: contribution.payment_reference ?? '',
        coupleNames,
      }),
    }),
  ]

  const { data: members } = await admin
    .from('wedding_members')
    .select('user_id')
    .eq('wedding_id', item.wedding_id)
    .eq('role', 'owner')

  if (members?.length) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('email')
      .in('id', members.map((m) => m.user_id))
    for (const p of profiles ?? []) {
      emailPromises.push(
        resend.emails.send({
          from: FROM_ADDRESS,
          to: p.email ?? '',
          subject: `Nieuwe bijdrage: €${(contribution.amount / 100).toFixed(2)} voor ${item.title}`,
          html: renderRegistryNewContributionCoupleEmail({
            guestName: contribution.guest_name,
            itemTitle: item.title,
            amountCents: contribution.amount,
            totalCents,
            dashboardUrl,
          }),
        })
      )
    }
  }

  await Promise.allSettled(emailPromises)

  return NextResponse.json({ success: true })
}
