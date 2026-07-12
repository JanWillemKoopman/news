import type { ID, Message } from '@/lib/bruiloft/types'

// Groepeert losse messages-rijen tot gesprekken: alles met dezelfde
// thread-root (het openingsbericht) hoort bij elkaar, ongeacht richting.
// parentMessageId wijst altijd naar de root (niet naar het vorige bericht in
// het gesprek) — zowel leverancierreacties als vervolgberichten van het
// bruidspaar zetten `parentMessageId = root.id`, zie /api/reactie/[token] en
// /api/berichten/[id]/reply.
export interface Thread {
  id: ID // thread-root message id
  root: Message
  berichten: Message[] // chronologisch, oud → nieuw
  laatste: Message
  vendorId?: ID
  onderwerp: string
  archived: boolean
  deleted: boolean
  ongelezen: boolean
  // Een gesprek is pas beantwoordbaar zodra de leverancier zelf heeft
  // gereageerd — dat is de expliciete voorwaarde uit de opzet.
  heeftLeverancierReactie: boolean
  // Alleen offerte-/contact-openingsberichten krijgen een reply_token
  // (altijd, zie /api/leveranciers/contact) — dus reageren kan alleen bij
  // die twee brontypen.
  kanReageren: boolean
}

function threadRootId(m: Message): ID {
  return m.parentMessageId ?? m.id
}

export function buildThreads(messages: Message[], gelezenIds: Set<ID>): Thread[] {
  const groepen = new Map<ID, Message[]>()
  for (const m of messages) {
    const rootId = threadRootId(m)
    const lijst = groepen.get(rootId)
    if (lijst) lijst.push(m)
    else groepen.set(rootId, [m])
  }

  const threads: Thread[] = []
  for (const [rootId, lijst] of Array.from(groepen.entries())) {
    const berichten = [...lijst].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const root = berichten.find((m) => m.id === rootId) ?? berichten[0]
    const laatste = berichten[berichten.length - 1]
    threads.push({
      id: rootId,
      root,
      berichten,
      laatste,
      vendorId: root.vendorId,
      onderwerp: root.onderwerp,
      archived: Boolean(root.archivedAt),
      deleted: Boolean(root.deletedAt),
      ongelezen: berichten.some((m) => m.direction === 'inbound' && !gelezenIds.has(m.id)),
      heeftLeverancierReactie: berichten.some((m) => m.type === 'leverancier_reactie'),
      kanReageren: root.type === 'leverancier_offerte' || root.type === 'leverancier_contact',
    })
  }
  return threads
}

export type BerichtFolder = 'postvak-in' | 'verzonden' | 'concepten' | 'archief' | 'verwijderd'

// Postvak in / Archief / Verwijderd tonen gesprekken (conversation view, ook
// het eigen openingsbericht en eventuele vervolgberichten inbegrepen) — zelfde
// idee als Gmail. Verzonden / Concepten tonen losse berichten (zie
// verzondenBerichten/conceptBerichten hieronder), zoals een echte mailbox dat
// ook doet: "Verzonden" is een log van wat je verstuurd hebt, geen
// gespreksweergave.
export function threadsVoorFolder(threads: Thread[], folder: 'postvak-in' | 'archief' | 'verwijderd'): Thread[] {
  const zichtbaar = threads.filter((t) => {
    if (folder === 'verwijderd') return t.deleted
    if (t.deleted) return false
    if (folder === 'archief') return t.archived
    if (t.archived) return false
    return t.laatste.status !== 'concept'
  })
  return zichtbaar.sort((a, b) => b.laatste.createdAt.localeCompare(a.laatste.createdAt))
}

export function verzondenBerichten(messages: Message[]): Message[] {
  return messages
    .filter((m) => m.direction === 'outbound' && m.status !== 'concept' && !m.archivedAt && !m.deletedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function conceptBerichten(messages: Message[]): Message[] {
  return messages
    .filter((m) => m.status === 'concept' && !m.archivedAt && !m.deletedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
