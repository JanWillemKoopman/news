'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, ArrowLeft, RefreshCw, Send } from 'lucide-react'
import { AGENTS } from '@/lib/agents'
import { useChatStore } from '@/store/chatStore'
import type { AgentId, ConversationEntry, Message } from '@/types'
import MessageBubble from './MessageBubble'
import TypingIndicator from './TypingIndicator'

export default function ChatScreen() {
  const {
    selectedAgents,
    messages,
    isTyping,
    typingAgent,
    questionCount,
    sessionComplete,
    error,
    addMessage,
    setTyping,
    setError,
    incrementQuestionCount,
    completeSession,
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

  // Welcome message on first mount
  useEffect(() => {
    if (initialized.current || messages.length > 0) {
      initialized.current = true
      return
    }
    initialized.current = true

    const names = selectedAgents.map((id) => AGENTS[id].name)
    const nameList =
      names.length > 1
        ? names.slice(0, -1).join(', ') + ' en ' + names[names.length - 1]
        : names[0]

    addMessage({
      id: crypto.randomUUID(),
      role: 'moderator',
      content: `Welkom bij jouw persoonlijke adviesgesprek. Ik heb ${nameList} geselecteerd als adviseurs. Beschrijf je businessidee of vraagstuk zo concreet mogelijk — dan stel ik gerichte vervolgvragen voor maximaal diepgaand advies.`,
      timestamp: Date.now(),
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // ── Orchestration helpers ────────────────────────────────────────────────

  const buildHistory = (msgs: Message[]): ConversationEntry[] =>
    msgs
      .filter((m) => m.role !== 'moderator')
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        content: m.content,
      }))

  const askAgent = useCallback(
    async (agentName: string, history: ConversationEntry[]) => {
      setTyping(true, agentName)

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ask_agent', selectedAgents, messages: history, agentName }),
      })
      if (!res.ok) throw new Error(`Agent verzoek mislukt (${res.status})`)

      const { response, agentId, agentName: name } = await res.json()
      setTyping(false)

      addMessage({
        id: crypto.randomUUID(),
        role: 'agent',
        agentId: agentId as AgentId,
        agentName: name,
        content: response,
        timestamp: Date.now(),
      })
      incrementQuestionCount()
    },
    [selectedAgents, addMessage, setTyping, incrementQuestionCount]
  )

  const generateFinalAdvice = useCallback(
    async (history: ConversationEntry[]) => {
      setTyping(true, 'Alle adviseurs')

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'final_advice', selectedAgents, messages: history }),
      })
      if (!res.ok) throw new Error(`Eindadvies generatie mislukt (${res.status})`)

      const { agentAdvices, finalAdvice } = await res.json()
      setTyping(false)

      for (const a of agentAdvices) {
        addMessage({
          id: crypto.randomUUID(),
          role: 'agent',
          agentId: a.agentId as AgentId,
          agentName: a.agentName,
          content: a.advice,
          timestamp: Date.now(),
        })
      }

      addMessage({
        id: crypto.randomUUID(),
        role: 'final',
        content: finalAdvice,
        timestamp: Date.now(),
      })

      completeSession()
    },
    [selectedAgents, addMessage, setTyping, completeSession]
  )

  const runOrchestration = useCallback(
    async (userMessage: string, snapshotMessages: Message[]) => {
      setIsLoading(true)
      setError(null)

      try {
        const currentCount = useChatStore.getState().questionCount
        const history = buildHistory(snapshotMessages)
        const fullHistory: ConversationEntry[] = [
          ...history,
          { role: 'user', content: userMessage },
        ]

        if (currentCount >= 3) {
          await generateFinalAdvice(fullHistory)
          return
        }

        setTyping(true, 'Moderator')
        const modRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'moderate', selectedAgents, messages: fullHistory }),
        })
        if (!modRes.ok) throw new Error(`Moderatie mislukt (${modRes.status})`)

        const { decision } = await modRes.json()
        setTyping(false)

        if (decision.action === 'final_advice') {
          await generateFinalAdvice(fullHistory)
        } else {
          await askAgent(decision.selected_agent, fullHistory)
        }
      } catch (err) {
        setTyping(false)
        const msg = err instanceof Error ? err.message : 'Onbekende fout'
        setError(msg)
        setRetryPayload({ userMessage, snapshotMessages })
      } finally {
        setIsLoading(false)
      }
    },
    [selectedAgents, askAgent, generateFinalAdvice, setTyping, setError]
  )

  // ── Event handlers ────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = inputValue.trim()
    if (!text || isLoading || sessionComplete) return

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

  const agentList = selectedAgents.map((id) => AGENTS[id])

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-md px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={resetSession}
            aria-label="Terug naar selectie"
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <ArrowLeft size={15} className="text-slate-400" />
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-0.5">
              Adviesgesprek
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {agentList.map((agent, i) => (
                <span key={agent.id} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-slate-700">·</span>}
                  <span className={`text-xs font-semibold ${agent.color}`}>{agent.name}</span>
                </span>
              ))}
            </div>
          </div>

          <div
            className={[
              'text-xs font-mono px-2 py-1 rounded-lg border flex-shrink-0',
              questionCount >= 3
                ? 'text-red-400 bg-red-500/10 border-red-500/20'
                : 'text-slate-400 bg-slate-800/60 border-slate-700/50',
            ].join(' ')}
          >
            {questionCount}/3
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
        <div className="max-w-2xl mx-auto space-y-5">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}

          {isTyping && <TypingIndicator agentName={typingAgent ?? 'Adviseur'} />}

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

      {/* Input / Session complete */}
      <footer className="sticky bottom-0 border-t border-slate-800/60 bg-slate-950/90 backdrop-blur-md px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {sessionComplete ? (
            <button
              onClick={resetSession}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-blue-500/20"
            >
              <RefreshCw size={15} />
              Start Nieuwe Sessie
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="flex items-end gap-3">
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  messages.length <= 1 ? 'Beschrijf je businessidee...' : 'Jouw antwoord...'
                }
                disabled={isLoading}
                maxLength={2000}
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
          )}
        </div>
      </footer>
    </div>
  )
}
