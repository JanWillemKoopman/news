import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { AgentId, ChatSession, Message, Phase } from '@/types'

const VALID_PHASES: Phase[] = ['intake', 'planning', 'final']

function buildPreview(messages: Message[]): string | null {
  const firstUser = messages.find((m) => m.role === 'user')
  if (!firstUser) return null
  return firstUser.content.slice(0, 140)
}

function deriveTitle(messages: Message[], existing: string | null): string {
  if (existing && existing !== 'Nieuwe sessie') return existing
  const firstUser = messages.find((m) => m.role === 'user')
  if (!firstUser) return existing || 'Nieuwe sessie'
  const oneLine = firstUser.content.replace(/\s+/g, ' ').trim()
  return oneLine.length > 60 ? `${oneLine.slice(0, 57)}…` : oneLine || 'Nieuwe sessie'
}

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const { id } = ctx.params
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
  return NextResponse.json({ session: data as ChatSession })
}

interface PatchBody {
  title?: string
  messages?: Message[]
  phase?: Phase
  intakeRound?: number
  planningRound?: number
  selectedAgents?: AgentId[]
}

export async function PATCH(request: NextRequest, ctx: { params: { id: string } }) {
  const { id } = ctx.params
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  let body: PatchBody = {}
  try {
    body = (await request.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: 'Ongeldige body' }, { status: 400 })
  }

  // Haal huidig record op om title intelligent te updaten.
  const { data: existing } = await supabase
    .from('chat_sessions')
    .select('title')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (typeof body.title === 'string' && body.title.trim()) {
    update.title = body.title.trim().slice(0, 120)
  }
  if (Array.isArray(body.messages)) {
    update.messages = body.messages
    update.preview = buildPreview(body.messages)
    if (typeof body.title !== 'string') {
      update.title = deriveTitle(body.messages, (existing as { title: string }).title)
    }
  }
  if (body.phase && VALID_PHASES.includes(body.phase)) {
    update.phase = body.phase
  }
  if (typeof body.intakeRound === 'number' && body.intakeRound >= 0) {
    update.intake_round = body.intakeRound
  }
  if (typeof body.planningRound === 'number' && body.planningRound >= 0) {
    update.planning_round = body.planningRound
  }
  if (Array.isArray(body.selectedAgents)) {
    update.selected_agents = body.selectedAgents
  }

  const { data, error } = await supabase
    .from('chat_sessions')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session: data as ChatSession })
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  const { id } = ctx.params
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
