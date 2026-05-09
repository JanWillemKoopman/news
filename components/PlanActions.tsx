'use client'

import { useState } from 'react'
import { Check, Copy, Download, Printer } from 'lucide-react'
import {
  copyPlanAsRichText,
  downloadPlanAsMarkdown,
  printPlan,
} from '@/lib/planActions'

interface PlanActionsProps {
  content: string
}

export default function PlanActions({ content }: PlanActionsProps) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)

  const handleCopy = async () => {
    setCopyError(null)
    const ok = await copyPlanAsRichText(content)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      setCopyError('Kopieren is niet gelukt. Selecteer en kopieer het plan handmatig.')
      setTimeout(() => setCopyError(null), 4000)
    }
  }

  const baseBtn =
    'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-medium transition-colors'
  const idleBtn =
    'bg-cream-50 border-cream-500 text-ink-700 hover:bg-cream-300'
  const successBtn =
    'bg-clay-500/10 border-clay-500/30 text-clay-700'

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => downloadPlanAsMarkdown(content)}
        className={`${baseBtn} ${idleBtn}`}
        aria-label="Plan downloaden als markdown-bestand"
      >
        <Download size={11} />
        Download (.md)
      </button>
      <button
        type="button"
        onClick={handleCopy}
        className={`${baseBtn} ${copied ? successBtn : idleBtn}`}
        aria-label="Plan kopieren als geformatteerde tekst"
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}
        {copied ? 'Gekopieerd' : 'Kopieer'}
      </button>
      <button
        type="button"
        onClick={() => printPlan(content)}
        className={`${baseBtn} ${idleBtn}`}
        aria-label="Plan afdrukken of opslaan als PDF"
      >
        <Printer size={11} />
        Print / PDF
      </button>
      {copyError && (
        <span className="text-[11px] text-clay-700">{copyError}</span>
      )}
    </div>
  )
}
