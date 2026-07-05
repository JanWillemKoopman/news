import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { hashPassword } from '@/lib/crypto/password'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Wachtwoord wordt hier server-side gehasht en weggeschreven; de directe
// client-upsert-laag (saveWebsiteContent) raakt site_password nooit aan —
// alleen deze route mag de kolom schrijven. Een leeg wachtwoord (na trim)
// verwijdert de bescherming (site_password wordt null).
const bodySchema = z.object({
  weddingId: z.string().uuid(),
  password: z.string().max(200).optional(),
})

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const raw = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }
  const { weddingId, password } = parsed.data

  const admin = createAdminClient()

  const { data: member } = await admin
    .from('wedding_members')
    .select('role')
    .eq('wedding_id', weddingId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!member || member.role !== 'owner') {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  const trimmed = password?.trim() ?? ''
  const hashed = trimmed ? await hashPassword(trimmed) : null

  const { error } = await admin
    .from('website_content')
    .update({ site_password: hashed })
    .eq('wedding_id', weddingId)

  if (error) return NextResponse.json({ error: 'Opslaan mislukt' }, { status: 500 })

  return NextResponse.json({ sitePasswordSet: !!hashed })
}
