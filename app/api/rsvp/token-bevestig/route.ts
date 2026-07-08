import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { checkRateLimit } from '@/lib/rateLimit'
import { createClient } from '@/lib/supabase/server'

// Bevestigen via de persoonlijke RSVP-link (token in de URL, zie
// app/rsvp/[token]/[[...pagina]]/page.tsx). In tegenstelling tot
// /api/rsvp/bevestig (dat op slug+naam matcht, met kans op ambiguïteit) is
// hier de token zelf al de eenduidige identiteit — wrapt de bestaande
// submit_rsvp(p_token, p_payload)-RPC (migratie 0005).
const bodySchema = z.object({
  token: z.string().min(1),
  payload: z.object({
    rsvpStatus: z.enum(['bevestigd', 'afgemeld']).optional(),
    dieetwensen: z.string().max(1000).optional(),
    heeftPartner: z.boolean().optional(),
    partnerNaam: z.string().max(200).optional(),
    aantalKinderen: z.number().int().min(0).max(20).optional(),
  }),
})

export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const { token, payload } = parsed.data
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const rateLimit = await checkRateLimit(`rsvp:token-bevestig:${ip}:${token}`, 10, 15 * 60)
  if (!rateLimit.allowed) {
    return NextResponse.json({ ok: false, error: 'Te veel pogingen' }, { status: 429 })
  }

  const supabase = createClient()
  const { error } = await supabase.rpc('submit_rsvp', { p_token: token, p_payload: payload })

  if (error) return NextResponse.json({ ok: false }, { status: 400 })
  return NextResponse.json({ ok: true })
}
