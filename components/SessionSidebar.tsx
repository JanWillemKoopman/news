'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Trash2, X } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import type { ChatSession, ChatSessionSummary } from '@/types'

interface SessionSidebarProps {
  open: boolean
  onClose: () => void
  refreshKey: number
  onMutate: () => void
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
}: SessionSidebarProps) {
  const startSession = useChatStore((s) => s.startSession)
  const hydrateFromSession = useChatStore((s) => s.hydrateFromSession)
  const currentSessionId = useChatStore((s) => s.currentSessionId)

  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const handleNew = () => {
    startSession()
    onClose()
    onMutate()
  }

  const handleSelect = async (id: string) => {
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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const ok = window.confirm('Deze sessie verwijderen? Dit kan niet ongedaan worden gemaakt.')
    if (!ok) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Verwijderen mislukt')
      // Verwijderde sessie was de huidige? → start meteen een nieuwe.
      if (id === currentSessionId) {
        startSession()
      }
      onMutate()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verwijderen mislukt')
    } finally {
      setBusyId(null)
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
          className="md:hidden w-7 h-7 rounded-full hover:bg-cream-400 flex items-center justify-center"
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

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {loading && sessions.length === 0 && (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={16} className="animate-spin text-ink-400" />
          </div>
        )}
        {error && (
          <p className="px-3 py-2 text-xs text-clay-700">{error}</p>
        )}
        {!loading && sessions.length === 0 && !error && (
          <p className="px-3 py-3 text-xs text-ink-500 leading-relaxed">
            Nog geen opgeslagen sessies. Begin gewoon met praten — het wordt
            automatisch bewaard.
          </p>
        )}
        <ul className="space-y-1">
          {sessions.map((s) => {
            const isCurrent = s.id === currentSessionId
            return (
              <li key={s.id}>
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
                    <button
                      type="button"
                      aria-label="Sessie verwijderen"
                      onClick={(e) => handleDelete(s.id, e)}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity w-6 h-6 rounded-md flex items-center justify-center hover:bg-clay-500/10 flex-shrink-0"
                    >
                      <Trash2 size={11} className="text-ink-400 hover:text-clay-700" />
                    </button>
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
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop: vaste zijbalk links */}
      <aside className="hidden md:flex w-72 flex-col bg-cream-200 border-r border-cream-500 h-screen sticky top-0">
        {content}
      </aside>

      {/* Mobile: drawer */}
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
