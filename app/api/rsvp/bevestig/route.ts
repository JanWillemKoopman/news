import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { createClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  slug: z.string().min(1),
  voornaam: z.string().min(1).max(100),
  achternaam: z.string().min(1).max(100),
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

  const { slug, voornaam, achternaam, payload } = parsed.data
  const ip = getClientIp(request)

  const rateLimit = await checkRateLimit(`rsvp:bevestig:${ip}:${slug}`, 10, 15 * 60)
  if (!rateLimit.allowed) {
    return NextResponse.json({ ok: false, error: 'Te veel pogingen' }, { status: 429 })
  }

  const supabase = createClient()
  const { error } = await supabase.rpc('submit_rsvp_by_name', {
    p_slug: slug,
    p_voornaam: voornaam,
    p_achternaam: achternaam,
    p_payload: payload,
  })

  if (error) return NextResponse.json({ ok: false }, { status: 400 })
  return NextResponse.json({ ok: true })
}
