import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type {
  AgentId,
  ChatSession,
  ChatSessionSummary,
  ClientProfile,
  Message,
  Phase,
} from '@/types'

const VALID_PHASES: Phase[] = ['intake', 'planning', 'final']

function buildPreview(messages: Message[]): string | null {
  const firstUser = messages.find((m) => m.role === 'user')
  if (!firstUser) return null
  return firstUser.content.slice(0, 140)
}

function buildTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === 'user')
  if (!firstUser) return 'Nieuwe sessie'
  const oneLine = firstUser.content.replace(/\s+/g, ' ').trim()
  return oneLine.length > 60 ? `${oneLine.slice(0, 57)}…` : oneLine || 'Nieuwe sessie'
}

export async function GET() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data, error } = await supabase
    .from('chat_sessions')
    .select('id, title, preview, phase, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sessions: (data ?? []) as ChatSessionSummary[] })
}

interface CreateSessionBody {
  selectedAgents?: AgentId[]
  messages?: Message[]
  phase?: Phase
  clientProfileId?: string | null
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  let body: CreateSessionBody = {}
  try {
    body = (await request.json()) as CreateSessionBody
  } catch {
    body = {}
  }

  const messages = Array.isArray(body.messages) ? body.messages : []
  const selected = Array.isArray(body.selectedAgents) ? body.selectedAgents : []
  const phase: Phase = body.phase && VALID_PHASES.includes(body.phase) ? body.phase : 'intake'
  const clientProfileId =
    typeof body.clientProfileId === 'string' && body.clientProfileId
      ? body.clientProfileId
      : null

  // Snapshot het gekozen klantprofiel zodat latere wijzigingen oude sessies
  // niet vervuilen. Als geen klantprofiel is meegegeven: geen snapshot.
  let snapshot: ClientProfile | null = null
  if (clientProfileId) {
    const { data: profileRow } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('id', clientProfileId)
      .eq('user_id', user.id)
      .maybeSingle()
    snapshot = (profileRow ?? null) as ClientProfile | null
  }

  const insertPayload = {
    user_id: user.id,
    title: buildTitle(messages),
    preview: buildPreview(messages),
    phase,
    intake_round: 0,
    planning_round: 0,
    selected_agents: selected,
    messages,
    client_profile_id: snapshot ? clientProfileId : null,
    company_profile_snapshot: snapshot,
  }

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert(insertPayload)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session: data as ChatSession })
}
