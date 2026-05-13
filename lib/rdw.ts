// RDW Open Data — query-laag voor de Nederlandse RDW open data API.
// Resource: Gekentekende voertuigen (m9d7-ebf2) — https://opendata.rdw.nl
//
// Eén exporteerde functie: executeRdwQuery. Gebruikt gestructureerde params
// (geen vrije SoQL) zodat veldnamen + operators altijd whitelisted zijn.

const RDW_BASE = 'https://opendata.rdw.nl/resource/m9d7-ebf2.json'
const FETCH_TIMEOUT_MS = 8000
const MAX_LIMIT = 1000
const DEFAULT_LIMIT = 20
const MAX_RETURNED_ROWS = 50

type FieldType = 'text' | 'number' | 'boolean_jn' | 'date'

// Whitelist van velden + hun type. Velden die niet in deze map staan worden
// afgewezen voor select / filter / group_by / order_by.
export const RDW_FIELDS: Record<string, { type: FieldType; label: string }> = {
  kenteken: { type: 'text', label: 'Kenteken' },
  merk: { type: 'text', label: 'Merk' },
  handelsbenaming: { type: 'text', label: 'Model / handelsbenaming' },
  voertuigsoort: { type: 'text', label: 'Voertuigsoort (bv. Personenauto, Bestelauto)' },
  inrichting: { type: 'text', label: 'Inrichting' },
  eerste_kleur: { type: 'text', label: 'Primaire kleur' },
  tweede_kleur: { type: 'text', label: 'Tweede kleur' },
  bouwjaar: { type: 'number', label: 'Bouwjaar' },
  aantal_cilinders: { type: 'number', label: 'Aantal cilinders' },
  cilinderinhoud: { type: 'number', label: 'Cilinderinhoud (cc)' },
  massa_ledig_voertuig: { type: 'number', label: 'Massa leeg voertuig (kg)' },
  massa_rijklaar: { type: 'number', label: 'Massa rijklaar (kg)' },
  toegestane_maximum_massa_voertuig: { type: 'number', label: 'Toegestane max massa (kg)' },
  aantal_zitplaatsen: { type: 'number', label: 'Aantal zitplaatsen' },
  aantal_deuren: { type: 'number', label: 'Aantal deuren' },
  aantal_wielen: { type: 'number', label: 'Aantal wielen' },
  catalogusprijs: { type: 'number', label: 'Catalogusprijs (€)' },
  wam_verzekerd: { type: 'boolean_jn', label: 'WAM-verzekerd (J/N)' },
  vervaldatum_apk_dt: { type: 'date', label: 'APK-vervaldatum' },
  datum_eerste_toelating_dt: { type: 'date', label: 'Eerste toelating (wereldwijd)' },
  datum_eerste_tenaamstelling_in_nederland_dt: {
    type: 'date',
    label: 'Eerste tenaamstelling in Nederland',
  },
}

export type RdwOp =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'starts_with'
  | 'contains'
  | 'between'
  | 'is_null'
  | 'is_not_null'

export type RdwFilter = {
  field: string
  op: RdwOp
  value?: string | number | [string | number, string | number]
}

export type RdwAggregate = {
  fn: 'count' | 'sum' | 'avg' | 'min' | 'max'
  field?: string
  alias?: string
}

export type RdwQueryParams = {
  filters?: RdwFilter[]
  select?: string[]
  group_by?: string[]
  aggregate?: RdwAggregate
  order_by?: Array<{ field: string; dir: 'asc' | 'desc' }>
  limit?: number
}

export type RdwResult = {
  rows: Record<string, unknown>[]
  row_count_returned: number
  truncated: boolean
  query_url: string
  error?: string
}

function escapeSoqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

function isoDate(value: string | number): string {
  const s = String(value).trim()
  // Accepteer YYYY-MM-DD of YYYY-MM-DDTHH:MM:SS(.sss)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `'${s}T00:00:00.000'`
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return `'${s.replace(/Z$/, '')}'`
  throw new Error(`Ongeldig datumformaat (verwacht YYYY-MM-DD): ${s}`)
}

function ensureField(field: string): { type: FieldType; label: string } {
  const def = RDW_FIELDS[field]
  if (!def) {
    throw new Error(
      `Onbekend veld: '${field}'. Toegestane velden: ${Object.keys(RDW_FIELDS).join(', ')}.`,
    )
  }
  return def
}

function formatScalar(field: string, value: string | number): string {
  const { type } = ensureField(field)
  if (type === 'date') return isoDate(value)
  if (type === 'number') {
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n)) throw new Error(`Ongeldige numerieke waarde voor ${field}: ${value}`)
    return String(n)
  }
  if (type === 'boolean_jn') {
    const v = String(value).toUpperCase()
    if (v !== 'J' && v !== 'N')
      throw new Error(`wam_verzekerd verwacht 'J' of 'N', kreeg '${value}'`)
    return escapeSoqlString(v)
  }
  // text
  return escapeSoqlString(String(value))
}

