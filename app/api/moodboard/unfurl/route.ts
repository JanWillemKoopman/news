import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { extractOgData } from '@/lib/bruiloft/ogImage'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { assertPublicUrl, SsrfBlockedError } from '@/lib/security/ssrfGuard'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// "Pin via link": haalt voor het moodboard een og:image (of het eerste
// bruikbare plaatje) op van een door de gebruiker geplakte URL, zodat een
// Pinterest-pin, blogpost of shoppagina met één plak-actie een tegel wordt.
// We downloaden de afbeelding zelf NIET — alleen de HTML/og-metadata om de
// directe afbeeldings-URL te vinden; de browser van de gebruiker laadt die
// afbeelding daarna zelf (hotlink, zie mood_board_items.bron='link').
//
// Vereist login + rate limit: dit endpoint laat de server een URL naar keuze
// ophalen (klassiek SSRF-aanvalsoppervlak) — zie lib/security/ssrfGuard.ts
// voor de host-validatie. Nooit publiek/anoniem opengesteld.

const MAX_BYTES = 3 * 1024 * 1024 // 3 MB — ruim genoeg voor <head>, klein genoeg om misbruik te beperken
const MAX_REDIRECTS = 4
// Eén overkoepelende deadline voor de hele operatie (elke redirect-hop +
// het lezen van de body) i.p.v. een timeout per fetch-aanroep — anders zou
// een traag-druppelende respons (of veel redirects) de teller kunnen
// omzeilen door nooit één enkele fetch lang genoeg te laten duren.
const TOTAL_TIMEOUT_MS = 15000

const bodySchema = z.object({ url: z.string().trim().min(1).max(2000) })

async function readBodyCapped(res: Response, maxBytes: number, signal: AbortSignal): Promise<string> {
  const reader = res.body?.getReader()
  if (!reader) return ''
  const decoder = new TextDecoder()
  let ontvangen = 0
  let tekst = ''
  for (;;) {
    if (signal.aborted) {
      await reader.cancel().catch(() => {})
      throw new DOMException('Aborted', 'AbortError')
    }
    const { done, value } = await reader.read()
    if (done) break
    ontvangen += value.byteLength
    if (ontvangen > maxBytes) {
      await reader.cancel().catch(() => {})
      break
    }
    tekst += decoder.decode(value, { stream: true })
  }
  return tekst
}

// Volgt redirects handmatig (i.p.v. fetch's ingebouwde redirect-afhandeling)
// zodat elke hop opnieuw tegen de SSRF-guard gevalideerd wordt — een
// interne server mag zich niet via een 302 achter een publieke URL
// verstoppen. Gebruikt dezelfde signal voor elke hop, zodat de
// overkoepelende deadline (zie hierboven) overal geldt.
async function veiligOphalen(
  startUrl: URL,
  signal: AbortSignal
): Promise<{ response: Response; finalUrl: URL }> {
  let huidigeUrl = startUrl
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(huidigeUrl)

    const response = await fetch(huidigeUrl, {
      redirect: 'manual',
      signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OnsTrouwplanBot/1.0; +https://onstrouwplan.nl)',
        Accept: 'text/html,image/*;q=0.9,*/*;q=0.5',
      },
    })

    if (response.status >= 300 && response.status < 400) {
      const locatie = response.headers.get('location')
      if (!locatie) throw new SsrfBlockedError('Redirect zonder bestemming')
      huidigeUrl = new URL(locatie, huidigeUrl)
      continue
    }

    return { response, finalUrl: huidigeUrl }
  }
  throw new SsrfBlockedError('Te veel redirects')
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Niet ingelogd' }, { status: 401 })
  }

  const ip = getClientIp(request)
  const [perUser, perIp] = await Promise.all([
    checkRateLimit(`moodboard-unfurl:user:${user.id}`, 20, 60),
    checkRateLimit(`moodboard-unfurl:ip:${ip}`, 30, 60),
  ])
  if (!perUser.allowed || !perIp.allowed) {
    return NextResponse.json({ ok: false, error: 'Te veel pogingen, probeer het over een minuut opnieuw' }, { status: 429 })
  }

  const rawBody = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Ongeldige link' }, { status: 400 })
  }

  let startUrl: URL
  try {
    startUrl = new URL(parsed.data.url)
  } catch {
    return NextResponse.json({ ok: false, error: 'Dit is geen geldige link' }, { status: 400 })
  }

  const controller = new AbortController()
  const overallTimeout = setTimeout(() => controller.abort(), TOTAL_TIMEOUT_MS)

  try {
    const { response, finalUrl } = await veiligOphalen(startUrl, controller.signal)

    if (!response.ok) {
      return NextResponse.json({ ok: false, error: 'Deze link kon niet worden opgehaald' }, { status: 422 })
    }

    const contentType = response.headers.get('content-type') ?? ''

    // De link wíjst zelf al naar een afbeelding — niets te unfurlen.
    if (contentType.startsWith('image/')) {
      await response.body?.cancel().catch(() => {})
      return NextResponse.json({ ok: true, imageUrl: finalUrl.toString(), titel: null })
    }

    if (!contentType.includes('text/html')) {
      await response.body?.cancel().catch(() => {})
      return NextResponse.json(
        { ok: false, error: 'Geen afbeelding gevonden op deze pagina' },
        { status: 422 }
      )
    }

    const html = await readBodyCapped(response, MAX_BYTES, controller.signal)
    const { imageUrl, titel } = extractOgData(html)

    if (!imageUrl) {
      return NextResponse.json(
        { ok: false, error: 'Geen afbeelding gevonden op deze pagina' },
        { status: 422 }
      )
    }

    // Relatieve/protocol-relatieve afbeeldings-URL oplossen t.o.v. de
    // uiteindelijke paginalink (na eventuele redirects).
    let opgelosteImageUrl: string
    try {
      opgelosteImageUrl = new URL(imageUrl, finalUrl).toString()
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Geen geldige afbeelding gevonden op deze pagina' },
        { status: 422 }
      )
    }

    return NextResponse.json({ ok: true, imageUrl: opgelosteImageUrl, titel })
  } catch (err) {
    if (err instanceof SsrfBlockedError) {
      return NextResponse.json({ ok: false, error: 'Deze link is niet toegestaan' }, { status: 400 })
    }
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ ok: false, error: 'Deze pagina reageerde niet op tijd' }, { status: 504 })
    }
    console.error('[moodboard/unfurl] onverwachte fout:', err)
    return NextResponse.json({ ok: false, error: 'Ophalen mislukt' }, { status: 500 })
  } finally {
    clearTimeout(overallTimeout)
  }
}
