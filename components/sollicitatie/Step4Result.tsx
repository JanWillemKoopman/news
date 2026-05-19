'use client'

import { useRef, useState } from 'react'
import {
  Check,
  Copy,
  Download,
  Gauge,
  Lightbulb,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { useCoverLetterStore } from '@/store/coverLetterStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { LetterStyle } from '@/types/cover-letter'

type ChatMessage = { instruction: string; status: 'pending' | 'done' | 'error' }

const STYLES: { id: LetterStyle; label: string; desc: string }[] = [
  { id: 'challenger', label: 'The Challenger', desc: 'Bold · energiek · startup' },
  { id: 'expert', label: 'The Expert', desc: 'Datagedreven · formeel · corporate' },
  { id: 'culture', label: 'The Culture Match', desc: 'Waardegedreven · verbindend' },
]

export default function Step4Result() {
  const { letter, verdict, activeStyle, setLetter, setActiveStyle, reset } =
    useCoverLetterStore()

  const [copied, setCopied] = useState(false)
  const [restyling, setRestyling] = useState<LetterStyle | null>(null)
  const [restyleError, setRestyleError] = useState<string | null>(null)

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  if (!letter || !verdict) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(letter)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([letter], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sollicitatiebrief.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleChatSubmit = async () => {
    const instruction = chatInput.trim()
    if (!instruction || chatLoading) return
    setChatInput('')
    const idx = chatMessages.length
    setChatMessages((prev) => [...prev, { instruction, status: 'pending' }])
    setChatLoading(true)
    try {
      const res = await fetch('/api/adjust-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letter, instruction }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (!data.letter) throw new Error()
      setLetter(data.letter)
      setChatMessages((prev) =>
        prev.map((m, i) => (i === idx ? { ...m, status: 'done' } : m))
      )
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch {
      setChatMessages((prev) =>
        prev.map((m, i) => (i === idx ? { ...m, status: 'error' } : m))
      )
    } finally {
      setChatLoading(false)
    }
  }

  const handleRestyle = async (style: LetterStyle) => {
    if (restyling) return
    setRestyling(style)
    setRestyleError(null)
    try {
      const res = await fetch('/api/restyle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letter, style }),
      })
      if (!res.ok) throw new Error('restyle mislukt')
      const data = await res.json()
      if (!data.letter) throw new Error('lege brief')
      setLetter(data.letter)
      setActiveStyle(style)
    } catch {
      setRestyleError('De stijlaanpassing is mislukt. Probeer het opnieuw.')
    } finally {
      setRestyling(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Je sollicitatiebrief is klaar
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Geschreven, gestresstest door een recruiterpanel en verfijnd. Pas de toon hieronder
            direct aan.
          </p>
        </div>
        <Button variant="outline" onClick={reset}>
          <RefreshCw size={15} />
          Nieuwe brief
        </Button>
      </div>

      {/* Style toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Wand2 size={15} className="text-primary" />
            Pas de toon aan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {STYLES.map((style) => {
              const isActive = activeStyle === style.id
              const isBusy = restyling === style.id
              return (
                <button
                  key={style.id}
                  onClick={() => handleRestyle(style.id)}
                  disabled={restyling !== null}
                  className={cn(
                    'rounded-md border px-4 py-3 text-left transition-colors disabled:opacity-60',
                    isActive
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-muted-foreground'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isBusy ? (
                      <Loader2 size={14} className="text-primary animate-spin" />
                    ) : (
                      <Sparkles
                        size={14}
                        className={isActive ? 'text-primary' : 'text-muted-foreground'}
                      />
                    )}
                    <span className="text-sm font-semibold">{style.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{style.desc}</p>
                </button>
              )
            })}
          </div>
          {restyleError && (
            <p className="text-xs text-destructive mt-2">{restyleError}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Letter */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">De brief</CardTitle>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check size={13} className="text-primary" />
                    Gekopieerd
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    Kopiëren
                  </>
                )}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleDownload}>
                <Download size={13} />
                .txt
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'rounded-md border border-border bg-background p-5 transition-opacity',
                restyling && 'opacity-50'
              )}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{letter}</p>
            </div>
          </CardContent>
        </Card>

        {/* Verdict */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck size={16} className="text-primary" />
              The Recruiter&apos;s Verdict
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <VerdictSection
              icon={<Check size={13} />}
              title="Sterke punten"
              items={verdict.strengths}
            />
            <VerdictSection
              icon={<ShieldCheck size={13} />}
              title="Overbrugde hiaten"
              items={verdict.bridgedGaps}
            />
            <VerdictSection
              icon={<Lightbulb size={13} />}
              title="Strategische keuzes"
              items={verdict.strategicChoices}
            />
            {verdict.atsKeywords.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Gauge size={13} />
                  ATS-keywords
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {verdict.atsKeywords.map((kw) => (
                    <Badge key={kw} variant="secondary">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chat aanpassingen */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare size={16} className="text-primary" />
            Pas de brief aan via chat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {chatMessages.length > 0 && (
            <ul className="space-y-2">
              {chatMessages.map((msg, i) => (
                <li
                  key={i}
                  className={cn(
                    'flex items-start gap-3 rounded-md border px-4 py-3 text-sm',
                    msg.status === 'done' && 'border-primary/30 bg-primary/5',
                    msg.status === 'pending' && 'border-border bg-muted/50',
                    msg.status === 'error' && 'border-destructive/30 bg-destructive/5'
                  )}
                >
                  <span className="flex-shrink-0 mt-0.5">
                    {msg.status === 'pending' && (
                      <Loader2 size={14} className="text-muted-foreground animate-spin" />
                    )}
                    {msg.status === 'done' && (
                      <Check size={14} className="text-primary" strokeWidth={3} />
                    )}
                    {msg.status === 'error' && (
                      <span className="text-destructive text-xs font-semibold">!</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'flex-1',
                      msg.status === 'error' ? 'text-destructive' : 'text-foreground'
                    )}
                  >
                    {msg.instruction}
                    {msg.status === 'error' && (
                      <span className="block text-xs text-destructive mt-0.5">
                        Aanpassing mislukt. Probeer het opnieuw.
                      </span>
                    )}
                    {msg.status === 'done' && (
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        Verwerkt — de brief is bijgewerkt.
                      </span>
                    )}
                  </span>
                </li>
              ))}
              <div ref={chatEndRef} />
            </ul>
          )}

          <div className="flex gap-2 items-end">
            <Textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleChatSubmit()
              }}
              placeholder="Bijv. &quot;Maak de opening korter&quot; of &quot;Voeg meer nadruk op mijn Python-ervaring toe&quot;…"
              rows={3}
              disabled={chatLoading}
              className="flex-1 resize-none"
            />
            <Button
              onClick={handleChatSubmit}
              disabled={!chatInput.trim() || chatLoading}
              className="flex-shrink-0 self-end"
            >
              {chatLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
              <span className="sr-only">Verstuur</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: gebruik <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-xs">⌘ Enter</kbd> om te versturen.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function VerdictSection({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode
  title: string
  items: string[]
}) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
        {icon}
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm leading-relaxed flex gap-2">
            <span className="text-primary mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
