import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { verifySitePassword } from '@/lib/crypto/sitePassword'
import { cookieNaamVoor, maakOntgrendelCookieWaarde } from '@/lib/crypto/siteUnlockCookie'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { createAdminClient } from '@/lib/supabase/admin'

const bodySchema = z.object({
  slug: z.string().min(1),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const { slug, password } = parsed.data
  const ip = getClientIp(request)

  const rateLimit = await checkRateLimit(`trouwen:password:${ip}:${slug}`, 10, 15 * 60)
  if (!rateLimit.allowed) {
    return NextResponse.json({ ok: false, error: 'Te veel pogingen' }, { status: 429 })
  }

  const admin = createAdminClient()
  const { data: content } = await admin
    .from('website_content')
    .select('wedding_id, site_password, site_password_enabled, website_gepubliceerd')
    .eq('slug', slug)
    .maybeSingle()

  if (!content || !content.website_gepubliceerd) return NextResponse.json({ ok: false })

  // Niet (langer) beveiligd: geen echte grens, dus altijd doorlaten.
  if (!content.site_password_enabled || !content.site_password) {
    return NextResponse.json({ ok: true })
  }

  const ok = await verifySitePassword(password, content.site_password)
  if (!ok) return NextResponse.json({ ok: false })

  const { waarde, maxAge } = maakOntgrendelCookieWaarde(content.wedding_id)
  const response = NextResponse.json({ ok: true })
  response.cookies.set(cookieNaamVoor(content.wedding_id), waarde, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/',
  })
  return response
}
