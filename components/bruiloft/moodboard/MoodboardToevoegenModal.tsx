'use client'

import * as React from 'react'
import { Check, ImagePlus, Link2, Loader2, X } from 'lucide-react'

import { Button, Field, Input, Modal, SegmentedControl, Select, useToast } from '@/components/bruiloft/ui'
import { compressImage } from '@/lib/bruiloft/compressImage'
import { MOODBOARD_CATEGORIEEN } from '@/lib/bruiloft/moodboardCategorieen'
import { capFirst } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'

interface MoodboardToevoegenModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Vooringevulde categorie — handig als de gebruiker net op een
  // categoriefilter zat toen die op "Toevoegen" klikte.
  standaardCategorie?: string | null
  // Bestanden die al gekozen zijn vóórdat de modal opende (bv. gesleept
  // vanaf het bureaublad rechtstreeks op de pagina) — vult de upload-tab
  // direct, zonder dat de gebruiker opnieuw hoeft te kiezen.
  initialFiles?: File[]
}

interface PendingFile {
  id: string
  file: File
  preview: string
  status: 'wachtend' | 'bezig' | 'klaar' | 'mislukt'
}

interface UnfurlResultaat {
  imageUrl: string
  titel: string
}

const MAX_FILES = 20
const MAX_FILE_BYTES = 15 * 1024 * 1024 // 15 MB vóór compressie

