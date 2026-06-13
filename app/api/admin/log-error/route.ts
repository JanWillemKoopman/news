import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { createRawAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  level:     z.enum(['error', 'warning', 'info']).default('error'),
  message:   z.string().max(2000),
  stack:     z.string().max(10000).optional(),
  path:      z.string().max(500).optional(),
  component: z.string().max(200).optional(),
  metadata:  z.record(z.string(), z.unknown()).optional(),
})

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const raw = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }

  const admin = createRawAdminClient()
  await admin.from('error_logs').insert({
    ...parsed.data,
    user_id: user?.id ?? null,
  })

  return NextResponse.json({ ok: true })
}
