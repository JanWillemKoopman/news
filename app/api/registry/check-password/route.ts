import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient, createRawAdminClient } from '@/lib/supabase/admin'

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

  return NextResponse.json({ ok: settings.password === password })
}
