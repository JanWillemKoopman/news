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
  const [printError, setPrintError] = useState(false)

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

  const handlePrint = () => {
    setPrintError(false)
    const ok = printPlan(content)
    if (!ok) {
      setPrintError(true)
      setTimeout(() => setPrintError(false), 8000)
    }
  }

  const baseBtn =
    'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-medium transition-colors'
  const idleBtn =
    'bg-cream-50 border-cream-500 text-ink-700 hover:bg-cream-300'
  const successBtn =
    'bg-clay-500/10 border-clay-500/30 text-clay-700'

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => downloadPlanAsMarkdown(content)}
          className={`${baseBtn} ${idleBtn}`}
          title="Download het plan als tekstbestand (.md)"
          aria-label="Plan downloaden als tekstbestand"
        >
          <Download size={11} />
          Download als tekst
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className={`${baseBtn} ${copied ? successBtn : idleBtn}`}
          title="Kopieer het plan als opgemaakte tekst"
          aria-label="Plan kopieren als geformatteerde tekst"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Gekopieerd' : 'Kopieer'}
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className={`${baseBtn} ${idleBtn}`}
          title="Druk het plan af of sla het op als PDF"
          aria-label="Plan afdrukken of opslaan als PDF"
        >
          <Printer size={11} />
          Print / PDF
        </button>
      </div>
      {copyError && (
        <p className="mt-2 text-[11px] text-clay-700 bg-clay-500/10 px-2.5 py-1.5 rounded-xl border border-clay-500/20">
          {copyError}
        </p>
      )}
      {printError && (
        <p className="mt-2 text-[11px] text-clay-700 bg-clay-500/10 px-2.5 py-1.5 rounded-xl border border-clay-500/20">
          Printen werkt niet in deze browser. Kopieer de tekst en plak hem in Word of Google Docs.
        </p>
      )}
    </div>
  )
}
