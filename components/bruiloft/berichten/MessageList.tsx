'use client'

import { Archive, FileText, Inbox, Send, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { EmptyState } from '@/components/bruiloft/ui'
import { tijdGeleden } from '@/lib/bruiloft/format'
import type { BerichtFolder, Thread } from '@/lib/bruiloft/berichten/threads'
import type { ID, Message, Vendor } from '@/lib/bruiloft/types'
import { cn } from '@/lib/utils'

interface MessageListProps {
  folder: BerichtFolder
  threads: Thread[]
  berichten: Message[]
  vendors: Vendor[]
  geselecteerdId: ID | null
  onSelect: (threadId: ID) => void
}

const LEEG: Record<BerichtFolder, { icon: LucideIcon; titel: string; beschrijving: string }> = {
  'postvak-in': {
    icon: Inbox,
    titel: 'Nog geen berichten',
    beschrijving: 'Hier verschijnen updates, tips en reacties van leveranciers.',
  },
  verzonden: {
    icon: Send,
    titel: 'Nog niets verstuurd',
    beschrijving: 'Offertes en berichten die jullie naar leveranciers sturen, verschijnen hier.',
  },
  concepten: {
    icon: FileText,
    titel: 'Nog geen concepten',
    beschrijving: 'Concepten opslaan komt in een volgende versie.',
  },
  archief: {
    icon: Archive,
    titel: 'Geen gearchiveerde berichten',
    beschrijving: 'Archiveer een gesprek om het hier terug te vinden.',
  },
  verwijderd: {
    icon: Trash2,
    titel: 'Prullenbak is leeg',
    beschrijving: 'Verwijderde gesprekken verschijnen hier.',
  },
}

interface RijData {
  threadId: ID
  naam: string
  onderwerp: string
  tijd: string
  ongelezen: boolean
}

export function MessageList({ folder, threads, berichten, vendors, geselecteerdId, onSelect }: MessageListProps) {
  const isPlat = folder === 'verzonden' || folder === 'concepten'
  const leeg = LEEG[folder]

  const aantal = isPlat ? berichten.length : threads.length
  if (aantal === 0) {
    return <EmptyState className="m-4" icon={leeg.icon} titel={leeg.titel} beschrijving={leeg.beschrijving} />
  }

  // Al gesorteerd van recent naar oud door de aanroeper (threadsVoorFolder /
  // verzondenBerichten / conceptBerichten) — hier alleen nog splitsen in
  // ongelezen/gelezen, met de sortering binnen elke groep intact.
  const rijen: RijData[] = isPlat
    ? berichten.map((m) => {
        const threadId = m.parentMessageId ?? m.id
        const vendorNaam = m.vendorId ? vendors.find((v) => v.id === m.vendorId)?.naam : undefined
        return { threadId, naam: vendorNaam ?? m.afzenderNaam, onderwerp: m.onderwerp, tijd: m.createdAt, ongelezen: false }
      })
    : threads.map((t) => {
        const vendorNaam = t.vendorId ? vendors.find((v) => v.id === t.vendorId)?.naam : undefined
        const meerdereBerichten = t.berichten.length > 1
        return {
          threadId: t.id,
          naam: vendorNaam ?? t.laatste.afzenderNaam,
          onderwerp: `${t.onderwerp}${meerdereBerichten ? ` (${t.berichten.length})` : ''}`,
          tijd: t.laatste.createdAt,
          ongelezen: t.ongelezen,
        }
      })

  const ongelezenRijen = rijen.filter((r) => r.ongelezen)
  const gelezenRijen = rijen.filter((r) => !r.ongelezen)

  return (
    <div>
      {ongelezenRijen.length > 0 ? (
        <>
          <GroepLabel tekst="Nieuwe berichten" />
          <ul className="divide-y divide-border">
            {ongelezenRijen.map((r) => (
              <MessageRow
                key={r.threadId}
                {...r}
                geselecteerd={geselecteerdId === r.threadId}
                onClick={() => onSelect(r.threadId)}
              />
            ))}
          </ul>
        </>
      ) : null}
      {gelezenRijen.length > 0 ? (
        <>
          <GroepLabel tekst="Gelezen berichten" metStreep={ongelezenRijen.length > 0} />
          <ul className="divide-y divide-border">
            {gelezenRijen.map((r) => (
              <MessageRow
                key={r.threadId}
                {...r}
                geselecteerd={geselecteerdId === r.threadId}
                onClick={() => onSelect(r.threadId)}
              />
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}

// Alleen getoond bij een echte mix van nieuw/gelezen (zie boven) — de streep
// (border-top) maakt zichtbaar waar de nieuwe berichten overgaan in de
// gelezen berichten.
function GroepLabel({ tekst, metStreep }: { tekst: string; metStreep?: boolean }) {
  return (
    <p
      className={cn(
        'px-4 pb-1.5 pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground',
        metStreep && 'border-t border-border'
      )}
    >
      {tekst}
    </p>
  )
}

function MessageRow({
  naam,
  onderwerp,
  tijd,
  ongelezen,
  geselecteerd,
  onClick,
}: {
  naam: string
  onderwerp: string
  tijd: string
  ongelezen: boolean
  geselecteerd: boolean
  onClick: () => void
}) {
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        }}
        className={cn(
          'flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/40',
          geselecteerd && 'bg-accent/60'
        )}
      >
        {ongelezen ? (
          <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
        ) : (
          <span aria-hidden className="mt-2 h-2 w-2 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-sm', ongelezen ? 'font-semibold text-foreground' : 'text-foreground')}>
            {naam}
          </p>
          <p className={cn('truncate text-sm', ongelezen ? 'font-medium text-foreground' : 'text-muted-foreground')}>
            {onderwerp}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{tijdGeleden(tijd)}</span>
      </div>
    </li>
  )
}
