'use client'

import { useRef, useState } from 'react'
import {
  AlertCircle,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Loader2,
  Paperclip,
  X,
} from 'lucide-react'
import { useCoverLetterStore } from '@/store/coverLetterStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { SupportingFile } from '@/types/cover-letter'

const ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.md,' +
  '.jpg,.jpeg,.png,.gif,.webp,.heic,.heif,' +
  '.mp4,.mov,.avi,.mp3,.wav,.aac,.ogg,.flac'

const MAX_MB = 10

function fileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <FileImage size={15} className="text-primary flex-shrink-0" />
  if (mimeType.startsWith('audio/')) return <FileAudio size={15} className="text-primary flex-shrink-0" />
  if (mimeType.startsWith('video/')) return <FileVideo size={15} className="text-primary flex-shrink-0" />
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv')
    return <FileSpreadsheet size={15} className="text-primary flex-shrink-0" />
  return <FileText size={15} className="text-primary flex-shrink-0" />
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type UploadItem = { localId: string; name: string; size: number; status: 'uploading' | 'error'; error?: string }

export default function SupportingFilesUpload() {
  const { supportingFiles, addSupportingFile, removeSupportingFile } = useCoverLetterStore()
  const [uploading, setUploading] = useState<UploadItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const newItems: UploadItem[] = Array.from(files).map((f) => ({
      localId: `${Date.now()}-${f.name}`,
      name: f.name,
      size: f.size,
      status: 'uploading' as const,
    }))
    setUploading((prev) => [...prev, ...newItems])

    await Promise.all(
      Array.from(files).map(async (file, idx) => {
        const localId = newItems[idx].localId
        if (file.size > MAX_MB * 1024 * 1024) {
          setUploading((prev) =>
            prev.map((u) =>
              u.localId === localId
                ? { ...u, status: 'error', error: `Bestand te groot (max ${MAX_MB} MB)` }
                : u
            )
          )
          return
        }

        try {
          const formData = new FormData()
          formData.append('file', file)
          const res = await fetch('/api/upload-file', { method: 'POST', body: formData })
          const data = await res.json()
          if (!res.ok || !data.uri) throw new Error(data.error ?? 'Upload mislukt')

          const uploaded: SupportingFile = {
            uri: data.uri,
            mimeType: data.mimeType,
            displayName: data.displayName,
            size: data.size,
          }
          addSupportingFile(uploaded)
          setUploading((prev) => prev.filter((u) => u.localId !== localId))
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Upload mislukt'
          setUploading((prev) =>
            prev.map((u) => (u.localId === localId ? { ...u, status: 'error', error: msg } : u))
          )
        }
      })
    )
  }

  const dismissError = (localId: string) =>
    setUploading((prev) => prev.filter((u) => u.localId !== localId))

  const hasAny = supportingFiles.length > 0 || uploading.length > 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Paperclip size={16} className="text-primary" />
          Ondersteunende bestanden
          <span className="text-xs font-normal text-muted-foreground ml-1">(optioneel)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Upload aanvullende bestanden die de AI kan raadplegen — bijv. een portfolio, LinkedIn
          export, certificaten of screenshot. Ondersteund: PDF, Word, Excel, afbeeldingen, audio,
          video (max {MAX_MB} MB per bestand).
        </p>

        {hasAny && (
          <ul className="space-y-2">
            {supportingFiles.map((f) => (
              <li
                key={f.uri}
                className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2.5"
              >
                {fileIcon(f.mimeType)}
                <span className="flex-1 min-w-0">
                  <span className="text-sm truncate block">{f.displayName}</span>
                  <span className="text-xs text-muted-foreground">{formatBytes(f.size)}</span>
                </span>
                <button
                  onClick={() => removeSupportingFile(f.uri)}
                  aria-label={`${f.displayName} verwijderen`}
                  className="w-7 h-7 rounded-md hover:bg-accent flex items-center justify-center flex-shrink-0"
                >
                  <X size={13} className="text-muted-foreground" />
                </button>
              </li>
            ))}

            {uploading.map((u) => (
              <li
                key={u.localId}
                className={cn(
                  'flex items-center gap-3 rounded-md border px-3 py-2.5',
                  u.status === 'error'
                    ? 'border-destructive/30 bg-destructive/5'
                    : 'border-border bg-muted/50'
                )}
              >
                {u.status === 'uploading' ? (
                  <Loader2 size={15} className="text-muted-foreground animate-spin flex-shrink-0" />
                ) : (
                  <AlertCircle size={15} className="text-destructive flex-shrink-0" />
                )}
                <span className="flex-1 min-w-0">
                  <span className="text-sm truncate block">{u.name}</span>
                  {u.status === 'uploading' && (
                    <span className="text-xs text-muted-foreground">Uploaden…</span>
                  )}
                  {u.status === 'error' && (
                    <span className="text-xs text-destructive">{u.error}</span>
                  )}
                </span>
                {u.status === 'error' && (
                  <button
                    onClick={() => dismissError(u.localId)}
                    className="w-7 h-7 rounded-md hover:bg-accent flex items-center justify-center flex-shrink-0"
                    aria-label="Fout negeren"
                  >
                    <X size={13} className="text-muted-foreground" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          onClick={(e) => {
            // Reset so same file can be re-selected after error
            ;(e.target as HTMLInputElement).value = ''
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading.some((u) => u.status === 'uploading')}
        >
          <Paperclip size={14} />
          Bestanden toevoegen
        </Button>
      </CardContent>
    </Card>
  )
}
