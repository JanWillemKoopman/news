'use client'

import * as React from 'react'
import Link from 'next/link'
import { Inbox as InboxIcon, Send, FileText } from 'lucide-react'

import { Card, EmptyState, Modal } from '@/components/bruiloft/ui'
import { tijdGeleden } from '@/lib/bruiloft/format'
import { cn } from '@/lib/utils'
import type { Message } from '@/lib/bruiloft/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

type Tab = 'postvak-in' | 'verzonden' | 'concepten'

const TABS: { key: Tab; label: string }[] = [
  { key: 'postvak-in', label: 'Postvak IN' },
  { key: 'verzonden', label: 'Verzonden' },
  { key: 'concepten', label: 'Concepten' },
]

// Eén scherm: tabs (Postvak IN / Verzonden / Concepten) + lijst + detail in een
// modal — geen Gmail-achtig split-pane, dat zou op mobiel moeten wrappen.
export function BerichtenOverzicht() {
  const messages = useBruiloftStore((s) => s.messages)
  const messageReads = useBruiloftStore((s) => s.messageReads)
  const currentUserId = useBruiloftStore((s) => s.currentUser?.id)
  const vendors = useBruiloftStore((s) => s.vendors)
  const markMessageRead = useBruiloftStore((s) => s.markMessageRead)

  const [tab, setTab] = React.useState<Tab>('postvak-in')
  const [geselecteerd, setGeselecteerd] = React.useState<Message | null>(null)

  const gelezenIds = React.useMemo(
    () => new Set(messageReads.filter((r) => r.userId === currentUserId).map((r) => r.messageId)),
    [messageReads, currentUserId]
  )

  const zichtbaar = React.useMemo(() => {
    const gesorteerd = [...messages].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (tab === 'postvak-in') return gesorteerd.filter((m) => m.direction === 'inbound')
    if (tab === 'verzonden') return gesorteerd.filter((m) => m.direction === 'outbound')
    return gesorteerd.filter((m) => m.status === 'concept')
  }, [messages, tab])

  const openen = (bericht: Message) => {
    setGeselecteerd(bericht)
    if (bericht.direction === 'inbound' && !gelezenIds.has(bericht.id)) {
      markMessageRead(bericht.id)
    }
  }

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-rose-600 text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {zichtbaar.length === 0 ? (
        <EmptyState
          icon={tab === 'postvak-in' ? InboxIcon : tab === 'verzonden' ? Send : FileText}
          titel={
            tab === 'postvak-in'
              ? 'Nog geen berichten'
              : tab === 'verzonden'
                ? 'Nog niets verstuurd'
                : 'Nog geen concepten'
          }
          beschrijving={
            tab === 'postvak-in'
              ? 'Hier verschijnen straks updates en tips over jullie bruiloft.'
              : tab === 'verzonden'
                ? 'Offertes en berichten die jullie naar leveranciers sturen, verschijnen hier.'
                : 'Concepten opslaan komt in een volgende versie.'
          }
        />
      ) : (
        <ul className="space-y-2">
          {zichtbaar.map((m) => {
            const ongelezen = m.direction === 'inbound' && !gelezenIds.has(m.id)
            const vendorNaam = m.vendorId ? vendors.find((v) => v.id === m.vendorId)?.naam : undefined
            return (
              <li key={m.id}>
                <Card
                  interactive
                  onClick={() => openen(m)}
                  className="flex items-start gap-3 px-4 py-3"
                >
                  {ongelezen ? (
                    <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                  ) : (
                    <span aria-hidden className="mt-2 h-2 w-2 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-sm', ongelezen ? 'font-semibold text-foreground' : 'text-foreground')}>
                      {m.afzenderNaam}
                      {vendorNaam ? <span className="font-normal text-muted-foreground"> · {vendorNaam}</span> : null}
                    </p>
                    <p className={cn('truncate text-sm', ongelezen ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                      {m.onderwerp}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{tijdGeleden(m.createdAt)}</span>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <Modal
        open={geselecteerd !== null}
        onOpenChange={(open) => !open && setGeselecteerd(null)}
        title={geselecteerd?.onderwerp ?? ''}
        description={geselecteerd ? `${geselecteerd.afzenderNaam} · ${tijdGeleden(geselecteerd.createdAt)}` : undefined}
        className="sm:max-w-lg"
      >
        {geselecteerd ? (
          <div className="space-y-4">
            {/* Bij een leveranciersreactie: het eigen bericht waarop gereageerd
                is als citaat erboven, zodat de context niet opgezocht hoeft te
                worden. */}
            {(() => {
              const origineel = geselecteerd.parentMessageId
                ? messages.find((m) => m.id === geselecteerd.parentMessageId)
                : undefined
              return origineel ? (
                <div className="rounded-md border-l-2 border-border bg-accent/50 px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    In antwoord op &ldquo;{origineel.onderwerp}&rdquo; · {tijdGeleden(origineel.createdAt)}
                  </p>
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
                    {origineel.inhoud}
                  </p>
                </div>
              ) : null
            })()}
            <p className="whitespace-pre-wrap text-sm text-foreground">{geselecteerd.inhoud}</p>
            {geselecteerd.vendorId ? (
              <Link
                href="/bruiloft/leveranciers"
                className="inline-block text-sm text-rose-600 hover:text-rose-500"
                onClick={() => setGeselecteerd(null)}
              >
                Bekijk leverancier →
              </Link>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
