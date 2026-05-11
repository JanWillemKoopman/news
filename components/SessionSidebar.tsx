'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Loader2, MoreVertical, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import type { ChatSession, ChatSessionSummary } from '@/types'

interface SessionSidebarProps {
  open: boolean
  onClose: () => void
  refreshKey: number
  onMutate: () => void
  variant?: 'persistent' | 'drawer'
}

const PHASE_LABEL: Record<string, string> = {
  intake: 'Intake',
  planning: 'Planning',
  final: 'Plan',
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - then)
  const min = Math.round(diff / 60_000)
  if (min < 1) return 'net'
  if (min < 60) return `${min} min`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} uur`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day} d`
  const wk = Math.round(day / 7)
  if (wk < 5) return `${wk} wk`
  const mo = Math.round(day / 30)
  return `${mo} mnd`
}

export default function SessionSidebar({
  open,
  onClose,
  refreshKey,
  onMutate,
  variant = 'persistent',
}: SessionSidebarProps) {
  const resetSession = useChatStore((s) => s.resetSession)
  const hydrateFromSession = useChatStore((s) => s.hydrateFromSession)
  const currentSessionId = useChatStore((s) => s.currentSessionId)

  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const menuContainerRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sessions', { cache: 'no-store' })
      if (res.status === 401) {
        setSessions([])
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { sessions: ChatSessionSummary[] }
      setSessions(data.sessions ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon sessies niet laden')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  // Sluit driepuntsmenu bij klik buiten.
  useEffect(() => {
    if (!menuOpenId) return
    function onDocClick(e: MouseEvent) {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setMenuOpenId(null)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuOpenId])

  // "Nieuwe sessie" stuurt terug naar het selectie-scherm zodat de gebruiker
  // opnieuw specialisten kiest én via de klantprofiel-picker een klant aangeeft.
  const handleNew = () => {
    resetSession()
    onClose()
    onMutate()
  }

  const handleSelect = async (id: string) => {
    if (renameId === id) return
    if (id === currentSessionId) {
      onClose()
      return
    }
    setBusyId(id)
    try {
      const res = await fetch(`/api/sessions/${id}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Kon sessie niet laden')
      const { session } = (await res.json()) as { session: ChatSession }
      hydrateFromSession(session)
      onClose()
      onMutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon sessie niet laden')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setMenuOpenId(null)
    const ok = window.confirm('Deze sessie verwijderen? Dit kan niet ongedaan worden gemaakt.')
    if (!ok) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Verwijderen mislukt')
      if (id === currentSessionId) {
        resetSession()
      }
      onMutate()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verwijderen mislukt')
    } finally {
      setBusyId(null)
    }
  }

  const startRename = (s: ChatSessionSummary) => {
    setMenuOpenId(null)
    setRenameId(s.id)
    setRenameValue(s.title)
  }

  const cancelRename = () => {
    setRenameId(null)
    setRenameValue('')
  }

  const submitRename = async (id: string) => {
    const trimmed = renameValue.trim()
    if (!trimmed) {
      cancelRename()
      return
    }
    // Optimistisch direct in lijst tonen.
    setSessions((list) =>
      list.map((s) => (s.id === id ? { ...s, title: trimmed } : s))
    )
    setRenameId(null)
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      })
      if (!res.ok) throw new Error('Hernoemen mislukt')
      onMutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hernoemen mislukt')
      // Bij fout: herlaad om server-truth terug te krijgen.
      await load()
    }
  }

  const content = (
    <>
      <div className="flex items-center justify-between px-4 py-4 border-b border-cream-500">
        <p className="text-[10px] font-medium text-ink-500 uppercase tracking-[0.18em]">
          Sessies
        </p>
        <button
          onClick={onClose}
          aria-label="Sluit zijbalk"
          className={[
            'w-7 h-7 rounded-full hover:bg-cream-400 flex items-center justify-center',
            variant === 'drawer' ? '' : 'md:hidden',
          ].join(' ')}
        >
          <X size={14} className="text-ink-500" />
        </button>
      </div>

      <div className="px-3 py-3 border-b border-cream-500">
        <button
          onClick={handleNew}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-clay-500 hover:bg-clay-600 text-white text-sm font-medium transition-colors"
        >
          <Plus size={14} />
          Nieuwe sessie
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2" ref={menuContainerRef}>
        {loading && sessions.length === 0 && (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={16} className="animate-spin text-ink-400" />
          </div>
        )}
        {error && <p className="px-3 py-2 text-xs text-clay-700">{error}</p>}
        {!loading && sessions.length === 0 && !error && (
          <p className="px-3 py-3 text-xs text-ink-500 leading-relaxed">
            Nog geen opgeslagen sessies. Begin gewoon met praten — het wordt automatisch
            bewaard.
          </p>
        )}
        <ul className="space-y-1">
          {sessions.map((s) => {
            const isCurrent = s.id === currentSessionId
            const isRenaming = renameId === s.id
            return (
              <li key={s.id} className="relative">
                {isRenaming ? (
                  <div
                    className={[
                      'px-3 py-2.5 rounded-xl border',
                      isCurrent
                        ? 'bg-cream-50 border-clay-500/40'
                        : 'bg-cream-50 border-cream-500',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitRename(s.id)
                          if (e.key === 'Escape') cancelRename()
                        }}
                        maxLength={120}
                        className="flex-1 min-w-0 bg-cream-200 border border-cream-500 focus:border-clay-500 outline-none rounded-lg px-2 py-1 text-sm text-ink-900"
                      />
                      <button
                        type="button"
                        onClick={() => submitRename(s.id)}
                        aria-label="Bevestig hernoemen"
                        className="w-7 h-7 rounded-md hover:bg-cream-300 flex items-center justify-center flex-shrink-0"
                      >
                        <Check size={13} className="text-clay-600" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelRename}
                        aria-label="Annuleer hernoemen"
                        className="w-7 h-7 rounded-md hover:bg-cream-300 flex items-center justify-center flex-shrink-0"
                      >
                        <X size={13} className="text-ink-500" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelect(s.id)}
                    disabled={busyId === s.id}
                    className={[
                      'group w-full text-left px-3 py-2.5 rounded-xl border transition-colors',
                      isCurrent
                        ? 'bg-cream-50 border-clay-500/40'
                        : 'bg-transparent border-transparent hover:bg-cream-300 hover:border-cream-500',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-ink-900 line-clamp-2 leading-snug">
                        {s.title}
                      </p>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="Meer acties"
                        aria-haspopup="menu"
                        aria-expanded={menuOpenId === s.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpenId(menuOpenId === s.id ? null : s.id)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            e.stopPropagation()
                            setMenuOpenId(menuOpenId === s.id ? null : s.id)
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 aria-expanded:opacity-100 transition-opacity w-6 h-6 rounded-md flex items-center justify-center hover:bg-cream-400 flex-shrink-0 cursor-pointer"
                      >
                        <MoreVertical size={12} className="text-ink-500" />
                      </span>
                    </div>
                    {s.preview && (
                      <p className="mt-1 text-[11px] text-ink-500 line-clamp-1">
                        {s.preview}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-ink-400">
                      <span>{relativeTime(s.updated_at)}</span>
                      <span>·</span>
                      <span>{PHASE_LABEL[s.phase] ?? s.phase}</span>
                    </div>
                  </button>
                )}

                {menuOpenId === s.id && !isRenaming && (
                  <div
                    role="menu"
                    className="absolute right-2 top-10 z-10 w-40 bg-cream-50 border border-cream-500 rounded-xl shadow-lg overflow-hidden"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation()
                        startRename(s)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink-700 hover:bg-cream-200 transition-colors"
                    >
                      <Pencil size={12} className="text-ink-500" />
                      Hernoemen
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(s.id)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-clay-700 hover:bg-clay-500/10 transition-colors border-t border-cream-500"
                    >
                      <Trash2 size={12} />
                      Verwijderen
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )

  if (variant === 'drawer') {
    if (!open) return null
    return (
      <div className="fixed inset-0 z-30 flex">
        <div
          className="flex-1 bg-ink-900/30"
          onClick={onClose}
          aria-hidden="true"
        />
        <aside className="w-72 max-w-[85%] bg-cream-200 border-l border-cream-500 flex flex-col">
          {content}
        </aside>
      </div>
    )
  }

  // persistent: vaste zijbalk op desktop, drawer op mobiel.
  return (
    <>
      <aside className="hidden md:flex w-72 flex-col bg-cream-200 border-r border-cream-500 h-screen sticky top-0">
        {content}
      </aside>

      {open && (
        <div className="md:hidden fixed inset-0 z-30 flex">
          <div
            className="flex-1 bg-ink-900/30"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="w-72 max-w-[85%] bg-cream-200 border-l border-cream-500 flex flex-col">
            {content}
          </aside>
        </div>
      )}
    </>
  )
}
