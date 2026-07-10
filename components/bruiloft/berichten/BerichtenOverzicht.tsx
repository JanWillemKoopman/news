'use client'

import * as React from 'react'

import { SearchInput, useToast } from '@/components/bruiloft/ui'
import {
  buildThreads,
  conceptBerichten,
  threadsVoorFolder,
  verzondenBerichten,
  type BerichtFolder,
  type Thread,
} from '@/lib/bruiloft/berichten/threads'
import { ongelezenBerichten } from '@/lib/bruiloft/derived'
import { canEdit } from '@/lib/bruiloft/permissions'
import type { ID, Message } from '@/lib/bruiloft/types'
import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { FolderNav } from './FolderNav'
import { MessageDetail } from './MessageDetail'
import { MessageList } from './MessageList'

// Echte-mailboxervaring: links de berichtenlijst (met mappen bovenaan),
// rechts de volledige inhoud van het geselecteerde gesprek — op desktop
// permanent naast elkaar, op mobiel schakelt de kolom om (lijst ↔ detail)
// i.p.v. te wrappen naar een rommelige tweede rij.
export function BerichtenOverzicht() {
  const messages = useBruiloftStore((s) => s.messages)
  const messageReads = useBruiloftStore((s) => s.messageReads)
  const currentUserId = useBruiloftStore((s) => s.currentUser?.id)
  const vendors = useBruiloftStore((s) => s.vendors)
  const markMessageRead = useBruiloftStore((s) => s.markMessageRead)
  const archiveMessage = useBruiloftStore((s) => s.archiveMessage)
  const unarchiveMessage = useBruiloftStore((s) => s.unarchiveMessage)
  const trashMessage = useBruiloftStore((s) => s.trashMessage)
  const restoreMessage = useBruiloftStore((s) => s.restoreMessage)
  const replyToMessage = useBruiloftStore((s) => s.replyToMessage)
  const permissions = useBruiloftStore((s) => s.permissions)
  const heeftEditRechten = canEdit(permissions, 'leveranciers')
  const { toast } = useToast()

  const [folder, setFolder] = React.useState<BerichtFolder>('postvak-in')
  const [selectedThreadId, setSelectedThreadId] = React.useState<ID | null>(null)
  const [mobielWeergave, setMobielWeergave] = React.useState<'lijst' | 'detail'>('lijst')
  const [zoek, setZoek] = React.useState('')

  const gelezenIds = React.useMemo(
    () => new Set(messageReads.filter((r) => r.userId === currentUserId).map((r) => r.messageId)),
    [messageReads, currentUserId]
  )
  const threads = React.useMemo(() => buildThreads(messages, gelezenIds), [messages, gelezenIds])
  const threadsById = React.useMemo(() => new Map(threads.map((t) => [t.id, t])), [threads])
  const ongelezenPostvakIn = ongelezenBerichten(messages, messageReads, currentUserId)

  const vendorNaamVoor = (vendorId?: ID) => (vendorId ? vendors.find((v) => v.id === vendorId)?.naam : undefined)

  const zoekterm = zoek.trim().toLowerCase()
  const matchThread = (t: Thread): boolean => {
    if (!zoekterm) return true
    const vendorNaam = vendorNaamVoor(t.vendorId) ?? ''
    const doorzoekbaar = [t.onderwerp, vendorNaam, ...t.berichten.map((m) => `${m.afzenderNaam} ${m.inhoud}`)]
      .join(' ')
      .toLowerCase()
    return doorzoekbaar.includes(zoekterm)
  }
  const matchBericht = (m: Message): boolean => {
    if (!zoekterm) return true
    const vendorNaam = vendorNaamVoor(m.vendorId) ?? ''
    return `${m.onderwerp} ${m.afzenderNaam} ${m.inhoud} ${vendorNaam}`.toLowerCase().includes(zoekterm)
  }

  const isPlat = folder === 'verzonden' || folder === 'concepten'
  const zichtbareThreads = isPlat ? [] : threadsVoorFolder(threads, folder).filter(matchThread)
  const zichtbareBerichten = !isPlat
    ? []
    : (folder === 'verzonden' ? verzondenBerichten(messages) : conceptBerichten(messages)).filter(matchBericht)

  const kiesFolder = (f: BerichtFolder) => {
    setFolder(f)
    setSelectedThreadId(null)
    setMobielWeergave('lijst')
  }

  const openThread = (threadId: ID) => {
    setSelectedThreadId(threadId)
    setMobielWeergave('detail')
    const thread = threadsById.get(threadId)
    if (!thread) return
    for (const m of thread.berichten) {
      if (m.direction === 'inbound' && !gelezenIds.has(m.id)) {
        markMessageRead(m.id).catch(() => {})
      }
    }
  }

  const voerActieUit = async (id: ID, fn: (id: ID) => Promise<void>, label: string) => {
    const thread = threadsById.get(id)
    if (!thread) return
    try {
      await Promise.all(thread.berichten.map((m) => fn(m.id)))
      toast({ title: label, variant: 'success' })
      if (selectedThreadId === id) {
        setSelectedThreadId(null)
        setMobielWeergave('lijst')
      }
    } catch {
      toast({ title: 'Actie mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
  }

  const archiveerId = (id: ID) => voerActieUit(id, archiveMessage, 'Gesprek gearchiveerd')
  const unarchiveerId = (id: ID) => voerActieUit(id, unarchiveMessage, 'Teruggezet naar postvak in')
  const verwijderId = (id: ID) => voerActieUit(id, trashMessage, 'Gesprek verwijderd')
  const herstelId = (id: ID) => voerActieUit(id, restoreMessage, 'Gesprek hersteld')

  const geselecteerdeThread = selectedThreadId ? (threadsById.get(selectedThreadId) ?? null) : null
  const geselecteerdeVendorNaam = geselecteerdeThread ? vendorNaamVoor(geselecteerdeThread.vendorId) : undefined

  const reageerOpGeselecteerd = async (tekst: string) => {
    if (!selectedThreadId) return
    await replyToMessage(selectedThreadId, tekst)
  }

  const lijstProps = {
    folder,
    threads: zichtbareThreads,
    berichten: zichtbareBerichten,
    vendors,
    geselecteerdId: selectedThreadId,
    onSelect: openThread,
    onArchive: archiveerId,
    onUnarchive: unarchiveerId,
    onTrash: verwijderId,
    onRestore: herstelId,
  }

  const detailProps = {
    thread: geselecteerdeThread,
    vendorNaam: geselecteerdeVendorNaam,
    heeftEditRechten,
    onArchive: () => geselecteerdeThread && archiveerId(geselecteerdeThread.id),
    onUnarchive: () => geselecteerdeThread && unarchiveerId(geselecteerdeThread.id),
    onTrash: () => geselecteerdeThread && verwijderId(geselecteerdeThread.id),
    onRestore: () => geselecteerdeThread && herstelId(geselecteerdeThread.id),
    onReply: reageerOpGeselecteerd,
  }

  return (
    <div className="flex h-[75vh] min-h-[480px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm md:h-[calc(100vh-13rem)]">
      {/* Mobiel: lijst óf detail, nooit beide tegelijk. */}
      <div className={cn('flex min-h-0 flex-1 flex-col md:hidden', mobielWeergave === 'detail' && 'hidden')}>
        <div className="border-b border-border p-3">
          <SearchInput
            value={zoek}
            onValueChange={setZoek}
            placeholder="Zoek in berichten…"
            aria-label="Zoek in berichten"
          />
        </div>
        <FolderNav folder={folder} onChange={kiesFolder} ongelezenPostvakIn={ongelezenPostvakIn} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <MessageList {...lijstProps} />
        </div>
      </div>
      <div className={cn('min-h-0 flex-1 md:hidden', mobielWeergave === 'lijst' && 'hidden')}>
        <MessageDetail {...detailProps} onBack={() => setMobielWeergave('lijst')} />
      </div>

      {/* Desktop: twee kolommen permanent naast elkaar. */}
      <div className="hidden min-h-0 flex-1 md:flex">
        <div className="flex w-[320px] shrink-0 flex-col border-r border-border lg:w-[360px]">
          <div className="border-b border-border p-3">
            <SearchInput
              value={zoek}
              onValueChange={setZoek}
              placeholder="Zoek in berichten…"
              aria-label="Zoek in berichten"
            />
          </div>
          <FolderNav folder={folder} onChange={kiesFolder} ongelezenPostvakIn={ongelezenPostvakIn} />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <MessageList {...lijstProps} />
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <MessageDetail {...detailProps} />
        </div>
      </div>
    </div>
  )
}
