import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { createRawAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  event_type: z.string().max(100),
  path:       z.string().max(500).optional(),
  metadata:   z.record(z.string(), z.unknown()).optional(),
})

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const raw = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }

  const admin = createRawAdminClient()
  await admin.from('analytics_events').insert({
    ...parsed.data,
    user_id: user.id,
  })

  return NextResponse.json({ ok: true })
}
