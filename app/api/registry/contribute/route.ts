import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient, createRawAdminClient } from '@/lib/supabase/admin'
import { isRateLimited } from '@/lib/rateLimit'

const bodySchema = z.object({
  item_id: z.string().uuid(),
  guest_name: z.string().min(1).max(200),
  guest_email: z.string().email(),
  amount_cents: z.number().int().min(500),
  message: z.string().max(1000).optional().default(''),
  wedding_slug: z.string().min(1),
})

function generateReference(slug: string, itemId: string): string {
  const shortItem = itemId.replace(/-/g, '').slice(0, 6).toUpperCase()
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  const shortSlug = slug.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase()
  return `${shortSlug}-${shortItem}-${rand}`
}

export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }

  const { item_id, guest_name, guest_email, amount_cents, message, wedding_slug } = parsed.data

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(`contribute:${ip}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Te veel verzoeken' }, { status: 429 })
  }

  const admin = createAdminClient()
  const rawAdmin = createRawAdminClient()

  // Validate item
  const { data: item } = await rawAdmin
    .from('registry_items')
    .select('id, type, title, is_visible, wedding_id, payment_link')
    .eq('id', item_id)
    .maybeSingle()

  if (!item) return NextResponse.json({ error: 'Item niet gevonden' }, { status: 404 })
  if (item.type !== 'fund') return NextResponse.json({ error: 'Alleen geldfondsen accepteren bijdragen' }, { status: 400 })
  if (!item.is_visible) return NextResponse.json({ error: 'Item niet beschikbaar' }, { status: 400 })

  // Verify slug matches
  const { data: content } = await admin
    .from('website_content')
    .select('wedding_id')
    .eq('slug', wedding_slug)
    .maybeSingle()
  if (!content || content.wedding_id !== item.wedding_id) {
    return NextResponse.json({ error: 'Item niet gevonden' }, { status: 404 })
  }

  const paymentReference = generateReference(wedding_slug, item_id)

  const { data: contribution, error: contribError } = await rawAdmin
    .from('registry_contributions')
    .insert({
      item_id,
      guest_name,
      guest_email,
      amount: amount_cents,
      message: message || null,
      payment_status: 'pending',
      payment_method: 'bank_transfer',
      payment_reference: paymentReference,
    })
    .select()
    .single()

  if (contribError || !contribution) {
    console.error('[registry/contribute] Insert error:', contribError)
    return NextResponse.json({ error: 'Bijdrage registreren mislukt' }, { status: 500 })
  }

  // Get IBAN from settings
  const { data: settings } = await rawAdmin
    .from('registry_settings')
    .select('bank_account_iban, bank_account_name')
    .eq('wedding_id', item.wedding_id)
    .maybeSingle()

  return NextResponse.json({
    success: true,
    contribution_id: contribution.id,
    payment_reference: paymentReference,
    has_payment_link: !!(item.payment_link),
    payment_link: item.payment_link || undefined,
    iban: settings?.bank_account_iban || undefined,
    account_name: settings?.bank_account_name || undefined,
  })
}
