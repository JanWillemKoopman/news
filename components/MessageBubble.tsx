import { Briefcase, Crown } from 'lucide-react'
import { AGENTS, MANAGER_NAME, MANAGER_TITLE } from '@/lib/agents'
import type { Message } from '@/types'
import AgentIcon from './AgentIcon'

interface MessageBubbleProps {
  message: Message
}

// Lichte markdown renderer voor: **bold**, ## H2, # H1, --- hr, - bullet, *cursief*
function RichText({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/)
  return (
    <div className="space-y-3">
      {blocks.map((block, bi) => {
        const trimmed = block.trim()

        if (trimmed === '---') {
          return <hr key={bi} className="border-slate-700/60" />
        }

        if (/^# /.test(trimmed)) {
          return (
            <h2 key={bi} className="text-base font-bold text-white mt-1">
              {renderInline(trimmed.replace(/^# /, ''))}
            </h2>
          )
        }

        if (/^## /.test(trimmed)) {
          return (
            <h3 key={bi} className="text-sm font-bold text-white mt-1">
              {renderInline(trimmed.replace(/^## /, ''))}
            </h3>
          )
        }

        // bullet list block
        if (/^([-•*])\s/.test(trimmed)) {
          const items = trimmed.split('\n').filter((l) => /^([-•*])\s/.test(l.trim()))
          return (
            <ul key={bi} className="list-disc list-outside pl-5 space-y-1.5 text-slate-200">
              {items.map((it, i) => (
                <li key={i} className="text-sm leading-relaxed">
                  {renderInline(it.replace(/^([-•*])\s/, ''))}
                </li>
              ))}
            </ul>
          )
        }

        // numbered list block
        if (/^\d+\.\s/.test(trimmed)) {
          const items = trimmed.split('\n').filter((l) => /^\d+\.\s/.test(l.trim()))
          return (
            <ol key={bi} className="list-decimal list-outside pl-5 space-y-1.5 text-slate-200">
              {items.map((it, i) => (
                <li key={i} className="text-sm leading-relaxed">
                  {renderInline(it.replace(/^\d+\.\s/, ''))}
                </li>
              ))}
            </ol>
          )
        }

        // paragraph (kan meerdere regels bevatten — interpreteer enkele \n als <br/>)
        const lines = trimmed.split('\n')
        return (
          <p key={bi} className="text-sm text-slate-200 leading-relaxed">
            {lines.map((line, li) => (
              <span key={li}>
                {renderInline(line)}
                {li < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

function renderInline(text: string): React.ReactNode {
  // Splits op **bold**
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[82%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-sm">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    )
  }

  if (message.role === 'manager') {
    return (
      <div className="flex items-start gap-3 animate-fade-in">
        <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Briefcase size={14} className="text-blue-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold mb-1.5 text-blue-300">
            {MANAGER_NAME} <span className="text-slate-500 font-normal">· {MANAGER_TITLE}</span>
          </p>
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl rounded-tl-sm px-4 py-3">
            <RichText content={message.content} />
          </div>
        </div>
      </div>
    )
  }

  if (message.role === 'plan') {
    return (
      <div className="animate-slide-up">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Crown size={15} className="text-yellow-400" />
          <span className="text-xs font-semibold text-yellow-400 uppercase tracking-widest">
            Campagneplan
          </span>
          <div className="flex-1 h-px bg-yellow-500/20" />
        </div>
        <div className="bg-gradient-to-br from-slate-900 to-slate-900/60 border border-yellow-500/20 rounded-2xl p-5 shadow-lg shadow-yellow-500/5">
          <RichText content={message.content} />
        </div>
      </div>
    )
  }

  // Specialist (agent) message
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
          {agent && (
            <span className="text-slate-500 font-normal"> · {agent.title}</span>
          )}
        </p>
        <div
          className={[
            'border rounded-2xl rounded-tl-sm px-4 py-3',
            agent ? `${agent.bgColor} ${agent.borderColor}` : 'bg-slate-900 border-slate-800',
          ].join(' ')}
        >
          <RichText content={message.content} />
        </div>
      </div>
    </div>
  )
}
