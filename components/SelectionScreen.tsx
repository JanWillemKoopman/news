'use client'

import { ArrowRight, Briefcase, Users } from 'lucide-react'
import { AGENTS, ALL_AGENT_IDS, MANAGER_NAME, MANAGER_TITLE } from '@/lib/agents'
import { useChatStore } from '@/store/chatStore'
import AgentIcon from './AgentIcon'

export default function SelectionScreen() {
  const startSession = useChatStore((s) => s.startSession)

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
            Maak kennis met je bureau
          </h1>
          <p className="text-slate-400 mt-2 text-sm sm:text-base max-w-lg">
            Je krijgt vandaag de begeleiding van een complete marketing-crew. {MANAGER_NAME} —
            jouw {MANAGER_TITLE} — neemt de intake en zet daarna de zes specialisten in om
            samen een ijzersterk campagneplan voor je op te stellen.
          </p>
        </div>
      </header>

      {/* Team grid */}
      <main className="flex-1 px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Manager card (separate, prominent) */}
          <div className="mb-6">
            <div className="relative p-5 rounded-2xl border bg-blue-500/10 border-blue-500/30 shadow-lg">
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
            Zes specialisten
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {ALL_AGENT_IDS.map((id) => {
              const agent = AGENTS[id]
              return (
                <div
                  key={agent.id}
                  className={`relative p-5 rounded-2xl border ${agent.bgColor} ${agent.borderColor} shadow-lg`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 border ${agent.bgColor} ${agent.borderColor}`}
                  >
                    <AgentIcon agentId={agent.id} className={`w-5 h-5 ${agent.color}`} />
                  </div>
                  <h3 className="font-semibold text-sm mb-0.5 text-white">{agent.name}</h3>
                  <p className={`text-xs font-medium mb-2 ${agent.color}`}>{agent.title}</p>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                    {agent.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </main>

      {/* Sticky footer CTA */}
      <footer className="sticky bottom-0 border-t border-slate-800/60 bg-slate-950/90 backdrop-blur-md px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Users size={15} className="text-slate-500" />
            <span>
              <span className="font-semibold text-white">7</span>
              <span className="text-slate-500"> experts staan klaar</span>
            </span>
          </div>

          <button
            onClick={startSession}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-0.5"
          >
            Start campagne-briefing
            <ArrowRight size={15} />
          </button>
        </div>
      </footer>
    </div>
  )
}
