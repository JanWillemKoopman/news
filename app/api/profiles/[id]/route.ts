import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ClientProfile } from '@/types'

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const { id } = ctx.params
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data, error } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
  return NextResponse.json({ profile: data as ClientProfile })
}

export async function PUT(request: NextRequest, ctx: { params: { id: string } }) {
  const { id } = ctx.params
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const body = (await request.json()) as Partial<ClientProfile>

  if (!body.name?.trim() || !body.industry?.trim() || !body.description?.trim()) {
    return NextResponse.json(
      { error: 'Klantnaam, branche en omschrijving zijn verplicht.' },
      { status: 400 }
    )
  }

  const payload = {
    name: body.name.trim(),
    industry: body.industry.trim(),
    description: body.description.trim(),
    channels: body.channels ?? [],
    expertise: body.expertise ?? [],
    website: body.website || null,
    audience: body.audience || null,
    usp: body.usp || null,
    tools: body.tools || null,
    budget: body.budget || null,
    tone_of_voice: body.tone_of_voice || null,
    competitors: body.competitors || null,
    goals: body.goals || null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('client_profiles')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data as ClientProfile })
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  const { id } = ctx.params
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { error } = await supabase
    .from('client_profiles')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
