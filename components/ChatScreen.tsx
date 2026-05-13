'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, ArrowLeft, Menu, RefreshCw, Send } from 'lucide-react'
import {
  AGENTS,
  AGENT_NAME_TO_ID,
  MANAGER_NAME,
} from '@/lib/agents'
import { useChatStore } from '@/store/chatStore'
import type {
  AgentId,
  ChatSession,
  ConversationEntry,
  Message,
  Phase,
} from '@/types'
import MessageBubble from './MessageBubble'
import TypingIndicator from './TypingIndicator'
import SessionSidebar from './SessionSidebar'

const PHASE_LABELS: Record<Phase, string> = {
  intake: 'Gesprek',
  planning: 'Uitwerking',
  final: 'Bijsturen',
}

export default function ChatScreen() {
  const {
    selectedAgents,
    messages,
    isTyping,
    typingAgent,
    phase,
    intakeRound,
    planningRound,
    error,
    addMessage,
    updateMessageContent,
    setTyping,
    setError,
    setPhase,
    incrementIntakeRound,
    incrementPlanningRound,
    resetSession,
    currentSessionId,
    setCurrentSessionId,
    currentClientProfile,
    sessionTitle,
    isResumed,
  } = useChatStore()

  const [inputValue, setInputValue] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [retryPayload, setRetryPayload] = useState<{
    userMessage: string
    snapshotMessages: Message[]
  } | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sessionsRefreshKey, setSessionsRefreshKey] = useState(0)
  const [resumeBannerDismissed, setResumeBannerDismissed] = useState(false)
  const [planSteps, setPlanSteps] = useState<string[]>([])
  const [currentPlanStep, setCurrentPlanStep] = useState(0)
  const [inputError, setInputError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const prevLoading = useRef(false)
  const sessionCreateInFlight = useRef(false)
  const lastSavedHash = useRef<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (messages.length <= 1 && !isTyping) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Reset window scroll bij entry en bij sessiewisseling zodat sticky header correct uitlijnt
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [currentSessionId])

  // Geef focus terug aan de input nadat een verzoek klaar is (niet bij initieel laden)
  useEffect(() => {
    if (prevLoading.current && !isLoading) {
      inputRef.current?.focus()
    }
    prevLoading.current = isLoading
  }, [isLoading])

  // Detect of de gebruiker is ingelogd (alleen ingelogd → sidebar + auto-save)
  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const { createSupabaseBrowserClient } = await import(
          '@/lib/supabase/client'
        )
        const supabase = createSupabaseBrowserClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!cancelled) setIsAuthenticated(Boolean(user))
      } catch {
        if (!cancelled) setIsAuthenticated(false)
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [])

  // Maak een nieuwe sessie aan zodra een ingelogde gebruiker op het chatscherm
  // komt zonder bestaande sessie. Snapshot van het klantprofiel gebeurt server-side.
  useEffect(() => {
    if (!isAuthenticated) return
    if (currentSessionId) return
    if (sessionCreateInFlight.current) return
    sessionCreateInFlight.current = true
    ;(async () => {
      try {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            selectedAgents,
            phase,
            clientProfileId: currentClientProfile?.id ?? null,
          }),
        })
        if (!res.ok) return
        const { session } = (await res.json()) as { session: ChatSession }
        if (session?.id) {
          setCurrentSessionId(session.id)
          setSessionsRefreshKey((k) => k + 1)
        }
      } finally {
        sessionCreateInFlight.current = false
      }
    })()
    // We willen alleen reageren op auth-status en sessionId; de andere velden
    // worden bij creatie meegestuurd maar veroorzaken geen re-creatie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentSessionId])

  // Bij elke sessie-wissel: reset save-hash zodat de nieuwe sessie minstens
  // één keer wordt opgeslagen (of bij hydrate niets dubbel gebeurt).
  useEffect(() => {
    lastSavedHash.current = null
  }, [currentSessionId])

  // Auto-save: debounce 800ms na laatste wijziging — patch sessie naar Supabase.
  useEffect(() => {
    if (!isAuthenticated) return
    if (!currentSessionId) return
    if (isTyping) return // wachten tot streaming pauzeert

    const hash = JSON.stringify({
      messages,
      phase,
      intakeRound,
      planningRound,
      selectedAgents,
    })
    if (hash === lastSavedHash.current) return

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sessions/${currentSessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            phase,
            intakeRound,
            planningRound,
            selectedAgents,
          }),
        })
        if (res.ok) {
          lastSavedHash.current = hash
          setSessionsRefreshKey((k) => k + 1)
        }
      } catch {
        // stille fail; volgende wijziging probeert opnieuw
      }
    }, 800)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [
    isAuthenticated,
    currentSessionId,
    messages,
    phase,
    intakeRound,
    planningRound,
    selectedAgents,
    isTyping,
  ])

  // ── Helpers ──────────────────────────────────────────────────────────────

  const buildHistory = (msgs: Message[]): ConversationEntry[] =>
    msgs.map((m) => {
      if (m.role === 'user') return { role: 'user' as const, content: m.content }
      if (m.role === 'manager')
        return { role: 'model' as const, content: `[${MANAGER_NAME} — Marketing Manager]: ${m.content}` }
      if (m.role === 'agent' && m.agentName) {
        const agent = m.agentId ? AGENTS[m.agentId] : null
        const title = agent ? agent.title : 'Specialist'
        return { role: 'model' as const, content: `[${m.agentName} — ${title}]: ${m.content}` }
      }
      if (m.role === 'plan')
        return { role: 'model' as const, content: `[Leveringsstuk opgeleverd door ${MANAGER_NAME}]:\n${m.content}` }
      return { role: 'model' as const, content: m.content }
    })

  // ── API helpers ──────────────────────────────────────────────────────────

  const callApi = async <T,>(action: string, payload: object): Promise<T> => {
    const state = useChatStore.getState()
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        sessionId: state.currentSessionId,
        clientProfileId: state.currentClientProfile?.id ?? null,
        ...payload,
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      const msg = body?.message ?? 'Er ging iets mis. Controleer je verbinding en probeer het opnieuw.'
      const err = new Error(msg) as Error & { code?: string }
      if (body?.error) err.code = body.error
      throw err
    }
    return res.json() as Promise<T>
  }

  // NDJSON stream-events van de backend
  type RouterAction =
    | 'ask_followup'
    | 'answer_directly'
    | 'consult_specialist'
    | 'start_workout'
  type StreamEvent =
    | { type: 'meta'; agentId?: AgentId; agentName?: string }
    | {
        type: 'decision'
        action: RouterAction
        specialist?: string
        briefing?: string
      }
    | { type: 'chunk'; text: string }
    | { type: 'done' }
    | { type: 'error'; message: string }

  async function* streamApi(
    action: string,
    payload: object
  ): AsyncGenerator<StreamEvent> {
    const state = useChatStore.getState()
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        sessionId: state.currentSessionId,
        clientProfileId: state.currentClientProfile?.id ?? null,
        ...payload,
      }),
    })
    if (!res.ok || !res.body) {
      const body = res.body ? await res.json().catch(() => null) : null
      const msg = body?.message ?? 'Er ging iets mis. Controleer je verbinding en probeer het opnieuw.'
      const err = new Error(msg) as Error & { code?: string }
      if (body?.error) err.code = body.error
      throw err
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const parseLine = (line: string): StreamEvent | null => {
      const trimmed = line.trim()
      if (!trimmed) return null
      try {
        return JSON.parse(trimmed) as StreamEvent
      } catch {
        return null
      }
    }

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let nl = buffer.indexOf('\n')
      while (nl !== -1) {
        const line = buffer.slice(0, nl)
        buffer = buffer.slice(nl + 1)
        const event = parseLine(line)
        if (event) yield event
        nl = buffer.indexOf('\n')
      }
    }
    const tail = parseLine(buffer)
    if (tail) yield tail
  }

  // ── Specialist beurt afhandelen ──────────────────────────────────────────

  const runSpecialistTurn = useCallback(
    async (agentName: string, briefing: string, round: number) => {
      const currentMsgs = useChatStore.getState().messages
      const history = buildHistory(currentMsgs)

      setTyping(true, agentName)

      const messageId = crypto.randomUUID()
      let buffer = ''
      let added = false
      let agentId: AgentId | undefined =
        AGENT_NAME_TO_ID[agentName] as AgentId | undefined

      // Gebruik de huidige store-fase als message-fase: 'planning' tijdens een
      // uitwerking, 'intake' bij een ad-hoc consult tijdens het gesprek.
      const messagePhase = useChatStore.getState().phase

      for await (const event of streamApi('specialist_turn', {
        agentName,
        briefing,
        messages: history,
        round,
      })) {
        if (event.type === 'meta') {
          if (event.agentId) agentId = event.agentId
        } else if (event.type === 'chunk') {
          buffer += event.text
          if (!added) {
            setTyping(false)
            addMessage({
              id: messageId,
              role: 'agent',
              agentId,
              agentName,
              content: buffer,
              timestamp: Date.now(),
              phase: messagePhase,
            })
            added = true
          } else {
            updateMessageContent(messageId, buffer)
          }
        } else if (event.type === 'error') {
          throw new Error(event.message)
        }
      }

      setTyping(false)
      if (added) {
        // Trim eventuele trailing whitespace voor nette opslag
        const trimmed = buffer.trim()
        if (trimmed !== buffer) updateMessageContent(messageId, trimmed)
      }

      // Korte pauze voor render-rust
      await new Promise((r) => setTimeout(r, 90))
    },
    [addMessage, updateMessageContent, setTyping]
  )

  // ── Planning loop: kickoff → ronde 1 → manager check → eventueel ronde 2 → finalize
  const runPlanningLoop = useCallback(async () => {
    setPhase('planning')
    setPlanSteps([])
    setCurrentPlanStep(0)

    // Kickoff: type leveringsstuk + volgorde + briefings + intro-bericht
    setTyping(true, MANAGER_NAME)
    const { plan } = await callApi<{
      plan: {
        deliverable_type?: string
        speaking_order: string[]
        briefings: Record<string, string>
        kickoff_message: string
      }
    }>('planning_kickoff', {
      messages: buildHistory(useChatStore.getState().messages),
      selectedAgents: useChatStore.getState().selectedAgents,
    })
    setTyping(false)

    // Zet de stappen nu we de speaking_order kennen
    setPlanSteps(plan.speaking_order.filter((n) => AGENT_NAME_TO_ID[n]))

    addMessage({
      id: crypto.randomUUID(),
      role: 'manager',
      content: plan.kickoff_message,
      timestamp: Date.now(),
      phase: 'planning',
    })

    incrementPlanningRound() // ronde 1

    // Ronde 1: alle specialisten in opgegeven volgorde
    for (let i = 0; i < plan.speaking_order.length; i++) {
      const agentName = plan.speaking_order[i]
      if (!AGENT_NAME_TO_ID[agentName]) continue
      setCurrentPlanStep(i)
      const briefing = plan.briefings[agentName] ?? ''
      await runSpecialistTurn(agentName, briefing, 1)
    }

    // Manager-check
    setTyping(true, MANAGER_NAME)
    const { decision } = await callApi<{
      decision: {
        action: 'second_round' | 'finalize'
        follow_up: { agent: string; briefing: string }[]
        reason?: string
      }
    }>('manager_check', {
      messages: buildHistory(useChatStore.getState().messages),
      selectedAgents: useChatStore.getState().selectedAgents,
      round: 1,
    })
    setTyping(false)

    if (decision.action === 'second_round' && decision.follow_up.length > 0) {
      addMessage({
        id: crypto.randomUUID(),
        role: 'manager',
        content:
          decision.reason
            ? `Mooi werk team. Ik wil nog op een paar punten doorpakken: ${decision.reason}`
            : 'Goed begin team — ik wil nog op een paar punten doorpakken voor we het plan finaliseren.',
        timestamp: Date.now(),
        phase: 'planning',
      })

      // Voeg tweede-ronde stappen toe aan de lijst
      const r2names = decision.follow_up
        .filter((f) => AGENT_NAME_TO_ID[f.agent])
        .map((f) => f.agent)
      setPlanSteps((prev) => [...prev, ...r2names])

      incrementPlanningRound() // ronde 2
      for (let i = 0; i < decision.follow_up.length; i++) {
        const item = decision.follow_up[i]
        if (!AGENT_NAME_TO_ID[item.agent]) continue
        setCurrentPlanStep(plan.speaking_order.length + i)
        await runSpecialistTurn(item.agent, item.briefing, 2)
      }
    }

    // Finalize: manager schrijft het leveringsstuk in passend format (streamend)
    setTyping(true, MANAGER_NAME)
    const finalId = crypto.randomUUID()
    let finalBuffer = ''
    let finalAdded = false

    for await (const event of streamApi('finalize', {
      messages: buildHistory(useChatStore.getState().messages),
      deliverableType: plan.deliverable_type,
    })) {
      if (event.type === 'chunk') {
        finalBuffer += event.text
        if (!finalAdded) {
          setTyping(false)
          addMessage({
            id: finalId,
            role: 'plan',
            content: finalBuffer,
            timestamp: Date.now(),
            phase: 'final',
          })
          finalAdded = true
        } else {
          updateMessageContent(finalId, finalBuffer)
        }
      } else if (event.type === 'error') {
        throw new Error(event.message)
      }
    }
    setTyping(false)
    if (finalAdded) {
      const trimmed = finalBuffer.trim()
      if (trimmed !== finalBuffer) updateMessageContent(finalId, trimmed)
    }

    setPlanSteps([])
    setCurrentPlanStep(0)
    setPhase('final')
  }, [
    addMessage,
    updateMessageContent,
    setTyping,
    setPhase,
    incrementPlanningRound,
    runSpecialistTurn,
  ])

  // ── Gespreks-loop: manager kiest per beurt actie ─────────────────────────
  // De backend stuurt eerst een 'decision' event met één van vier acties.
  // Daarna stromen optioneel manager-tekst-chunks binnen. Bij consult_specialist
  // volgt na de manager-aankondiging direct een specialist-beurt; bij
  // start_workout slaan we de manager-tekst over en gaan we naar de uitwerking.

  const runIntake = useCallback(async () => {
    setTyping(true, MANAGER_NAME)
    const history = buildHistory(useChatStore.getState().messages)
    const round = useChatStore.getState().intakeRound + 1

    let decision: RouterAction | null = null
    let consultSpecialist: string | undefined
    let consultBriefing: string | undefined
    const messageId = crypto.randomUUID()
    let buffer = ''
    let added = false

    for await (const event of streamApi('intake_turn', {
      messages: history,
      intakeRound: round,
    })) {
      if (event.type === 'decision') {
        decision = event.action
        if (event.action === 'consult_specialist') {
          consultSpecialist = event.specialist
          consultBriefing = event.briefing
        }
      } else if (event.type === 'chunk') {
        buffer += event.text
        if (!added) {
          setTyping(false)
          addMessage({
            id: messageId,
            role: 'manager',
            content: buffer,
            timestamp: Date.now(),
            phase: 'intake',
          })
          added = true
        } else {
          updateMessageContent(messageId, buffer)
        }
      } else if (event.type === 'error') {
        throw new Error(event.message)
      }
    }
    setTyping(false)
    if (added) {
      const trimmed = buffer.trim()
      if (trimmed !== buffer) updateMessageContent(messageId, trimmed)
    }

    // Vervolgactie op basis van decision
    if (decision === 'start_workout') {
      await runPlanningLoop()
      return
    }
    if (
      decision === 'consult_specialist' &&
      consultSpecialist &&
      AGENT_NAME_TO_ID[consultSpecialist]
    ) {
      // Kleine pauze voor render-rust tussen manager-aankondiging en specialist
      await new Promise((r) => setTimeout(r, 120))
      await runSpecialistTurn(
        consultSpecialist,
        consultBriefing ?? '',
        round
      )
      incrementIntakeRound()
      return
    }
    incrementIntakeRound()
  }, [
    addMessage,
    updateMessageContent,
    setTyping,
    runPlanningLoop,
    runSpecialistTurn,
    incrementIntakeRound,
  ])

  // ── Bijsturen: manager past plan aan ─────────────────────────────────────

  const runIteration = useCallback(async () => {
    setTyping(true, MANAGER_NAME)
    const messageId = crypto.randomUUID()
    let buffer = ''
    let added = false

    for await (const event of streamApi('iterate_plan', {
      messages: buildHistory(useChatStore.getState().messages),
    })) {
      if (event.type === 'chunk') {
        buffer += event.text
        if (!added) {
          setTyping(false)
          addMessage({
            id: messageId,
            role: 'plan',
            content: buffer,
            timestamp: Date.now(),
            phase: 'final',
          })
          added = true
        } else {
          updateMessageContent(messageId, buffer)
        }
      } else if (event.type === 'error') {
        throw new Error(event.message)
      }
    }
    setTyping(false)
    if (added) {
      const trimmed = buffer.trim()
      if (trimmed !== buffer) updateMessageContent(messageId, trimmed)
    }
  }, [addMessage, updateMessageContent, setTyping])

  // ── Main orchestratie na elk gebruikersbericht ───────────────────────────

  const runOrchestration = useCallback(
    async (
      userMessage: string,
      snapshotMessages: Message[],
      onTooLong?: (text: string) => void
    ) => {
      setIsLoading(true)
      setError(null)

      try {
        const currentPhase = useChatStore.getState().phase

        if (currentPhase === 'final') {
          await runIteration()
          return
        }

        // intake fase
        await runIntake()
      } catch (err) {
        setTyping(false)
        const typedErr = err as Error & { code?: string }
        if (typedErr.code === 'too_long') {
          setInputError(typedErr.message)
          onTooLong?.(userMessage)
          return
        }
        const msg = typedErr.message ?? 'Onbekende fout'
        setError(msg)
        setRetryPayload({ userMessage, snapshotMessages })
      } finally {
        setIsLoading(false)
      }
    },
    [runIntake, runIteration, setTyping, setError]
  )

  // ── Event handlers ────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = inputValue.trim()
    if (!text || isLoading) return

    setInputValue('')
    setRetryPayload(null)
    setError(null)

    const snapshot = useChatStore.getState().messages

    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    })

    await runOrchestration(text, snapshot, (original) => setInputValue(original))
  }

  const handleRetry = async () => {
    if (!retryPayload) return
    const payload = retryPayload
    setRetryPayload(null)
    await runOrchestration(payload.userMessage, payload.snapshotMessages)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 flex bg-cream-200">
      {isAuthenticated && (
        <SessionSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          refreshKey={sessionsRefreshKey}
          onMutate={() => setSessionsRefreshKey((k) => k + 1)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-cream-500 bg-cream-200/95 backdrop-blur-md px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            {isAuthenticated && (
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sessies"
                className="md:hidden w-9 h-9 rounded-full bg-cream-400 hover:bg-cream-500 border border-cream-500 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <Menu size={15} className="text-ink-600" />
              </button>
            )}
            <button
              onClick={resetSession}
              aria-label="Terug naar bureau-overzicht"
              className="w-9 h-9 rounded-full bg-cream-400 hover:bg-cream-500 border border-cream-500 flex items-center justify-center transition-colors flex-shrink-0"
            >
              <ArrowLeft size={15} className="text-ink-600" />
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-ink-500 uppercase tracking-[0.18em]">
                Marketing sessie
              </p>
              {currentClientProfile?.name && (
                <p className="text-xs text-ink-700 truncate mt-0.5">
                  Klant: <span className="font-medium">{currentClientProfile.name}</span>
                </p>
              )}
            </div>

            <div className="text-[11px] px-2.5 py-1 rounded-full border flex-shrink-0 text-ink-600 bg-cream-50 border-cream-500">
              {PHASE_LABELS[phase]}
            </div>
          </div>
        </header>

        {/* Session resume banner */}
        {isResumed && !resumeBannerDismissed && (() => {
          const phaseHint: Record<string, string> = {
            intake: 'Het team is nog bezig met de intake.',
            planning: 'De uitwerking is in gang.',
            final: 'Het plan is klaar — geef feedback of start een nieuwe sessie.',
          }
          const title = sessionTitle ?? messages.find((m) => m.role === 'manager')?.content?.slice(0, 60)
          return (
            <div className="relative px-4 py-3 bg-cream-50 border-l-4 border-clay-500/20 text-xs text-ink-700 leading-relaxed">
              <button
                onClick={() => setResumeBannerDismissed(true)}
                aria-label="Sluit sessie-banner"
                className="absolute top-2 right-3 text-ink-400 hover:text-ink-600 transition-colors text-sm leading-none"
              >
                ✕
              </button>
              <div className="pr-5 space-y-0.5">
                {title && <p className="font-medium text-ink-800 truncate">{title}{title.length >= 60 ? '…' : ''}</p>}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-ink-500">
                  {currentClientProfile?.name && <span>Klant: <span className="text-ink-700">{currentClientProfile.name}</span></span>}
                  {currentClientProfile?.name && <span aria-hidden>·</span>}
                  <span>{PHASE_LABELS[phase]}</span>
                  <span aria-hidden>·</span>
                  <span>{phaseHint[phase]}</span>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Planning progress indicator */}
        {phase === 'planning' && isTyping && planSteps.length > 0 && (() => {
          const activeAgent = typingAgent && typingAgent !== MANAGER_NAME ? typingAgent : null
          const activeAgentId = activeAgent ? AGENT_NAME_TO_ID[activeAgent] as AgentId | undefined : undefined
          const agentConfig = activeAgentId ? AGENTS[activeAgentId] : null
          const stepLabel = activeAgent
            ? `Stap ${currentPlanStep + 1} van ${planSteps.length} — ${activeAgent} werkt bij`
            : `${typingAgent ?? 'Manager'} coördineert`
          // Extract hex from e.g. "border-[#9c4a3a]/30" → "#9c4a3a"
          const hexMatch = agentConfig?.borderColor.match(/#[0-9a-fA-F]{3,6}/)
          const barBg = hexMatch ? hexMatch[0] : '#b87f6a'
          const pct = Math.min(100, Math.round(((currentPlanStep + 1) / planSteps.length) * 100))
          return (
            <div className="px-4 py-2 bg-cream-50 border-b border-cream-500">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] text-ink-600 font-medium">{stepLabel}</p>
                  <p className="text-[10px] text-ink-400 tabular-nums">{currentPlanStep + 1}/{planSteps.length}</p>
                </div>
                <div className="h-1 w-full bg-cream-400 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 animate-pulse"
                    style={{ width: `${pct}%`, backgroundColor: barBg }}
                  />
                </div>
              </div>
            </div>
          )
        })()}

        {/* Messages */}
        <main className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
          <div className="max-w-2xl mx-auto space-y-5">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}

            {isTyping && <TypingIndicator agentName={typingAgent ?? 'Bureau'} />}

            {error && (
              <div className="p-4 bg-clay-500/10 border border-clay-500/30 rounded-2xl animate-fade-in">
                <div className="flex items-start gap-3">
                  <AlertCircle size={17} className="text-clay-700 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-ink-700 leading-relaxed">{error}</p>
                </div>
                {retryPayload && (
                  <button
                    onClick={handleRetry}
                    aria-label="Probeer opnieuw bericht te versturen"
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-clay-500 hover:bg-clay-600 text-white font-medium text-sm transition-colors"
                  >
                    <RefreshCw size={13} />
                    Probeer opnieuw
                  </button>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input */}
        <footer className="sticky bottom-0 border-t border-cream-500 bg-cream-200/95 backdrop-blur-md px-4 py-4">
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="flex items-end gap-3">
              <textarea
                ref={inputRef}
                rows={inputFocused ? 4 : 1}
                value={inputValue}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onChange={(e) => { setInputValue(e.target.value); setInputError(null) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e as unknown as React.FormEvent)
                  }
                }}
                placeholder={
                  phase === 'final'
                    ? 'Geef bijstuur-feedback op het stuk...'
                    : phase === 'planning'
                    ? 'Aanvulling of vraag tijdens de uitwerking...'
                    : messages.length <= 1
                    ? 'Stel je vraag aan het team...'
                    : 'Jouw antwoord aan de Marketing Manager...'
                }
                aria-label="Jouw bericht aan de Marketing Manager"
                disabled={isLoading}
                maxLength={2000}
                className="flex-1 bg-cream-50 border border-cream-500 rounded-2xl px-4 py-3 text-base text-ink-900 placeholder-ink-400 focus:outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 transition-all disabled:opacity-50 resize-none"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                aria-label="Bericht verzenden"
                className="w-11 h-11 rounded-full bg-clay-500 hover:bg-clay-600 disabled:bg-cream-400 flex items-center justify-center transition-all duration-200 flex-shrink-0 disabled:cursor-not-allowed shadow-sm"
              >
                <Send
                  size={15}
                  className={inputValue.trim() && !isLoading ? 'text-white' : 'text-ink-400'}
                />
              </button>
            </form>
            {/* Inline input errors */}
            {inputError && (
              <p className="mt-1 px-1 text-[11px] text-clay-700 bg-clay-500/10 px-2.5 py-1 rounded-xl border border-clay-500/20">
                {inputError}
              </p>
            )}
            {phase === 'final' && !isLoading && (
              <button
                onClick={resetSession}
                className="mt-2 w-full flex items-center justify-center gap-2 py-2 text-xs text-ink-500 hover:text-ink-700 transition-colors"
              >
                <RefreshCw size={11} />
                Start nieuwe sessie
              </button>
            )}
          </div>
        </footer>
      </div>

    </div>
  )
}
