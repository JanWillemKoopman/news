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
  intake: 'Intake',
  planning: 'Planning',
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

  // Reset window scroll bij entry zodat sticky header/footer correct uitlijnen
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

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
  // komt zonder bestaande sessie. Snapshot van het profiel gebeurt server-side.
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
        return { role: 'model' as const, content: `[${MANAGER_NAME} — Campagne Manager]: ${m.content}` }
      if (m.role === 'agent' && m.agentName) {
        const agent = m.agentId ? AGENTS[m.agentId] : null
        const title = agent ? agent.title : 'Specialist'
        return { role: 'model' as const, content: `[${m.agentName} — ${title}]: ${m.content}` }
      }
      if (m.role === 'plan')
        return { role: 'model' as const, content: `[Campagneplan opgeleverd door ${MANAGER_NAME}]:\n${m.content}` }
      return { role: 'model' as const, content: m.content }
    })

  // ── API helpers ──────────────────────────────────────────────────────────

  const callApi = async <T,>(action: string, payload: object): Promise<T> => {
    const sessionId = useChatStore.getState().currentSessionId
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, sessionId, ...payload }),
    })
    if (!res.ok) throw new Error(`Verzoek mislukt (${res.status})`)
    return res.json() as Promise<T>
  }

  // NDJSON stream-events van de backend
  type StreamEvent =
    | { type: 'meta'; agentId?: AgentId; agentName?: string }
    | { type: 'decision'; action: 'ask_followup' | 'start_planning' }
    | { type: 'chunk'; text: string }
    | { type: 'done' }
    | { type: 'error'; message: string }

  async function* streamApi(
    action: string,
    payload: object
  ): AsyncGenerator<StreamEvent> {
    const sessionId = useChatStore.getState().currentSessionId
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, sessionId, ...payload }),
    })
    if (!res.ok || !res.body) throw new Error(`Verzoek mislukt (${res.status})`)

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
              phase: 'planning',
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

    // Kickoff: volgorde + briefings + intro-bericht
    setTyping(true, MANAGER_NAME)
    const { plan } = await callApi<{
      plan: {
        speaking_order: string[]
        briefings: Record<string, string>
        kickoff_message: string
      }
    }>('planning_kickoff', {
      messages: buildHistory(useChatStore.getState().messages),
      selectedAgents: useChatStore.getState().selectedAgents,
    })
    setTyping(false)

    addMessage({
      id: crypto.randomUUID(),
      role: 'manager',
      content: plan.kickoff_message,
      timestamp: Date.now(),
      phase: 'planning',
    })

    incrementPlanningRound() // ronde 1

    // Ronde 1: alle specialisten in opgegeven volgorde
    for (const agentName of plan.speaking_order) {
      if (!AGENT_NAME_TO_ID[agentName]) continue
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

      incrementPlanningRound() // ronde 2
      for (const item of decision.follow_up) {
        if (!AGENT_NAME_TO_ID[item.agent]) continue
        await runSpecialistTurn(item.agent, item.briefing, 2)
      }
    }

    // Finalize: manager schrijft compleet plan (streamend)
    setTyping(true, MANAGER_NAME)
    const finalId = crypto.randomUUID()
    let finalBuffer = ''
    let finalAdded = false

    for await (const event of streamApi('finalize', {
      messages: buildHistory(useChatStore.getState().messages),
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

    setPhase('final')
  }, [
    addMessage,
    updateMessageContent,
    setTyping,
    setPhase,
    incrementPlanningRound,
    runSpecialistTurn,
  ])

  // ── Intake loop: manager beslist of doorvragen of starten ────────────────

  const runIntake = useCallback(async () => {
    setTyping(true, MANAGER_NAME)
    const history = buildHistory(useChatStore.getState().messages)
    const round = useChatStore.getState().intakeRound + 1

    let decision: 'ask_followup' | 'start_planning' | null = null
    const messageId = crypto.randomUUID()
    let buffer = ''
    let added = false

    for await (const event of streamApi('intake_turn', {
      messages: history,
      intakeRound: round,
    })) {
      if (event.type === 'decision') {
        decision = event.action
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

    if (decision === 'start_planning') {
      await runPlanningLoop()
      return
    }
    incrementIntakeRound()
  }, [
    addMessage,
    updateMessageContent,
    setTyping,
    runPlanningLoop,
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
    async (userMessage: string, snapshotMessages: Message[]) => {
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
        const msg = err instanceof Error ? err.message : 'Onbekende fout'
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

    await runOrchestration(text, snapshot)
  }

  const handleRetry = async () => {
    if (!retryPayload) return
    const payload = retryPayload
    setRetryPayload(null)
    await runOrchestration(payload.userMessage, payload.snapshotMessages)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex bg-cream-200">
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
                Campagne-bureau · {MANAGER_NAME}
              </p>
            </div>

            <div className="text-[11px] px-2.5 py-1 rounded-full border flex-shrink-0 text-ink-600 bg-cream-50 border-cream-500">
              {PHASE_LABELS[phase]}
            </div>
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
          <div className="max-w-2xl mx-auto space-y-5">
            {isAuthenticated === false && (
              <div className="px-4 py-3 bg-clay-500/10 border border-clay-500/30 rounded-2xl text-xs text-ink-700 leading-relaxed">
                Je werkt in demo-modus. <a href="/login" className="font-medium text-clay-700 underline">Maak een account aan</a> om je sessies te bewaren en later te hervatten.
              </div>
            )}
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}

            {isTyping && <TypingIndicator agentName={typingAgent ?? 'Bureau'} />}

            {error && (
              <div className="flex items-start gap-3 p-4 bg-clay-500/10 border border-clay-500/30 rounded-2xl animate-fade-in">
                <AlertCircle size={17} className="text-clay-700 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-ink-700 leading-relaxed">{error}</p>
                  {retryPayload && (
                    <button
                      onClick={handleRetry}
                      aria-label="Probeer opnieuw bericht te versturen"
                      className="mt-2 flex items-center gap-1.5 text-xs font-medium text-clay-700 hover:text-clay-600 transition-colors"
                    >
                      <RefreshCw size={11} />
                      Probeer opnieuw
                    </button>
                  )}
                </div>
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
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e as unknown as React.FormEvent)
                  }
                }}
                placeholder={
                  phase === 'final'
                    ? 'Geef bijstuur-feedback op het plan...'
                    : phase === 'planning'
                    ? 'Aanvulling of vraag tijdens de uitwerking...'
                    : messages.length <= 1
                    ? 'Beschrijf je gewenste campagne...'
                    : 'Jouw antwoord aan de Campagne Manager...'
                }
                aria-label="Jouw bericht aan de Campagne Manager"
                disabled={isLoading}
                maxLength={4000}
                className="flex-1 bg-cream-50 border border-cream-500 rounded-2xl px-4 py-3 text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 transition-all disabled:opacity-50 resize-none"
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
            {phase === 'final' && !isLoading && (
              <button
                onClick={resetSession}
                className="mt-2 w-full flex items-center justify-center gap-2 py-2 text-xs text-ink-500 hover:text-ink-700 transition-colors"
              >
                <RefreshCw size={11} />
                Start nieuwe campagne
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}
