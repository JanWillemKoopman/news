'use client'

import * as React from 'react'
import { Camera, ImageOff, X } from 'lucide-react'

import { createRawClient } from '@/lib/supabase/client'

export interface WallPhoto {
  id: string
  url: string
  guestName: string | null
  message: string | null
  isFeatured: boolean
  uploadedAt: string
}

export interface WallSettings {
  isActive: boolean
  title: string
  moderationRequired: boolean
  requireName: boolean
  guestsCanDownload: boolean
  numColumns: number
}

interface Props {
  weddingId: string
  slug: string
  partner1Naam: string
  partner2Naam: string
  trouwdatum: string | null
  settings: WallSettings
  initialPhotos: WallPhoto[]
}

// Comprimeer afbeelding client-side vóór upload (Canvas API, geen extra library)
async function compressImage(file: File): Promise<File> {
  const MAX_W = 1920
  const QUALITY = 0.82

  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { width, height } = img
      if (width > MAX_W) {
        height = Math.round((height / width) * MAX_W)
        width = MAX_W
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas niet beschikbaar')); return }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Compressie mislukt')); return }
          resolve(new File([blob], 'foto.jpg', { type: 'image/jpeg' }))
        },
        'image/jpeg',
        QUALITY
      )
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Laden mislukt')) }
    img.src = objectUrl
  })
}

function tijdGeleden(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'zojuist'
  if (diff < 3600) return `${Math.floor(diff / 60)} min geleden`
  if (diff < 86400) return `${Math.floor(diff / 3600)} u geleden`
  return `${Math.floor(diff / 86400)} d geleden`
}

