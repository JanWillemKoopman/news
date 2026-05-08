'use client'

import { ArrowRight, Briefcase, Check, Users } from 'lucide-react'
import { AGENTS, ALL_AGENT_IDS, MANAGER_NAME, MANAGER_TITLE } from '@/lib/agents'
import { useChatStore } from '@/store/chatStore'
import type { AgentId } from '@/types'
import AgentIcon from './AgentIcon'

export default function SelectionScreen() {
  const { selectedAgents, toggleAgent, startSession } = useChatStore()
  const canStart = selectedAgents.length >= 1

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-4 pt-10 pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Briefcase size={14} className="text-blue-400" />
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Online Marketingbureau
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Stel je bureau-team samen
          </h1>
          <p className="text-slate-400 mt-2 text-sm sm:text-base max-w-lg">
            {MANAGER_NAME} — jouw {MANAGER_TITLE} — neemt altijd de regie. Kies daarnaast
            welke specialisten je wilt inschakelen voor jouw campagne. Standaard staat
            het volledige team aan voor een compleet plan.
          </p>
        </div>
      </header>

      {/* Team grid */}
      <main className="flex-1 px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Manager card (separate, prominent, niet selecteerbaar) */}
          <div className="mb-6">
            <div className="relative p-5 rounded-2xl border bg-blue-500/10 border-blue-500/30 shadow-lg">
              <span className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-widest text-blue-300">
                Altijd aan
              </span>
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center border bg-blue-500/20 border-blue-500/40 flex-shrink-0">
                  <Briefcase size={20} className="text-blue-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-blue-300 uppercase tracking-widest mb-1">
                    Jouw dirigent
                  </p>
                  <h3 className="font-semibold text-base text-white">{MANAGER_NAME}</h3>
                  <p className="text-xs font-medium text-blue-300 mb-2">{MANAGER_TITLE}</p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Doet de intake, bewaakt de regie en bouwt aan het eind het complete plan
                    op basis van álle input van jou en het team.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3 px-1">
            Specialisten — tik om te (de)selecteren
          </p>

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
                      ? `${agent.bgColor} ${agent.borderColor} shadow-lg`
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-600 hover:bg-slate-800/70',
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
                      'w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-all duration-200 border',
                      isSelected
                        ? `${agent.bgColor} ${agent.borderColor}`
                        : 'bg-slate-800 border-slate-700 group-hover:border-slate-600',
                    ].join(' ')}
                  >
                    <AgentIcon
                      agentId={agent.id}
                      className={`w-5 h-5 transition-colors ${
                        isSelected ? agent.color : 'text-slate-400 group-hover:text-slate-300'
                      }`}
                    />
                  </div>

                  <h3
                    className={`font-semibold text-sm mb-0.5 ${
                      isSelected ? 'text-white' : 'text-slate-200'
                    }`}
                  >
                    {agent.name}
                  </h3>
                  <p
                    className={`text-xs font-medium mb-2 ${
                      isSelected ? agent.color : 'text-slate-500'
                    }`}
                  >
                    {agent.title}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                    {agent.description}
                  </p>
                </button>
              )
            })}
          </div>

          {selectedAgents.length === 0 && (
            <p className="text-center text-xs text-amber-400/80 mt-4 animate-fade-in">
              Selecteer minstens één specialist om te starten.
            </p>
          )}
        </div>
      </main>

      {/* Sticky footer CTA */}
      <footer className="sticky bottom-0 border-t border-slate-800/60 bg-slate-950/90 backdrop-blur-md px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Users size={15} className="text-slate-500" />
            <span>
              <span
                className={`font-semibold ${
                  selectedAgents.length > 0 ? 'text-white' : ''
                }`}
              >
                {selectedAgents.length}
              </span>
              <span className="text-slate-500"> / {ALL_AGENT_IDS.length} specialisten</span>
            </span>
          </div>

          <button
            onClick={startSession}
            disabled={!canStart}
            className={[
              'flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200',
              canStart
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-0.5'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed',
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
