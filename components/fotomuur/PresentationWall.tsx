'use client'

import * as React from 'react'

import { createRawClient } from '@/lib/supabase/client'
import type { WallPhoto, WallSettings } from './GuestWall'

function QrCode({ url, size = 120 }: { url: string; size?: number }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    let alive = true
    async function draw() {
      if (typeof window === 'undefined') return
      const { toCanvas } = await import('qrcode')
      if (!alive || !canvasRef.current) return
      await toCanvas(canvasRef.current, url, {
        width: size,
        margin: 1,
        color: { dark: '#ffffff', light: '#1c1917' },
      })
    }
    void draw()
    return () => { alive = false }
  }, [url, size])

  return <canvas ref={canvasRef} width={size} height={size} className="rounded-xl" />
}

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

function ScrollingColumn({ photos, scrollDown }: { photos: WallPhoto[]; scrollDown: boolean }) {
  if (photos.length === 0) return <div className="flex-1" />

  // Zorg voor minimaal 3 unieke foto's zodat de animatie er goed uitziet
  const filled = photos.length >= 3 ? photos : Array.from({ length: Math.ceil(3 / photos.length) }, () => photos).flat()

  // Dubbelvoer voor naadloze oneindige loop
  const looped = [...filled, ...filled]

  // Snelheid: ~6s per foto → meer foto's = zelfde visuele snelheid
  const duration = Math.max(20, filled.length * 6)

  // pwall-down: element glijdt naar beneden (foto's bewegen omlaag)
  // pwall-up:   element glijdt naar boven  (foto's bewegen omhoog)
  const animName = scrollDown ? 'pwall-down' : 'pwall-up'

  return (
    <div className="flex-1 min-w-0 overflow-hidden">
      <div style={{ animation: `${animName} ${duration}s linear infinite`, willChange: 'transform' }}>
        {looped.map((photo, i) => (
          <div key={`${photo.id}-${i}`} className="mb-3 overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="" className="w-full object-cover" loading="lazy" />
            {photo.guestName && (
              <div className="bg-stone-900/70 px-2.5 py-1.5">
                <p className="text-xs text-white/70 truncate">{photo.guestName}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function PresentationWall({ weddingId, partner1Naam, partner2Naam, trouwdatum, initialPhotos, guestUrl }: Props) {
  const [photos, setPhotos] = React.useState<WallPhoto[]>(initialPhotos)
  const [numCols, setNumCols] = React.useState(3)
  const [spotlight, setSpotlight] = React.useState<WallPhoto | null>(null)

  // Realtime: nieuwe foto's live toevoegen
  React.useEffect(() => {
    const supabase = createRawClient()
    const channel = supabase
      .channel(`photo-wall-scherm:${weddingId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'photo_wall_photos', filter: `wedding_id=eq.${weddingId}` },
        (payload: any) => {
          if (payload.eventType === 'INSERT' && payload.new?.is_approved) {
            const p: WallPhoto = {
              id: payload.new.id, url: payload.new.url,
              guestName: payload.new.guest_name, message: payload.new.message,
              isFeatured: payload.new.is_featured, uploadedAt: payload.new.uploaded_at,
            }
            setPhotos((prev) => prev.some((x) => x.id === p.id) ? prev : [p, ...prev])
            setSpotlight(p)
            setTimeout(() => setSpotlight(null), 5000)
          } else if (payload.eventType === 'UPDATE' && payload.new?.is_approved) {
            const p: WallPhoto = {
              id: payload.new.id, url: payload.new.url,
              guestName: payload.new.guest_name, message: payload.new.message,
              isFeatured: payload.new.is_featured, uploadedAt: payload.new.uploaded_at,
            }
            setPhotos((prev) => {
              const exists = prev.some((x) => x.id === p.id)
              if (!exists) { setSpotlight(p); setTimeout(() => setSpotlight(null), 5000) }
              return exists ? prev.map((x) => x.id === p.id ? p : x) : [p, ...prev]
            })
          } else if (payload.eventType === 'DELETE') {
            setPhotos((prev) => prev.filter((x) => x.id !== payload.old?.id))
          }
        }
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [weddingId])

  // Verdeel foto's round-robin over kolommen
  const columns = React.useMemo(() => {
    const cols: WallPhoto[][] = Array.from({ length: numCols }, () => [])
    photos.forEach((photo, i) => cols[i % numCols].push(photo))
    return cols
  }, [photos, numCols])

  const datumlabel = trouwdatum
    ? new Date(trouwdatum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="fixed inset-0 bg-stone-950 flex flex-col overflow-hidden select-none">
      {/* CSS keyframes voor de scrollanimaties */}
      <style>{`
        @keyframes pwall-up {
          from { transform: translateY(0); }
          to   { transform: translateY(-50%); }
        }
        @keyframes pwall-down {
          from { transform: translateY(-50%); }
          to   { transform: translateY(0); }
        }
      `}</style>

      {/* Spotlight: nieuwe foto groot in beeld */}
      {spotlight && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 animate-fade-in">
          <div className="flex flex-col items-center max-w-3xl px-8 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={spotlight.url} alt="" className="max-h-[72vh] max-w-full rounded-2xl shadow-2xl object-contain" />
            {spotlight.guestName && (
              <p className="mt-5 text-2xl font-light text-white/90">{spotlight.guestName}</p>
            )}
            {spotlight.message && (
              <p className="mt-1.5 text-lg text-white/55 italic">"{spotlight.message}"</p>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 shrink-0">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-rose-400">Fotomuur</p>
          <h1 className="font-serif text-3xl font-semibold text-white mt-0.5">
            {partner1Naam} & {partner2Naam}
          </h1>
          {datumlabel && <p className="text-sm text-white/40 mt-0.5">{datumlabel}</p>}
        </div>

        <div className="flex items-center gap-6">
          {/* Foto-teller */}
          <p className="text-sm text-white/50">
            <span className="text-white/80 font-semibold text-xl">{photos.length}</span>{' '}
            {photos.length === 1 ? "foto" : "foto's"}
          </p>

          {/* Kolom-kiezer */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-white/30 mr-1">kolommen</span>
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setNumCols(n)}
                className={[
                  'w-8 h-8 rounded-lg text-sm font-semibold transition-colors',
                  numCols === n
                    ? 'bg-rose-600 text-white'
                    : 'bg-white/10 text-white/40 hover:bg-white/20 hover:text-white',
                ].join(' ')}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Gastlink QR */}
          <div className="flex flex-col items-center gap-1.5">
            <QrCode url={guestUrl} size={120} />
            <p className="text-xs text-white/30 uppercase tracking-widest">Scan & voeg toe</p>
          </div>
        </div>
      </div>

      {/* Scrollende kolommen */}
      <div className="flex-1 flex gap-3 px-6 pb-6 min-h-0">
        {photos.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-white/20 text-lg">
            Wacht op de eerste foto…
          </div>
        ) : (
          columns.map((colPhotos, colIdx) => (
            // Kolom 1 (idx 0) → beneden, kolom 2 (idx 1) → boven, enz.
            <ScrollingColumn key={colIdx} photos={colPhotos} scrollDown={colIdx % 2 === 0} />
          ))
        )}
      </div>

      <div className="absolute bottom-4 right-6 text-xs text-white/20">Ons Trouwplan</div>
    </div>
  )
}
