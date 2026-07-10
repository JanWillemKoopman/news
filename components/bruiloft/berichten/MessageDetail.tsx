'use client'

import Link from 'next/link'
import { Archive, ArchiveRestore, ArrowLeft, Mail, Trash2 } from 'lucide-react'

import { Button } from '@/components/bruiloft/ui'
import { tijdGeleden } from '@/lib/bruiloft/format'
import type { Thread } from '@/lib/bruiloft/berichten/threads'
import type { Message, MessageActie } from '@/lib/bruiloft/types'
import { ReplyComposer } from './ReplyComposer'

interface MessageDetailProps {
  thread: Thread | null
  vendorNaam?: string
  // Reageren stuurt een echte e-mail naar de leverancier; dat vereist
  // dezelfde edit-rechten op de leveranciers-module als offerte/contact
  // versturen (de server handhaaft dit ook, dit bepaalt alleen de UI).
  heeftEditRechten: boolean
  onBack?: () => void // mobiel: terug naar de lijst
  onArchive: () => void
  onUnarchive: () => void
  onTrash: () => void
  onRestore: () => void
  onReply: (tekst: string) => Promise<void>
}

// Leest de actieknoppen uit metadata.acties, defensief: alleen goedgevormde
// items met een intern pad ('/...') tellen mee — metadata komt uit de database
// en kan door toekomstige afzenders (AI, cron) gevuld zijn.
function berichtActies(bericht: Message): MessageActie[] {
  const raw = bericht.metadata?.acties
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (a): a is MessageActie =>
      typeof a === 'object' &&
      a !== null &&
      typeof (a as MessageActie).label === 'string' &&
      typeof (a as MessageActie).href === 'string' &&
      (a as MessageActie).href.startsWith('/') &&
      !(a as MessageActie).href.startsWith('//')
  )
}

export function MessageDetail({
  thread,
  vendorNaam,
  heeftEditRechten,
  onBack,
  onArchive,
  onUnarchive,
  onTrash,
  onRestore,
  onReply,
}: MessageDetailProps) {
  if (!thread) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center md:h-full md:py-0">
        <Mail className="h-10 w-10 text-gray-300" />
        <p className="text-sm text-muted-foreground">Selecteer een bericht om te lezen.</p>
      </div>
    )
  }

  // Reageren kan alleen binnen een gesprek dat met een offerte-/
  // contactaanvraag begon, én pas zodra de leverancier zelf heeft
  // gereageerd — dat is precies het moment waarop er iets is om op te
  // antwoorden.
  const kanReageren = thread.kanReageren && thread.heeftLeverancierReactie

  return (
    <div className="flex flex-col md:h-full">
      <div className="flex items-start gap-2 border-b border-border px-4 py-3 sm:px-6">
        {onBack ? (
          <Button variant="ghost" size="icon" className="-ml-2 shrink-0 md:hidden" onClick={onBack} aria-label="Terug naar lijst">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-foreground">{thread.onderwerp}</h2>
          {vendorNaam ? (
            <p className="truncate text-sm text-muted-foreground">
              {vendorNaam}
              {' · '}
              <Link href="/bruiloft/leveranciers" className="text-rose-600 hover:text-rose-500">
                Bekijk leverancier
              </Link>
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {thread.deleted ? (
            <Button variant="outline" size="sm" onClick={onRestore}>
              <ArchiveRestore className="h-4 w-4" /> Herstellen
            </Button>
          ) : thread.archived ? (
            <>
              <Button variant="outline" size="icon" onClick={onUnarchive} aria-label="Terug naar postvak in">
                <ArchiveRestore className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={onTrash} aria-label="Verwijderen">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="icon" onClick={onArchive} aria-label="Archiveren">
                <Archive className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={onTrash} aria-label="Verwijderen">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 md:min-h-0 md:flex-1 md:overflow-y-auto">
        <div className="divide-y divide-border">
          {thread.berichten.map((bericht) => (
            <MessageBubble key={bericht.id} bericht={bericht} />
          ))}
        </div>
      </div>

      {kanReageren || thread.kanReageren ? (
        <div className="shrink-0 border-t border-border px-4 py-3 sm:px-6">
          {kanReageren && heeftEditRechten ? (
            <ReplyComposer onSend={onReply} />
          ) : kanReageren ? (
            <p className="text-sm text-muted-foreground">
              Alleen wie leveranciers mag bewerken kan hier reageren.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Je kunt hier reageren zodra {vendorNaam || 'de leverancier'} heeft gereageerd op dit gesprek.
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}

function MessageBubble({ bericht }: { bericht: Message }) {
  const acties = berichtActies(bericht)
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{bericht.afzenderNaam}</span> ·{' '}
        {tijdGeleden(bericht.createdAt)}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{bericht.inhoud}</p>
      {acties.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {acties.map((a) => (
            <Link key={a.href + a.label} href={a.href} className="text-sm text-rose-600 hover:text-rose-500">
              {a.label} →
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}
