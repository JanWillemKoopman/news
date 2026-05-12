'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ArrowRight, Check, Clock, Info, Users } from 'lucide-react'
import { AGENTS, ALL_AGENT_IDS, MANAGER_NAME, MANAGER_TITLE } from '@/lib/agents'
import BrandLogo from './BrandLogo'
import { useChatStore } from '@/store/chatStore'
import type { Agent, AgentId, ClientProfile } from '@/types'
import AgentIcon from './AgentIcon'
import AgentInfoModal from './AgentInfoModal'
import AuthHeader from './AuthHeader'
import ClientProfilePicker from './ClientProfilePicker'
import SessionSidebar from './SessionSidebar'

export default function SelectionScreen() {
  const { selectedAgents, toggleAgent, selectAll, startSession } = useChatStore()
  const allSelected = selectedAgents.length === ALL_AGENT_IDS.length
  const canStart = selectedAgents.length >= 1
  const [infoAgent, setInfoAgent] = useState<Agent | null>(null)

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [userFirstName, setUserFirstName] = useState<string | undefined>(undefined)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sessionsRefreshKey, setSessionsRefreshKey] = useState(0)
  const [selectingProfile, setSelectingProfile] = useState(false)
  const [pickerError, setPickerError] = useState<string | null>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const { createSupabaseBrowserClient } = await import(
          '@/lib/supabase/client'
        )
        const supabase = createSupabaseBrowserClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!cancelled) {
          setIsAuthenticated(Boolean(user))
          setUserFirstName(user?.user_metadata?.first_name as string | undefined)
        }
      } catch {
        if (!cancelled) setIsAuthenticated(false)
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleStart() {
    if (!canStart) return
    setPickerError(null)
    if (isAuthenticated === false) {
      // Gast: meteen door zonder klantprofiel.
      startSession(null, undefined)
      return
    }
    // Ingelogd: open picker (laadt zelf de lijst, toont fallback bij 0 profielen).
    setPickerOpen(true)
  }

  async function handlePickerConfirm(profileId: string) {
    setSelectingProfile(true)
    setPickerError(null)
    try {
      const res = await fetch(`/api/profiles/${profileId}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Kon klantprofiel niet laden')
      const data = (await res.json()) as { profile: ClientProfile }
      startSession(data.profile, userFirstName)
      setPickerOpen(false)
    } catch (err) {
      setPickerError(err instanceof Error ? err.message : 'Kon sessie niet starten')
    } finally {
      setSelectingProfile(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream-200">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-cream-200 border-b border-cream-500/60 px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-ink-900/8 border border-ink-900/15 flex items-center justify-center">
                <BrandLogo size={14} className="text-ink-900" />
              </div>
              <span className="hidden sm:inline text-[11px] font-medium text-ink-500 uppercase tracking-[0.18em]">
                Marketing Sessie
              </span>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Bekijk eerdere sessies"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cream-50 border border-cream-500 hover:border-cream-600 text-xs font-medium text-ink-600 hover:text-ink-700 transition-colors"
                >
                  <Clock size={12} />
                  Geschiedenis
                </button>
              )}
              <AuthHeader />
            </div>
          </div>
        </div>
      </header>

      {/* Team grid */}
      <main className="flex-1 px-4 pt-8 pb-28">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-serif font-medium text-4xl sm:text-5xl text-ink-900 tracking-tight leading-[1.05]">
            Stel je team samen
          </h1>
          <p className="text-ink-500 mt-4 mb-8 text-base sm:text-lg max-w-xl leading-relaxed">
            Kies je specialisten en ga aan de slag. Onder begeleiding van marketingmanager Jeroen pakken we jouw marketingvraagstuk samen aan.
          </p>
          {/* Manager card (separate, prominent, niet selecteerbaar) */}
          <div className="mb-6">
            <div className="relative p-6 rounded-2xl border bg-cream-50 border-clay-500/30 shadow-sm">
              <span className="absolute top-5 right-5 text-[10px] font-medium uppercase tracking-[0.15em] text-clay-600">
                Altijd aanwezig
              </span>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-clay-500/40 ring-offset-2 ring-offset-cream-50 flex-shrink-0">
                  <Image
                    src="/agents/jeroen.png"
                    alt={MANAGER_NAME}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif font-medium text-xl text-ink-900 leading-tight">
                    {MANAGER_NAME}
                  </h3>
                  <p className="text-sm font-medium text-clay-600 mb-2.5 mt-0.5">
                    {MANAGER_TITLE}
                  </p>
                  <p className="text-sm text-ink-500 leading-relaxed">
                    {MANAGER_NAME} is jouw strategische partner. Hij vertaalt jouw marketingvraagstukken naar de juiste inzet van het team. Of het nu gaat om een snelle vraag of een volledig campagneplan, hij zorgt dat het geregeld wordt.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-[10px] font-medium text-ink-500 uppercase tracking-[0.18em]">
              Kies specialist(en)
            </p>
            {!allSelected && (
              <button
                type="button"
                onClick={selectAll}
                className="text-[11px] font-medium text-clay-600 hover:text-clay-700 transition-colors"
              >
                Alles selecteren
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {ALL_AGENT_IDS.map((id: AgentId) => {
              const agent = AGENTS[id]
              const isSelected = selectedAgents.includes(id)
              return (
                <div
                  key={agent.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleAgent(id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleAgent(id) }}
                  className={[
                    'relative p-5 rounded-2xl border text-left w-full transition-all duration-200 group cursor-pointer',
                    isSelected
                      ? `bg-cream-50 ${agent.borderColor} shadow-sm`
                      : 'bg-cream-300 border-cream-500 hover:border-cream-600 hover:bg-cream-400 opacity-90',
                  ].join(' ')}
                >
                  {isSelected && (
                    <span
                      className={`absolute top-4 right-4 w-5 h-5 rounded-full flex items-center justify-center ${agent.bgColor} border ${agent.borderColor}`}
                    >
                      <Check size={10} className={agent.color} strokeWidth={3} />
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setInfoAgent(agent) }}
                    aria-label={`Meer info over ${agent.name}`}
                    className={[
                      'absolute bottom-4 right-4 w-6 h-6 rounded-full flex items-center justify-center border transition-colors',
                      isSelected
                        ? `${agent.bgColor} ${agent.borderColor} hover:opacity-80`
                        : 'bg-cream-200 border-cream-500 hover:bg-cream-300',
                    ].join(' ')}
                  >
                    <Info size={11} className={isSelected ? agent.color : 'text-ink-500'} />
                  </button>

                  <div
                    className={[
                      'w-12 h-12 rounded-full overflow-hidden mb-4 ring-2 ring-offset-2 transition-all duration-200',
                      isSelected
                        ? `${agent.borderColor.replace('border-', 'ring-')} ring-offset-cream-50`
                        : 'ring-cream-500 ring-offset-cream-300',
                    ].join(' ')}
                  >
                    <AgentIcon agentId={agent.id} size={48} />
                  </div>

                  <h3
                    className={`font-serif text-lg leading-tight mb-0.5 ${
                      isSelected ? 'text-ink-900' : 'text-ink-700'
                    }`}
                  >
                    {agent.name}
                  </h3>
                  <p
                    className={`text-xs font-medium mb-2 ${
                      isSelected ? agent.color : 'text-ink-400'
                    }`}
                  >
                    {agent.title}
                  </p>
                  <p className="text-xs text-ink-500 leading-relaxed line-clamp-3 pr-2">
                    {agent.description}
                  </p>
                </div>
              )
            })}
          </div>

          {selectedAgents.length === 0 && (
            <p className="text-center text-xs text-clay-700 mt-4 animate-fade-in">
              Selecteer minstens één specialist om te starten.
            </p>
          )}
        </div>
      </main>

      {infoAgent && (
        <AgentInfoModal agent={infoAgent} onClose={() => setInfoAgent(null)} />
      )}

      <ClientProfilePicker
        open={pickerOpen}
        onClose={() => {
          if (!selectingProfile) setPickerOpen(false)
        }}
        onConfirm={handlePickerConfirm}
      />

      {pickerError && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-clay-500 text-white text-xs shadow-lg">
          {pickerError}
        </div>
      )}

      {isAuthenticated && (
        <SessionSidebar
          variant="drawer"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          refreshKey={sessionsRefreshKey}
          onMutate={() => setSessionsRefreshKey((k) => k + 1)}
        />
      )}

      {/* Fixed footer CTA */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 border-t border-cream-500 bg-cream-200/95 backdrop-blur-md px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-ink-500">
            <Users size={15} className="text-ink-400" />
            <span>
              <span
                className={`font-medium ${
                  selectedAgents.length > 0 ? 'text-ink-900' : ''
                }`}
              >
                {selectedAgents.length}
              </span>
              <span className="text-ink-400"> / {ALL_AGENT_IDS.length} specialisten</span>
            </span>
          </div>

          <button
            onClick={handleStart}
            disabled={!canStart}
            className={[
              'flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all duration-200',
              canStart
                ? 'bg-clay-500 hover:bg-clay-600 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5'
                : 'bg-cream-400 text-ink-400 cursor-not-allowed',
            ].join(' ')}
          >
            Start sessie
            <ArrowRight size={15} />
          </button>
        </div>
      </footer>
    </div>
  )
}
