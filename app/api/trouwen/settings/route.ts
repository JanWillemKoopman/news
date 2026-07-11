import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { decryptSitePassword, encryptSitePassword } from '@/lib/crypto/sitePassword'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPlatformAdmin } from '@/lib/supabase/authz'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Wachtwoord wordt hier server-side versleuteld (omkeerbaar, zie
// lib/crypto/sitePassword.ts) en weggeschreven; de directe client-upsert-
// laag (saveWebsiteContent) raakt site_password nooit aan — alleen deze
// route mag de kolom lezen/schrijven. Een leeg wachtwoord (na trim)
// verwijdert de bescherming (site_password wordt null). Omkeerbaar (i.p.v.
// een onomkeerbare hash) is een bewuste keuze: de eigenaar moet het
// ingestelde wachtwoord kunnen terugzien in de editor.
const bodySchema = z.object({
  weddingId: z.string().uuid(),
  password: z.string().max(200).optional(),
})

async function verifieerEigenaar(weddingId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: member } = await admin
    .from('wedding_members')
    .select('role')
    .eq('wedding_id', weddingId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!member || member.role !== 'owner') {
    if (!(await isPlatformAdmin(supabase, user.id))) return null
  }

  return admin
}

export async function GET(request: NextRequest) {
  const weddingId = request.nextUrl.searchParams.get('weddingId') ?? ''
  if (!z.string().uuid().safeParse(weddingId).success) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }

  const admin = await verifieerEigenaar(weddingId)
  if (!admin) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })

  const { data: content } = await admin
    .from('website_content')
    .select('site_password')
    .eq('wedding_id', weddingId)
    .maybeSingle()

  const stored = content?.site_password ?? null
  return NextResponse.json({ isSet: !!stored, password: decryptSitePassword(stored) })
}

export async function PATCH(request: NextRequest) {
  const raw = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }
  const { weddingId, password } = parsed.data

  const admin = await verifieerEigenaar(weddingId)
  if (!admin) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })

  const trimmed = password?.trim() ?? ''
  const encrypted = trimmed ? encryptSitePassword(trimmed) : null

  const { error } = await admin
    .from('website_content')
    .update({ site_password: encrypted })
    .eq('wedding_id', weddingId)

  if (error) return NextResponse.json({ error: 'Opslaan mislukt' }, { status: 500 })

  return NextResponse.json({ sitePasswordSet: !!encrypted, password: trimmed || null })
}
