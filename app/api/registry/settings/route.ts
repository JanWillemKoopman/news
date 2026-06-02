import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, createRawAdminClient } from '@/lib/supabase/admin'
import { hashPassword } from '@/lib/crypto/password'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  weddingId: z.string().uuid(),
  isEnabled: z.boolean().optional(),
  password: z.string().max(200).optional().nullable(),
  introText: z.string().max(5000).optional(),
  bankAccountIban: z.string().max(50).optional(),
  bankAccountName: z.string().max(200).optional(),
  thema: z.string().optional(),
  kleurAccent: z.string().optional(),
  kopLettertype: z.string().optional(),
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
  const { weddingId, password, ...rest } = parsed.data

  const admin = createAdminClient()
  const rawAdmin = createRawAdminClient()

  const { data: member } = await admin
    .from('wedding_members')
    .select('role')
    .eq('wedding_id', weddingId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!member || !['owner', 'planner'].includes(member.role)) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (rest.isEnabled !== undefined) dbPatch.is_enabled = rest.isEnabled
  if (rest.introText !== undefined) dbPatch.intro_text = rest.introText
  if (rest.bankAccountIban !== undefined) dbPatch.bank_account_iban = rest.bankAccountIban
  if (rest.bankAccountName !== undefined) dbPatch.bank_account_name = rest.bankAccountName
  if (rest.thema !== undefined) dbPatch.thema = rest.thema
  if (rest.kleurAccent !== undefined) dbPatch.kleur_accent = rest.kleurAccent
  if (rest.kopLettertype !== undefined) dbPatch.kop_lettertype = rest.kopLettertype

  if (password !== undefined) {
    dbPatch.password = password ? await hashPassword(password) : null
  }

  const { data: existing } = await rawAdmin
    .from('registry_settings')
    .select('id')
    .eq('wedding_id', weddingId)
    .maybeSingle()

  let result
  if (existing) {
    const { data, error } = await rawAdmin
      .from('registry_settings')
      .update(dbPatch)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: 'Opslaan mislukt' }, { status: 500 })
    result = data
  } else {
    const { data, error } = await rawAdmin
      .from('registry_settings')
      .insert({ wedding_id: weddingId, ...dbPatch })
      .select()
      .single()
    if (error) return NextResponse.json({ error: 'Opslaan mislukt' }, { status: 500 })
    result = data
  }

  const r = result as Record<string, unknown>
  return NextResponse.json({
    id: r.id,
    weddingId: r.wedding_id,
    isEnabled: r.is_enabled,
    password: r.password ? '••••' : '',
    introText: r.intro_text ?? '',
    bankAccountIban: r.bank_account_iban ?? '',
    bankAccountName: r.bank_account_name ?? '',
    thema: r.thema ?? 'klassiek',
    kleurAccent: r.kleur_accent ?? '#a75573',
    kopLettertype: r.kop_lettertype ?? 'cormorant',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  })
}
