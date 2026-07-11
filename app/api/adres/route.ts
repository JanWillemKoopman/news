import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { createRawAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Adres doorgeven via de publieke adreslink (/adres/[token]). Autorisatie =
// bezit van de onraadbare token; de service-role client valideert die en
// werkt de gastenlijst bij. Matching: bestaat er al een gast met dezelfde
// voor- + achternaam (hoofdletterongevoelig), dan werken we die bij — het
// adres altijd (daar is de link voor), e-mail/telefoon alleen als die nog
// leeg zijn. Geen match → nieuwe gast, duidelijk gemarkeerd in de notitie.

const bodySchema = z.object({
  token: z.string().uuid(),
  voornaam: z.string().trim().min(1).max(100),
  achternaam: z.string().trim().min(1).max(100),
  straat: z.string().trim().min(1).max(200),
  postcode: z.string().trim().max(20).optional(),
  plaats: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200).optional().or(z.literal('')),
  telefoon: z.string().trim().max(40).optional(),
})

export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Ongeldige invoer' }, { status: 400 })
  }
  const { token, voornaam, achternaam, straat, postcode, plaats, email, telefoon } = parsed.data

  // Rate limit per IP én per link: ruim genoeg voor een gezin dat meerdere
  // adressen doorgeeft, krap genoeg tegen scripts.
  const ip = getClientIp(request)
  const [perIp, perToken] = await Promise.all([
    checkRateLimit(`adres:ip:${ip}`, 15, 15 * 60),
    checkRateLimit(`adres:token:${token}`, 300, 24 * 60 * 60),
  ])
  if (!perIp.allowed || !perToken.allowed) {
    return NextResponse.json({ ok: false, error: 'Te veel pogingen' }, { status: 429 })
  }

  const admin = createRawAdminClient()

  const { data: share } = await admin
    .from('adres_shares')
    .select('wedding_id')
    .eq('token', token)
    .maybeSingle()
  if (!share) {
    return NextResponse.json({ ok: false, error: 'Link ongeldig' }, { status: 404 })
  }
  const weddingId: string = share.wedding_id

  const adres = [straat, [postcode, plaats].filter(Boolean).join(' ')].filter(Boolean).join(', ')

  // Match op naam (hoofdletterongevoelig, getrimd).
  const { data: bestaande } = await admin
    .from('guests')
    .select('id, voornaam, achternaam, email, telefoon')
    .eq('wedding_id', weddingId)
  const genormaliseerd = (s: string) => s.trim().toLowerCase()
  const match = (bestaande ?? []).find(
    (g) =>
      genormaliseerd(g.voornaam) === genormaliseerd(voornaam) &&
      genormaliseerd(g.achternaam) === genormaliseerd(achternaam)
  )

  if (match) {
    const { error } = await admin
      .from('guests')
      .update({
        adres,
        // E-mail/telefoon niet overschrijven: het bruidspaar kan daar
        // bewust iets anders hebben staan.
        ...(email && !match.email ? { email } : {}),
        ...(telefoon && !match.telefoon ? { telefoon } : {}),
      })
      .eq('id', match.id)
    if (error) {
      console.error('[adres] update mislukt:', error)
      return NextResponse.json({ ok: false, error: 'Opslaan mislukt' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  const { error } = await admin.from('guests').insert({
    wedding_id: weddingId,
    voornaam,
    achternaam,
    categorie: '',
    adres,
    email: email || '',
    telefoon: telefoon || '',
    rsvp_status: 'nog niet uitgenodigd',
    notitie: 'Adres doorgegeven via de adreslink',
  })
  if (error) {
    console.error('[adres] insert mislukt:', error)
    return NextResponse.json({ ok: false, error: 'Opslaan mislukt' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
