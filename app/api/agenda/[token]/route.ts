import { NextRequest, NextResponse } from 'next/server'

import { dagenTot, formatEuro } from '@/lib/bruiloft/format'
import { buildIcsCalendar, type IcsEvent } from '@/lib/bruiloft/ics'
import type { PaymentTerm } from '@/lib/bruiloft/types'
import { capFirst } from '@/lib/utils'
import { createRawAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Hele-dag-items ouder dan dit blijven uit de feed: een agenda vol verlopen
// taken is ruis. (Afspraken en de trouwdag blijven wél staan — dat is
// geschiedenis die je in je agenda terug wil kunnen zien.)
const MAX_DAGEN_VERLEDEN = 60

// Publieke iCalendar-feed (agenda-abonnement) voor de bruiloftplanning:
// trouwdag, leveranciersafspraken, taak-deadlines en betaaltermijnen.
// Autorisatie = het bezit van de onraadbare token (zelfde model als de
// draaiboek-deellink); de service-role client valideert de token en RLS is
// hier dus bewust niet de poortwachter. De feed geeft alleen planning-items
// terug — geen e-mailadressen of andere gegevens.
export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  // Agenda-apps sturen soms een .ics-achtervoegsel mee — accepteer beide.
  const token = params.token.replace(/\.ics$/i, '')
  if (!UUID_RE.test(token)) {
    return new NextResponse('Niet gevonden', { status: 404 })
  }

  const admin = createRawAdminClient()

  const { data: share } = await admin
    .from('agenda_shares')
    .select('wedding_id')
    .eq('token', token)
    .maybeSingle()
  if (!share) {
    return new NextResponse('Niet gevonden', { status: 404 })
  }
  const weddingId: string = share.wedding_id

  const [weddingRes, tasksRes, budgetRes, vendorsRes] = await Promise.all([
    admin
      .from('weddings')
      .select('partner1_naam, partner2_naam, trouwdatum, locatie')
      .eq('id', weddingId)
      .maybeSingle(),
    admin
      .from('tasks')
      .select('id, titel, deadline, status')
      .eq('wedding_id', weddingId)
      .neq('status', 'klaar')
      .not('deadline', 'is', null),
    admin.from('budget_items').select('id, omschrijving, betaaltermijnen').eq('wedding_id', weddingId),
    admin
      .from('vendors')
      .select('id, naam, type, adres, afspraak_datum, afspraak_tijd, status')
      .eq('wedding_id', weddingId)
      .not('afspraak_datum', 'is', null),
  ])

  const wedding = weddingRes.data
  if (!wedding) {
    return new NextResponse('Niet gevonden', { status: 404 })
  }

  const namen =
    [wedding.partner1_naam, wedding.partner2_naam].filter(Boolean).join(' & ') || 'Bruiloft'

  const events: IcsEvent[] = []

  if (wedding.trouwdatum) {
    events.push({
      uid: `trouwdag-${weddingId}@onstrouwplan`,
      titel: `💍 Bruiloft ${namen}`,
      datum: wedding.trouwdatum,
      locatie: wedding.locatie || undefined,
    })
  }

  for (const v of vendorsRes.data ?? []) {
    if (v.status === 'afgewezen' || !v.afspraak_datum) continue
    events.push({
      uid: `afspraak-${v.id}@onstrouwplan`,
      titel: `Afspraak: ${v.naam || 'leverancier'}`,
      datum: v.afspraak_datum,
      tijd: v.afspraak_tijd || undefined,
      omschrijving: v.type ? capFirst(v.type) : undefined,
      locatie: v.adres || undefined,
    })
  }

  for (const t of tasksRes.data ?? []) {
    if (!t.deadline || dagenTot(t.deadline) < -MAX_DAGEN_VERLEDEN) continue
    events.push({
      uid: `taak-${t.id}@onstrouwplan`,
      titel: `Taak: ${t.titel || 'naamloos'}`,
      datum: t.deadline,
    })
  }

  for (const item of budgetRes.data ?? []) {
    const termijnen = Array.isArray(item.betaaltermijnen)
      ? (item.betaaltermijnen as unknown as PaymentTerm[])
      : []
    for (const term of termijnen) {
      if (!term || term.betaald || !term.vervaldatum) continue
      if (dagenTot(term.vervaldatum) < -MAX_DAGEN_VERLEDEN) continue
      events.push({
        uid: `betaaltermijn-${term.id}@onstrouwplan`,
        titel: `Betaling: ${item.omschrijving || 'betaaltermijn'} (${formatEuro(term.bedrag ?? 0)})`,
        datum: term.vervaldatum,
      })
    }
  }

  const ics = buildIcsCalendar(`Bruiloft ${namen}`, events)

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="trouwplan.ics"',
      // Abonnementen mogen even gecachet worden; privé want token-gebonden.
      'Cache-Control': 'private, max-age=300',
      'X-Robots-Tag': 'noindex',
    },
  })
}
