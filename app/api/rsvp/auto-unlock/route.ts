import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { cookieNaamVoor, maakOntgrendelCookieWaarde } from '@/lib/crypto/siteUnlockCookie'
import { createClient } from '@/lib/supabase/server'

const bodySchema = z.object({ token: z.string().min(1) })

// Ontgrendelt de wachtwoord-beveiligde trouwwebsite automatisch voor een
// gast die zijn persoonlijke RSVP-link opent: het rsvp_token identificeert
// de gast al betrouwbaar, dus hoeft die geen apart siteswachtwoord meer in
// te typen (dat wachtwoord staat sowieso alleen als onomkeerbare hash
// opgeslagen, zie 0050_site_password.sql). No-op als de site geen
// wachtwoord vereist.
export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_rsvp_unlock_meta', { p_token: parsed.data.token })
  if (error || !data) {
    return NextResponse.json({ ok: false }, { status: 404 })
  }

  const meta = data as unknown as { weddingId: string; sitePasswordVereist: boolean }
  if (!meta.sitePasswordVereist) {
    return NextResponse.json({ ok: true, unlocked: false })
  }

  const { waarde, maxAge } = maakOntgrendelCookieWaarde(meta.weddingId)
  const response = NextResponse.json({ ok: true, unlocked: true })
  response.cookies.set(cookieNaamVoor(meta.weddingId), waarde, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/',
  })
  return response
}
