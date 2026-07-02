#!/usr/bin/env node
// =====================================================================
// Synchroniseert de schone directory (tabel businesses) vanuit de interne
// brontabel. De volledige logica leeft in de database-functie
// sync_businesses_from_source() (migratie 0047): idempotent, transactioneel,
// kopieert uitsluitend naam/categorie/adres/contact/geo en raakt
// businesses.omschrijving (eigen AI-tekst) nooit aan.
//
// Gebruik:
//   node scripts/sync-businesses.mjs
//
// Vereist (uit omgeving of .env.local):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// =====================================================================

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

// --- .env.local laden (kale node laadt Next-env niet automatisch) ----------
function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    const key = m[1]
    const val = m[2].trim().replace(/^["']|["']$/g, '')
    if (!(key in process.env)) process.env[key] = val
  }
}

async function main() {
  loadEnvLocal()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY zijn vereist.')
    process.exit(1)
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { error } = await admin.rpc('sync_businesses_from_source')
  if (error) {
    console.error('Sync mislukt:', error.message)
    process.exit(1)
  }

  const { count, error: countError } = await admin
    .from('businesses')
    .select('*', { count: 'exact', head: true })
  if (countError) {
    console.error('Sync gelukt, maar tellen mislukt:', countError.message)
    return
  }
  console.log(`Sync gelukt — businesses bevat nu ${count} rijen.`)
}

main()
