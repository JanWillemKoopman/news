'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, ArrowLeft, RefreshCw, Send } from 'lucide-react'
import {
  AGENTS,
  AGENT_NAME_TO_ID,
  ALL_AGENT_IDS,
  MANAGER_NAME,
} from '@/lib/agents'
import { useChatStore } from '@/store/chatStore'
import type { AgentId, ConversationEntry, Message, Phase } from '@/types'
import MessageBubble from './MessageBubble'
import TypingIndicator from './TypingIndicator'

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
    error,
    addMessage,
    setTyping,
    setError,
    setPhase,
    incrementIntakeRound,
    incrementPlanningRound,
    resetSession,
  } = useChatStore()

  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [retryPayload, setRetryPayload] = useState<{
    userMessage: string
    snapshotMessages: Message[]
  } | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const initialized = useRef(false)

  // Welkomstbericht van de Campagne Manager bij eerste mount
  useEffect(() => {
    if (initialized.current || messages.length > 0) {
      initialized.current = true
      return
    }
    initialized.current = true

    addMessage({
      id: crypto.randomUUID(),
      role: 'manager',
      content: `Welkom bij het bureau! Ik ben ${MANAGER_NAME}, je Campagne Manager. Ik begeleid je vandaag samen met zes specialisten om een ijzersterk campagneplan voor je neer te zetten.

Vertel me om te beginnen zo concreet mogelijk over je campagne. Denk bijvoorbeeld aan:
• Wat is het doel van de campagne?
• Wat voor product of dienst gaat het om en wat maakt het bijzonder?
• Wie is je doelgroep en waar zijn jullie gevestigd?
• Wat is je beschikbare budget en gewenste looptijd?
• Heb je al een website of bestaande kanalen?

Hoe meer context, hoe scherper het plan dat we voor je bouwen.`,
      timestamp: Date.now(),
      phase: 'intake',
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (messages.length <= 1 && !isTyping) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

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
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    })
    if (!res.ok) throw new Error(`Verzoek mislukt (${res.status})`)
    return res.json() as Promise<T>
  }

  // ── Specialist beurt afhandelen ──────────────────────────────────────────

  const runSpecialistTurn = useCallback(
    async (agentName: string, briefing: string, round: number) => {
      const currentMsgs = useChatStore.getState().messages
      const history = buildHistory(currentMsgs)

      setTyping(true, agentName)

      const { response, agentId } = await callApi<{
        response: string
        agentId: AgentId
        agentName: string
      }>('specialist_turn', {
        agentName,
        briefing,
        messages: history,
        round,
      })

      setTyping(false)
      addMessage({
        id: crypto.randomUUID(),
        role: 'agent',
        agentId,
        agentName,
        content: response,
        timestamp: Date.now(),
        phase: 'planning',
      })

      // Korte pauze voor render-rust
      await new Promise((r) => setTimeout(r, 90))
    },
    [addMessage, setTyping]
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

    // Finalize: manager schrijft compleet plan
    setTyping(true, MANAGER_NAME)
    const { plan: finalPlan } = await callApi<{ plan: string }>('finalize', {
      messages: buildHistory(useChatStore.getState().messages),
    })
    setTyping(false)

    addMessage({
      id: crypto.randomUUID(),
      role: 'plan',
      content: finalPlan,
      timestamp: Date.now(),
      phase: 'final',
    })

    setPhase('final')
  }, [addMessage, setTyping, setPhase, incrementPlanningRound, runSpecialistTurn])

  // ── Intake loop: manager beslist of doorvragen of starten ────────────────

  const runIntake = useCallback(async () => {
    setTyping(true, MANAGER_NAME)
    const history = buildHistory(useChatStore.getState().messages)
    const round = useChatStore.getState().intakeRound + 1

    const { decision, managerMessage } = await callApi<{
      decision: 'ask_followup' | 'start_planning'
      managerMessage: string | null
    }>('intake_turn', { messages: history, intakeRound: round })

    setTyping(false)

    if (decision === 'start_planning') {
      await runPlanningLoop()
      return
    }

    if (managerMessage) {
      addMessage({
        id: crypto.randomUUID(),
        role: 'manager',
        content: managerMessage,
        timestamp: Date.now(),
        phase: 'intake',
      })
    }
    incrementIntakeRound()
  }, [addMessage, setTyping, runPlanningLoop, incrementIntakeRound])

  // ── Bijsturen: manager past plan aan ─────────────────────────────────────

  const runIteration = useCallback(async () => {
    setTyping(true, MANAGER_NAME)
    const { plan } = await callApi<{ plan: string }>('iterate_plan', {
      messages: buildHistory(useChatStore.getState().messages),
    })
    setTyping(false)

    addMessage({
      id: crypto.randomUUID(),
      role: 'plan',
      content: plan,
      timestamp: Date.now(),
      phase: 'final',
    })
  }, [addMessage, setTyping])

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

  const teamList = (selectedAgents.length > 0 ? selectedAgents : ALL_AGENT_IDS).map(
    (id) => AGENTS[id]
  )

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-md px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={resetSession}
            aria-label="Terug naar bureau-overzicht"
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <ArrowLeft size={15} className="text-slate-400" />
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-0.5">
              Campagne-bureau · {MANAGER_NAME}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {teamList.map((agent, i) => (
                <span key={agent.id} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-slate-700">·</span>}
                  <span className={`text-xs font-semibold ${agent.color}`}>{agent.name}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="text-xs font-mono px-2 py-1 rounded-lg border flex-shrink-0 text-slate-400 bg-slate-800/60 border-slate-700/50">
            {PHASE_LABELS[phase]}
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
        <div className="max-w-2xl mx-auto space-y-5">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}

          {isTyping && <TypingIndicator agentName={typingAgent ?? 'Bureau'} />}

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-fade-in">
              <AlertCircle size={17} className="text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-300 leading-relaxed">{error}</p>
                {retryPayload && (
                  <button
                    onClick={handleRetry}
                    className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
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
      <footer className="sticky bottom-0 border-t border-slate-800/60 bg-slate-950/90 backdrop-blur-md px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                phase === 'final'
                  ? 'Geef bijstuur-feedback op het plan...'
                  : phase === 'planning'
                  ? 'Aanvulling of vraag tijdens de uitwerking...'
                  : messages.length <= 1
                  ? 'Beschrijf je gewenste campagne...'
                  : 'Jouw antwoord aan de Campagne Manager...'
              }
              disabled={isLoading}
              maxLength={4000}
              className="flex-1 bg-slate-900 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500/20 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 flex items-center justify-center transition-all duration-200 flex-shrink-0 disabled:cursor-not-allowed"
            >
              <Send
                size={15}
                className={inputValue.trim() && !isLoading ? 'text-white' : 'text-slate-500'}
              />
            </button>
          </form>
          {phase === 'final' && !isLoading && (
            <button
              onClick={resetSession}
              className="mt-2 w-full flex items-center justify-center gap-2 py-2 text-xs text-slate-500 hover:text-slate-400 transition-colors"
            >
              <RefreshCw size={11} />
              Start nieuwe campagne
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}
