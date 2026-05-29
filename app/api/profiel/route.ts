import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { displayName, email, avatarUrl } = body as {
    displayName?: string
    email?: string
    avatarUrl?: string | null
  }

  const profilePatch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (displayName !== undefined) profilePatch.display_name = displayName.trim()
  if (email !== undefined) profilePatch.email = email.trim().toLowerCase()
  if (avatarUrl !== undefined) profilePatch.avatar_url = avatarUrl

  const { error: profileError } = await supabase
    .from('profiles')
    .update(profilePatch)
    .eq('id', user.id)
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  if (email !== undefined && email.trim().toLowerCase() !== user.email) {
    const { error: authError } = await supabase.auth.updateUser({
      email: email.trim().toLowerCase(),
    })
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
