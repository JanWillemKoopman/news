'use client'

import { Check } from 'lucide-react'
import type { Agent } from '@/types'
import AgentIcon from './AgentIcon'

interface AgentCardProps {
  agent: Agent
  isSelected: boolean
  isDisabled: boolean
  onClick: () => void
}

export default function AgentCard({ agent, isSelected, isDisabled, onClick }: AgentCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={[
        'relative p-3 md:p-5 rounded-2xl border text-left w-full transition-all duration-200 group',
        isSelected
          ? `${agent.bgColor} ${agent.borderColor} shadow-lg`
          : isDisabled
          ? 'bg-slate-900/30 border-slate-800/50 opacity-40 cursor-not-allowed'
          : 'bg-slate-900/80 border-slate-800 hover:border-slate-600 hover:bg-slate-800/70',
      ].join(' ')}
    >
      {isSelected && (
        <span
          className={`absolute top-2 right-2 md:top-4 md:right-4 w-5 h-5 rounded-full flex items-center justify-center ${agent.bgColor} border ${agent.borderColor}`}
        >
          <Check size={10} className={agent.color} strokeWidth={3} />
        </span>
      )}

      <div
        className={[
          'w-9 h-9 md:w-11 md:h-11 rounded-xl flex items-center justify-center mb-2 md:mb-4 transition-all duration-200 border',
          isSelected
            ? `${agent.bgColor} ${agent.borderColor}`
            : 'bg-slate-800 border-slate-700 group-hover:border-slate-600',
        ].join(' ')}
      >
        <AgentIcon
          agentId={agent.id}
          className={`w-4 h-4 md:w-5 md:h-5 transition-colors ${isSelected ? agent.color : 'text-slate-400 group-hover:text-slate-300'}`}
        />
      </div>

      <h3 className={`font-semibold text-sm mb-0.5 ${isSelected ? 'text-white' : 'text-slate-200'}`}>
        {agent.name}
      </h3>
      <p className={`text-xs font-medium mb-2 ${isSelected ? agent.color : 'text-slate-500'}`}>
        {agent.title}
      </p>
      <p className="hidden md:block text-xs text-slate-500 leading-relaxed line-clamp-2">{agent.description}</p>
    </button>
  )
}
