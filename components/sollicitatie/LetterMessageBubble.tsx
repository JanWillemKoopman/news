'use client'

import { useState } from 'react'
import { Check, Copy, Download, FileText, MessageCircleQuestion, Sparkles } from 'lucide-react'
import type { LetterMessage } from '@/types/sollicitatie'

interface LetterMessageBubbleProps {
  message: LetterMessage
}

export default function LetterMessageBubble({ message }: LetterMessageBubbleProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[82%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-sm">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    )
  }

  if (message.kind === 'analysis') {
    return (
      <div className="flex items-start gap-3 animate-fade-in">
        <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles size={14} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-blue-400 mb-1.5 uppercase tracking-wide">
            Analyse
          </p>
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl rounded-tl-sm px-4 py-3">
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (message.kind === 'letter') {
    return <LetterCard content={message.content} />
  }

  // Clarifying question from the coach
  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
        <MessageCircleQuestion size={14} className="text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
          Sollicitatiecoach
        </p>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>
    </div>
  )
}

function LetterCard({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sollicitatiebrief.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="animate-slide-up">
      <div className="flex items-center gap-2 mb-3 px-1">
        <FileText size={15} className="text-emerald-400" />
        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
          Jouw sollicitatiebrief
        </span>
        <div className="flex-1 h-px bg-emerald-500/20" />
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-900/60 border border-emerald-500/20 rounded-2xl p-5 shadow-lg shadow-emerald-500/5">
        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{content}</p>

        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-800">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-400" />
                Gekopieerd
              </>
            ) : (
              <>
                <Copy size={13} />
                Kopiëren
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            <Download size={13} />
            Download .txt
          </button>
        </div>
      </div>
    </div>
  )
}
