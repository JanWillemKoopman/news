import { NextResponse } from 'next/server'
import { z } from 'zod'

import { themeConfigSchema } from '@/lib/bruiloft/theme'
import { createClient } from '@/lib/supabase/server'

// Slaat een gevalideerd thema op bij de opgegeven bruiloft. Alleen owner/
// planner mag de styling van de publieke pagina aanpassen.
//
// We doen een upsert op website_content omdat een bruiloft mogelijk nog geen
// content-rij heeft (de admin kan eerst stylen, daarna inhoud invullen).

const bodySchema = z.object({
  weddingId: z.string().uuid(),
  theme: themeConfigSchema,
})

const ALLOWED_ROLES = new Set(['owner', 'planner'])

export async function POST(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  let payload: z.infer<typeof bodySchema>
  try {
    payload = bodySchema.parse(await req.json())
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof z.ZodError ? e.issues[0].message : 'Ongeldige invoer' },
      { status: 400 },
    )
  }

  const { data: member, error: memberError } = await supabase
    .from('wedding_members')
    .select('role')
    .eq('wedding_id', payload.weddingId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (memberError) {
    return NextResponse.json({ error: 'Kan rechten niet controleren.' }, { status: 500 })
  }
  if (!member || !ALLOWED_ROLES.has(member.role)) {
    return NextResponse.json(
      { error: 'Alleen eigenaar of planner mag de vormgeving aanpassen.' },
      { status: 403 },
    )
  }

  const { error: upsertError } = await supabase
    .from('website_content')
    .upsert(
      { wedding_id: payload.weddingId, theme_config: payload.theme },
      { onConflict: 'wedding_id' },
    )

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
