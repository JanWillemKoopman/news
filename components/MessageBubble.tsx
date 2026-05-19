import { Bot, Crown } from 'lucide-react'
import { AGENTS } from '@/lib/agents'
import type { Message } from '@/types'
import AgentIcon from './AgentIcon'

interface MessageBubbleProps {
  message: Message
}

function RichText({ content }: { content: string }) {
  const parts = content.split(/(\*\*[^*]+\*\*)/)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[82%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-sm">
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
      </div>
    )
  }

  if (message.role === 'moderator') {
    return (
      <div className="flex items-start gap-3 animate-fade-in">
        <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot size={14} className="text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
            Moderator
          </p>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
            <p className="text-sm text-slate-300 leading-relaxed">{message.content}</p>
          </div>
        </div>
      </div>
    )
  }

  if (message.role === 'final') {
    return (
      <div className="animate-slide-up">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Crown size={15} className="text-yellow-400" />
          <span className="text-xs font-semibold text-yellow-400 uppercase tracking-widest">
            Eindadvies
          </span>
          <div className="flex-1 h-px bg-yellow-500/20" />
        </div>
        <div className="bg-gradient-to-br from-slate-900 to-slate-900/60 border border-yellow-500/20 rounded-2xl p-5 shadow-lg shadow-yellow-500/5">
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
            <RichText content={message.content} />
          </p>
        </div>
      </div>
    )
  }

  // Agent message
  const agent = message.agentId ? AGENTS[message.agentId] : null

  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div
        className={[
          'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border',
          agent ? `${agent.bgColor} ${agent.borderColor}` : 'bg-slate-800 border-slate-700',
        ].join(' ')}
      >
        {message.agentId && (
          <AgentIcon
            agentId={message.agentId}
            className={`w-4 h-4 ${agent?.color ?? 'text-slate-400'}`}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold mb-1.5 ${agent?.color ?? 'text-slate-400'}`}>
          {message.agentName}
        </p>
        <div
          className={[
            'border rounded-2xl rounded-tl-sm px-4 py-3',
            agent ? `${agent.bgColor} ${agent.borderColor}` : 'bg-slate-900 border-slate-800',
          ].join(' ')}
        >
          <p className="text-sm text-slate-200 leading-relaxed">{message.content}</p>
        </div>
      </div>
    </div>
  )
}