export function MoodboardToevoegenModal({
  open,
  onOpenChange,
  standaardCategorie,
  initialFiles,
}: MoodboardToevoegenModalProps) {
  const uploadMoodBoardImage = useBruiloftStore((s) => s.uploadMoodBoardImage)
  const addMoodBoardItem = useBruiloftStore((s) => s.addMoodBoardItem)
  const { toast } = useToast()

  const [tab, setTab] = React.useState<'upload' | 'link'>('upload')
  const [categorie, setCategorie] = React.useState(standaardCategorie || MOODBOARD_CATEGORIEEN[0])
  const [pending, setPending] = React.useState<PendingFile[]>([])
  const [bezigMetUploaden, setBezigMetUploaden] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [linkUrl, setLinkUrl] = React.useState('')
  const [linkOphalen, setLinkOphalen] = React.useState(false)
  const [linkFout, setLinkFout] = React.useState('')
  const [linkPreview, setLinkPreview] = React.useState<UnfurlResultaat | null>(null)
  const [linkTitel, setLinkTitel] = React.useState('')
  const [linkVastpinnen, setLinkVastpinnen] = React.useState(false)
  const [linkGepind, setLinkGepind] = React.useState(0)

  const reset = () => {
    pending.forEach((p) => URL.revokeObjectURL(p.preview))
    setPending([])
    setTab('upload')
    setCategorie(standaardCategorie || MOODBOARD_CATEGORIEEN[0])
    setLinkUrl('')
    setLinkFout('')
    setLinkPreview(null)
    setLinkTitel('')
    setLinkGepind(0)
  }

  React.useEffect(() => {
    if (open) setCategorie(standaardCategorie || MOODBOARD_CATEGORIEEN[0])
  }, [open, standaardCategorie])

  // initialFiles alleen bij het ÓPENEN overnemen (niet bij elke re-render) —
  // een ref met de laatste waarde omzeilt een stale closure zonder
  // initialFiles zelf als dependency te hoeven gebruiken.
  const initialFilesRef = React.useRef(initialFiles)
  initialFilesRef.current = initialFiles
  React.useEffect(() => {
    if (open && initialFilesRef.current && initialFilesRef.current.length > 0) {
      voegBestandenToe(initialFilesRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const sluit = (o: boolean) => {
    if (!o) reset()
    onOpenChange(o)
  }

  const voegBestandenToe = (files: FileList | File[]) => {
    const nieuw: PendingFile[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > MAX_FILE_BYTES) {
        toast({ title: `${file.name} is te groot`, description: 'Maximaal 15 MB per foto.', variant: 'error' })
        continue
      }
      nieuw.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: URL.createObjectURL(file),
        status: 'wachtend',
      })
    }
    if (nieuw.length === 0) return
    setPending((prev) => {
      const totaal = [...prev, ...nieuw]
      if (totaal.length > MAX_FILES) {
        toast({ title: `Maximaal ${MAX_FILES} foto's tegelijk`, variant: 'error' })
        return totaal.slice(0, MAX_FILES)
      }
      return totaal
    })
  }

  const verwijderPending = (id: string) => {
    setPending((prev) => {
      const item = prev.find((p) => p.id === id)
      if (item) URL.revokeObjectURL(item.preview)
      return prev.filter((p) => p.id !== id)
    })
  }

  const uploadAlles = async () => {
    if (pending.length === 0 || bezigMetUploaden) return
    setBezigMetUploaden(true)
    let gelukt = 0
    for (const p of pending) {
      setPending((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: 'bezig' } : x)))
      try {
        const compressed = await compressImage(p.file)
        await uploadMoodBoardImage(compressed, categorie, '')
        gelukt++
        setPending((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: 'klaar' } : x)))
      } catch {
        setPending((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: 'mislukt' } : x)))
      }
    }
    setBezigMetUploaden(false)
    if (gelukt > 0) {
      toast({
        title: gelukt === 1 ? 'Foto toegevoegd' : `${gelukt} foto's toegevoegd`,
        variant: 'success',
      })
    }
    const nogOver = pending.length - gelukt
    if (nogOver === 0) {
      sluit(false)
    } else {
      // Gelukte items opruimen, mislukte laten staan zodat de gebruiker het
      // opnieuw kan proberen zonder alles over te hoeven doen.
      setPending((prev) => prev.filter((x) => x.status !== 'klaar'))
    }
  }

  const haalLinkOp = async () => {
    if (!linkUrl.trim() || linkOphalen) return
    setLinkOphalen(true)
    setLinkFout('')
    setLinkPreview(null)
    try {
      const res = await fetch('/api/moodboard/unfurl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkUrl.trim() }),
      })
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; imageUrl?: string; titel?: string; error?: string }
      if (!res.ok || !json.ok || !json.imageUrl) {
        setLinkFout(json.error ?? 'Kon geen afbeelding vinden op deze link.')
        return
      }
      setLinkPreview({ imageUrl: json.imageUrl, titel: json.titel ?? '' })
      setLinkTitel(json.titel ?? '')
    } catch {
      setLinkFout('Er ging iets mis. Probeer het opnieuw.')
    } finally {
      setLinkOphalen(false)
    }
  }

  const pinLinkVast = async () => {
    if (!linkPreview || linkVastpinnen) return
    setLinkVastpinnen(true)
    try {
      await addMoodBoardItem({
        categorie,
        url: linkPreview.imageUrl,
        bron: 'link',
        bronUrl: linkUrl.trim(),
        titel: linkTitel.trim(),
      })
      setLinkGepind((n) => n + 1)
      setLinkUrl('')
      setLinkPreview(null)
      setLinkTitel('')
    } catch {
      toast({ title: 'Vastpinnen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    } finally {
      setLinkVastpinnen(false)
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) voegBestandenToe(e.dataTransfer.files)
  }

  const onPaste = (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.items)
      .filter((item) => item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null)
    if (files.length > 0) {
      e.preventDefault()
      setTab('upload')
      voegBestandenToe(files)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={sluit}
      title="Toevoegen aan moodboard"
      description="Upload eigen foto's of plak een link naar inspiratie die je online vond."
      className="sm:max-w-lg"
      footer={
        tab === 'upload' && pending.length > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {pending.length} {pending.length === 1 ? 'foto' : "foto's"} klaar om toe te voegen
            </p>
            <Button onClick={uploadAlles} loading={bezigMetUploaden}>
              Toevoegen
            </Button>
          </div>
        ) : undefined
      }
    >
      <div onPaste={onPaste} className="space-y-4">
        <SegmentedControl
          waarde={tab}
          onChange={setTab}
          ariaLabel="Manier van toevoegen"
          opties={[
            { waarde: 'upload', label: 'Upload', icon: ImagePlus },
            { waarde: 'link', label: 'Link plakken', icon: Link2 },
          ]}
        />

        {tab === 'upload' ? (
          <div className="space-y-4">
            <Field label="Categorie" htmlFor="mb-categorie">
              <Select id="mb-categorie" value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                {MOODBOARD_CATEGORIEEN.map((c) => (
                  <option key={c} value={c}>
                    {capFirst(c)}
                  </option>
                ))}
              </Select>
            </Field>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <ImagePlus className="h-7 w-7" />
              <span className="text-sm font-medium">Kies foto&apos;s, sleep ze hierheen, of plak (Ctrl+V)</span>
              <span className="text-xs">Meerdere tegelijk kan</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                if (e.target.files) voegBestandenToe(e.target.files)
                e.target.value = ''
              }}
            />

            {pending.length > 0 ? (
              <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {pending.map((p) => (
                  <li key={p.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.preview} alt="" className="h-full w-full object-cover" />
                    {p.status === 'wachtend' ? (
                      <button
                        type="button"
                        onClick={() => verwijderPending(p.id)}
                        aria-label="Verwijderen"
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    ) : null}
                    {p.status === 'bezig' ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </div>
                    ) : null}
                    {p.status === 'klaar' ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-emerald-600/40">
                        <Check className="h-5 w-5 text-white" />
                      </div>
                    ) : null}
                    {p.status === 'mislukt' ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-rose-600/50 p-1 text-center">
                        <span className="text-[10px] font-medium leading-tight text-white">Mislukt</span>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Categorie" htmlFor="mb-link-categorie">
              <Select id="mb-link-categorie" value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                {MOODBOARD_CATEGORIEEN.map((c) => (
                  <option key={c} value={c}>
                    {capFirst(c)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Link naar inspiratie" htmlFor="mb-link-url" error={linkFout || undefined}>
              <div className="flex gap-2">
                <Input
                  id="mb-link-url"
                  type="url"
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="https://pinterest.com/pin/..."
                  value={linkUrl}
                  onChange={(e) => {
                    setLinkUrl(e.target.value)
                    setLinkFout('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void haalLinkOp()
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={haalLinkOp}
                  loading={linkOphalen}
                  disabled={!linkUrl.trim()}
                >
                  Ophalen
                </Button>
              </div>
            </Field>

            {linkPreview ? (
              <div className="flex gap-3 rounded-lg border border-border bg-muted/30 p-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={linkPreview.imageUrl} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Input
                    value={linkTitel}
                    onChange={(e) => setLinkTitel(e.target.value)}
                    placeholder="Titel (optioneel)"
                    aria-label="Titel"
                  />
                  <Button size="sm" onClick={pinLinkVast} loading={linkVastpinnen} className="self-start">
                    Vastpinnen
                  </Button>
                </div>
              </div>
            ) : null}

            {linkGepind > 0 ? (
              <p className="text-sm text-muted-foreground">
                ✓ {linkGepind} {linkGepind === 1 ? 'link vastgepind' : 'links vastgepind'} — plak gerust nog een link.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </Modal>
  )
}
