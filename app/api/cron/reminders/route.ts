import { NextRequest, NextResponse } from 'next/server'

import { afspraakRelatief, dagenTot, dagLabel, formatDatumNL, formatEuro } from '@/lib/bruiloft/format'
import { afspraakMijlpaal, betalingMijlpaal, taakMijlpaal } from '@/lib/bruiloft/reminders'
import type { MessageActie, PaymentTerm } from '@/lib/bruiloft/types'
import { FROM_ADDRESS, getResend } from '@/lib/email/resend'
import {
  renderReminderDigestEmail,
  type ReminderAfspraakItem,
  type ReminderBetalingItem,
  type ReminderTaakItem,
} from '@/lib/email/templates'
import { createAdminClient, createRawAdminClient } from '@/lib/supabase/admin'

// Draait server-side met de service-role; nooit cachen.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Mijlpaal = '7d' | '1d' | '14d' | '3d' | '0d' | 'te-laat'

interface LogRow {
  wedding_id: string
  soort: 'taak' | 'betaaltermijn' | 'afspraak'
  ref_id: string
  mijlpaal: Mijlpaal
  user_id: string
  email: string
}

interface Pending {
  userId: string
  email: string
  naam: string
  partnerNamen: string
  taken: ReminderTaakItem[]
  betalingen: ReminderBetalingItem[]
  afspraken: ReminderAfspraakItem[]
  logRows: LogRow[]
}

function partnerNamen(p1: string, p2: string): string {
  if (p1 && p2) return `${p1} & ${p2}`
  return p1 || p2 || 'het bruidspaar'
}

