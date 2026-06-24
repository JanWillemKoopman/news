#!/usr/bin/env node
// =====================================================================
// Seed-script voor het demo-account "Thomas & Laura".
//
// Bouwt één volledig, mooi gevuld bruiloft-account dat als showcase aan
// potentiële klanten getoond kan worden. Alles valt onder het account van
// de app-beheerder (koopman.janwillem@gmail.com) als 'owner'.
//
// Idempotent: een eerdere demo-bruiloft (zelfde slug / partners+datum) wordt
// eerst verwijderd (ON DELETE CASCADE ruimt alle kindrijen op) inclusief de
// bijbehorende storage-mappen, daarna wordt alles opnieuw opgebouwd. Zo levert
// herhaald draaien exact hetzelfde resultaat zonder duplicaten.
//
// Bewust kale Node + @supabase/supabase-js (al een dependency), net als
// scripts/import-suppliers.mjs — geen extra TS-tooling nodig.
//
// Gebruik:
//   node scripts/seed-demo-account.mjs
//
// Vereist (uit omgeving of .env.local):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// =====================================================================

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

// --- .env.local laden (kale node laadt Next-env niet automatisch) ----------
function loadEnvLocal() {
  for (const file of ['.env.local', '.env']) {
    const path = resolve(process.cwd(), file)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      const key = m[1]
      const val = m[2].trim().replace(/^["']|["']$/g, '')
      if (!(key in process.env)) process.env[key] = val
    }
  }
}
loadEnvLocal()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('✖ Ontbrekende env: NEXT_PUBLIC_SUPABASE_URL en/of SUPABASE_SERVICE_ROLE_KEY')
  console.error('  Zet ze in .env.local (zie .env.example) en draai opnieuw.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// =====================================================================
// Configuratie van de demo
// =====================================================================
const OWNER_EMAIL = 'koopman.janwillem@gmail.com'
const SLUG = 'thomas-en-laura'
const PARTNER1 = 'Thomas'
const PARTNER2 = 'Laura'
const TROUWDATUM = '2027-06-12' // zaterdag
const CREATED_AT = '2025-12-20T10:00:00Z' // ~6 maanden geleden gestart
const LOCATIE = 'Landgoed De Reehorst, Driebergen'
const WOONPLAATS = 'Utrecht'
const PROVINCIE = 'Utrecht'
const TOTAAL_BUDGET = 27500
const DAGGASTEN = 70
const AVONDGASTEN = 130
const ACCENT = '#c2829a'
const THEMA = 'romantisch'
const FONT = 'dancing-script'

// helper: dagen vóór de trouwdatum → ISO datum
const TROUW_MS = new Date(TROUWDATUM + 'T12:00:00Z').getTime()
const DAG = 24 * 60 * 60 * 1000
function dagenVoor(n) {
  return new Date(TROUW_MS - n * DAG).toISOString().slice(0, 10)
}
function tsVoor(n) {
  return new Date(TROUW_MS - n * DAG).toISOString()
}
const pick = (arr, i) => arr[i % arr.length]

// =====================================================================
// Foto's: curated Unsplash-URLs. We downloaden en uploaden naar de eigen
// storage-buckets. Lukt downloaden niet, dan vallen we terug op de externe
// URL zodat de afbeelding hoe dan ook zichtbaar blijft.
// =====================================================================
const U = (id, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`

const HERO_FOTO = U('1519741497674-611481863552', 2400)

const GALLERIJ_FOTOS = [
  { id: '1606216794074-735e91aa2c92', bijschrift: 'Onze verloving' },
  { id: '1511285560929-80b456fea0bc', bijschrift: 'Een wandeling samen' },
  { id: '1465495976277-4387d4b0b4c6', bijschrift: 'De ringen' },
  { id: '1519225421980-715cb0215aed', bijschrift: 'Zomeravond' },
  { id: '1522673607200-164d1b6ce486', bijschrift: 'Lachen tot het zeer doet' },
  { id: '1532712938310-34cb3982ef74', bijschrift: 'Bloemen voor Laura' },
  { id: '1469371670807-013ccf25f16a', bijschrift: 'Op reis' },
  { id: '1525258946800-98cfd641d0de', bijschrift: 'Thuis' },
]

const PHOTO_WALL_FOTOS = [
  { id: '1511795409834-ef04bbd61622', naam: 'Sanne', bericht: 'Wat een prachtige dag! ❤️', featured: true },
  { id: '1460978812857-470ed1c77af0', naam: 'Oom Kees', bericht: 'Proost op het bruidspaar!' },
  { id: '1464366400600-7168b8af9bc3', naam: 'Marit', bericht: 'Zo mooi 😍' },
  { id: '1470816692649-6b7f86c4b1f8', naam: 'Bas', bericht: 'Top feest!' },
  { id: '1519671482749-fd09be7ccebf', naam: 'Familie de Vries', bericht: 'Gefeliciteerd!', featured: true },
  { id: '1530103862676-de8c9debad1d', naam: 'Lotte', bericht: 'Dansen!' },
  { id: '1525328437458-0c4d4db7cab4', naam: 'Pieter', bericht: '' },
  { id: '1492684223066-81342ee5ff30', naam: 'Anouk', bericht: 'Onvergetelijk' },
  { id: '1543269865-cbf427effbad', naam: 'Tom', bericht: 'Wat een sfeer' },
  { id: '1464047736614-af63643285bf', naam: 'Eva', bericht: 'De taart!! 🎂' },
  { id: '1511578314322-379afb476865', naam: 'Daan', bericht: '' },
  { id: '1467810563316-b5476525c0f9', naam: 'Sophie', bericht: 'Mooiste stel ❤️' },
  { id: '1508700929628-666bc8bd84ea', naam: 'Opa Henk', bericht: 'Trots!' },
  { id: '1471967183320-ee018f6e114a', naam: 'Noor', bericht: '' },
  { id: '1513279922550-250c2129b13a', naam: 'Ruben', bericht: 'Legendarisch' },
  { id: '1515934751635-2f6d27dca80c', naam: 'Fleur', bericht: 'Tranen van geluk' },
  { id: '1527529482837-4698179dc6ce', naam: 'Jeroen', bericht: '' },
  { id: '1496843916299-590492c751f4', naam: 'Iris', bericht: 'Wat een avond!' },
]

const REGISTRY_FOTOS = {
  keukenmachine: '1556910103-1c02745aae4d',
  servies: '1578749556568-bc2c40e68b61',
  dekens: '1522771739844-6a9f6d5f14af',
  wijn: '1510812431401-41d2bd2722f3',
  bbq: '1529193591184-b1d58069ecc0',
  koffie: '1495474472287-4d71bcdd2085',
  tuinstoel: '1533090481720-856c6e3c1fdc',
  fotolijst: '1513519245088-0e12902e35ca',
  honeymoon: '1502602898657-3e91760cbb34',
  huis: '1568605114967-8130f3a36994',
  tuin: '1416879595882-3373a0480b5b',
}

// downloaden + uploaden; geeft de definitieve publieke URL terug
async function uploadFoto(bucket, path, sourceUrl) {
  try {
    const res = await fetch(sourceUrl)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, buf, { contentType: 'image/jpeg', upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  } catch (e) {
    console.warn(`  ⚠ upload mislukt (${bucket}/${path}): ${e.message} — val terug op externe URL`)
    return sourceUrl
  }
}

// =====================================================================
// Stap 0: owner opzoeken (of aanmaken)
// =====================================================================
async function vindOwnerId() {
  // doorloop de gebruikerslijst (gepagineerd) tot we het e-mailadres vinden
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const found = data.users.find(
      (u) => (u.email || '').toLowerCase() === OWNER_EMAIL.toLowerCase()
    )
    if (found) return found.id
    if (data.users.length < 200) break
  }
  // niet gevonden → aanmaken (bevestigd, zodat hij meteen kan inloggen)
  console.log(`  • ${OWNER_EMAIL} bestaat nog niet — aanmaken`)
  const { data, error } = await supabase.auth.admin.createUser({
    email: OWNER_EMAIL,
    email_confirm: true,
    user_metadata: { display_name: 'Jan Willem' },
  })
  if (error) throw error
  return data.user.id
}

// =====================================================================
// Stap 1: bestaande demo-bruiloft verwijderen (idempotent)
// =====================================================================
async function verwijderBestaandeDemo() {
  const ids = new Set()

  const { data: bySlug } = await supabase
    .from('website_content')
    .select('wedding_id')
    .eq('slug', SLUG)
  for (const r of bySlug || []) ids.add(r.wedding_id)

  const { data: byNaam } = await supabase
    .from('weddings')
    .select('id')
    .eq('partner1_naam', PARTNER1)
    .eq('partner2_naam', PARTNER2)
    .eq('trouwdatum', TROUWDATUM)
  for (const r of byNaam || []) ids.add(r.id)

  for (const id of ids) {
    console.log(`  • bestaande demo-bruiloft verwijderen: ${id}`)
    // storage-mappen opruimen
    for (const bucket of ['wedding-media', 'photo-wall', 'registry-images']) {
      await leegStorageMap(bucket, id)
    }
    const { error } = await supabase.from('weddings').delete().eq('id', id)
    if (error) throw error
  }
}

async function leegStorageMap(bucket, weddingId) {
  // verzamel alle bestandspaden onder {weddingId}/... en verwijder ze
  const teVerwijderen = []
  async function loop(prefix) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 })
    if (error || !data) return
    for (const entry of data) {
      const full = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.id === null || entry.metadata === null) {
        await loop(full) // submap
      } else {
        teVerwijderen.push(full)
      }
    }
  }
  await loop(weddingId)
  if (teVerwijderen.length) {
    await supabase.storage.from(bucket).remove(teVerwijderen)
  }
}

// =====================================================================
// Stap 2: kern-bruiloft
// =====================================================================
async function maakWedding(ownerId) {
  const { data, error } = await supabase
    .from('weddings')
    .insert({
      partner1_naam: PARTNER1,
      partner2_naam: PARTNER2,
      trouwdatum: TROUWDATUM,
      locatie: LOCATIE,
      woonplaats: WOONPLAATS,
      provincie: PROVINCIE,
      totaal_budget: TOTAAL_BUDGET,
      aantal_daggasten: DAGGASTEN,
      aantal_avondgasten: AVONDGASTEN,
      created_by: ownerId,
      created_at: CREATED_AT,
    })
    .select('id')
    .single()
  if (error) throw error
  const wid = data.id
  // de AFTER-trigger heeft de owner + rechten-matrix al geseed; borgen:
  await supabase
    .from('wedding_members')
    .upsert({ wedding_id: wid, user_id: ownerId, role: 'owner' }, { onConflict: 'wedding_id,user_id' })
  return wid
}

// =====================================================================
// Stap 3: tafels (plattegrond)
// =====================================================================
async function maakTafels(wid) {
  const rijen = []
  // 1 hoofdtafel (langwerpig) + 11 ronde tafels in een nette grid
  rijen.push({ wedding_id: wid, naam: 'Hoofdtafel', vorm: 'langwerpig', capaciteit: 10, pos_x: 500, pos_y: 120, rotatie: 0 })
  const kolommen = 4
  for (let i = 0; i < 11; i++) {
    const col = i % kolommen
    const row = Math.floor(i / kolommen)
    rijen.push({
      wedding_id: wid,
      naam: `Tafel ${i + 1}`,
      vorm: 'rond',
      capaciteit: 8,
      pos_x: 200 + col * 220,
      pos_y: 320 + row * 220,
      rotatie: 0,
    })
  }
  const { data, error } = await supabase.from('tables').insert(rijen).select('id, naam')
  if (error) throw error
  return data // [{id, naam}]
}

// =====================================================================
// Stap 4: leveranciers + budget (met onderlinge koppeling)
// =====================================================================
async function maakLeveranciersEnBudget(wid) {
  // vendors eerst (zonder budget_item_id)
  const vendorDefs = [
    { naam: 'Landgoed De Reehorst', type: 'locatie', status: 'geboekt', contactpersoon: 'Mevr. Jansen', telefoon: '0343-512345', email: 'events@dereehorst.nl', website: 'https://dereehorst.nl', geoffreerd_bedrag: 6500, notitie: 'Ceremonie buiten + diner en feest binnen. Aanbetaling voldaan.' },
    { naam: 'Smaakvol Catering', type: 'catering', status: 'geboekt', contactpersoon: 'Rik de Boer', telefoon: '06-21345678', email: 'rik@smaakvol.nl', website: 'https://smaakvol.nl', geoffreerd_bedrag: 8200, notitie: '3-gangen diner + avondhapjes. Menuproeverij gepland.' },
    { naam: 'Studio Lumière', type: 'fotograaf', status: 'geboekt', contactpersoon: 'Eline Vos', telefoon: '06-11223344', email: 'hallo@studiolumiere.nl', website: 'https://studiolumiere.nl', geoffreerd_bedrag: 2450, notitie: 'Hele dag, inclusief loveshoot.' },
    { naam: 'DJ Sound & Vision', type: 'dj of band', status: 'geboekt', contactpersoon: 'Marco', telefoon: '06-99887766', email: 'boekingen@soundvision.nl', website: 'https://soundvision.nl', geoffreerd_bedrag: 1650, notitie: 'Avondfeest tot 01:00, inclusief licht.' },
    { naam: 'Bloemen door Fleur', type: 'bloemist', status: 'geboekt', contactpersoon: 'Fleur Smit', telefoon: '06-44556677', email: 'fleur@bloemendoorfleur.nl', website: 'https://bloemendoorfleur.nl', geoffreerd_bedrag: 1250, notitie: 'Bruidsboeket, corsages en tafelstukken.' },
    { naam: 'Atelier Bruidsmode Amersfoort', type: 'kleding', status: 'bezocht', contactpersoon: '', telefoon: '033-4567890', email: 'info@bruidsmode-amersfoort.nl', website: '', geoffreerd_bedrag: 1800, notitie: 'Jurk Laura gevonden; tweede pasbeurt in maart.' },
    { naam: 'Pure Taarten', type: 'taart', status: 'offerte aangevraagd', contactpersoon: 'Sanne', telefoon: '06-12121212', email: 'sanne@puretaarten.nl', website: 'https://puretaarten.nl', geoffreerd_bedrag: 480, notitie: 'Naked cake met seizoensfruit, proeverij volgt.' },
    { naam: 'Vintage Trouwauto Verhuur', type: 'vervoer', status: 'offerte aangevraagd', contactpersoon: '', telefoon: '', email: 'info@vintagetrouwauto.nl', website: 'https://vintagetrouwauto.nl', geoffreerd_bedrag: 550, notitie: 'Klassieke Citroën DS overwegen.' },
    { naam: 'Film & Frame', type: 'videograaf', status: 'bezocht', contactpersoon: 'Joost', telefoon: '06-31313131', email: 'joost@filmframe.nl', website: '', geoffreerd_bedrag: 1600, notitie: 'Twijfel nog of we een videograaf willen.' },
    { naam: 'Trouwambtenaar Karin Bos', type: 'overig', status: 'geboekt', contactpersoon: 'Karin Bos', telefoon: '06-78787878', email: 'karin@ceremonies.nl', website: '', geoffreerd_bedrag: 650, notitie: 'Kennismakingsgesprek was hartverwarmend.' },
  ]
  const { data: vendors, error: vErr } = await supabase
    .from('vendors')
    .insert(vendorDefs.map((v) => ({ wedding_id: wid, ...v })))
    .select('id, type, naam')
  if (vErr) throw vErr
  const vByNaam = Object.fromEntries(vendors.map((v) => [v.naam, v.id]))

  // budget_items, gekoppeld aan vendors waar logisch
  const t = (n) => dagenVoor(n)
  const budgetDefs = [
    { categorie: 'locatie', omschrijving: 'Landgoed De Reehorst — huur & zaal', geschat_bedrag: 6500, geoffreerd_bedrag: 6500, betaald_bedrag: 3250, vendor: 'Landgoed De Reehorst', termijnen: [ { bedrag: 3250, vervaldatum: t(150), betaald: true }, { bedrag: 3250, vervaldatum: t(14), betaald: false } ] },
    { categorie: 'catering', omschrijving: 'Diner & avondhapjes (Smaakvol)', geschat_bedrag: 8000, geoffreerd_bedrag: 8200, betaald_bedrag: 2000, vendor: 'Smaakvol Catering', termijnen: [ { bedrag: 2000, vervaldatum: t(120), betaald: true }, { bedrag: 6200, vervaldatum: t(21), betaald: false } ] },
    { categorie: 'fotografie en video', omschrijving: 'Fotograaf hele dag (Studio Lumière)', geschat_bedrag: 2500, geoffreerd_bedrag: 2450, betaald_bedrag: 612, vendor: 'Studio Lumière', termijnen: [ { bedrag: 612, vervaldatum: t(160), betaald: true }, { bedrag: 1838, vervaldatum: t(7), betaald: false } ] },
    { categorie: 'muziek', omschrijving: 'DJ avondfeest', geschat_bedrag: 1500, geoffreerd_bedrag: 1650, betaald_bedrag: 0, vendor: 'DJ Sound & Vision', termijnen: [ { bedrag: 1650, vervaldatum: t(14), betaald: false } ] },
    { categorie: 'bloemen en decoratie', omschrijving: 'Bloemwerk & aankleding', geschat_bedrag: 1400, geoffreerd_bedrag: 1250, betaald_bedrag: 0, vendor: 'Bloemen door Fleur', termijnen: [] },
    { categorie: 'kleding', omschrijving: 'Trouwjurk Laura', geschat_bedrag: 1800, geoffreerd_bedrag: 1800, betaald_bedrag: 360, vendor: 'Atelier Bruidsmode Amersfoort', termijnen: [ { bedrag: 360, vervaldatum: t(140), betaald: true } ] },
    { categorie: 'kleding', omschrijving: 'Pak Thomas', geschat_bedrag: 900, geoffreerd_bedrag: 0, betaald_bedrag: 0, vendor: null, termijnen: [] },
    { categorie: 'taart', omschrijving: 'Bruidstaart (naked cake)', geschat_bedrag: 480, geoffreerd_bedrag: 480, betaald_bedrag: 0, vendor: 'Pure Taarten', termijnen: [] },
    { categorie: 'vervoer', omschrijving: 'Klassieke trouwauto', geschat_bedrag: 550, geoffreerd_bedrag: 550, betaald_bedrag: 0, vendor: 'Vintage Trouwauto Verhuur', termijnen: [] },
    { categorie: 'ringen', omschrijving: 'Trouwringen', geschat_bedrag: 1500, geoffreerd_bedrag: 1450, betaald_bedrag: 1450, vendor: null, termijnen: [ { bedrag: 1450, vervaldatum: t(170), betaald: true } ] },
    { categorie: 'uitnodigingen en drukwerk', omschrijving: 'Save-the-dates & uitnodigingen', geschat_bedrag: 600, geoffreerd_bedrag: 540, betaald_bedrag: 540, vendor: null, termijnen: [ { bedrag: 540, vervaldatum: t(160), betaald: true } ] },
    { categorie: 'overig', omschrijving: 'Trouwambtenaar', geschat_bedrag: 650, geoffreerd_bedrag: 650, betaald_bedrag: 325, vendor: 'Trouwambtenaar Karin Bos', termijnen: [ { bedrag: 325, vervaldatum: t(150), betaald: true }, { bedrag: 325, vervaldatum: t(7), betaald: false } ] },
  ]

  const budgetRows = budgetDefs.map((b) => ({
    wedding_id: wid,
    categorie: b.categorie,
    omschrijving: b.omschrijving,
    geschat_bedrag: b.geschat_bedrag,
    geoffreerd_bedrag: b.geoffreerd_bedrag,
    betaald_bedrag: b.betaald_bedrag,
    vendor_id: b.vendor ? vByNaam[b.vendor] : null,
    betaaltermijnen: b.termijnen.map((tm, i) => ({ id: `${i}`, ...tm })),
  }))
  const { data: budget, error: bErr } = await supabase
    .from('budget_items')
    .insert(budgetRows)
    .select('id, omschrijving, vendor_id')
  if (bErr) throw bErr

  // vendors terugkoppelen aan hun budgetregel (vendors.budget_item_id)
  for (const bi of budget) {
    if (bi.vendor_id) {
      await supabase.from('vendors').update({ budget_item_id: bi.id }).eq('id', bi.vendor_id)
    }
  }
  return { vendors: vByNaam, budget }
}

// =====================================================================
// Stap 5: gasten + tafelschikking
// =====================================================================
const VOORNAMEN = ['Sanne', 'Bas', 'Lotte', 'Daan', 'Eva', 'Tom', 'Anouk', 'Ruben', 'Fleur', 'Jeroen', 'Iris', 'Pieter', 'Noor', 'Sven', 'Maud', 'Tim', 'Sophie', 'Wouter', 'Emma', 'Lars', 'Britt', 'Niels', 'Lieke', 'Joost', 'Marit', 'Stijn', 'Roos', 'Bram', 'Tessa', 'Koen', 'Femke', 'Gijs', 'Sara', 'Thijs', 'Hanne', 'Jasper', 'Nina', 'Mark', 'Esmée', 'Rick']
const ACHTERNAMEN = ['de Vries', 'Jansen', 'Bakker', 'Visser', 'Smit', 'Meijer', 'Mulder', 'de Boer', 'Bos', 'Vos', 'Peters', 'Hendriks', 'van Dijk', 'van den Berg', 'Dekker', 'Brouwer', 'de Groot', 'Scholten', 'Willems', 'van Leeuwen']
const DIEET = ['', '', '', '', 'vegetarisch', 'veganistisch', 'glutenvrij', 'lactose-intolerant', 'notenallergie', 'geen schaaldieren']

async function maakGasten(wid, tafels) {
  const rijen = []
  const categorieen = ['familie partner 1', 'familie partner 2', 'vrienden', "collega's", 'overig']
  const totaal = DAGGASTEN + AVONDGASTEN // 200 — incl. partners zou hoger zijn; we maken ~130 records
  const aantalRecords = 130
  for (let i = 0; i < aantalRecords; i++) {
    const isDag = i < 64 // ~de helft als individueel record is daggast
    const cat =
      i < 26 ? 'familie partner 1' :
      i < 50 ? 'familie partner 2' :
      i < 95 ? 'vrienden' :
      i < 118 ? "collega's" : 'overig'
    // RSVP-verdeling: ~70% bevestigd, ~10% afgemeld, rest open
    const r = i % 10
    const rsvp = r < 7 ? 'bevestigd' : r < 8 ? 'afgemeld' : r < 9 ? 'geen reactie' : 'uitgenodigd'
    const heeftPartner = i % 3 === 0
    const kinderen = i % 11 === 0 ? (1 + (i % 3)) : 0
    rijen.push({
      wedding_id: wid,
      voornaam: pick(VOORNAMEN, i),
      achternaam: pick(ACHTERNAMEN, Math.floor(i / 2) + i),
      categorie: cat,
      gasttype: isDag ? 'daggast' : 'avondgast',
      rsvp_status: rsvp,
      dieetwensen: rsvp === 'bevestigd' ? pick(DIEET, i * 3) : '',
      heeft_partner: heeftPartner,
      partner_naam: heeftPartner ? `${pick(VOORNAMEN, i + 5)} ${pick(ACHTERNAMEN, i)}` : '',
      aantal_kinderen: kinderen,
      adres: `${pick(['Dorpsstraat', 'Kerkweg', 'Molenlaan', 'Beukenhof', 'Parklaan'], i)} ${1 + (i % 60)}, Utrecht`,
      notitie: '',
      rsvp_status_submitted: rsvp === 'bevestigd' || rsvp === 'afgemeld',
      __rsvpDone: rsvp === 'bevestigd' || rsvp === 'afgemeld',
      __isDag: isDag,
    })
  }

  // invoegen zonder tafel; daarna daggasten verdelen over tafels
  const insertRows = rijen.map((g) => ({
    wedding_id: g.wedding_id,
    voornaam: g.voornaam,
    achternaam: g.achternaam,
    categorie: g.categorie,
    gasttype: g.gasttype,
    rsvp_status: g.rsvp_status,
    dieetwensen: g.dieetwensen,
    heeft_partner: g.heeft_partner,
    partner_naam: g.partner_naam,
    aantal_kinderen: g.aantal_kinderen,
    adres: g.adres,
    rsvp_submitted_at: g.__rsvpDone ? tsVoor(40 + (Math.floor(Math.random() * 60))) : null,
  }))
  const { data: guests, error } = await supabase.from('guests').insert(insertRows).select('id, gasttype, rsvp_status')
  if (error) throw error

  // tafelschikking: bevestigde daggasten over de tafels verdelen
  const dagGuests = guests.filter((g) => g.gasttype === 'daggast' && g.rsvp_status === 'bevestigd')
  let seat = 0
  let tafelIdx = 0
  const updates = []
  for (const g of dagGuests) {
    const tafel = tafels[tafelIdx % tafels.length]
    const cap = tafelIdx === 0 ? 10 : 8
    updates.push({ id: g.id, tafel_id: tafel.id, stoel_index: seat })
    seat++
    if (seat >= cap) { seat = 0; tafelIdx++ }
  }
  for (const u of updates) {
    await supabase.from('guests').update({ tafel_id: u.tafel_id, stoel_index: u.stoel_index }).eq('id', u.id)
  }
  return guests.length
}

// =====================================================================
// Stap 6: taken (over alle fases)
// =====================================================================
async function maakTaken(wid, vendors, budget) {
  const bId = (oms) => (budget.find((b) => b.omschrijving === oms) || {}).id || null
  const K = 'klaar', B = 'bezig', O = 'open'
  const H = 'hoog', M = 'midden', L = 'laag'
  const SAMEN = 'samen', P1 = 'partner 1', P2 = 'partner 2'
  // [titel, omschrijving, tijdsblok, status, prioriteit, toegewezen, dagenVoorDeadline, subtaken?]
  const defs = [
    ['Trouwdatum prikken', 'Samen de knoop doorhakken: 12 juni 2027!', '12 maanden voor', K, H, SAMEN, 360],
    ['Budget bepalen', 'Totaalbudget en verdeling over de grote posten.', '12 maanden voor', K, H, SAMEN, 350],
    ['Trouwlocatie zoeken', 'Shortlist maken en bezichtigingen plannen.', '12 maanden voor', K, H, SAMEN, 340, ['Wensenlijst opstellen', 'Top 5 selecteren', 'Bezichtigingen plannen']],
    ['Trouwlocatie boeken', 'Landgoed De Reehorst vastleggen.', '12 maanden voor', K, H, SAMEN, 320],
    ['Gastenlijst (eerste opzet)', 'Globale aantallen dag en avond.', '12 maanden voor', K, M, SAMEN, 300],
    ['Ceremoniemeester vragen', 'Vraag aan onze beste vrienden.', '9 maanden voor', K, M, SAMEN, 270],
    ['Trouwambtenaar kiezen', 'Kennismakingsgesprek inplannen.', '9 maanden voor', K, M, P2, 260],
    ['Save-the-dates versturen', 'Digitaal + per post.', '9 maanden voor', K, M, P1, 250, ['Ontwerp maken', 'Adressen verzamelen', 'Versturen']],
    ['Fotograaf boeken', 'Studio Lumière vastleggen.', '9 maanden voor', K, H, SAMEN, 240],
    ['Catering selecteren', 'Proeverijen vergelijken.', '9 maanden voor', K, H, SAMEN, 230],
    ['Trouwringen uitzoeken', 'Samen naar de juwelier.', '6 maanden voor', K, M, SAMEN, 200],
    ['Trouwjurk zoeken', 'Eerste pasafspraken.', '6 maanden voor', K, H, P2, 190, ['Inspiratie verzamelen', 'Afspraken maken', 'Jurk kiezen']],
    ['DJ / muziek regelen', 'Avondfeest invullen.', '6 maanden voor', K, M, P1, 180],
    ['Bloemist kiezen', 'Bruidsboeket en aankleding.', '6 maanden voor', K, M, P2, 170],
    ['Uitnodigingen ontwerpen', 'Drukwerk laten maken.', '6 maanden voor', K, M, SAMEN, 160, ['Tekst schrijven', 'Ontwerp goedkeuren', 'Bestellen']],
    ['Pak Thomas uitzoeken', 'Op maat laten maken.', '3 maanden voor', B, M, P1, 110],
    ['Uitnodigingen versturen', 'Met RSVP-link.', '3 maanden voor', K, H, SAMEN, 120],
    ['Menu definitief maken', 'Keuzes doorgeven aan catering.', '3 maanden voor', B, H, SAMEN, 90, ['Proeverij', 'Diëten inventariseren', 'Doorgeven']],
    ['Taart bestellen', 'Naked cake met seizoensfruit.', '3 maanden voor', O, M, P2, 95],
    ['Trouwauto regelen', 'Klassieke auto reserveren.', '3 maanden voor', O, L, P1, 100],
    ['Trouwwebsite vullen', 'Programma, route en FAQ.', '3 maanden voor', B, M, SAMEN, 105],
    ['Dagindeling / draaiboek opstellen', 'Tijden afstemmen met leveranciers.', '1 maand voor', B, H, SAMEN, 30],
    ['RSVP\'s verwerken', 'Definitieve aantallen bijhouden.', '1 maand voor', B, H, P2, 25],
    ['Tafelschikking maken', 'Indeling op de plattegrond.', '1 maand voor', B, M, SAMEN, 20],
    ['Speeches afstemmen', 'Volgorde en spreektijd.', '1 maand voor', O, L, P1, 18],
    ['Definitief aantal doorgeven', 'Catering & locatie informeren.', 'laatste week', O, H, SAMEN, 6],
    ['Trouwringen ophalen', 'Bij de juwelier.', 'laatste week', O, H, P1, 5],
    ['Inpakken & klaarleggen', 'Kleding, schoenen, noodpakket.', 'laatste week', O, M, P2, 3],
    ['Generale / oefenen ceremonie', 'Met ceremoniemeester.', 'trouwweek', O, M, SAMEN, 2],
    ['Genieten van de grote dag!', 'Alles uit handen geven 💍', 'trouwweek', O, H, SAMEN, 0],
    ['Bedankkaartjes versturen', 'Na de huwelijksreis.', 'na de bruiloft', O, L, SAMEN, -30],
    ['Foto\'s & video nabestellen', 'Album samenstellen.', 'na de bruiloft', O, L, P2, -45],
  ]

  const rows = defs.map((d, i) => ({
    wedding_id: wid,
    titel: d[0],
    omschrijving: d[1],
    tijdsblok: d[2],
    status: d[3],
    prioriteit: d[4],
    toegewezen_aan: d[5],
    deadline: dagenVoor(d[6]),
    volgorde: i,
    subtaken: (d[7] || []).map((s, j) => ({ id: `${j}`, titel: s, klaar: d[3] === 'klaar' })),
    vendor_id: null,
    budget_item_id: null,
  }))
  // koppel een paar taken aan budgetregels voor realisme
  const koppel = {
    'Trouwlocatie boeken': 'Landgoed De Reehorst — huur & zaal',
    'Fotograaf boeken': 'Fotograaf hele dag (Studio Lumière)',
    'DJ / muziek regelen': 'DJ avondfeest',
    'Taart bestellen': 'Bruidstaart (naked cake)',
  }
  for (const r of rows) {
    if (koppel[r.titel]) r.budget_item_id = bId(koppel[r.titel])
  }
  const { data, error } = await supabase.from('tasks').insert(rows).select('id, titel')
  if (error) throw error
  return data
}

// =====================================================================
// Stap 7: opmerkingen op taken (mooie namen via UPDATE na de insert-trigger)
// =====================================================================
async function maakOpmerkingen(wid, taken) {
  const tId = (titel) => (taken.find((t) => t.titel === titel) || {}).id
  const defs = [
    ['Menu definitief maken', 'Laura', 'De proeverij was heerlijk! Ik stem voor de zalm als hoofdgerecht.', 40],
    ['Menu definitief maken', 'Thomas', 'Eens! En de tomatensoep vooraf voor de vegetariërs.', 39],
    ['Tafelschikking maken', 'Thomas', 'Zullen we oom Kees en oom Henk niet naast elkaar zetten? 😅', 22],
    ['Tafelschikking maken', 'Laura', 'Haha goed punt, doen we.', 21],
    ['Dagindeling / draaiboek opstellen', 'Laura', 'Fotograaf wil graag golden hour rond 21:00 voor de portretten.', 32],
    ['Trouwwebsite vullen', 'Thomas', 'Route en parkeerinfo toegevoegd, kun jij de FAQ nalopen?', 50],
    ['Speeches afstemmen', 'Laura', 'Mijn vader wil graag iets zeggen, max 5 minuten afgesproken.', 19],
    ['Trouwringen uitzoeken', 'Thomas', 'Wat een mooie dag bij de juwelier ❤️', 200],
  ]
  for (const [titel, naam, body, dagen] of defs) {
    const taskId = tId(titel)
    if (!taskId) continue
    const { data, error } = await supabase
      .from('task_comments')
      .insert({ wedding_id: wid, task_id: taskId, body })
      .select('id')
      .single()
    if (error) continue
    // de prepare-trigger heeft author_name leeggemaakt → mooie naam + datum zetten
    await supabase
      .from('task_comments')
      .update({ author_name: naam, created_at: tsVoor(dagen) })
      .eq('id', data.id)
  }
}

// =====================================================================
// Stap 8: draaiboek
// =====================================================================
async function maakDraaiboek(wid) {
  const items = [
    ['10:00', '12:00', 'Klaarmaken bruid', 'Haar & make-up, met de bruidsmeisjes.', 'Bruidssuite', ['bruid', 'fotograaf']],
    ['11:30', '12:15', 'Aankleden bruidegom', 'Met getuigen en een goed glas.', 'Landhuis', ['bruidegom']],
    ['12:30', '13:00', 'First look', 'Een intiem moment voor de ceremonie.', 'Tuin', ['bruidspaar', 'fotograaf']],
    ['13:00', '13:30', 'Ontvangst gasten', 'Welkom met bubbels en limonade.', 'Terras', ['gasten', 'locatie']],
    ['13:30', '14:30', 'Ceremonie', 'Het jawoord onder de oude eik.', 'Ceremonietuin', ['bruidspaar', 'gasten', 'ceremoniemeester']],
    ['14:30', '15:30', 'Felicitaties & borrel', 'Toost op het bruidspaar.', 'Terras', ['gasten', 'catering']],
    ['15:30', '16:30', 'Fotoshoot bruidspaar', 'Portretten op het landgoed.', 'Landgoed', ['bruidspaar', 'fotograaf']],
    ['16:30', '17:30', 'Hightea & spelletjes', 'Voor de gasten tijdens de shoot.', 'Tuin', ['gasten']],
    ['18:00', '20:00', 'Diner', '3-gangen diner met speeches.', 'Oranjerie', ['gasten', 'catering']],
    ['19:00', '19:30', 'Speeches', 'Door ouders en getuigen.', 'Oranjerie', ['gasten']],
    ['20:00', '20:15', 'Aansnijden taart', 'Naked cake met seizoensfruit.', 'Oranjerie', ['bruidspaar', 'catering']],
    ['20:30', '20:45', 'Openingsdans', 'De eerste dans van het bruidspaar.', 'Feestzaal', ['bruidspaar', 'dj of band']],
    ['20:45', '23:30', 'Avondfeest', 'Dansen met DJ Sound & Vision.', 'Feestzaal', ['gasten', 'dj of band']],
    ['23:30', '00:00', 'Nachtsnack', 'Patat & broodjes hamburger.', 'Feestzaal', ['gasten', 'catering']],
    ['00:45', '01:00', 'Afsluiting', 'Uitzwaaien met sterretjes.', 'Voorplein', ['bruidspaar', 'gasten']],
  ]
  const rows = items.map(([tijd, eindtijd, titel, omschrijving, locatie, betrokkenen]) => ({
    wedding_id: wid, tijd, eindtijd, titel, omschrijving, locatie, betrokkenen,
  }))
  const { error } = await supabase.from('schedule_items').insert(rows)
  if (error) throw error
}

// =====================================================================
// Stap 9: website + foto's (hero, galerij)
// =====================================================================
async function maakWebsite(wid) {
  console.log('  • foto\'s uploaden (hero + galerij)…')
  const heroUrl = await uploadFoto('wedding-media', `${wid}/header/hero.jpg`, HERO_FOTO)
  const gallerij = []
  for (let i = 0; i < GALLERIJ_FOTOS.length; i++) {
    const f = GALLERIJ_FOTOS[i]
    const url = await uploadFoto('wedding-media', `${wid}/gallerij/g${i + 1}.jpg`, U(f.id))
    gallerij.push({ id: `${i + 1}`, url, bijschrift: f.bijschrift })
  }

  const sectiesConfig = {
    welkom: { zichtbaar: true, naam: 'Welkom', volgorde: 0 },
    programma: { zichtbaar: true, naam: 'Programma', volgorde: 1 },
    dresscode: { zichtbaar: true, naam: 'Dresscode', volgorde: 2 },
    fotos: { zichtbaar: true, naam: "Foto's", volgorde: 3 },
    cadeaulijst: { zichtbaar: true, naam: 'Cadeaulijst', volgorde: 4 },
    hotels: { zichtbaar: true, naam: 'Overnachten', volgorde: 5 },
    routebeschrijving: { zichtbaar: true, naam: 'Route', volgorde: 6 },
    faq: { zichtbaar: true, naam: 'FAQ', volgorde: 7 },
    contact: { zichtbaar: true, naam: 'Contact', volgorde: 8 },
  }

  const faq = [
    { id: '1', vraag: 'Tot hoe laat kan ik aanwezig zijn?', antwoord: 'Het feest duurt tot 01:00 uur. Daarna zwaaien we jullie graag uit met sterretjes!' },
    { id: '2', vraag: 'Kan ik mijn kinderen meenemen?', antwoord: 'Wij houden van een feest voor jong en oud. Geef bij je RSVP even door met hoeveel (en welke leeftijd) kinderen je komt.' },
    { id: '3', vraag: 'Is er parkeergelegenheid?', antwoord: 'Ja, er is ruim gratis parkeren op het landgoed. Kom je met de trein? Laat het ons weten, dan regelen we vervoer vanaf het station.' },
    { id: '4', vraag: 'Wat is de dresscode?', antwoord: 'Feestelijke zomerse kleding. Denk aan lichte tinten en zachte pasteltinten — maar bovenal: kleding waarin jij je stralend voelt.' },
    { id: '5', vraag: 'Hebben jullie een cadeau-idee?', antwoord: 'Jullie aanwezigheid is het mooiste cadeau. Wil je toch iets geven? Bekijk dan onze cadeaulijst op deze website.' },
  ]

  const payload = {
    wedding_id: wid,
    slug: SLUG,
    website_gepubliceerd: true,
    thema: THEMA,
    kleur_accent: ACCENT,
    kop_lettertype: FONT,
    header_foto_url: heroUrl,
    header_overlay: 0.35,
    welkomsttekst:
      'Lieve familie en vrienden,\n\nNa al die mooie jaren samen geven wij elkaar het jawoord! ' +
      'Op zaterdag 12 juni 2027 vieren we onze trouwdag op het sfeervolle Landgoed De Reehorst in Driebergen, ' +
      'en niets zou de dag completer maken dan jullie erbij te hebben. We kijken er nu al naar uit om samen ' +
      'te lachen, te proosten en de voetjes van de vloer te dansen.\n\nLiefs, Thomas & Laura',
    dresscode:
      'Feestelijke zomerse kleding in lichte en pasteltinten. Het feest is deels buiten op gras — houd daar ' +
      'rekening mee met je schoenkeuze. Vooral: draag iets waarin jij je helemaal jezelf voelt.',
    cadeaulijst:
      'Jullie aanwezigheid is voor ons het allermooiste cadeau. Wie ons toch iets wil geven, vindt op onze ' +
      'cadeaulijst een paar ideeën — van een bijdrage aan onze huwelijksreis tot iets moois voor ons nieuwe huis.',
    hotels:
      'Voor wie wil blijven slapen: Hotel De Bergse Bossen (5 min) en Fletcher Hotel Doorwerth (15 min) liggen ' +
      'vlakbij. Noem bij je reservering "bruiloft Thomas & Laura" voor een speciaal tarief.',
    routebeschrijving:
      'Landgoed De Reehorst, Hoofdstraat 22, Driebergen. Met de auto via de A12 (afslag Driebergen-Zeist), ' +
      'ruime gratis parkeergelegenheid op het terrein. Met het openbaar vervoer: station Driebergen-Zeist op ' +
      '10 minuten; laat het ons weten als je een lift wilt.',
    contact:
      'Vragen? Onze ceremoniemeesters Sanne en Bas helpen je graag: ceremoniemeesters@thomasenlaura.nl. ' +
      'Voor alle andere vragen mag je ons natuurlijk altijd appen.',
    secties_config: sectiesConfig,
    faq,
    gallerij,
  }
  // upsert op wedding_id (unique). De rij bestaat nog niet (nieuwe bruiloft),
  // maar upsert maakt het robuust bij her-run.
  const { error } = await supabase
    .from('website_content')
    .upsert(payload, { onConflict: 'wedding_id' })
  if (error) throw error
}

// =====================================================================
// Stap 10: fotomuur
// =====================================================================
async function maakFotomuur(wid) {
  await supabase
    .from('photo_wall_settings')
    .upsert(
      {
        wedding_id: wid,
        is_active: true,
        title: 'Deel jouw mooiste momenten van Thomas & Laura 📸',
        moderation_required: false,
        require_name: false,
        guests_can_download: true,
        num_columns: 3,
      },
      { onConflict: 'wedding_id' }
    )

  console.log('  • foto\'s uploaden (fotomuur)…')
  const rows = []
  for (let i = 0; i < PHOTO_WALL_FOTOS.length; i++) {
    const f = PHOTO_WALL_FOTOS[i]
    const url = await uploadFoto('photo-wall', `${wid}/pw${i + 1}.jpg`, U(f.id, 1200))
    rows.push({
      wedding_id: wid,
      storage_path: `${wid}/pw${i + 1}.jpg`,
      url,
      guest_name: f.naam,
      message: f.bericht || null,
      is_approved: true,
      is_featured: !!f.featured,
      uploaded_at: tsVoor(-1 + i * 0.01), // net "na" de trouwdag, oplopend
    })
  }
  const { error } = await supabase.from('photo_wall_photos').insert(rows)
  if (error) throw error
}

// =====================================================================
// Stap 11: cadeaulijst
// =====================================================================
async function maakCadeaulijst(wid) {
  await supabase.from('registry_settings').upsert(
    {
      wedding_id: wid,
      is_enabled: true,
      intro_text:
        'Wat lief dat je aan een cadeau denkt! Jullie aanwezigheid is het mooiste geschenk, maar wie ons ' +
        'toch wil verrassen vindt hieronder een paar ideeën. Van harte bedankt — het betekent veel voor ons.',
      bank_account_iban: 'NL12 RABO 0123 4567 89',
      bank_account_name: 'T. Bakker & L. de Vries',
    },
    { onConflict: 'wedding_id' }
  )

  console.log('  • foto\'s uploaden (cadeaulijst)…')
  const c = (eur) => eur * 100 // euro → cent
  // gifts
  const gifts = [
    ['keukenmachine', 'Keukenmachine', 'Voor Laura die graag bakt op zondag.', 'https://www.bol.com'],
    ['servies', 'Compleet serviesset', '6-persoons servies voor onze nieuwe eettafel.', 'https://www.bol.com'],
    ['dekens', 'Wollen plaids', 'Voor knusse avonden op de bank.', 'https://www.bol.com'],
    ['wijn', 'Wijnpakket', 'Een fles opentrekken op onze trouwdag, elk jaar opnieuw.', 'https://www.gall.nl'],
    ['bbq', 'Houtskoolbarbecue', 'Voor zwoele zomeravonden in de tuin.', 'https://www.bol.com'],
    ['koffie', 'Espressomachine', 'Thomas kan niet zonder zijn ochtendkoffie.', 'https://www.coolblue.nl'],
    ['tuinstoel', 'Loungeset tuin', 'Relaxen in onze nieuwe tuin.', 'https://www.ikea.com'],
    ['fotolijst', 'Fotolijsten set', 'Voor de mooiste herinneringen aan de muur.', 'https://www.bol.com'],
  ]
  // funds
  const funds = [
    ['honeymoon', 'Bijdrage huwelijksreis', 'We dromen van een rondreis door Japan 🌸', 4000, [2500, 5000, 10000]],
    ['huis', 'Verbouwing nieuwe huis', 'Een handje helpen met onze droomkeuken.', 3000, [2500, 5000, 7500]],
    ['tuin', 'Onze nieuwe tuin', 'Planten, een boom en een vuurkorf.', 1500, [1500, 2500, 5000]],
  ]

  const items = []
  let sort = 0
  for (const [key, title, description, shop] of gifts) {
    const url = await uploadFoto('registry-images', `${wid}/${key}.jpg`, U(REGISTRY_FOTOS[key], 800))
    items.push({
      wedding_id: wid, type: 'gift', title, description, image_url: url, shop_url: shop,
      target_amount: null, suggested_amounts: null, payment_link: null,
      sort_order: sort++, is_visible: true,
    })
  }
  for (const [key, title, description, targetEur, suggestedEur] of funds) {
    const url = await uploadFoto('registry-images', `${wid}/${key}.jpg`, U(REGISTRY_FOTOS[key], 800))
    items.push({
      wedding_id: wid, type: 'fund', title, description, image_url: url, shop_url: null,
      target_amount: c(targetEur), suggested_amounts: suggestedEur.map(c), payment_link: null,
      sort_order: sort++, is_visible: true,
    })
  }
  const { data: created, error } = await supabase.from('registry_items').insert(items).select('id, type, title')
  if (error) throw error

  // een paar reserveringen op gifts
  const giftIds = created.filter((i) => i.type === 'gift')
  const reserveerNamen = [
    ['Sanne de Vries', 'sanne@example.nl', 'Stiekem al ingepakt 🎁'],
    ['Familie Jansen', 'jansen@example.nl', ''],
    ['Bas & Lotte', 'bas@example.nl', 'Veel plezier ermee!'],
    ['Oom Kees', 'kees@example.nl', ''],
  ]
  for (let i = 0; i < Math.min(reserveerNamen.length, giftIds.length); i++) {
    const [naam, mail, msg] = reserveerNamen[i]
    await supabase.from('registry_reservations').insert({
      item_id: giftIds[i].id, guest_name: naam, guest_email: mail, message: msg || null,
    })
  }

  // bijdragen op de funds (mix confirmed/pending)
  const fundIds = created.filter((i) => i.type === 'fund')
  const honeymoon = fundIds.find((f) => f.title.includes('huwelijksreis'))
  const bijdragen = [
    [honeymoon, 'Marit Smit', 'marit@example.nl', 50, 'confirmed', 'Geniet ervan!'],
    [honeymoon, 'Pieter Bos', 'pieter@example.nl', 100, 'confirmed', ''],
    [honeymoon, 'Collega\'s afdeling', 'team@example.nl', 250, 'confirmed', 'Van ons allemaal!'],
    [honeymoon, 'Anouk', 'anouk@example.nl', 50, 'pending', ''],
    [fundIds[1], 'Opa & Oma', 'opaoma@example.nl', 250, 'confirmed', 'Voor jullie mooie keuken'],
    [fundIds[1], 'Eva', 'eva@example.nl', 75, 'confirmed', ''],
    [fundIds[2], 'Tom & Sophie', 'tom@example.nl', 50, 'confirmed', 'Groene vingers gewenst 🌱'],
    [fundIds[2], 'Daan', 'daan@example.nl', 25, 'pending', ''],
  ]
  for (const [fund, naam, mail, eur, status, msg] of bijdragen) {
    if (!fund) continue
    await supabase.from('registry_contributions').insert({
      item_id: fund.id, guest_name: naam, guest_email: mail, amount: c(eur),
      payment_status: status, payment_method: 'bank_transfer',
      message: msg || null,
      confirmed_at: status === 'confirmed' ? tsVoor(20 + Math.floor(Math.random() * 60)) : null,
    })
  }
}

// =====================================================================
// Stap 12: activiteitenfeed (curated, backdated)
// =====================================================================
async function maakActiviteit(wid, ownerId) {
  // verwijder de automatisch gelogde rijen (actor leeg) en plaats nette entries
  await supabase.from('wedding_activity').delete().eq('wedding_id', wid)

  const A = (module, entityType, action, actorName, label, dagen) => ({
    wedding_id: wid, module, entity_type: entityType, action,
    actor_id: ownerId, actor_name: actorName, label, created_at: tsVoor(dagen),
  })
  const rows = [
    A('leveranciers', 'vendors', 'insert', 'Thomas', 'Landgoed De Reehorst', 320),
    A('budget', 'budget_items', 'insert', 'Laura', 'Landgoed De Reehorst — huur & zaal', 320),
    A('taken', 'tasks', 'update', 'Thomas', 'Trouwlocatie boeken', 318),
    A('leveranciers', 'vendors', 'insert', 'Laura', 'Studio Lumière', 240),
    A('taken', 'tasks', 'update', 'Laura', 'Fotograaf boeken', 239),
    A('gasten', 'guests', 'insert', 'Thomas', 'Familie de Vries toegevoegd', 230),
    A('taken', 'tasks', 'update', 'Laura', 'Save-the-dates versturen', 250),
    A('leveranciers', 'vendors', 'insert', 'Thomas', 'Smaakvol Catering', 230),
    A('budget', 'budget_items', 'update', 'Thomas', 'Trouwringen', 170),
    A('taken', 'tasks', 'update', 'Laura', 'Trouwjurk zoeken', 150),
    A('gasten', 'guests', 'update', 'Laura', 'RSVP bevestigd: Bas Bakker', 90),
    A('draaiboek', 'schedule_items', 'insert', 'Thomas', 'Ceremonie', 60),
    A('draaiboek', 'schedule_items', 'insert', 'Thomas', 'Avondfeest', 60),
    A('taken', 'tasks', 'update', 'Laura', 'Menu definitief maken', 40),
    A('gasten', 'guests', 'update', 'Thomas', 'RSVP bevestigd: Lotte Smit', 35),
    A('tafels', 'tables', 'insert', 'Laura', 'Hoofdtafel', 20),
    A('tafels', 'tables', 'update', 'Thomas', 'Tafel 3', 18),
    A('taken', 'tasks', 'update', 'Laura', 'Tafelschikking maken', 18),
    A('gasten', 'guests', 'update', 'Thomas', 'RSVP afgemeld: Niels Vos', 30),
    A('budget', 'budget_items', 'update', 'Laura', 'Diner & avondhapjes (Smaakvol)', 21),
  ]
  const { error } = await supabase.from('wedding_activity').insert(rows)
  if (error) console.warn('  ⚠ activiteitenfeed niet geseed:', error.message)
}

// =====================================================================
// Main
// =====================================================================
async function main() {
  console.log('▶ Demo-account "Thomas & Laura" opbouwen…')

  console.log('• Owner opzoeken…')
  const ownerId = await vindOwnerId()
  console.log(`  ✓ owner: ${OWNER_EMAIL} (${ownerId})`)

  console.log('• Bestaande demo opruimen (idempotent)…')
  await verwijderBestaandeDemo()

  console.log('• Bruiloft aanmaken…')
  const wid = await maakWedding(ownerId)
  console.log(`  ✓ wedding_id: ${wid}`)

  console.log('• Tafels…')
  const tafels = await maakTafels(wid)

  console.log('• Leveranciers & budget…')
  const { vendors, budget } = await maakLeveranciersEnBudget(wid)

  console.log('• Gasten & tafelschikking…')
  const aantalGasten = await maakGasten(wid, tafels)
  console.log(`  ✓ ${aantalGasten} gasten`)

  console.log('• Taken…')
  const taken = await maakTaken(wid, vendors, budget)
  console.log(`  ✓ ${taken.length} taken`)

  console.log('• Opmerkingen…')
  await maakOpmerkingen(wid, taken)

  console.log('• Draaiboek…')
  await maakDraaiboek(wid)

  console.log('• Trouwwebsite…')
  await maakWebsite(wid)

  console.log('• Fotomuur…')
  await maakFotomuur(wid)

  console.log('• Cadeaulijst…')
  await maakCadeaulijst(wid)

  console.log('• Activiteitenfeed…')
  await maakActiviteit(wid, ownerId)

  console.log('\n✅ Klaar! Demo-account is opgebouwd.')
  console.log(`   • Log in als ${OWNER_EMAIL} en open de bruiloft van Thomas & Laura.`)
  console.log(`   • Publieke trouwwebsite: /trouwen/${SLUG}`)
  console.log(`   • Fotomuur: /foto/${SLUG}`)
  console.log(`   • Cadeaulijst: /trouwen/${SLUG}/cadeaulijst`)
}

main().catch((e) => {
  console.error('\n✖ Seed mislukt:', e.message || e)
  process.exit(1)
})
