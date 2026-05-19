'use client'

import { useRef, useState } from 'react'
import { AlertCircle, ArrowRight, FileCheck2, Loader2, Upload, X } from 'lucide-react'
import { useCoverLetterStore } from '@/store/coverLetterStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { Analysis, CvInput } from '@/types/cover-letter'
import ExampleLetterLibrary from './ExampleLetterLibrary'

const MAX_PDF_BYTES = 3 * 1024 * 1024

export default function Step1Input() {
  const {
    cv,
    vacancyUrl,
    vacancyText,
    setCv,
    setVacancyUrl,
    setVacancyText,
    setAnalysis,
    setStep,
    error,
    setError,
  } = useCoverLetterStore()

  const [cvMode, setCvMode] = useState<'pdf' | 'text'>(cv?.kind === 'text' ? 'text' : 'pdf')
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [scrapeNote, setScrapeNote] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const pdf = cv?.kind === 'pdf' ? cv : null
  const cvText = cv?.kind === 'text' ? cv.text : ''
  const canAnalyze = cv !== null && vacancyText.trim().length > 0 && !analyzing

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
      const base64 = (reader.result as string).split(',')[1] ?? ''
      setCv({ kind: 'pdf', data: base64, mimeType: 'application/pdf', fileName: file.name })
    }
    reader.onerror = () => setFileError('Kon het bestand niet lezen.')
    reader.readAsDataURL(file)
  }

  const handleScrape = async () => {
    const url = vacancyUrl.trim()
    if (!url || scraping) return
    setScraping(true)
    setScrapeNote(null)
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (data.ok) {
        setVacancyText(data.text)
        setScrapeNote('Vacaturetekst opgehaald — controleer hieronder en pas aan indien nodig.')
      } else {
        setScrapeNote(
          'We konden deze pagina niet automatisch lezen (veel sites blokkeren dit). Plak de vacaturetekst hieronder.'
        )
      }
    } catch {
      setScrapeNote('Ophalen mislukt. Plak de vacaturetekst hieronder.')
    } finally {
      setScraping(false)
    }
  }

  const handleAnalyze = async () => {
    if (!canAnalyze || !cv) return
    setAnalyzing(true)
    setError(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv, vacancy: vacancyText.trim() }),
      })
      if (!res.ok) throw new Error(`Analyse mislukt (${res.status})`)
      const analysis = (await res.json()) as Analysis
      if (!analysis.starrQuestions?.length) {
        throw new Error('De analyse leverde geen vragen op. Probeer het opnieuw.')
      }
      setAnalysis(analysis)
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Begin met je CV en de vacature
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          De AI-agent analyseert beide, stelt verdiepende vragen en schrijft daarna via een
          recruiterpanel een hoog-converterende sollicitatiebrief.
        </p>
      </div>

      {/* CV */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Jouw CV</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={cvMode}
            onValueChange={(v) => {
              setCvMode(v as 'pdf' | 'text')
              setCv(null)
              setFileError(null)
            }}
          >
            <TabsList className="mb-4">
              <TabsTrigger value="pdf">PDF uploaden</TabsTrigger>
              <TabsTrigger value="text">Tekst plakken</TabsTrigger>
            </TabsList>

            <TabsContent value="pdf">
              {pdf ? (
                <div className="flex items-center gap-3 rounded-md border border-primary/40 bg-primary/5 px-4 py-3">
                  <FileCheck2 size={18} className="text-primary flex-shrink-0" />
                  <span className="text-sm flex-1 min-w-0 truncate">{pdf.fileName}</span>
                  <button
                    onClick={() => setCv(null)}
                    aria-label="Bestand verwijderen"
                    className="w-7 h-7 rounded-md hover:bg-accent flex items-center justify-center"
                  >
                    <X size={14} className="text-muted-foreground" />
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
                  className={cn(
                    'w-full flex flex-col items-center justify-center gap-2 py-9 rounded-md border border-dashed transition-colors',
                    dragging
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground'
                  )}
                >
                  <Upload size={20} className="text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Sleep je CV hierheen of klik om te uploaden
                  </span>
                  <span className="text-xs text-muted-foreground">PDF, maximaal 3 MB</span>
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
                <p className="text-xs text-destructive mt-2 flex items-center gap-1.5">
                  <AlertCircle size={12} />
                  {fileError}
                </p>
              )}
            </TabsContent>

            <TabsContent value="text">
              <Textarea
                value={cvText}
                onChange={(e) => setCv({ kind: 'text', text: e.target.value })}
                placeholder="Plak hier de volledige tekst van je CV..."
                rows={9}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Vacancy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. De vacature</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="vacancy-url">Vacature-URL (optioneel)</Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                id="vacancy-url"
                type="url"
                value={vacancyUrl}
                onChange={(e) => setVacancyUrl(e.target.value)}
                placeholder="https://..."
              />
              <Button
                variant="secondary"
                onClick={handleScrape}
                disabled={!vacancyUrl.trim() || scraping}
              >
                {scraping ? <Loader2 size={15} className="animate-spin" /> : 'Ophalen'}
              </Button>
            </div>
            {scrapeNote && (
              <p className="text-xs text-muted-foreground mt-2">{scrapeNote}</p>
            )}
          </div>

          <div>
            <Label htmlFor="vacancy-text">Vacaturetekst</Label>
            <Textarea
              id="vacancy-text"
              className="mt-1.5"
              value={vacancyText}
              onChange={(e) => setVacancyText(e.target.value)}
              placeholder="Plak hier de volledige vacaturetekst (of haal hem op via de URL hierboven)..."
              rows={9}
            />
          </div>
        </CardContent>
      </Card>

      {/* Example letters */}
      <ExampleLetterLibrary />

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-md border border-destructive/30 bg-destructive/10">
          <AlertCircle size={17} className="text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-sm text-destructive-foreground">{error}</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button size="lg" onClick={handleAnalyze} disabled={!canAnalyze}>
          {analyzing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Analyseren...
            </>
          ) : (
            <>
              Analyseer &amp; ga verder
              <ArrowRight size={16} />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
