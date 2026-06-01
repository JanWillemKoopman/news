import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { PublicRegistryData, PublicRegistryItem, WeddingThema, WeddingLettertype } from '@/lib/bruiloft/types'
import { PublicCadeaulijstPage } from '@/components/website/PublicCadeaulijstPage'

type RegistryResult =
  | { status: 'ok'; data: PublicRegistryData }
  | { status: 'disabled' }
  | { status: 'not_found' }
  | { status: 'error'; message: string }

async function getRegistryData(slug: string): Promise<RegistryResult> {
  try {
    const supabase = createClient()

    // Use the SECURITY DEFINER RPC — works with anon key, bypasses RLS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('get_public_registry', { p_slug: slug })

    if (error) {
      console.error('[cadeaulijst] RPC error:', error)
      return { status: 'error', message: error.message }
    }

    if (!data) return { status: 'not_found' }
    if (!data.enabled) return { status: 'disabled' }

    // Map snake_case RPC result to camelCase TypeScript types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: PublicRegistryItem[] = (data.items ?? []).map((i: any) => ({
      id: i.id as string,
      type: i.type as 'gift' | 'fund',
      title: i.title as string,
      description: (i.description as string) ?? '',
      imageUrl: (i.image_url as string) ?? '',
      shopUrl: (i.shop_url as string) ?? '',
      targetAmount: (i.target_amount as number | null) ?? null,
      suggestedAmounts: (i.suggested_amounts as number[]) ?? [],
      paymentLink: (i.payment_link as string) ?? '',
      sortOrder: i.sort_order as number,
      isReserved: i.is_reserved as boolean,
      totalConfirmed: (i.total_confirmed as number) ?? 0,
      totalPending: (i.total_pending as number) ?? 0,
      contributorCount: (i.contributor_count as number) ?? 0,
    }))

    const registryData: PublicRegistryData = {
      enabled: true,
      passwordRequired: !!(data.password_required),
      introText: (data.intro_text as string) ?? '',
      bankAccountIban: (data.bank_account_iban as string) ?? '',
      bankAccountName: (data.bank_account_name as string) ?? '',
      weddingId: data.wedding_id as string,
      partner1Naam: (data.partner1_naam as string) ?? '',
      partner2Naam: (data.partner2_naam as string) ?? '',
      trouwdatum: (data.trouwdatum as string) ?? null,
      thema: ((data.thema as string) ?? 'klassiek') as WeddingThema,
      kleurAccent: (data.kleur_accent as string) ?? '#a75573',
      kopLettertype: ((data.kop_lettertype as string) ?? 'cormorant') as WeddingLettertype,
      headerFotoUrl: '',
      items,
    }

    return { status: 'ok', data: registryData }
  } catch (err) {
    console.error('[cadeaulijst] unexpected error:', err)
    return { status: 'error', message: String(err) }
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const result = await getRegistryData(params.slug)
  if (result.status !== 'ok') return { title: 'Cadeaulijst' }
  return {
    title: `Cadeaulijst — ${result.data.partner1Naam} & ${result.data.partner2Naam}`,
    robots: { index: false },
  }
}

export default async function CadeaulijstStandalonePage({ params }: { params: { slug: string } }) {
  const result = await getRegistryData(params.slug)

  if (result.status === 'not_found') notFound()
  if (result.status === 'disabled' || result.status === 'error') {
    redirect(`/trouwen/${params.slug}`)
  }

  return <PublicCadeaulijstPage registry={result.data} slug={params.slug} />
}
