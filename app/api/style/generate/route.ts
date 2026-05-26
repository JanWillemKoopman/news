import { NextResponse } from 'next/server'
import { z } from 'zod'

import { generateThemeFromPrompt, ThemeGenerationError } from '@/lib/ai/gemini-theme'
import { themeConfigSchema } from '@/lib/bruiloft/theme'
import { createClient } from '@/lib/supabase/server'

// Genereert een ThemeConfig op basis van een natuurlijke prompt. Slaat
// NIETS op — de admin-UI doet eerst een preview, en POSTet daarna naar
// /api/style/save om te bewaren.
//
// Vereist: ingelogde gebruiker die lid is van minstens één bruiloft. We
// koppelen het op deze plek niet aan een specifieke wedding_id, omdat we
// alleen genereren (geen mutatie); de save-route bewaakt de wedding_id-scope.
//
// Rate-limit: simpele in-memory limiter (per process). Genoeg om tegen
// per-ongeluk-bursts te beschermen; voor productie zou je dit naar Redis
// of een edge-tabel willen verplaatsen.

const RATE_WINDOW_MS = 60 * 60 * 1000 // 1 uur
const RATE_LIMIT = 20

const calls = new Map<string, number[]>()

function checkRate(userId: string): boolean {
  const now = Date.now()
  const window = now - RATE_WINDOW_MS
  const recent = (calls.get(userId) ?? []).filter((t) => t > window)
  if (recent.length >= RATE_LIMIT) return false
  recent.push(now)
  calls.set(userId, recent)
  return true
}

const bodySchema = z.object({
  prompt: z.string().min(3).max(500),
  currentTheme: themeConfigSchema.optional(),
})

export async function POST(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  if (!checkRate(user.id)) {
    return NextResponse.json(
      { error: 'Even pauzeren — je hebt je limiet bereikt. Probeer over een uur opnieuw.' },
      { status: 429 },
    )
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

  try {
    const theme = await generateThemeFromPrompt(payload)
    return NextResponse.json({ theme })
  } catch (e) {
    const msg =
      e instanceof ThemeGenerationError
        ? e.message
        : 'Onbekende fout bij thema-generatie.'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
