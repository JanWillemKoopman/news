'use client'

import { ArrowRight, Briefcase, Check, Users } from 'lucide-react'
import { AGENTS, ALL_AGENT_IDS, MANAGER_NAME, MANAGER_TITLE } from '@/lib/agents'
import { useChatStore } from '@/store/chatStore'
import type { AgentId } from '@/types'
import AgentIcon from './AgentIcon'

export default function SelectionScreen() {
  const { selectedAgents, toggleAgent, selectAll, startSession } = useChatStore()
  const allSelected = selectedAgents.length === ALL_AGENT_IDS.length
  const canStart = selectedAgents.length >= 1

  return (
    <div className="min-h-screen flex flex-col bg-cream-200">
      {/* Header */}
      <header className="px-4 pt-12 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-clay-500/15 border border-clay-500/30 flex items-center justify-center">
              <Briefcase size={14} className="text-clay-600" />
            </div>
            <span className="text-[11px] font-medium text-ink-500 uppercase tracking-[0.18em]">
              Online Marketingbureau
            </span>
          </div>
          <h1 className="font-serif font-medium text-4xl sm:text-5xl text-ink-900 tracking-tight leading-[1.05]">
            Stel je bureau-team samen
          </h1>
          <p className="text-ink-500 mt-4 text-base sm:text-lg max-w-xl leading-relaxed">
            {MANAGER_NAME} — jouw {MANAGER_TITLE} — neemt altijd de regie. Kies daarnaast
            welke specialisten je wilt inschakelen voor jouw campagne. Standaard staat het
            volledige team aan voor een compleet plan.
          </p>
        </div>
      </header>

      {/* Team grid */}
      <main className="flex-1 px-4 pb-10">
        <div className="max-w-4xl mx-auto">
          {/* Manager card (separate, prominent, niet selecteerbaar) */}
          <div className="mb-8">
            <div className="relative p-6 rounded-2xl border bg-cream-50 border-clay-500/30 shadow-sm">
              <span className="absolute top-5 right-5 text-[10px] font-medium uppercase tracking-[0.15em] text-clay-600">
                Altijd aan
              </span>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center border bg-clay-500/15 border-clay-500/30 flex-shrink-0">
                  <Briefcase size={20} className="text-clay-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif font-medium text-xl text-ink-900 leading-tight">
                    {MANAGER_NAME}
                  </h3>
                  <p className="text-sm font-medium text-clay-600 mb-2.5 mt-0.5">
                    {MANAGER_TITLE}
                  </p>
                  <p className="text-sm text-ink-500 leading-relaxed">
                    Doet de intake, bewaakt de regie en bouwt aan het eind het complete plan
                    op basis van álle input van jou en het team.
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
                <button
                  key={agent.id}
                  onClick={() => toggleAgent(id)}
                  type="button"
                  className={[
                    'relative p-5 rounded-2xl border text-left w-full transition-all duration-200 group',
                    isSelected
                      ? `bg-cream-50 ${agent.borderColor} shadow-sm`
                      : 'bg-cream-300 border-cream-500 hover:border-cream-600 hover:bg-cream-400 opacity-70',
                  ].join(' ')}
                >
                  {isSelected && (
                    <span
                      className={`absolute top-4 right-4 w-5 h-5 rounded-full flex items-center justify-center ${agent.bgColor} border ${agent.borderColor}`}
                    >
                      <Check size={10} className={agent.color} strokeWidth={3} />
                    </span>
                  )}

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
                  <p className="text-xs text-ink-500 leading-relaxed line-clamp-3">
                    {agent.description}
                  </p>
                </button>
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

      {/* Sticky footer CTA */}
      <footer className="sticky bottom-0 border-t border-cream-500 bg-cream-200/95 backdrop-blur-md px-4 py-4">
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
            onClick={startSession}
            disabled={!canStart}
            className={[
              'flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all duration-200',
              canStart
                ? 'bg-clay-500 hover:bg-clay-600 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5'
                : 'bg-cream-400 text-ink-400 cursor-not-allowed',
            ].join(' ')}
          >
            Start campagne-briefing
            <ArrowRight size={15} />
          </button>
        </div>
      </footer>
    </div>
  )
}
