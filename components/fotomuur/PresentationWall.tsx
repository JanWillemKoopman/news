'use client'

import * as React from 'react'

import { createRawClient } from '@/lib/supabase/client'
import type { WallPhoto, WallSettings } from './GuestWall'

interface Props {
  weddingId: string
  slug: string
  partner1Naam: string
  partner2Naam: string
  trouwdatum: string | null
  settings: WallSettings
  initialPhotos: WallPhoto[]
  guestUrl: string
}

function tijdGeleden(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'zojuist'
  if (diff < 3600) return `${Math.floor(diff / 60)} min geleden`
  return `${Math.floor(diff / 3600)} u geleden`
}

export function PresentationWall({ weddingId, partner1Naam, partner2Naam, trouwdatum, initialPhotos, guestUrl }: Props) {
  const [photos, setPhotos] = React.useState<WallPhoto[]>(initialPhotos)
  const [spotlight, setSpotlight] = React.useState<WallPhoto | null>(null)
  const [slideshowIdx, setSlideshowIdx] = React.useState<number | null>(null)
  const idleTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const slideshowTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  const stopSlideshow = () => {
    if (slideshowTimerRef.current) {
      clearInterval(slideshowTimerRef.current)
      slideshowTimerRef.current = null
    }
    setSlideshowIdx(null)
  }

  const resetIdleTimer = React.useCallback((currentPhotos: WallPhoto[]) => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    stopSlideshow()
    idleTimerRef.current = setTimeout(() => {
      if (currentPhotos.length === 0) return
      let i = 0
      setSlideshowIdx(0)
      slideshowTimerRef.current = setInterval(() => {
        i = (i + 1) % currentPhotos.length
        setSlideshowIdx(i)
      }, 6000)
    }, 3 * 60 * 1000) // 3 minuten inactiviteit
  }, [])

  // Realtime subscription
  React.useEffect(() => {
    resetIdleTimer(photos)
    const supabase = createRawClient()
    const channel = supabase
      .channel(`photo-wall-scherm:${weddingId}`)
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
              const updated = [p, ...prev]
              resetIdleTimer(updated)
              return updated
            })
            setSpotlight(p)
            stopSlideshow()
            setTimeout(() => setSpotlight(null), 4000)
          } else if (payload.eventType === 'UPDATE' && payload.new?.is_approved) {
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
              const updated = exists ? prev.map((x) => (x.id === p.id ? p : x)) : [p, ...prev]
              if (!exists) {
                setSpotlight(p)
                stopSlideshow()
                setTimeout(() => setSpotlight(null), 4000)
              }
              resetIdleTimer(updated)
              return updated
            })
          } else if (payload.eventType === 'DELETE') {
            setPhotos((prev) => prev.filter((x) => x.id !== payload.old?.id))
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      stopSlideshow()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weddingId])

  const datumlabel = trouwdatum
    ? new Date(trouwdatum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const slideshowPhoto = slideshowIdx !== null ? photos[slideshowIdx] : null

  return (
    <div className="fixed inset-0 bg-stone-950 flex flex-col overflow-hidden select-none">

      {/* Spotlight: nieuwe foto groot in beeld */}
      {spotlight && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 animate-fade-in">
          <div className="flex flex-col items-center max-w-3xl px-8 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={spotlight.url}
              alt=""
              className="max-h-[70vh] max-w-full rounded-2xl shadow-2xl object-contain"
            />
            {spotlight.guestName && (
              <p className="mt-4 text-2xl font-light text-white/90">{spotlight.guestName}</p>
            )}
            {spotlight.message && (
              <p className="mt-1.5 text-lg text-white/60 italic">"{spotlight.message}"</p>
            )}
          </div>
        </div>
      )}

      {/* Slideshow (bij inactiviteit) */}
      {slideshowPhoto && !spotlight && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
          <div className="flex flex-col items-center max-w-3xl px-8 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slideshowPhoto.url}
              alt=""
              className="max-h-[72vh] max-w-full rounded-2xl object-contain shadow-2xl transition-opacity duration-1000"
            />
            {slideshowPhoto.guestName && (
              <p className="mt-4 text-xl font-light text-white/80">{slideshowPhoto.guestName}</p>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 shrink-0">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-rose-400">Fotomuur</p>
          <h1 className="font-serif text-3xl font-semibold text-white mt-0.5">
            {partner1Naam} & {partner2Naam}
          </h1>
          {datumlabel && <p className="text-sm text-white/40 mt-0.5">{datumlabel}</p>}
        </div>
        <div className="flex items-center gap-6">
          <p className="text-sm text-white/50">
            <span className="text-white/80 font-semibold text-lg">{photos.length}</span>{' '}
            {photos.length === 1 ? "foto" : "foto's"}
          </p>
          {/* QR instructie */}
          <div className="text-right">
            <p className="text-xs text-white/40 uppercase tracking-widest">Scan & voeg toe</p>
            <p className="text-sm font-mono text-white/60 mt-0.5 max-w-[240px] truncate">{guestUrl}</p>
          </div>
        </div>
      </div>

      {/* Foto-raster */}
      <div className="flex-1 overflow-hidden px-6 pb-6">
        {photos.length === 0 ? (
          <div className="flex h-full items-center justify-center text-white/20 text-lg">
            Wacht op de eerste foto…
          </div>
        ) : (
          <div className="columns-3 md:columns-4 lg:columns-5 gap-3 h-full overflow-hidden">
            {photos.map((photo) => (
              <div key={photo.id} className="mb-3 break-inside-avoid overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt=""
                  className="w-full object-cover"
                  loading="lazy"
                />
                {photo.guestName && (
                  <div className="bg-stone-900/80 px-2.5 py-1.5">
                    <p className="text-xs text-white/70 truncate">{photo.guestName}</p>
                    <p className="text-[10px] text-white/30">{tijdGeleden(photo.uploadedAt)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Branding */}
      <div className="absolute bottom-4 right-6 text-xs text-white/20">
        Ons Trouwplan
      </div>
    </div>
  )
}
