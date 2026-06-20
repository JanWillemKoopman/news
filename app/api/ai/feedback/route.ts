import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Slaat een duim omhoog/omlaag op een individueel AI-advies op (#14). Eén stem
// per gebruiker per advies; opnieuw stemmen overschrijft de vorige waardering.
// Vormt de basis om te meten welk advies nuttig is en de adviezen te verbeteren.

const schema = z.object({
  weddingId: z.string().uuid(),
  adviesKey: z.string().min(1).max(400),
  adviesTitel: z.string().max(300).optional(),
  adviesType: z.string().max(40).optional(),
  sectie: z.string().max(200).optional(),
  waardering: z.enum(['omhoog', 'omlaag']),
})

export async function POST(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const raw = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }
  const d = parsed.data

  const { error } = await (supabase as any).from('ai_advice_feedback').upsert(
    {
      wedding_id: d.weddingId,
      user_id: user.id,
      advies_key: d.adviesKey,
      advies_titel: d.adviesTitel ?? '',
      advies_type: d.adviesType ?? 'actie',
      sectie: d.sectie ?? '',
      waardering: d.waardering,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'wedding_id,user_id,advies_key' }
  )

  if (error) {
    return NextResponse.json({ error: 'Opslaan mislukt' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
