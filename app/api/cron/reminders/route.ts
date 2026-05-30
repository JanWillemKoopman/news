import { NextRequest, NextResponse } from 'next/server'

import { dagenTot } from '@/lib/bruiloft/format'
import { betalingMijlpaal, taakMijlpaal } from '@/lib/bruiloft/reminders'
import type { PaymentTerm } from '@/lib/bruiloft/types'
import { FROM_ADDRESS, getResend } from '@/lib/email/resend'
import {
  renderReminderDigestEmail,
  type ReminderBetalingItem,
  type ReminderTaakItem,
} from '@/lib/email/templates'
import { createAdminClient } from '@/lib/supabase/admin'

// Draait server-side met de service-role; nooit cachen.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Mijlpaal = '7d' | '1d' | '14d' | '3d' | 'te-laat'

interface LogRow {
  wedding_id: string
  soort: 'taak' | 'betaaltermijn'
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const dashboardUrl = `${siteUrl}/bruiloft`

  const [weddingsRes, membersRes, profilesRes, tasksRes, budgetRes, logRes] = await Promise.all([
    admin.from('weddings').select('id, partner1_naam, partner2_naam'),
    admin.from('wedding_members').select('wedding_id, user_id, role'),
    admin.from('profiles').select('id, email, display_name, email_herinneringen'),
    admin.from('tasks').select('id, wedding_id, titel, deadline, status, assignees').neq('status', 'klaar'),
    admin.from('budget_items').select('id, wedding_id, omschrijving, betaaltermijnen'),
    admin.from('reminder_log').select('soort, ref_id, mijlpaal, user_id'),
  ])

  const firstError =
    weddingsRes.error ?? membersRes.error ?? profilesRes.error ?? tasksRes.error ?? budgetRes.error ?? logRes.error
  if (firstError) {
    console.error('[cron/reminders] queryfout:', firstError)
    return NextResponse.json({ error: 'Databasefout' }, { status: 500 })
  }

  const weddings = weddingsRes.data ?? []
  const members = membersRes.data ?? []
  const profiles = profilesRes.data ?? []
  const tasks = tasksRes.data ?? []
  const budgetItems = budgetRes.data ?? []
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

  // --- Versturen + loggen ---
  let verstuurd = 0
  let mislukt = 0
  const resend = pendingByUser.size > 0 ? getResend() : null

  for (const p of pendingByUser.values()) {
    if (p.taken.length === 0 && p.betalingen.length === 0) continue
    const { subject, html } = renderReminderDigestEmail({
      ontvangerNaam: p.naam,
      partnerNamen: p.partnerNamen,
      taken: p.taken,
      betalingen: p.betalingen,
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
  }

  return NextResponse.json({ ok: true, ontvangers: pendingByUser.size, verstuurd, mislukt })
}
