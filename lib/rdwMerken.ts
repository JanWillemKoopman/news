// Fuzzy matching tegen de lijst van bekende merken in de RDW open-data set.
// Eenmaal per cold start (TTL 24u) wordt de distinct-merklijst gecached.

import { executeRdwQuery } from './rdw'

type MerkRecord = { merk: string; aantal: number }

let cache: { records: MerkRecord[]; loadedAt: number } | null = null
let inflight: Promise<MerkRecord[]> | null = null
const TTL_MS = 24 * 60 * 60 * 1000

async function loadMerken(): Promise<MerkRecord[]> {
  if (cache && Date.now() - cache.loadedAt < TTL_MS) return cache.records
  if (inflight) return inflight
  inflight = (async () => {
    const result = await executeRdwQuery({
      group_by: ['merk'],
      aggregate: { fn: 'count', alias: 'aantal' },
      order_by: [{ field: 'aantal', dir: 'desc' }],
      limit: 1000,
    })
    const records: MerkRecord[] = []
    for (const row of result.rows) {
      const merk = typeof row.merk === 'string' ? row.merk : null
      const aantal = typeof row.aantal === 'number' ? row.aantal : Number(row.aantal)
      if (merk && Number.isFinite(aantal)) records.push({ merk, aantal })
    }
    cache = { records, loadedAt: Date.now() }
    return records
  })()
  try {
    return await inflight
  } finally {
    inflight = null
  }
}

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const prev = new Array(b.length + 1)
  const curr = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]
  }
  return prev[b.length]
}

export type MerkKandidaat = { merk: string; aantal: number; score: number }

function scoreMatch(queryNorm: string, candidateNorm: string): number {
  if (!queryNorm || !candidateNorm) return 0
  if (queryNorm === candidateNorm) return 100
  if (candidateNorm.startsWith(queryNorm) || queryNorm.startsWith(candidateNorm)) return 90
  if (candidateNorm.includes(queryNorm) || queryNorm.includes(candidateNorm)) return 80
  const dist = levenshtein(queryNorm, candidateNorm)
  const maxLen = Math.max(queryNorm.length, candidateNorm.length)
  if (dist === 1 && maxLen >= 4) return 79
  if (dist === 2 && maxLen >= 6) return 65
  if (dist <= Math.floor(maxLen / 4) && maxLen >= 8) return 55
  return 0
}

export async function findMerkKandidaten(
  zoekterm: string,
  limit = 5,
): Promise<{ kandidaten: MerkKandidaat[]; totaal_bekend: number; error?: string }> {
  const records = await loadMerken().catch((err) => {
    return { __error: err instanceof Error ? err.message : String(err) }
  })
  if (!Array.isArray(records)) {
    return { kandidaten: [], totaal_bekend: 0, error: records.__error }
  }
  const qNorm = normalize(zoekterm)
  if (!qNorm) return { kandidaten: [], totaal_bekend: records.length }
  const scored: MerkKandidaat[] = []
  for (const rec of records) {
    const score = scoreMatch(qNorm, normalize(rec.merk))
    if (score > 0) scored.push({ merk: rec.merk, aantal: rec.aantal, score })
  }
  scored.sort((a, b) => (b.score - a.score) || (b.aantal - a.aantal))
  return {
    kandidaten: scored.slice(0, Math.max(1, Math.min(20, limit))),
    totaal_bekend: records.length,
  }
}
