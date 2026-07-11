import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import {
  renderRegistryReservationGuestEmail,
  renderRegistryNewReservationCoupleEmail,
} from '@/lib/email/templates'
import { getResend, FROM_ADDRESS } from '@/lib/email/resend'
import { createAdminClient } from '@/lib/supabase/admin'

const bodySchema = z.object({
  item_id: z.string().uuid(),
  guest_name: z.string().min(1).max(200),
  guest_email: z.string().optional().default(''),
  message: z.string().max(1000).optional().default(''),
  wedding_slug: z.string().min(1),
})

const ERROR_MESSAGES: Record<string, string> = {
  item_not_found: 'Item niet gevonden',
  not_a_gift: 'Alleen cadeauwensen kunnen worden gereserveerd',
  item_not_available: 'Item niet beschikbaar',
  already_reserved: 'Dit cadeau is al gereserveerd',
}

export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }

  const { item_id, guest_name, guest_email, message, wedding_slug } = parsed.data

  // Use anon-key client + SECURITY DEFINER RPC — works without service role key
  const supabase = createClient() as any
  const { data: result, error: rpcError } = await supabase.rpc('reserve_registry_item', {
    p_item_id: item_id,
    p_slug: wedding_slug,
    p_guest_name: guest_name,
    p_guest_email: guest_email,
    p_message: message || null,
  })

  if (rpcError || !result) {
    console.error('[registry/reserve] RPC error:', rpcError)
    return NextResponse.json({ error: 'Reservering mislukt' }, { status: 500 })
  }

  if (!result.ok) {
    const msg = ERROR_MESSAGES[result.error as string] ?? 'Er ging iets mis'
    const status = result.error === 'already_reserved' ? 409 : 404
    return NextResponse.json({ error: msg }, { status })
  }

  // Send emails (best-effort, non-blocking)
  const coupleNames = `${result.partner1_naam} & ${result.partner2_naam}`
  const cancelUrl = `${(process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')}/api/registry/cancel-reservation?token=${result.cancel_token}`
  const dashboardUrl = `${(process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')}/bruiloft/cadeaulijst`

  const resend = getResend()
  const emailPromises: Promise<unknown>[] = []

  if (guest_email) {
    emailPromises.push(
      resend.emails.send({
        from: FROM_ADDRESS,
        to: guest_email,
        subject: `Je hebt een cadeau gereserveerd voor ${coupleNames}`,
        html: renderRegistryReservationGuestEmail({
          guestName: guest_name,
          itemTitle: result.item_title as string,
          coupleNames,
          weddingDate: (result.trouwdatum as string) ?? null,
          shopUrl: (result.shop_url as string) ?? null,
          cancelUrl,
        }),
      })
    )
  }

  // Notify wedding owners (falls back gracefully if admin client fails)
  try {
    const admin = createAdminClient()
    const { data: members } = await admin
      .from('wedding_members')
      .select('user_id')
      .eq('wedding_id', result.wedding_id as string)
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
            subject: 'Nieuw cadeau gereserveerd op jullie cadeaulijst',
            html: renderRegistryNewReservationCoupleEmail({
              guestName: guest_name,
              itemTitle: result.item_title as string,
              dashboardUrl,
            }),
          })
        )
      }
    }
  } catch (err) {
    console.warn('[registry/reserve] Couple notification skipped:', err)
  }

  await Promise.allSettled(emailPromises)

  return NextResponse.json({ success: true })
}
