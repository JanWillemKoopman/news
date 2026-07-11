// Lichtgewicht, dependency-vrije extractie van og:image/twitter:image/eerste
// <img> en <title> uit een stuk HTML — voor de "pin via link"-functie van
// het moodboard. Bewust geen volwaardige HTML-parser: regex over de
// (al tot maxBytes afgekapte) tekst is voldoende voor metatags en veel
// sneller/lichter dan een DOM-library erbij halen voor deze ene taak.

interface MetaVeld {
  attrs: Record<string, string>
}

function parseMetaTags(html: string): MetaVeld[] {
  const tags: MetaVeld[] = []
  const metaRe = /<meta\b([^>]*)>/gi
  const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"|([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*'([^']*)'/g
  let m: RegExpExecArray | null
  while ((m = metaRe.exec(html))) {
    const attrs: Record<string, string> = {}
    let a: RegExpExecArray | null
    attrRe.lastIndex = 0
    while ((a = attrRe.exec(m[1]))) {
      const key = (a[1] ?? a[3]).toLowerCase()
      const value = a[2] ?? a[4] ?? ''
      attrs[key] = value
    }
    tags.push({ attrs })
  }
  return tags
}

const IMAGE_META_KEYS = ['og:image:secure_url', 'og:image', 'twitter:image:src', 'twitter:image']

export interface OgResultaat {
  imageUrl: string | null
  titel: string | null
}

export function extractOgData(html: string): OgResultaat {
  const tags = parseMetaTags(html)

  let imageUrl: string | null = null
  for (const key of IMAGE_META_KEYS) {
    const tag = tags.find(
      (t) => (t.attrs.property?.toLowerCase() === key || t.attrs.name?.toLowerCase() === key) && t.attrs.content
    )
    if (tag) {
      imageUrl = tag.attrs.content
      break
    }
  }

  if (!imageUrl) {
    const imgMatch = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i.exec(html)
    if (imgMatch) imageUrl = imgMatch[1]
  }

  let titel: string | null = null
  const ogTitelTag = tags.find((t) => t.attrs.property?.toLowerCase() === 'og:title' && t.attrs.content)
  if (ogTitelTag) {
    titel = ogTitelTag.attrs.content
  } else {
    const titleMatch = /<title[^>]*>([^<]*)<\/title>/i.exec(html)
    if (titleMatch) titel = titleMatch[1].trim()
  }

  return { imageUrl, titel: titel ? decodeHtmlEntities(titel).slice(0, 200) : null }
}

// Kleine set — genoeg voor titels/meta-content, geen volledige entity-tabel.
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}
