'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { Agent } from '@/types'
import AgentIcon from './AgentIcon'

interface AgentInfoModalProps {
  agent: Agent
  onClose: () => void
}

export default function AgentInfoModal({ agent, onClose }: AgentInfoModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink-900/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-lg bg-cream-50 border border-cream-500 rounded-t-3xl sm:rounded-2xl p-6 pt-8 sm:pt-6 animate-slide-up max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Sluiten"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-cream-300 hover:bg-cream-400 border border-cream-500 flex items-center justify-center transition-colors"
        >
          <X size={14} className="text-ink-600" />
        </button>

        <div className="flex items-start gap-4 mb-5">
          <div
            className={`w-14 h-14 rounded-full overflow-hidden ring-2 ring-offset-2 ring-offset-cream-50 flex-shrink-0 ${agent.borderColor.replace('border-', 'ring-')}`}
          >
            <AgentIcon agentId={agent.id} size={56} />
          </div>
          <div>
            <h2 className="font-serif font-medium text-2xl text-ink-900 leading-tight">
              {agent.name}
            </h2>
            <p className={`text-sm font-medium mt-0.5 ${agent.color}`}>{agent.title}</p>
          </div>
        </div>

        <div className="space-y-3">
          {agent.longDescription.split('\n\n').map((paragraph, i) => (
            <p key={i} className="text-sm text-ink-600 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
