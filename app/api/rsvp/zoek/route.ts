import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { checkRateLimit } from '@/lib/rateLimit'
import { createClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  slug: z.string().min(1),
  voornaam: z.string().min(1).max(100),
  achternaam: z.string().min(1).max(100),
})

export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ found: false, multiple: false }, { status: 400 })
  }

  const { slug, voornaam, achternaam } = parsed.data
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const rateLimit = await checkRateLimit(`rsvp:zoek:${ip}:${slug}`, 10, 15 * 60)
  if (!rateLimit.allowed) {
    return NextResponse.json({ found: false, multiple: false, error: 'Te veel pogingen' }, { status: 429 })
  }

  const supabase = createClient()
  const { data, error } = await supabase.rpc('find_guest_by_name', {
    p_slug: slug,
    p_voornaam: voornaam,
    p_achternaam: achternaam,
  })

  if (error || !data) {
    return NextResponse.json({ found: false, multiple: false })
  }

  return NextResponse.json(data)
}
