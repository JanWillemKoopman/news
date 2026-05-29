'use client'

import { ImagePlus, Loader2, X } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/bruiloft/ui'

interface Props {
  huidigUrl: string
  onUpload: (file: File) => Promise<void>
  onVerwijder?: () => void
  label?: string
  aanbevolenAfmeting?: string
}

export function FotoUpload({ huidigUrl, onUpload, onVerwijder, label = 'Foto uploaden', aanbevolenAfmeting }: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [bezig, setBezig] = React.useState(false)
  const [voorvertoning, setVoorvertoning] = React.useState<string | null>(null)

  const huidig = voorvertoning ?? huidigUrl

  async function verwerkBestand(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => setVoorvertoning(e.target?.result as string)
    reader.readAsDataURL(file)
    setBezig(true)
    try {
      await onUpload(file)
    } finally {
      setBezig(false)
    }
  }

  function onWijziging(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void verwerkBestand(file)
    e.target.value = ''
  }

  function onSleepNeer(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) void verwerkBestand(file)
  }

  return (
    <div className="space-y-2">
      {huidig ? (
        <div className="group relative overflow-hidden rounded-xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={huidig} alt="Geüploade foto" className="h-48 w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={bezig}>
              {bezig ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Vervangen'}
            </Button>
            {onVerwijder && (
              <Button size="sm" variant="outline" onClick={onVerwijder}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onSleepNeer}
          className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          disabled={bezig}
        >
          {bezig ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <>
              <ImagePlus className="h-8 w-8" />
              <span className="text-sm font-medium">{label}</span>
              {aanbevolenAfmeting && (
                <span className="text-xs">{aanbevolenAfmeting}</span>
              )}
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onWijziging}
      />
    </div>
  )
}
