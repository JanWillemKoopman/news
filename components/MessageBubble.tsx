import { Briefcase, FileText } from 'lucide-react'
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
          return <hr key={bi} className="border-cream-500" />
        }

        if (/^# /.test(trimmed)) {
          return (
            <h2 key={bi} className="font-serif font-medium text-2xl text-ink-900 mt-1 leading-tight">
              {renderInline(trimmed.replace(/^# /, ''))}
            </h2>
          )
        }

        if (/^## /.test(trimmed)) {
          return (
            <h3 key={bi} className="font-serif font-medium text-lg text-ink-900 mt-1 leading-snug">
              {renderInline(trimmed.replace(/^## /, ''))}
            </h3>
          )
        }

        // bullet list block
        if (/^([-•*])\s/.test(trimmed)) {
          const items = trimmed.split('\n').filter((l) => /^([-•*])\s/.test(l.trim()))
          return (
            <ul key={bi} className="list-disc list-outside pl-5 space-y-1.5 text-ink-700">
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
            <ol key={bi} className="list-decimal list-outside pl-5 space-y-1.5 text-ink-700">
              {items.map((it, i) => (
                <li key={i} className="text-sm leading-relaxed">
                  {renderInline(it.replace(/^\d+\.\s/, ''))}
                </li>
              ))}
            </ol>
          )
        }

        // paragraph
        const lines = trimmed.split('\n')
        return (
          <p key={bi} className="text-sm text-ink-700 leading-relaxed">
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
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-ink-900">
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
        <div className="max-w-[82%] bg-clay-500 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-sm">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    )
  }

  if (message.role === 'manager') {
    return (
      <div className="flex items-start gap-3 animate-fade-in">
        <div className="w-8 h-8 rounded-full bg-clay-500/15 border border-clay-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Briefcase size={14} className="text-clay-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium mb-1.5">
            <span className="text-clay-700">{MANAGER_NAME}</span>
            <span className="text-ink-400 font-normal"> · {MANAGER_TITLE}</span>
          </p>
          <div className="bg-cream-50 border border-cream-500 rounded-2xl rounded-tl-sm px-4 py-3">
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
          <FileText size={15} className="text-clay-600" />
          <span className="text-[10px] font-medium text-clay-700 uppercase tracking-[0.2em]">
            Campagneplan
          </span>
          <div className="flex-1 h-px bg-clay-500/30" />
        </div>
        <div className="bg-cream-50 border border-clay-500/30 rounded-2xl p-6 shadow-sm">
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
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border',
          agent ? `${agent.bgColor} ${agent.borderColor}` : 'bg-cream-400 border-cream-500',
        ].join(' ')}
      >
        {message.agentId && (
          <AgentIcon
            agentId={message.agentId}
            className={`w-4 h-4 ${agent?.color ?? 'text-ink-500'}`}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium mb-1.5">
          <span className={agent?.color ?? 'text-ink-500'}>{message.agentName}</span>
          {agent && (
            <span className="text-ink-400 font-normal"> · {agent.title}</span>
          )}
        </p>
        <div
          className={[
            'border rounded-2xl rounded-tl-sm px-4 py-3',
            agent ? `${agent.bgColor} ${agent.borderColor}` : 'bg-cream-50 border-cream-500',
          ].join(' ')}
        >
          <RichText content={message.content} />
        </div>
      </div>
    </div>
  )
}
