import { NextRequest, NextResponse } from 'next/server'
import { scrapeVacancy } from '@/lib/scraper'

export const runtime = 'nodejs'
export const maxDuration = 30

// Reject loopback / private / link-local hosts to limit SSRF surface.
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost') || h === '[::1]') return true
  if (/^127\./.test(h)) return true
  if (/^10\./.test(h)) return true
  if (/^192\.168\./.test(h)) return true
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return true
  if (/^169\.254\./.test(h)) return true
  if (h === '0.0.0.0') return true
  return false
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ ok: false, reason: 'unreachable' }, { status: 400 })
    }

    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return NextResponse.json({ ok: false, reason: 'unreachable' }, { status: 400 })
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return NextResponse.json({ ok: false, reason: 'unreachable' }, { status: 400 })
    }
    if (isBlockedHost(parsed.hostname)) {
      return NextResponse.json({ ok: false, reason: 'unreachable' }, { status: 400 })
    }

    const result = await scrapeVacancy(url)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[API /scrape]', err)
    return NextResponse.json({ ok: false, reason: 'unreachable' }, { status: 500 })
  }
}