export function GuestWall({ weddingId, slug, partner1Naam, partner2Naam, trouwdatum, settings, initialPhotos }: Props) {
  const [photos, setPhotos] = React.useState<WallPhoto[]>(initialPhotos)
  const [newPhotoIds, setNewPhotoIds] = React.useState<Set<string>>(new Set())

  // Upload modal state
  const [modalOpen, setModalOpen] = React.useState(false)
  const [preview, setPreview] = React.useState<string | null>(null)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [guestName, setGuestName] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [uploading, setUploading] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const [successBanner, setSuccessBanner] = React.useState(false)

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Realtime subscription: nieuwe foto's verschijnen automatisch
  React.useEffect(() => {
    const supabase = createRawClient()
    const channel = supabase
      .channel(`photo-wall:${weddingId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'photo_wall_photos', filter: `wedding_id=eq.${weddingId}` },
        (payload: any) => {
          if (payload.eventType === 'INSERT' && payload.new?.is_approved) {
            const p: WallPhoto = {
              id: payload.new.id,
              url: payload.new.url,
              guestName: payload.new.guest_name,
              message: payload.new.message,
              isFeatured: payload.new.is_featured,
              uploadedAt: payload.new.uploaded_at,
            }
            setPhotos((prev) => {
              if (prev.some((x) => x.id === p.id)) return prev
              return [p, ...prev]
            })
            setNewPhotoIds((prev) => new Set(prev).add(p.id))
            setTimeout(() => {
              setNewPhotoIds((prev) => { const s = new Set(prev); s.delete(p.id); return s })
            }, 3500)
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new?.is_approved) {
              const p: WallPhoto = {
                id: payload.new.id,
                url: payload.new.url,
                guestName: payload.new.guest_name,
                message: payload.new.message,
                isFeatured: payload.new.is_featured,
                uploadedAt: payload.new.uploaded_at,
              }
              setPhotos((prev) => {
                const exists = prev.some((x) => x.id === p.id)
                if (exists) return prev.map((x) => (x.id === p.id ? p : x))
                return [p, ...prev]
              })
            } else {
              setPhotos((prev) => prev.filter((x) => x.id !== payload.new.id))
            }
          } else if (payload.eventType === 'DELETE') {
            setPhotos((prev) => prev.filter((x) => x.id !== payload.old?.id))
          }
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [weddingId])

  const openFilePicker = () => fileInputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
    setUploadError(null)
    setModalOpen(true)
    e.target.value = ''
  }

  const closeModal = () => {
    setModalOpen(false)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setSelectedFile(null)
    setGuestName('')
    setMessage('')
    setUploadError(null)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    setUploadError(null)

    try {
      const compressed = await compressImage(selectedFile)
      const fd = new FormData()
      fd.append('file', compressed)
      fd.append('slug', slug)
      if (guestName.trim()) fd.append('guestName', guestName.trim())
      if (message.trim()) fd.append('message', message.trim())

      const res = await fetch('/api/foto/upload', { method: 'POST', body: fd })
      const json = await res.json()

      if (!res.ok) {
        setUploadError(json.error ?? 'Uploaden mislukt')
        return
      }

      closeModal()
      setSuccessBanner(true)
      setTimeout(() => setSuccessBanner(false), 5000)
    } catch {
      setUploadError('Er ging iets mis. Probeer het opnieuw.')
    } finally {
      setUploading(false)
    }
  }

  const datumlabel = trouwdatum
    ? new Date(trouwdatum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <>
      {/* Succes-banner */}
      {successBanner && (
        <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 pointer-events-none">
          <div className="pointer-events-auto animate-slide-down rounded-2xl bg-rose-600 px-6 py-3 text-center text-sm font-medium text-white shadow-xl">
            🎉 Je foto staat op de muur! Kijk op het grote scherm.
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-stone-100 px-4 py-5 text-center sticky top-0 z-10 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-widest text-rose-500">Fotomuur</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-stone-800">
          {partner1Naam} & {partner2Naam}
        </h1>
        {datumlabel && (
          <p className="mt-0.5 text-sm text-stone-500">{datumlabel}</p>
        )}
        <p className="mt-2 text-xs text-stone-400">
          {photos.length} {photos.length === 1 ? 'foto' : "foto's"}
        </p>
      </header>

      {/* Grid */}
      <main className="px-2 py-3 pb-28">
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-stone-400">
            <ImageOff className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm">Nog geen foto's. Wees de eerste!</p>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-2">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className={[
                  'mb-2 break-inside-avoid overflow-hidden rounded-xl transition-all duration-500',
                  newPhotoIds.has(photo.id)
                    ? 'ring-4 ring-rose-400 ring-offset-1 scale-[1.02]'
                    : '',
                ].join(' ')}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.guestName ? `Foto van ${photo.guestName}` : 'Bruiloftsfoto'}
                  className="w-full object-cover"
                  loading="lazy"
                />
                {(photo.guestName || photo.message) && (
                  <div className="bg-white px-2.5 py-2">
                    {photo.guestName && (
                      <p className="text-xs font-medium text-stone-700">{photo.guestName}</p>
                    )}
                    {photo.message && (
                      <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{photo.message}</p>
                    )}
                    <p className="text-[10px] text-stone-400 mt-1">{tijdGeleden(photo.uploadedAt)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Vaste upload-knop */}
      <div className="fixed bottom-6 inset-x-0 flex justify-center z-20 pointer-events-none">
        <button
          onClick={openFilePicker}
          className="pointer-events-auto flex items-center gap-2.5 rounded-full bg-rose-600 px-7 py-4 text-sm font-semibold text-white shadow-2xl shadow-rose-500/40 active:scale-95 transition-transform hover:bg-rose-700"
        >
          <Camera className="h-5 w-5" />
          Voeg jouw foto toe
        </button>
      </div>

      {/* Verborgen file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Upload modal (bottom sheet op mobiel) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          />
          {/* Sheet */}
          <div className="relative z-10 w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-2xl px-5 pt-5 pb-8 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-stone-800">Jouw foto</h2>
              <button onClick={closeModal} className="rounded-full p-1.5 hover:bg-stone-100">
                <X className="h-4 w-4 text-stone-500" />
              </button>
            </div>

            {/* Preview */}
            {preview && (
              <div className="mb-4 overflow-hidden rounded-xl bg-stone-100 max-h-60 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Voorbeeld" className="max-h-60 w-full object-contain" />
              </div>
            )}

            {/* Naam */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-stone-600 mb-1">
                {settings.requireName ? 'Jouw naam' : 'Jouw naam (optioneel)'}
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Bijv. Oma Riet"
                maxLength={60}
                className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            {/* Bericht */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Berichtje (optioneel)
              </label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Bijv. Wat een mooie dag!"
                maxLength={120}
                className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            {uploadError && (
              <p className="mb-3 text-xs text-rose-600">{uploadError}</p>
            )}

            <button
              onClick={handleUpload}
              disabled={uploading || (settings.requireName && !guestName.trim())}
              className="w-full rounded-xl bg-rose-600 py-3.5 text-sm font-semibold text-white transition-opacity hover:bg-rose-700 disabled:opacity-50"
            >
              {uploading ? 'Bezig met uploaden…' : 'Zet op de muur'}
            </button>
          </div>
        </div>
      )}

      {/* Footer branding */}
      <footer className="py-6 text-center text-xs text-stone-300">
        Gemaakt met <span className="text-stone-400 font-medium">Ons Trouwplan</span>
      </footer>
    </>
  )
}