function buildWhereClause(filters: RdwFilter[]): string {
  return filters
    .map((f) => {
      ensureField(f.field)
      switch (f.op) {
        case 'eq':
          return `${f.field} = ${formatScalar(f.field, f.value as string | number)}`
        case 'neq':
          return `${f.field} != ${formatScalar(f.field, f.value as string | number)}`
        case 'gt':
          return `${f.field} > ${formatScalar(f.field, f.value as string | number)}`
        case 'gte':
          return `${f.field} >= ${formatScalar(f.field, f.value as string | number)}`
        case 'lt':
          return `${f.field} < ${formatScalar(f.field, f.value as string | number)}`
        case 'lte':
          return `${f.field} <= ${formatScalar(f.field, f.value as string | number)}`
        case 'starts_with': {
          const def = ensureField(f.field)
          if (def.type !== 'text')
            throw new Error(`starts_with werkt alleen op tekst-velden (${f.field})`)
          return `starts_with(${f.field}, ${escapeSoqlString(String(f.value))})`
        }
        case 'contains': {
          const def = ensureField(f.field)
          if (def.type !== 'text')
            throw new Error(`contains werkt alleen op tekst-velden (${f.field})`)
          return `upper(${f.field}) like upper(${escapeSoqlString('%' + String(f.value) + '%')})`
        }
        case 'between': {
          if (!Array.isArray(f.value) || f.value.length !== 2)
            throw new Error(`between vereist een [from, to] array (${f.field})`)
          const a = formatScalar(f.field, f.value[0])
          const b = formatScalar(f.field, f.value[1])
          return `${f.field} between ${a} and ${b}`
        }
        case 'is_null':
          return `${f.field} is null`
        case 'is_not_null':
          return `${f.field} is not null`
        default:
          throw new Error(`Onbekende operator: ${(f as { op: string }).op}`)
      }
    })
    .join(' AND ')
}

function buildSelectClause(params: RdwQueryParams): string | null {
  const parts: string[] = []
  if (params.select && params.select.length) {
    for (const f of params.select) ensureField(f)
    parts.push(...params.select)
  }
  if (params.aggregate) {
    const { fn, field, alias } = params.aggregate
    const aliasOut = alias || (field ? `${fn}_${field}` : fn)
    if (fn === 'count') {
      parts.push(`count(*) as ${aliasOut}`)
    } else {
      if (!field) throw new Error(`Aggregatie ${fn} vereist een field`)
      ensureField(field)
      parts.push(`${fn}(${field}) as ${aliasOut}`)
    }
  }
  return parts.length ? parts.join(', ') : null
}

export function buildSoqlParams(params: RdwQueryParams): URLSearchParams {
  const qs = new URLSearchParams()

  const select = buildSelectClause(params)
  if (select) qs.set('$select', select)

  if (params.filters && params.filters.length) {
    qs.set('$where', buildWhereClause(params.filters))
  }

  if (params.group_by && params.group_by.length) {
    for (const f of params.group_by) ensureField(f)
    qs.set('$group', params.group_by.join(', '))
  }

  if (params.order_by && params.order_by.length) {
    for (const o of params.order_by) {
      // Sta ook aliassen toe via group_by/aggregate (e.g. 'aantal'); skip ensureField.
      if (!/^[a-z_][a-z0-9_]*$/i.test(o.field))
        throw new Error(`Ongeldige sortering: ${o.field}`)
    }
    qs.set(
      '$order',
      params.order_by.map((o) => `${o.field} ${o.dir === 'desc' ? 'desc' : 'asc'}`).join(', '),
    )
  }

  const limit = Math.max(1, Math.min(MAX_LIMIT, params.limit ?? DEFAULT_LIMIT))
  qs.set('$limit', String(limit))

  return qs
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(row)) {
    if (raw == null) {
      out[key] = null
      continue
    }
    const def = RDW_FIELDS[key]
    if (!def) {
      // onbekend veld (alias zoals 'aantal'): probeer numeriek anders string
      const asNum = Number(raw)
      out[key] = Number.isFinite(asNum) && String(asNum) === String(raw).trim() ? asNum : raw
      continue
    }
    if (def.type === 'number') {
      const n = Number(raw)
      out[key] = Number.isFinite(n) ? n : raw
    } else if (def.type === 'boolean_jn') {
      const v = String(raw).toUpperCase()
      out[key] = v === 'J' ? true : v === 'N' ? false : raw
    } else if (def.type === 'date') {
      // floating_timestamp → YYYY-MM-DD
      const s = String(raw)
      out[key] = s.length >= 10 ? s.slice(0, 10) : s
    } else {
      out[key] = raw
    }
  }
  return out
}

export async function executeRdwQuery(params: RdwQueryParams): Promise<RdwResult> {
  let qs: URLSearchParams
  try {
    qs = buildSoqlParams(params)
  } catch (err) {
    return {
      rows: [],
      row_count_returned: 0,
      truncated: false,
      query_url: RDW_BASE,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  const url = `${RDW_BASE}?${qs.toString()}`

  try {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (process.env.RDW_APP_TOKEN) headers['X-App-Token'] = process.env.RDW_APP_TOKEN

    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return {
        rows: [],
        row_count_returned: 0,
        truncated: false,
        query_url: url,
        error: `RDW API gaf status ${res.status}: ${text.slice(0, 200)}`,
      }
    }
    const raw = (await res.json()) as Array<Record<string, unknown>>
    const normalised = raw.map(normalizeRow)
    const truncated = normalised.length > MAX_RETURNED_ROWS
    return {
      rows: truncated ? normalised.slice(0, MAX_RETURNED_ROWS) : normalised,
      row_count_returned: Math.min(normalised.length, MAX_RETURNED_ROWS),
      truncated,
      query_url: url,
    }
  } catch (err) {
    return {
      rows: [],
      row_count_returned: 0,
      truncated: false,
      query_url: url,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
