'use client'

import Link from 'next/link'
import { ArrowUpRight, Inbox } from 'lucide-react'

import { ongelezenBerichten } from '@/lib/bruiloft/derived'
import { tijdGeleden } from '@/lib/bruiloft/format'
import type { Message } from '@/lib/bruiloft/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

// Vast onderdeel van het dashboard: het enige aanknopingspunt naar de
// Berichtenbox, die het centrale punt wordt voor systeemmeldingen en
// leverancierstips. Zelfde kaartpatroon als ModuleStatusGrid (link + pijltje),
// maar altijd zichtbaar — ook als postvak leeg is — zodat "Berichten" een
// vaste, voorspelbare plek op het dashboard heeft.
export function BerichtenPreview() {
  const messages = useBruiloftStore((s) => s.messages)
  const messageReads = useBruiloftStore((s) => s.messageReads)
  const currentUserId = useBruiloftStore((s) => s.currentUser?.id)

  const ongelezen = ongelezenBerichten(messages, messageReads, currentUserId)

  const laatsteInbound = messages
    .filter((m) => m.direction === 'inbound')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] as Message | undefined

  const titel =
    ongelezen > 0
      ? `${ongelezen} ${ongelezen === 1 ? 'nieuw bericht' : 'nieuwe berichten'}`
      : laatsteInbound
        ? 'Geen nieuwe berichten'
        : 'Berichten'

  const detail = laatsteInbound
    ? `${laatsteInbound.afzenderNaam} · ${laatsteInbound.onderwerp} · ${tijdGeleden(laatsteInbound.createdAt)}`
    : 'Hier landen updates en leverancierstips over jullie bruiloft.'

  return (
    <Link
      href="/bruiloft/berichten"
      className="group relative mb-8 flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-[box-shadow,border-color] duration-150 hover:border-rose-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span
        className={
          ongelezen > 0
            ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600'
            : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground'
        }
      >
        <Inbox className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{titel}</p>
        <p className="truncate text-sm text-muted-foreground">{detail}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-rose-500" />
    </Link>
  )
}
