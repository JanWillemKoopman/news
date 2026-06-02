import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { verifyPassword } from '@/lib/crypto/password'
import { createAdminClient, createRawAdminClient } from '@/lib/supabase/admin'

const bodySchema = z.object({
  slug: z.string().min(1),
  password: z.string().min(1),
})

// In-memory rate limiting: max 10 pogingen per 15 minuten per IP+slug.
const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 10
const WINDOW_MS = 15 * 60 * 1000

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const rec = attempts.get(key)
  if (!rec || rec.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  if (rec.count >= MAX_ATTEMPTS) return true
  rec.count++
  return false
}

export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const { slug, password } = parsed.data
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  if (isRateLimited(`${ip}:${slug}`)) {
    return NextResponse.json({ ok: false, error: 'Te veel pogingen' }, { status: 429 })
  }

  const admin = createAdminClient()
  const rawAdmin = createRawAdminClient()

  const { data: content } = await admin
    .from('website_content')
    .select('wedding_id')
    .eq('slug', slug)
    .maybeSingle()

  if (!content) return NextResponse.json({ ok: false })

  const { data: settings } = await rawAdmin
    .from('registry_settings')
    .select('password, is_enabled')
    .eq('wedding_id', content.wedding_id)
    .maybeSingle()

  if (!settings || !settings.is_enabled) return NextResponse.json({ ok: false })
  if (!settings.password) return NextResponse.json({ ok: true })

  const ok = await verifyPassword(password, settings.password as string)
  return NextResponse.json({ ok })
}
