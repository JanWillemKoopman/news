'use client'

import { ArrowRight, Users, Zap } from 'lucide-react'
import { AGENTS } from '@/lib/agents'
import { useChatStore } from '@/store/chatStore'
import type { AgentId } from '@/types'
import AgentCard from './AgentCard'

const AGENT_IDS = Object.keys(AGENTS) as AgentId[]

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
              <Zap size={14} className="text-blue-400" />
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Multi-Agent AI
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Stel je team samen
          </h1>
          <p className="text-slate-400 mt-2 text-sm sm:text-base max-w-lg">
            Selecteer 1 tot 3 experts. Het AI-systeem orkestreert gerichte vragen en
            genereert daarna een persoonlijk eindadvies in het Nederlands.
          </p>
        </div>
      </header>

      {/* Grid */}
      <main className="flex-1 px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {AGENT_IDS.map((id) => (
              <AgentCard
                key={id}
                agent={AGENTS[id]}
                isSelected={selectedAgents.includes(id)}
                isDisabled={!selectedAgents.includes(id) && selectedAgents.length >= 3}
                onClick={() => toggleAgent(id)}
              />
            ))}
          </div>

          {selectedAgents.length === 3 && (
            <p className="text-center text-xs text-slate-500 mt-4 animate-fade-in">
              Maximum van 3 adviseurs bereikt
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
              <span className={`font-semibold ${selectedAgents.length > 0 ? 'text-white' : ''}`}>
                {selectedAgents.length}
              </span>
              <span className="text-slate-500"> / 3 geselecteerd</span>
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
            Start Sessie
            <ArrowRight size={15} />
          </button>
        </div>
      </footer>
    </div>
  )
}