/**
 * Dagelijkse herinneringen-cron. Stuurt per gebruiker één digest-mail met de
 * taken/betaaltermijnen die een herinnerings-mijlpaal hebben bereikt en nog
 * niet eerder verstuurd zijn. Beveiligd met CRON_SECRET (Bearer-header).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
  }

  const admin = createAdminClient()
  // raw: voor tabellen/kolommen die nog niet in de gegenereerde
  // database.types.ts staan (messages, vendors.afspraak_datum — 0058/0070).
  const rawAdmin = createRawAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const dashboardUrl = `${siteUrl}/bruiloft`

  const [weddingsRes, membersRes, profilesRes, tasksRes, budgetRes, vendorsRes, logRes] = await Promise.all([
    admin.from('weddings').select('id, partner1_naam, partner2_naam'),
    admin.from('wedding_members').select('wedding_id, user_id, role'),
    admin.from('profiles').select('id, email, display_name, email_herinneringen'),
    admin.from('tasks').select('id, wedding_id, titel, deadline, status, assignees').neq('status', 'klaar'),
    admin.from('budget_items').select('id, wedding_id, omschrijving, betaaltermijnen'),
    rawAdmin
      .from('vendors')
      .select('id, wedding_id, naam, status, afspraak_datum, afspraak_tijd')
      .not('afspraak_datum', 'is', null),
    admin.from('reminder_log').select('soort, ref_id, mijlpaal, user_id'),
  ])

  const firstError =
    weddingsRes.error ??
    membersRes.error ??
    profilesRes.error ??
    tasksRes.error ??
    budgetRes.error ??
    vendorsRes.error ??
    logRes.error
  if (firstError) {
    console.error('[cron/reminders] queryfout:', firstError)
    return NextResponse.json({ error: 'Databasefout' }, { status: 500 })
  }

  const weddings = weddingsRes.data ?? []
  const members = membersRes.data ?? []
  const profiles = profilesRes.data ?? []
  const tasks = tasksRes.data ?? []
  const budgetItems = budgetRes.data ?? []
  const vendorsMetAfspraak = (vendorsRes.data ?? []) as unknown as {
    id: string
    wedding_id: string
    naam: string
    status: string
    afspraak_datum: string
    afspraak_tijd: string
  }[]
  const log = logRes.data ?? []

  // --- Lookups ---
  const weddingNamen = new Map<string, string>()
  for (const w of weddings) weddingNamen.set(w.id, partnerNamen(w.partner1_naam, w.partner2_naam))

  const ownersByWedding = new Map<string, string[]>()
  for (const m of members) {
    if (m.role !== 'owner') continue
    const list = ownersByWedding.get(m.wedding_id) ?? []
    list.push(m.user_id)
    ownersByWedding.set(m.wedding_id, list)
  }

  const profileById = new Map(profiles.map((p) => [p.id, p]))

  const alSent = new Set(log.map((r) => `${r.soort}|${r.ref_id}|${r.mijlpaal}|${r.user_id}`))

  // Verzamel per ontvanger.
  const pendingByUser = new Map<string, Pending>()

  function ontvangerOk(userId: string): { email: string; naam: string } | null {
    const prof = profileById.get(userId)
    if (!prof || !prof.email || prof.email_herinneringen === false) return null
    return { email: prof.email, naam: prof.display_name ?? '' }
  }

  function pendingVoor(userId: string, info: { email: string; naam: string }, weddingId: string): Pending {
    let p = pendingByUser.get(userId)
    if (!p) {
      p = {
        userId,
        email: info.email,
        naam: info.naam,
        partnerNamen: weddingNamen.get(weddingId) ?? 'het bruidspaar',
        taken: [],
        betalingen: [],
        afspraken: [],
        logRows: [],
      }
      pendingByUser.set(userId, p)
    }
    return p
  }

  // --- Taken ---
  for (const t of tasks) {
    if (!t.deadline) continue
    const dagen = dagenTot(t.deadline)
    const mijlpaal = taakMijlpaal(dagen)
    if (!mijlpaal) continue

    const assignees = (t.assignees ?? []) as string[]
    const ontvangers = assignees.length > 0 ? assignees : ownersByWedding.get(t.wedding_id) ?? []

    for (const userId of ontvangers) {
      const key = `taak|${t.id}|${mijlpaal}|${userId}`
      if (alSent.has(key)) continue
      const info = ontvangerOk(userId)
      if (!info) continue
      const p = pendingVoor(userId, info, t.wedding_id)
      p.taken.push({ titel: t.titel || 'Naamloze taak', deadline: t.deadline, dagen })
      p.logRows.push({
        wedding_id: t.wedding_id,
        soort: 'taak',
        ref_id: t.id,
        mijlpaal,
        user_id: userId,
        email: info.email,
      })
      alSent.add(key) // voorkom dubbel binnen dezelfde run
    }
  }

  // --- Betaaltermijnen (alleen naar de owners) ---
  for (const item of budgetItems) {
    const termijnen = Array.isArray(item.betaaltermijnen)
      ? (item.betaaltermijnen as unknown as PaymentTerm[])
      : []
    const ontvangers = ownersByWedding.get(item.wedding_id) ?? []
    if (ontvangers.length === 0) continue

    for (const term of termijnen) {
      if (!term || term.betaald || !term.vervaldatum) continue
      const dagen = dagenTot(term.vervaldatum)
      const mijlpaal = betalingMijlpaal(dagen)
      if (!mijlpaal) continue

      for (const userId of ontvangers) {
        const key = `betaaltermijn|${term.id}|${mijlpaal}|${userId}`
        if (alSent.has(key)) continue
        const info = ontvangerOk(userId)
        if (!info) continue
        const p = pendingVoor(userId, info, item.wedding_id)
        p.betalingen.push({
          omschrijving: item.omschrijving || 'Betaaltermijn',
          bedrag: term.bedrag ?? 0,
          vervaldatum: term.vervaldatum,
          dagen,
        })
        p.logRows.push({
          wedding_id: item.wedding_id,
          soort: 'betaaltermijn',
          ref_id: term.id,
          mijlpaal,
          user_id: userId,
          email: info.email,
        })
        alSent.add(key)
      }
    }
  }

  // --- Afspraken bij leveranciers (alleen naar de owners) ---
  for (const v of vendorsMetAfspraak) {
    // Een afspraak bij een afgewezen leverancier is achterhaald.
    if (v.status === 'afgewezen') continue
    const dagen = dagenTot(v.afspraak_datum)
    const mijlpaal = afspraakMijlpaal(dagen)
    if (!mijlpaal) continue

    const ontvangers = ownersByWedding.get(v.wedding_id) ?? []
    for (const userId of ontvangers) {
      const key = `afspraak|${v.id}|${mijlpaal}|${userId}`
      if (alSent.has(key)) continue
      const info = ontvangerOk(userId)
      if (!info) continue
      const p = pendingVoor(userId, info, v.wedding_id)
      p.afspraken.push({
        leverancier: v.naam || 'Leverancier',
        datum: v.afspraak_datum,
        tijd: v.afspraak_tijd || '',
        dagen,
      })
      p.logRows.push({
        wedding_id: v.wedding_id,
        soort: 'afspraak',
        ref_id: v.id,
        mijlpaal,
        user_id: userId,
        email: info.email,
      })
      alSent.add(key)
    }
  }

  // --- Versturen + loggen ---
  let verstuurd = 0
  let mislukt = 0
  const resend = pendingByUser.size > 0 ? getResend() : null

  // Dezelfde herinneringen ook als bericht in het berichtencentrum, één
  // gebundeld systeembericht per bruiloft (i.p.v. per ontvanger — de mailbox
  // is gedeeld). Items dedupen we per bruiloft: meerdere ontvangers krijgen
  // dezelfde taak/betaaltermijn maar het bericht noemt 'm één keer.
  interface WeddingBericht {
    taken: ReminderTaakItem[]
    betalingen: ReminderBetalingItem[]
    afspraken: ReminderAfspraakItem[]
    keys: Set<string>
  }
  const berichtPerWedding = new Map<string, WeddingBericht>()

  for (const p of Array.from(pendingByUser.values())) {
    if (p.taken.length === 0 && p.betalingen.length === 0 && p.afspraken.length === 0) continue
    const { subject, html } = renderReminderDigestEmail({
      ontvangerNaam: p.naam,
      partnerNamen: p.partnerNamen,
      taken: p.taken,
      betalingen: p.betalingen,
      afspraken: p.afspraken,
      dashboardUrl,
    })

    try {
      const { error: sendError } = await resend!.emails.send({
        from: FROM_ADDRESS,
        to: p.email,
        subject,
        html,
      })
      if (sendError) {
        console.error('[cron/reminders] Resend-fout:', sendError)
        mislukt++
        continue // niet loggen: volgende run probeert het opnieuw
      }
    } catch (err) {
      console.error('[cron/reminders] onverwachte fout:', err)
      mislukt++
      continue
    }

    // Pas loggen na succesvolle verzending, zodat een fout niet leidt tot een
    // gemiste herinnering.
    const { error: logError } = await admin.from('reminder_log').insert(p.logRows)
    if (logError) console.error('[cron/reminders] logfout:', logError)
    verstuurd++

    // Verzamel de zojuist verstuurde items per bruiloft voor het
    // berichtencentrum. p.logRows loopt 1-op-1 met
    // [taken..., betalingen..., afspraken...].
    p.logRows.forEach((row, i) => {
      const itemKey = `${row.soort}|${row.ref_id}|${row.mijlpaal}`
      let wb = berichtPerWedding.get(row.wedding_id)
      if (!wb) {
        wb = { taken: [], betalingen: [], afspraken: [], keys: new Set() }
        berichtPerWedding.set(row.wedding_id, wb)
      }
      if (wb.keys.has(itemKey)) return
      wb.keys.add(itemKey)
      if (row.soort === 'taak') wb.taken.push(p.taken[i])
      else if (row.soort === 'betaaltermijn') wb.betalingen.push(p.betalingen[i - p.taken.length])
      else wb.afspraken.push(p.afspraken[i - p.taken.length - p.betalingen.length])
    })
  }

  // --- Spiegel naar het berichtencentrum -----------------------------------
  let berichten = 0
  if (berichtPerWedding.size > 0) {
    for (const [weddingId, wb] of Array.from(berichtPerWedding.entries())) {
      const regels = [
        ...wb.afspraken.map(
          (a) =>
            `• Afspraak bij ${a.leverancier} — ${formatDatumNL(a.datum)}${a.tijd ? ` om ${a.tijd}` : ''} (${afspraakRelatief(a.dagen)})`
        ),
        ...wb.taken.map(
          (t) => `• ${t.titel} — deadline ${formatDatumNL(t.deadline)} (${dagLabel(t.dagen)})`
        ),
        ...wb.betalingen.map(
          (b) =>
            `• ${b.omschrijving} — ${formatEuro(b.bedrag)}, vervalt ${formatDatumNL(b.vervaldatum)} (${dagLabel(b.dagen)})`
        ),
      ]
      const aantal = wb.taken.length + wb.betalingen.length + wb.afspraken.length
      const acties: MessageActie[] = [
        ...(wb.afspraken.length > 0
          ? [{ label: 'Bekijk leveranciers', href: '/bruiloft/leveranciers' }]
          : []),
        ...(wb.taken.length > 0 ? [{ label: 'Bekijk taken', href: '/bruiloft/taken' }] : []),
        ...(wb.betalingen.length > 0 ? [{ label: 'Bekijk budget', href: '/bruiloft/budget' }] : []),
      ]
      const { error } = await rawAdmin.from('messages').insert({
        wedding_id: weddingId,
        direction: 'inbound',
        type: 'systeem',
        onderwerp:
          aantal === 1
            ? 'Herinnering voor jullie planning'
            : `${aantal} herinneringen voor jullie planning`,
        inhoud: `Dit staat er binnenkort aan te komen:\n\n${regels.join('\n')}`,
        afzender_naam: 'Bruiloft Assistent',
        afzender_type: 'systeem',
        status: 'verzonden',
        metadata: { acties },
      })
      if (error) console.error('[cron/reminders] bericht-insert mislukt:', error)
      else berichten++
    }
  }

  return NextResponse.json({ ok: true, ontvangers: pendingByUser.size, verstuurd, mislukt, berichten })
}
