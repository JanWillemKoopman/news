'use client'

import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import * as React from 'react'

import { Button, Input } from '@/components/bruiloft/ui'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { uploadWeddingMedia } from '@/lib/supabase/storage'
import { createClient } from '@/lib/supabase/client'

export function FotoGalerijEditor() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const fotos = useBruiloftStore((s) => s.websiteFotos)
  const saveWebsiteFoto = useBruiloftStore((s) => s.saveWebsiteFoto)
  const deleteWebsiteFoto = useBruiloftStore((s) => s.deleteWebsiteFoto)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [bezig, setBezig] = React.useState(false)

  async function verwerkBestanden(bestanden: FileList) {
    if (!wedding) return
    setBezig(true)
    try {
      const supabase = createClient()
      for (const file of Array.from(bestanden)) {
        const url = await uploadWeddingMedia(supabase, wedding.id, file, 'gallerij')
        await saveWebsiteFoto(url, '')
      }
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload foto&apos;s voor de galerij op jullie trouwwebsite.
      </p>

      {fotos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fotos.map((foto) => (
            <li key={foto.id} className="group relative overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto.url} alt={foto.bijschrift || 'Galerij foto'} className="h-32 w-full object-cover" />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => deleteWebsiteFoto(foto.id, foto.url)}
                  className="rounded bg-black/60 p-1 text-white hover:bg-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={bezig}
        className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
      >
        {bezig ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <>
            <ImagePlus className="h-6 w-6" />
            <span className="text-sm">Foto&apos;s toevoegen</span>
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) void verwerkBestanden(e.target.files); e.target.value = '' }}
      />
    </div>
  )
}
