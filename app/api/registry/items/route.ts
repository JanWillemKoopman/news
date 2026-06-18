import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { verifyPassword } from '@/lib/crypto/password'
import { checkRateLimit } from '@/lib/rateLimit'
import { createAdminClient, createRawAdminClient } from '@/lib/supabase/admin'

const bodySchema = z.object({
  slug: z.string().min(1),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const { slug, password } = parsed.data
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const rateLimit = await checkRateLimit(`registry:password:${ip}:${slug}`, 10, 15 * 60)
  if (!rateLimit.allowed) {
    return NextResponse.json({ ok: false, error: 'Te veel pogingen' }, { status: 429 })
  }

  const admin = createAdminClient()
  const rawAdmin = createRawAdminClient()

  const { data: content } = await admin
    .from('website_content')
    .select('wedding_id')
    .eq('slug', slug)
    .maybeSingle()

  if (!content) return NextResponse.json({ ok: false })

  const { data: settings } = await rawAdmin
    .from('registry_settings')
    .select('password, is_enabled, bank_account_iban, bank_account_name')
    .eq('wedding_id', content.wedding_id)
    .maybeSingle()

  if (!settings || !settings.is_enabled) return NextResponse.json({ ok: false })

  if (settings.password) {
    const ok = await verifyPassword(password, settings.password as string)
    if (!ok) return NextResponse.json({ ok: false })
  }

  // Password correct (or no password set): return items
  const { data: itemRows } = await rawAdmin
    .from('registry_items')
    .select(`
      id, type, title, description, image_url, shop_url,
      target_amount, suggested_amounts, payment_link, sort_order,
      registry_reservations(id),
      registry_contributions(item_id, amount, payment_status)
    `)
    .eq('wedding_id', content.wedding_id)
    .eq('is_visible', true)
    .order('sort_order')
    .order('created_at')

  const items = (itemRows ?? []).map((ri: any) => {
    const reservations: any[] = ri.registry_reservations ?? []
    const contributions: any[] = ri.registry_contributions ?? []
    const totalConfirmed = contributions
      .filter((c: any) => c.payment_status === 'confirmed')
      .reduce((s: number, c: any) => s + (c.amount ?? 0), 0)
    const totalPending = contributions
      .filter((c: any) => c.payment_status === 'pending')
      .reduce((s: number, c: any) => s + (c.amount ?? 0), 0)
    const contributorCount = contributions
      .filter((c: any) => c.payment_status === 'confirmed' || c.payment_status === 'pending')
      .length

    return {
      id: ri.id,
      type: ri.type,
      title: ri.title,
      description: ri.description ?? '',
      imageUrl: ri.image_url ?? '',
      shopUrl: ri.shop_url ?? '',
      targetAmount: ri.target_amount ?? null,
      suggestedAmounts: ri.suggested_amounts ?? [],
      paymentLink: ri.payment_link ?? '',
      sortOrder: ri.sort_order,
      isReserved: reservations.length > 0,
      totalConfirmed,
      totalPending,
      contributorCount,
    }
  })

  return NextResponse.json({
    ok: true,
    items,
    bankAccountIban: settings.bank_account_iban ?? '',
    bankAccountName: settings.bank_account_name ?? '',
  })
}
