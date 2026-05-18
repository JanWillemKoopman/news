'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, ArrowLeft, RefreshCw, Send } from 'lucide-react'
import { MAX_QUESTIONS, useLetterStore } from '@/store/letterStore'
import type { LetterMessage } from '@/types/sollicitatie'
import TypingIndicator from '@/components/TypingIndicator'
import LetterMessageBubble from './LetterMessageBubble'

export default function LetterChatScreen() {
  const {
    cvText,
    vacancyText,
    messages,
    isTyping,
    typingLabel,
    questionCount,
    sessionComplete,
    error,
    addMessage,
    setTyping,
    setError,
    incrementQuestionCount,
    completeSession,
    resetSession,
  } = useLetterStore()

  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [retryPayload, setRetryPayload] = useState<{
    answer: string
    snapshot: LetterMessage[]
  } | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const writeLetter = useCallback(
    async (snapshot: LetterMessage[]) => {
      setTyping(true, 'Brief schrijven')

      const res = await fetch('/api/sollicitatie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'letter', cvText, vacancy: vacancyText, messages: snapshot }),
      })
      if (!res.ok) throw new Error(`Brief genereren mislukt (${res.status})`)

      const { letter } = await res.json()
      setTyping(false)

      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        kind: 'letter',
        content: letter,
        timestamp: Date.now(),
      })
      completeSession()
    },
    [cvText, vacancyText, addMessage, setTyping, completeSession]
  )

  const runTurn = useCallback(
    async (answer: string, snapshot: LetterMessage[]) => {
      setIsLoading(true)
      setError(null)

      try {
        const count = useLetterStore.getState().questionCount

        if (count >= MAX_QUESTIONS) {
          await writeLetter(snapshot)
          return
        }

        setTyping(true, 'Sollicitatiecoach')
        const res = await fetch('/api/sollicitatie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'followup',
            cvText,
            vacancy: vacancyText,
            messages: snapshot,
            questionNumber: count + 1,
          }),
        })
        if (!res.ok) throw new Error(`Vervolgvraag mislukt (${res.status})`)

        const { question } = await res.json()
        setTyping(false)

        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          kind: 'question',
          content: question,
          timestamp: Date.now(),
        })
        incrementQuestionCount()
      } catch (err) {
        setTyping(false)
        setError(err instanceof Error ? err.message : 'Onbekende fout')
        setRetryPayload({ answer, snapshot })
      } finally {
        setIsLoading(false)
      }
    },
    [cvText, vacancyText, writeLetter, addMessage, setTyping, setError, incrementQuestionCount]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = inputValue.trim()
    if (!text || isLoading || sessionComplete) return

    setInputValue('')
    setRetryPayload(null)
    setError(null)

    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    })

    const snapshot = useLetterStore.getState().messages
    await runTurn(text, snapshot)
  }

  const handleRetry = async () => {
    if (!retryPayload) return
    const payload = retryPayload
    setRetryPayload(null)
    await runTurn(payload.answer, payload.snapshot)
  }

  const lastIsQuestion = messages[messages.length - 1]?.kind === 'question'

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-md px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={resetSession}
            aria-label="Opnieuw beginnen"
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <ArrowLeft size={15} className="text-slate-400" />
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-0.5">
              Sollicitatiebrief Helper
            </p>
            <p className="text-xs font-semibold text-emerald-400">
              {sessionComplete ? 'Brief gegenereerd' : 'Verdiepende vragen'}
            </p>
          </div>

          <div
            className={[
              'text-xs font-mono px-2 py-1 rounded-lg border flex-shrink-0',
              sessionComplete
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : 'text-slate-400 bg-slate-800/60 border-slate-700/50',
            ].join(' ')}
          >
            {Math.min(questionCount, MAX_QUESTIONS)}/{MAX_QUESTIONS}
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
        <div className="max-w-2xl mx-auto space-y-5">
          {messages.map((m) => (
            <LetterMessageBubble key={m.id} message={m} />
          ))}

          {isTyping && <TypingIndicator agentName={typingLabel ?? 'Sollicitatiecoach'} />}

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
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-emerald-500/20"
            >
              <RefreshCw size={15} />
              Nieuwe sollicitatiebrief
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="flex items-end gap-3">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={lastIsQuestion ? 'Jouw antwoord...' : 'Even geduld...'}
                disabled={isLoading}
                maxLength={2000}
                className="flex-1 bg-slate-900 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500/20 transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="w-11 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 flex items-center justify-center transition-all duration-200 flex-shrink-0 disabled:cursor-not-allowed"
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
