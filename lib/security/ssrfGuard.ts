// SSRF-bescherming voor server-side fetches naar door gebruikers opgegeven
// URLs (zie /api/moodboard/unfurl). Twee lagen:
// 1) elke hostname wordt vóór het verzoek volledig DNS-geresolved, en ALLE
//    teruggegeven adressen moeten publiek zijn (niet loopback/privé/link-
//    local/metadata/multicast/gereserveerd) — anders wordt de fetch geweigerd;
// 2) elke redirect-hop herhaalt diezelfde check (open redirects mogen niet
//    naar binnen wijzen).
// Bewuste restrictie: we resolven zelf (via dns.lookup) en laten de fetch
// zelf daarna nogmaals resolven — een aanvaller met perfecte DNS-rebinding-
// timing zou in theorie tussen die twee momenten kunnen wisselen. Dat gat is
// in de praktijk millisecondes klein; in combinatie met de request-timeout,
// byte-cap en dat dit endpoint alleen ingelogde gebruikers (met rate limit)
// bereiken, is dit een bewust geaccepteerd restrisico — geen stilzwijgende
// aanname.

import { lookup as dnsLookup } from 'node:dns/promises'

export class SsrfBlockedError extends Error {}

function ipv4ToInt(ip: string): number | null {
  const delen = ip.split('.')
  if (delen.length !== 4) return null
  let n = 0
  for (const deel of delen) {
    if (!/^\d{1,3}$/.test(deel)) return null
    const v = Number(deel)
    if (v > 255) return null
    n = (n << 8) | v
  }
  return n >>> 0
}

// IPv4-adressen die nooit een legitieme externe afbeelding hosten:
// loopback, privé, link-local (incl. cloud-metadata 169.254.169.254),
// CGNAT, documentatie/test-netwerken, multicast en gereserveerd.
const IPV4_BLOCKS: [string, number][] = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
  ['255.255.255.255', 32],
]

function isForbiddenIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip)
  if (n === null) return true // onherkenbaar formaat: liever weigeren
  for (const [basis, prefix] of IPV4_BLOCKS) {
    const basisN = ipv4ToInt(basis)!
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
    if ((n & mask) === (basisN & mask)) return true
  }
  return false
}

// Zet een (mogelijk verkorte, "::"-bevattende) IPv6-string om naar 8
// 16-bit groepen als bigint-array, voor nauwkeurige prefix-vergelijking.
function ipv6ToGroups(ip: string): bigint[] | null {
  const zonderZone = ip.split('%')[0]
  const helften = zonderZone.split('::')
  if (helften.length > 2) return null

  const parseGroepen = (deel: string): bigint[] | null => {
    if (deel === '') return []
    const stukken = deel.split(':')
    const groepen: bigint[] = []
    for (const stuk of stukken) {
      // IPv4-mapped staart (bv. ::ffff:127.0.0.1) omzetten naar 2 groepen.
      if (stuk.includes('.')) {
        const n = ipv4ToInt(stuk)
        if (n === null) return null
        groepen.push(BigInt(n >>> 16), BigInt(n & 0xffff))
        continue
      }
      if (!/^[0-9a-fA-F]{1,4}$/.test(stuk)) return null
      groepen.push(BigInt(parseInt(stuk, 16)))
    }
    return groepen
  }

  if (helften.length === 1) {
    const groepen = parseGroepen(helften[0])
    return groepen && groepen.length === 8 ? groepen : null
  }

  const links = parseGroepen(helften[0])
  const rechts = parseGroepen(helften[1])
  if (!links || !rechts) return null
  const ontbrekend = 8 - links.length - rechts.length
  if (ontbrekend < 0) return null
  return [...links, ...Array(ontbrekend).fill(BigInt(0)), ...rechts]
}

// Target in tsconfig.json is es5: de "0xffn"-literalsyntax is dan niet
// toegestaan (TS2737), dus overal BigInt(...) als functie-aanroep i.p.v.
// een n-suffix — functioneel identiek, alleen de schrijfwijze wijkt af.
function isForbiddenIpv6(ip: string): boolean {
  const groepen = ipv6ToGroups(ip)
  if (!groepen) return true // onherkenbaar: liever weigeren
  const nul = BigInt(0)

  // ::ffff:a.b.c.d (IPv4-mapped) — beoordeel het ingebedde IPv4-adres.
  if (
    groepen[0] === nul &&
    groepen[1] === nul &&
    groepen[2] === nul &&
    groepen[3] === nul &&
    groepen[4] === nul &&
    groepen[5] === BigInt(0xffff)
  ) {
    const a = Number(groepen[6] >> BigInt(8))
    const b = Number(groepen[6] & BigInt(0xff))
    const c = Number(groepen[7] >> BigInt(8))
    const d = Number(groepen[7] & BigInt(0xff))
    return isForbiddenIpv4(`${a}.${b}.${c}.${d}`)
  }

  const eersteGroep = groepen[0]
  if (eersteGroep === nul) {
    // :: (unspecified) en ::1 (loopback) — alle overige groepen 0 op één na.
    return true
  }
  // fe80::/10 (link-local)
  if ((eersteGroep & BigInt(0xffc0)) === BigInt(0xfe80)) return true
  // fc00::/7 (unique local / ULA)
  if ((eersteGroep & BigInt(0xfe00)) === BigInt(0xfc00)) return true
  // ff00::/8 (multicast)
  if ((eersteGroep & BigInt(0xff00)) === BigInt(0xff00)) return true
  // 2001:db8::/32 (documentatie)
  if (eersteGroep === BigInt(0x2001) && groepen[1] === BigInt(0xdb8)) return true

  return false
}

// Alle door DNS teruggegeven adressen moeten publiek zijn — bij meerdere
// A/AAAA-records (round robin) mag geen enkele naar binnen wijzen.
export async function assertPublicHostname(hostname: string): Promise<void> {
  let adressen: { address: string; family: number }[]
  try {
    adressen = await dnsLookup(hostname, { all: true, verbatim: true })
  } catch {
    throw new SsrfBlockedError('Host kan niet worden opgelost')
  }
  if (adressen.length === 0) {
    throw new SsrfBlockedError('Host kan niet worden opgelost')
  }
  for (const { address, family } of adressen) {
    const geblokkeerd = family === 6 ? isForbiddenIpv6(address) : isForbiddenIpv4(address)
    if (geblokkeerd) {
      throw new SsrfBlockedError('Dit adres wijst naar een niet-toegestaan netwerk')
    }
  }
}

export function assertPublicUrl(url: URL): void | Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SsrfBlockedError('Alleen http(s)-links zijn toegestaan')
  }
  if (url.username || url.password) {
    throw new SsrfBlockedError('Links met inloggegevens zijn niet toegestaan')
  }
  return assertPublicHostname(url.hostname)
}
