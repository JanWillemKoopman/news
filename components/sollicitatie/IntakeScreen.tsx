'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  FileCheck2,
  FileText,
  Loader2,
  Type,
  Upload,
  X,
} from 'lucide-react'
import { useLetterStore } from '@/store/letterStore'
import type { CvInput } from '@/types/sollicitatie'

const MAX_PDF_BYTES = 3 * 1024 * 1024

export default function IntakeScreen() {
  const {
    vacancyText,
    setVacancyText,
    setCvText,
    addMessage,
    incrementQuestionCount,
    goToChat,
  } = useLetterStore()

  const [cvMode, setCvMode] = useState<'pdf' | 'text'>('pdf')
  const [pastedCv, setPastedCv] = useState('')
  const [pdf, setPdf] = useState<{ data: string; fileName: string } | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const cvProvided = cvMode === 'pdf' ? pdf !== null : pastedCv.trim().length > 0
  const canStart = cvProvided && vacancyText.trim().length > 0 && !loading

  const handleFile = (file: File | undefined) => {
    setFileError(null)
    if (!file) return
    if (file.type !== 'application/pdf') {
      setFileError('Alleen PDF-bestanden zijn toegestaan.')
      return
    }
    if (file.size > MAX_PDF_BYTES) {
      setFileError('Het bestand is te groot (maximaal 3 MB).')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1] ?? ''
      setPdf({ data: base64, fileName: file.name })
    }
    reader.onerror = () => setFileError('Kon het bestand niet lezen.')
    reader.readAsDataURL(file)
  }

  const handleStart = async () => {
    if (!canStart) return

    const cv: CvInput =
      cvMode === 'pdf'
        ? { kind: 'pdf', data: pdf!.data, mimeType: 'application/pdf', fileName: pdf!.fileName }
        : { kind: 'text', text: pastedCv.trim() }

    setLoading(true)
    setSubmitError(null)

    try {
      const res = await fetch('/api/sollicitatie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', cv, vacancy: vacancyText.trim() }),
      })
      if (!res.ok) throw new Error(`Analyse mislukt (${res.status})`)

      const { analysis, question, cvText } = await res.json()
      if (!question) throw new Error('Geen geldige analyse ontvangen.')

      setCvText(cvText)
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        kind: 'analysis',
        content: analysis,
        timestamp: Date.now(),
      })
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        kind: 'question',
        content: question,
        timestamp: Date.now(),
      })
      incrementQuestionCount()
      goToChat()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-4 pt-10 pb-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <FileText size={14} className="text-emerald-400" />
              </div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                Sollicitatiebrief Helper
              </span>
            </div>
            <Link
              href="/"
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Advisor &rarr;
            </Link>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Schrijf een sterke sollicitatiebrief
          </h1>
          <p className="text-slate-400 mt-2 text-sm sm:text-base">
            Upload je CV en plak de vacature. De AI-coach analyseert beide, stelt een paar
            gerichte vragen en schrijft daarna een professionele brief in het Nederlands.
          </p>
        </div>
      </header>

      {/* Form */}
      <main className="flex-1 px-4 pb-8">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* CV card */}
          <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-400">
                  1
                </span>
                Jouw CV
              </h2>
              <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700/60 rounded-lg p-0.5">
                <button
                  onClick={() => {
                    setCvMode('pdf')
                    setFileError(null)
                  }}
                  className={[
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                    cvMode === 'pdf'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-slate-200',
                  ].join(' ')}
                >
                  <Upload size={12} />
                  PDF
                </button>
                <button
                  onClick={() => {
                    setCvMode('text')
                    setFileError(null)
                  }}
                  className={[
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                    cvMode === 'text'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-slate-200',
                  ].join(' ')}
                >
                  <Type size={12} />
                  Tekst
                </button>
              </div>
            </div>

            {cvMode === 'pdf' ? (
              <div>
                {pdf ? (
                  <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/30 rounded-xl px-4 py-3">
                    <FileCheck2 size={18} className="text-emerald-400 flex-shrink-0" />
                    <span className="text-sm text-slate-200 flex-1 min-w-0 truncate">
                      {pdf.fileName}
                    </span>
                    <button
                      onClick={() => setPdf(null)}
                      aria-label="Bestand verwijderen"
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors flex-shrink-0"
                    >
                      <X size={13} className="text-slate-400" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragging(true)
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragging(false)
                      handleFile(e.dataTransfer.files?.[0])
                    }}
                    className={[
                      'w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border border-dashed transition-colors',
                      dragging
                        ? 'border-emerald-500/60 bg-emerald-500/5'
                        : 'border-slate-700 bg-slate-950/40 hover:border-slate-600',
                    ].join(' ')}
                  >
                    <Upload size={20} className="text-slate-500" />
                    <span className="text-sm text-slate-300 font-medium">
                      Sleep je CV hierheen of klik om te uploaden
                    </span>
                    <span className="text-xs text-slate-500">PDF, maximaal 3 MB</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)}
                />
                {fileError && (
                  <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5">
                    <AlertCircle size={12} />
                    {fileError}
                  </p>
                )}
              </div>
            ) : (
              <textarea
                value={pastedCv}
                onChange={(e) => setPastedCv(e.target.value)}
                placeholder="Plak hier de tekst van je CV..."
                rows={8}
                className="w-full bg-slate-950/60 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500/20 transition-all resize-y"
              />
            )}
          </section>

          {/* Vacancy card */}
          <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-400">
                2
              </span>
              <Briefcase size={14} className="text-slate-400" />
              De vacature
            </h2>
            <textarea
              value={vacancyText}
              onChange={(e) => setVacancyText(e.target.value)}
              placeholder="Plak hier de volledige vacaturetekst..."
              rows={8}
              className="w-full bg-slate-950/60 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500/20 transition-all resize-y"
            />
          </section>

          {submitError && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
              <AlertCircle size={17} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300 leading-relaxed">{submitError}</p>
            </div>
          )}
        </div>
      </main>

      {/* Sticky footer CTA */}
      <footer className="sticky bottom-0 border-t border-slate-800/60 bg-slate-950/90 backdrop-blur-md px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-end">
          <button
            onClick={handleStart}
            disabled={!canStart}
            className={[
              'flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200',
              canStart
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed',
            ].join(' ')}
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Analyseren...
              </>
            ) : (
              <>
                Analyseer &amp; start
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  )
}
