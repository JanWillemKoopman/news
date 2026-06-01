import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient, createRawAdminClient } from '@/lib/supabase/admin'
import type { PublicRegistryData, PublicRegistryItem } from '@/lib/bruiloft/types'
import { PublicCadeaulijstPage } from '@/components/website/PublicCadeaulijstPage'

async function getRegistryData(slug: string): Promise<PublicRegistryData | null> {
  try {
    const admin = createAdminClient()
    const rawAdmin = createRawAdminClient()

    const { data: content } = await admin
      .from('website_content')
      .select('wedding_id')
      .eq('slug', slug)
      .maybeSingle()
    if (!content) return null

    const weddingId = content.wedding_id

    const { data: settings } = await rawAdmin
      .from('registry_settings')
      .select('*')
      .eq('wedding_id', weddingId)
      .maybeSingle()

    if (!settings || !settings.is_enabled) return null

    const { data: wedding } = await admin
      .from('weddings')
      .select('partner1_naam, partner2_naam, trouwdatum')
      .eq('id', weddingId)
      .single()

    const { data: rawItems } = await rawAdmin
      .from('registry_items')
      .select('*')
      .eq('wedding_id', weddingId)
      .eq('is_visible', true)
      .order('sort_order', { ascending: true })

    const items = rawItems ?? []
    const itemIds = items.map((i: Record<string, unknown>) => i.id as string)

    let reservationMap = new Map<string, boolean>()
    let contributionMap = new Map<string, { confirmed: number; pending: number; count: number }>()

    if (itemIds.length > 0) {
      const [resData, contribData] = await Promise.all([
        rawAdmin.from('registry_reservations').select('item_id').in('item_id', itemIds),
        rawAdmin.from('registry_contributions').select('item_id, amount, payment_status').in('item_id', itemIds).neq('payment_status', 'cancelled'),
      ])
      for (const r of resData.data ?? []) {
        reservationMap.set(r.item_id as string, true)
      }
      for (const c of contribData.data ?? []) {
        const id = c.item_id as string
        const existing = contributionMap.get(id) ?? { confirmed: 0, pending: 0, count: 0 }
        const amount = c.amount as number
        const status = c.payment_status as string
        contributionMap.set(id, {
          confirmed: existing.confirmed + (status === 'confirmed' ? amount : 0),
          pending: existing.pending + (status === 'pending' ? amount : 0),
          count: existing.count + 1,
        })
      }
    }

    const registryItems: PublicRegistryItem[] = items.map((i: Record<string, unknown>) => {
      const contribs = contributionMap.get(i.id as string) ?? { confirmed: 0, pending: 0, count: 0 }
      return {
        id: i.id as string,
        type: i.type as 'gift' | 'fund',
        title: i.title as string,
        description: (i.description as string) ?? '',
        imageUrl: (i.image_url as string) ?? '',
        shopUrl: (i.shop_url as string) ?? '',
        targetAmount: i.target_amount as number | null,
        suggestedAmounts: (i.suggested_amounts as number[]) ?? [],
        paymentLink: (i.payment_link as string) ?? '',
        sortOrder: i.sort_order as number,
        isReserved: reservationMap.has(i.id as string),
        totalConfirmed: contribs.confirmed,
        totalPending: contribs.pending,
        contributorCount: contribs.count,
      }
    })

    return {
      enabled: true,
      passwordRequired: !!(settings.password),
      introText: (settings.intro_text as string) ?? '',
      bankAccountIban: (settings.bank_account_iban as string) ?? '',
      bankAccountName: (settings.bank_account_name as string) ?? '',
      weddingId,
      partner1Naam: wedding?.partner1_naam ?? '',
      partner2Naam: wedding?.partner2_naam ?? '',
      trouwdatum: wedding?.trouwdatum ?? null,
      items: registryItems,
    }
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await getRegistryData(params.slug)
  if (!data) return { title: 'Cadeaulijst' }
  return {
    title: `Cadeaulijst — ${data.partner1Naam} & ${data.partner2Naam}`,
    robots: { index: false },
  }
}

export default async function CadeaulijstStandalonePage({ params }: { params: { slug: string } }) {
  const data = await getRegistryData(params.slug)
  if (!data || !data.enabled) notFound()
  return <PublicCadeaulijstPage registry={data} slug={params.slug} />
}
