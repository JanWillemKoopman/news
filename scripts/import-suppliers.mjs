#!/usr/bin/env node
// =====================================================================
// Import-script voor de globale leveranciersdirectory (tabel suppliers).
//
// Leest een puntkomma-gescheiden CSV (zie scripts/sample-suppliers.csv),
// normaliseert de rijen en UPSERT ze op (bron, external_id) zodat een
// her-import idempotent is — geen dubbele rijen.
//
// Bewust kale Node + @supabase/supabase-js (al een dependency), zodat er
// geen extra TS-tooling nodig is.
//
// Gebruik:
//   node scripts/import-suppliers.mjs --file ./scripts/sample-suppliers.csv \
//        --bron trouwlocaties --categorie locatie
//
// Vereist (uit omgeving of .env.local):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// =====================================================================

import { readFileSync, existsSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const GELDIGE_CATEGORIEEN = [
  'locatie', 'catering', 'fotograaf', 'videograaf', 'dj of band',
  'bloemist', 'kleding', 'vervoer', 'taart', 'overig',
]

// --- Argumenten ------------------------------------------------------------
function parseArgs(argv) {
  const out = {}
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) out[a.slice(2)] = argv[++i]
  }
  return out
}

// --- .env.local laden (kale node laadt Next-env niet automatisch) ----------
function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    const key = m[1]
    let val = m[2].trim().replace(/^["']|["']$/g, '')
    if (!(key in process.env)) process.env[key] = val
  }
}

// --- Minimale CSV-parser (quotes + embedded delimiters/newlines) -----------
function parseCsv(text, delim = ';') {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  // Strip UTF-8 BOM.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') {
      inQuotes = true
    } else if (c === delim) {
      row.push(field); field = ''
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = ''
    } else if (c === '\r') {
      // negeer; \n handelt de regel af
    } else field += c
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

// --- Veld-normalisatie -----------------------------------------------------
const txt = (v) => (v ?? '').trim()

function toNumOrNull(v) {
  const s = txt(v).replace(/[€\s.]/g, '').replace(',', '.')
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function toLatLng(v) {
  const s = txt(v).replace(',', '.')
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function toInt(v) {
  const n = parseInt(txt(v), 10)
  return Number.isFinite(n) ? n : 0
}

function toBool(v) {
  return ['true', 'ja', 'j', '1', 'y', 'yes'].includes(txt(v).toLowerCase())
}

function toTags(v) {
  return txt(v)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

function normaliseerRow(obj, bron, categorie) {
  return {
    external_id: txt(obj.external_id),
    bron,
    categorie,
    naam: txt(obj.naam),
    type: txt(obj.type),
    omschrijving_kort: txt(obj.omschrijving_kort),
    straat: txt(obj.straat),
    huisnummer: txt(obj.huisnummer),
    postcode: txt(obj.postcode).replace(/\s+/g, '').toUpperCase(),
    plaats: txt(obj.plaats),
    provincie: txt(obj.provincie),
    latitude: toLatLng(obj.latitude),
    longitude: toLatLng(obj.longitude),
    capaciteit_min: toInt(obj.capaciteit_min),
    capaciteit_max: toInt(obj.capaciteit_max),
    buiten_trouwen: toBool(obj.buiten_trouwen),
    overnachting_mogelijk: toBool(obj.overnachting_mogelijk),
    prijs_vanaf: toNumOrNull(obj.prijs_vanaf),
    prijs_tot: toNumOrNull(obj.prijs_tot),
    prijs_indicatie_tekst: txt(obj.prijs_indicatie_tekst),
    is_prijs_op_aanvraag: toBool(obj.is_prijs_op_aanvraag),
    website: txt(obj.website),
    email: txt(obj.email),
    telefoon: txt(obj.telefoon),
    afbeelding_url: txt(obj.afbeelding_url),
    tags: toTags(obj.tags),
    ai_context_tekst: txt(obj.ai_context_tekst),
  }
}

// --- Main ------------------------------------------------------------------
async function main() {
  loadEnvLocal()
  const args = parseArgs(process.argv)

  const filePath = args.file
  if (!filePath) {
    console.error('Gebruik: node scripts/import-suppliers.mjs --file <pad.csv> [--bron <naam>] [--categorie <categorie>]')
    process.exit(1)
  }
  const bron = args.bron || basename(filePath).replace(/\.csv$/i, '')
  const categorie = args.categorie || 'locatie'
  if (!GELDIGE_CATEGORIEEN.includes(categorie)) {
    console.error(`Ongeldige categorie "${categorie}". Kies uit: ${GELDIGE_CATEGORIEEN.join(', ')}`)
    process.exit(1)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Ontbrekend: NEXT_PUBLIC_SUPABASE_URL en/of SUPABASE_SERVICE_ROLE_KEY (zet in .env.local of de omgeving).')
    process.exit(1)
  }

  const raw = readFileSync(resolve(filePath), 'utf8')
  const rows = parseCsv(raw, ';')
  if (rows.length < 2) {
    console.error('CSV bevat geen datarijen.')
    process.exit(1)
  }

  const header = rows[0].map((h) => h.trim())
  const records = rows.slice(1).map((cols) => {
    const obj = {}
    header.forEach((h, idx) => { obj[h] = cols[idx] ?? '' })
    return normaliseerRow(obj, bron, categorie)
  })

  // Sla rijen zonder external_id over (kunnen niet idempotent ge-upsert worden).
  const geldig = records.filter((r) => r.external_id)
  const overgeslagen = records.length - geldig.length

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  let ingeladen = 0
  const BATCH = 500
  for (let i = 0; i < geldig.length; i += BATCH) {
    const batch = geldig.slice(i, i + BATCH)
    const { error } = await supabase
      .from('suppliers')
      .upsert(batch, { onConflict: 'bron,external_id' })
    if (error) {
      console.error(`Upsert mislukt bij batch ${i / BATCH + 1}:`, error.message)
      process.exit(1)
    }
    ingeladen += batch.length
    console.log(`  ✓ ${ingeladen}/${geldig.length} rijen ge-upsert...`)
  }

  console.log(`\nKlaar. bron="${bron}", categorie="${categorie}".`)
  console.log(`Ingeladen/bijgewerkt: ${ingeladen}` + (overgeslagen ? `, overgeslagen (geen external_id): ${overgeslagen}` : ''))
}

main().catch((err) => {
  console.error('Onverwachte fout:', err)
  process.exit(1)
})
