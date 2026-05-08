import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { CompanyProfile } from '@/types'

export async function GET() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ profile: null }, { status: 401 })

  const { data, error } = await supabase
    .from('company_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data ?? null })
}

export async function PUT(request: NextRequest) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const body = (await request.json()) as Partial<CompanyProfile>

  if (!body.name?.trim() || !body.industry?.trim() || !body.description?.trim()) {
    return NextResponse.json(
      { error: 'Bedrijfsnaam, branche en omschrijving zijn verplicht.' },
      { status: 400 }
    )
  }

  const payload = {
    user_id: user.id,
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
    .from('company_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}
