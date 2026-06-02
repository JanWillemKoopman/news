import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const rawBody = await req.json().catch(() => ({}))
  const parsed = z.object({
    displayName: z.string().max(100).optional(),
    email: z.string().email().optional(),
    avatarUrl: z
      .string()
      .url()
      .refine(
        (url) => {
          try {
            return new URL(url).hostname.endsWith('.supabase.co')
          } catch {
            return false
          }
        },
        { message: 'Avatar moet van Supabase Storage komen' }
      )
      .nullable()
      .optional(),
    emailHerinneringen: z.boolean().optional(),
  }).safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const { displayName, email, avatarUrl, emailHerinneringen } = parsed.data

  const profilePatch: {
    updated_at: string
    display_name?: string
    email?: string
    avatar_url?: string | null
    email_herinneringen?: boolean
  } = { updated_at: new Date().toISOString() }
  if (displayName !== undefined) profilePatch.display_name = displayName.trim()
  if (email !== undefined) profilePatch.email = email.trim().toLowerCase()
  if (avatarUrl !== undefined) profilePatch.avatar_url = avatarUrl
  if (emailHerinneringen !== undefined) profilePatch.email_herinneringen = emailHerinneringen

  const { error: profileError } = await supabase
    .from('profiles')
    .update(profilePatch)
    .eq('id', user.id)
  if (profileError) {
    return NextResponse.json({ error: 'Profiel bijwerken mislukt' }, { status: 500 })
  }

  if (email !== undefined && email.trim().toLowerCase() !== user.email) {
    const { error: authError } = await supabase.auth.updateUser({
      email: email.trim().toLowerCase(),
    })
    if (authError) {
      return NextResponse.json({ error: 'E-mailadres bijwerken mislukt' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
