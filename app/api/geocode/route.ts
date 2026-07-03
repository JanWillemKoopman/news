import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Gratis geocoding via Nominatim (OpenStreetMap) voor de kaartweergave op
// /bruiloft/leveranciers — geen API-key, geen kosten. Volgens het
// gebruiksbeleid van Nominatim: max. 1 verzoek/seconde en een herkenbare
// User-Agent; de client (VendorsMap) roept deze route dan ook één adres per
// keer en met vertrage aan, nooit in bulk.
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'OnsTrouwplan-WeddingPlanner/1.0 (leveranciers-kaart)'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const adres = request.nextUrl.searchParams.get('adres')?.trim()
  if (!adres) {
    return NextResponse.json({ error: 'Adres ontbreekt' }, { status: 400 })
  }

  const url = `${NOMINATIM_URL}?format=json&limit=1&countrycodes=nl,be&q=${encodeURIComponent(adres)}`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'nl' },
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'Geocoding mislukt' }, { status: 502 })
    }
    const results = (await res.json()) as Array<{ lat: string; lon: string }>
    const eerste = results[0]
    if (!eerste) {
      return NextResponse.json({ latitude: null, longitude: null })
    }
    return NextResponse.json({ latitude: Number(eerste.lat), longitude: Number(eerste.lon) })
  } catch (err) {
    console.error('[api/geocode] fout:', err)
    return NextResponse.json({ error: 'Geocoding mislukt' }, { status: 500 })
  }
}
