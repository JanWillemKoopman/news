'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, FileText, Loader2, Plus, Trash2, Upload } from 'lucide-react'
import { useExampleLetterStore } from '@/store/exampleLetterStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const MAX_PDF_BYTES = 3 * 1024 * 1024

export default function ExampleLetterLibrary() {
  const { letters, addLetter, removeLetter } = useExampleLetterStore()

  // The store is persisted in localStorage; gate persisted data behind a
  // mounted flag so the server render (empty) matches the first client render.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<'pdf' | 'text'>('text')
  const [text, setText] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setAdding(false)
    setTitle('')
    setMode('text')
    setText('')
    setError(null)
  }

  const handleFile = (file: File | undefined) => {
    setError(null)
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('Alleen PDF-bestanden zijn toegestaan.')
      return
    }
    if (file.size > MAX_PDF_BYTES) {
      setError('Het bestand is te groot (maximaal 3 MB).')
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1] ?? ''
      setExtracting(true)
      try {
        const res = await fetch('/api/extract-letter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: base64, mimeType: 'application/pdf' }),
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        setText(data.text ?? '')
        if (!title.trim()) setTitle(file.name.replace(/\.pdf$/i, ''))
        setMode('text')
      } catch {
        setError('Kon de PDF niet omzetten naar tekst. Probeer de tekst te plakken.')
      } finally {
        setExtracting(false)
      }
    }
    reader.onerror = () => setError('Kon het bestand niet lezen.')
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    if (!text.trim()) {
      setError('De brieftekst is leeg.')
      return
    }
    addLetter(title, text)
    resetForm()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          3. Voorbeeldbrieven ter inspiratie
          <span className="text-xs font-normal text-muted-foreground">(optioneel)</span>
          {mounted && letters.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {letters.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Voeg brieven toe waarvan je de stijl mooi vindt. De AI gebruikt ze als inspiratie
          voor de opening, toon en afsluiter — niet voor de inhoud. Ze blijven in je browser
          bewaard voor volgende sollicitaties.
        </p>

        {/* Saved letters */}
        {mounted && letters.length > 0 && (
          <ul className="space-y-2">
            {letters.map((letter) => (
              <li
                key={letter.id}
                className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5"
              >
                <FileText size={16} className="text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{letter.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {letter.content.slice(0, 90)}
                  </p>
                </div>
                <button
                  onClick={() => removeLetter(letter.id)}
                  aria-label="Voorbeeldbrief verwijderen"
                  className="w-7 h-7 rounded-md hover:bg-accent flex items-center justify-center flex-shrink-0"
                >
                  <Trash2 size={14} className="text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add form */}
        {adding ? (
          <div className="rounded-md border border-border p-3 space-y-3">
            <div>
              <Label htmlFor="example-title">Titel</Label>
              <Input
                id="example-title"
                className="mt-1.5"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Bijv. Mijn beste brief voor marketingrollen"
              />
            </div>

            <Tabs value={mode} onValueChange={(v) => setMode(v as 'pdf' | 'text')}>
              <TabsList>
                <TabsTrigger value="text">Tekst plakken</TabsTrigger>
                <TabsTrigger value="pdf">PDF uploaden</TabsTrigger>
              </TabsList>

              <TabsContent value="text">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Plak hier de volledige tekst van de voorbeeldbrief..."
                  rows={7}
                />
              </TabsContent>

              <TabsContent value="pdf">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={extracting}
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
                    'w-full flex flex-col items-center justify-center gap-2 py-7 rounded-md border border-dashed transition-colors disabled:opacity-60',
                    dragging
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground'
                  )}
                >
                  {extracting ? (
                    <>
                      <Loader2 size={18} className="text-primary animate-spin" />
                      <span className="text-sm font-medium">PDF wordt omgezet naar tekst...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={18} className="text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Sleep een PDF hierheen of klik om te uploaden
                      </span>
                      <span className="text-xs text-muted-foreground">PDF, maximaal 3 MB</span>
                    </>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)}
                />
                {text && !extracting && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Tekst opgehaald — controleer hem op het tabblad &quot;Tekst plakken&quot;
                    en sla daarna op.
                  </p>
                )}
              </TabsContent>
            </Tabs>

            {error && (
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <AlertCircle size={12} />
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={resetForm}>
                Annuleren
              </Button>
              <Button size="sm" onClick={handleSave} disabled={extracting || !text.trim()}>
                Opslaan
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
            <Plus size={15} />
            Voorbeeldbrief toevoegen
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
