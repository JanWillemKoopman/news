import * as cheerio from 'cheerio'

export type ScrapeResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'blocked' | 'unreachable' | 'empty' }

const MAX_CHARS = 15000
const MIN_CHARS = 200

/**
 * Best-effort extraction of clean text from a job-vacancy URL.
 * Only sees the initial HTML response — JS-rendered pages (LinkedIn, Indeed)
 * cannot be scraped and resolve to { ok: false }. The UI falls back to a
 * paste textarea in that case.
 */
export async function scrapeVacancy(url: string): Promise<ScrapeResult> {
  let html: string

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
      },
    }).finally(() => clearTimeout(timeout))

    if (res.status === 403 || res.status === 401 || res.status === 429) {
      return { ok: false, reason: 'blocked' }
    }
    if (!res.ok) {
      return { ok: false, reason: 'unreachable' }
    }
    html = await res.text()
  } catch {
    return { ok: false, reason: 'unreachable' }
  }

  const $ = cheerio.load(html)
  $('script, style, nav, header, footer, svg, noscript, iframe, form').remove()

  const container = $('main').first().length
    ? $('main').first()
    : $('article').first().length
      ? $('article').first()
      : $('[role="main"]').first().length
        ? $('[role="main"]').first()
        : $('body')

  const text = container
    .text()
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
    .slice(0, MAX_CHARS)

  if (text.length < MIN_CHARS) {
    return { ok: false, reason: 'empty' }
  }

  return { ok: true, text }
}
