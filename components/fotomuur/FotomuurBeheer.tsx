'use client'

import * as React from 'react'
import { Camera, Check, Copy, ExternalLink, Loader2, Monitor, Star, Trash2, X } from 'lucide-react'
import Link from 'next/link'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { Button, ConfirmDialog, EmptyState, useToast } from '@/components/bruiloft/ui'
import { createRawClient } from '@/lib/supabase/client'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { WallPhoto, WallSettings } from './GuestWall'

// QR-code wordt gegenereerd via de browser Canvas API (geen extra library)
function QrCode({ url, size = 160 }: { url: string; size?: number }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    let alive = true
    async function draw() {
      if (typeof window === 'undefined') return
      // Dynamisch laden zodat het niet in de server-bundle belandt
      const { toCanvas } = await import('qrcode')
      if (!alive || !canvasRef.current) return
      await toCanvas(canvasRef.current, url, {
        width: size,
        margin: 1,
        color: { dark: '#1c1917', light: '#ffffff' },
      })
    }
    void draw()
    return () => { alive = false }
  }, [url, size])

  return <canvas ref={canvasRef} width={size} height={size} className="rounded-lg" />
}

export function FotomuurBeheer() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const { toast } = useToast()

  const [slug, setSlug] = React.useState<string | null>(null)
  const [settings, setSettings] = React.useState<WallSettings | null>(null)
  const [photos, setPhotos] = React.useState<WallPhoto[]>([])
  const [pendingPhotos, setPendingPhotos] = React.useState<WallPhoto[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null)

  const weddingId = wedding?.id

  // Laad slug + instellingen + foto's
  React.useEffect(() => {
    if (!weddingId) return
    const supabase = createRawClient()
    let alive = true

    async function load() {
      setLoading(true)
      const [slugRes, settingsRes, photosRes] = await Promise.all([
        supabase.from('website_content').select('slug').eq('wedding_id', weddingId).maybeSingle(),
        supabase.from('photo_wall_settings').select('*').eq('wedding_id', weddingId).maybeSingle(),
        supabase.from('photo_wall_photos').select('*').eq('wedding_id', weddingId).order('uploaded_at', { ascending: false }),
      ])

      if (!alive) return

      setSlug((slugRes.data as any)?.slug ?? null)

      const s = settingsRes.data as any
      setSettings(s ? {
        isActive: s.is_active,
        title: s.title,
        moderationRequired: s.moderation_required,
        requireName: s.require_name,
        guestsCanDownload: s.guests_can_download,
      } : null)

      const allPhotos: WallPhoto[] = ((photosRes.data ?? []) as any[]).map((p) => ({
        id: p.id,
        url: p.url,
        guestName: p.guest_name,
        message: p.message,
        isFeatured: p.is_featured,
        uploadedAt: p.uploaded_at,
        isApproved: p.is_approved,
      } as WallPhoto & { isApproved: boolean }))

      setPhotos(allPhotos.filter((p: any) => p.isApproved))
      setPendingPhotos(allPhotos.filter((p: any) => !p.isApproved))
      setLoading(false)
    }

    void load()
    return () => { alive = false }
  }, [weddingId])

  // Realtime: houd foto-lijsten live
  React.useEffect(() => {
    if (!weddingId) return
    const supabase = createRawClient()
    const channel = supabase
      .channel(`fotomuur-beheer:${weddingId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'photo_wall_photos', filter: `wedding_id=eq.${weddingId}` },
        (payload: any) => {
          const p = payload.new as any
          if (payload.eventType === 'INSERT') {
            const photo: WallPhoto = {
              id: p.id, url: p.url, guestName: p.guest_name,
              message: p.message, isFeatured: p.is_featured, uploadedAt: p.uploaded_at,
            }
            if (p.is_approved) {
              setPhotos((prev) => prev.some((x) => x.id === p.id) ? prev : [photo, ...prev])
            } else {
              setPendingPhotos((prev) => prev.some((x) => x.id === p.id) ? prev : [photo, ...prev])
            }
          } else if (payload.eventType === 'UPDATE') {
            const photo: WallPhoto = {
              id: p.id, url: p.url, guestName: p.guest_name,
              message: p.message, isFeatured: p.is_featured, uploadedAt: p.uploaded_at,
            }
            if (p.is_approved) {
              setPhotos((prev) => {
                const exists = prev.some((x) => x.id === p.id)
                return exists ? prev.map((x) => (x.id === p.id ? photo : x)) : [photo, ...prev]
              })
              setPendingPhotos((prev) => prev.filter((x) => x.id !== p.id))
            }
          } else if (payload.eventType === 'DELETE') {
            const id = payload.old?.id
            setPhotos((prev) => prev.filter((x) => x.id !== id))
            setPendingPhotos((prev) => prev.filter((x) => x.id !== id))
          }
        }
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [weddingId])

  const upsertSettings = async (patch: Partial<WallSettings>) => {
    if (!weddingId) return
    setSaving(true)
    const merged = { ...defaults, ...settings, ...patch }
    const res = await fetch('/api/fotomuur/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weddingId,
        isActive: merged.isActive,
        title: merged.title,
        moderationRequired: merged.moderationRequired,
        requireName: merged.requireName,
        guestsCanDownload: merged.guestsCanDownload,
      }),
    })
    setSaving(false)
    if (!res.ok) { toast({ title: 'Fout bij opslaan', variant: 'error' }); return }
    setSettings(merged)
  }

  const approvePhoto = async (id: string) => {
    const supabase = createRawClient()
    await supabase.from('photo_wall_photos').update({ is_approved: true }).eq('id', id)
  }

  const rejectPhoto = async (id: string) => {
    const supabase = createRawClient()
    await supabase.from('photo_wall_photos').delete().eq('id', id)
  }

  const toggleFeature = async (photo: WallPhoto) => {
    const supabase = createRawClient()
    await supabase.from('photo_wall_photos').update({ is_featured: !photo.isFeatured }).eq('id', photo.id)
    setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, isFeatured: !p.isFeatured } : p))
  }

  const deletePhoto = async (id: string) => {
    const supabase = createRawClient()
    await supabase.from('photo_wall_photos').delete().eq('id', id)
    setDeleteTarget(null)
    toast({ title: "Foto verwijderd" })
  }

  const copyUrl = async () => {
    if (!guestUrl) return
    await navigator.clipboard.writeText(guestUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const defaults: WallSettings = {
    isActive: false,
    title: "Foto's van onze bruiloft",
    moderationRequired: false,
    requireName: false,
    guestsCanDownload: true,
  }

  const guestUrl = slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/foto/${slug}` : null
  const schermUrl = slug ? `/foto/${slug}/scherm` : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isActive = settings?.isActive ?? false
  const hasPending = pendingPhotos.length > 0

  return (
    <div className="space-y-8">
      <PageHeader
        titel="Fotomuur"
        beschrijving="Laat gasten foto's uploaden die live op een groot scherm verschijnen."
      />

      {/* Activatie */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-medium text-foreground">
              {isActive ? '✦ Fotomuur is actief' : 'Fotomuur activeren'}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {isActive
                ? 'Gasten kunnen nu foto\'s uploaden via de link hieronder.'
                : 'Zet de fotomuur aan zodat gasten foto\'s kunnen uploaden.'}
            </p>
          </div>
          <button
            onClick={() => void upsertSettings({ isActive: !isActive })}
            disabled={saving}
            className={[
              'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring',
              isActive ? 'bg-rose-600' : 'bg-muted-foreground/30',
            ].join(' ')}
            role="switch"
            aria-checked={isActive}
          >
            <span
              className={[
                'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md transition-transform mt-0.5',
                isActive ? 'translate-x-5.5' : 'translate-x-0.5',
              ].join(' ')}
            />
          </button>
        </div>
      </div>

      {/* Link & QR */}
      {slug ? (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-medium text-foreground mb-4">Link voor gasten</h2>
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* QR code */}
            <div className="shrink-0">
              <QrCode url={guestUrl!} size={148} />
              <p className="text-[11px] text-muted-foreground text-center mt-2">Scan om te openen</p>
            </div>
            {/* URL + knoppen */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 font-mono text-sm text-foreground overflow-hidden">
                <span className="truncate">{guestUrl}</span>
                <button onClick={copyUrl} className="shrink-0 text-muted-foreground hover:text-foreground">
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={guestUrl!} target="_blank">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Bekijk als gast
                  </Link>
                </Button>
                {schermUrl && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={schermUrl} target="_blank">
                      <Monitor className="h-3.5 w-3.5 mr-1.5" />
                      Open groot scherm
                    </Link>
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Zet de QR-code op tafelkaartjes of toon hem op een scherm zodat gasten hem kunnen scannen.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
          Stel eerst een slug in voor je trouwwebsite om de fotomuur-link te activeren.
        </div>
      )}

      {/* Instellingen */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="font-medium text-foreground">Instellingen</h2>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Titel van de muur</label>
          <input
            type="text"
            defaultValue={settings?.title ?? defaults.title}
            onBlur={(e) => void upsertSettings({ title: e.target.value })}
            className="w-full max-w-sm rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {[
          { key: 'moderationRequired', label: 'Foto\'s eerst goedkeuren', desc: 'Jij beslist welke foto\'s op de muur komen' },
          { key: 'requireName', label: 'Naam verplicht', desc: 'Gasten moeten hun naam invullen' },
          { key: 'guestsCanDownload', label: 'Gasten mogen downloaden', desc: 'Gasten kunnen foto\'s opslaan' },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-start justify-between gap-4 py-2 border-t">
            <div>
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <button
              onClick={() => void upsertSettings({ [key]: !(settings?.[key as keyof WallSettings] ?? defaults[key as keyof WallSettings]) })}
              disabled={saving}
              className={[
                'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none',
                (settings?.[key as keyof WallSettings] ?? defaults[key as keyof WallSettings])
                  ? 'bg-rose-600' : 'bg-muted-foreground/30',
              ].join(' ')}
              role="switch"
            >
              <span className={[
                'block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5',
                (settings?.[key as keyof WallSettings] ?? defaults[key as keyof WallSettings])
                  ? 'translate-x-4.5' : 'translate-x-0.5',
              ].join(' ')} />
            </button>
          </div>
        ))}
      </div>

      {/* Wachtende goedkeuring */}
      {hasPending && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-medium text-amber-900 mb-3">
            {pendingPhotos.length} {pendingPhotos.length === 1 ? "foto wacht" : "foto's wachten"} op goedkeuring
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {pendingPhotos.map((photo) => (
              <div key={photo.id} className="relative rounded-xl overflow-hidden bg-white border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="" className="w-full aspect-square object-cover" />
                {photo.guestName && (
                  <p className="px-2 py-1 text-xs text-stone-600 truncate">{photo.guestName}</p>
                )}
                <div className="flex border-t">
                  <button
                    onClick={() => void approvePhoto(photo.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-emerald-700 hover:bg-emerald-50 transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" /> Goedkeuren
                  </button>
                  <button
                    onClick={() => void rejectPhoto(photo.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors border-l"
                  >
                    <X className="h-3.5 w-3.5" /> Weigeren
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Foto's beheren */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-foreground">
            Alle foto's
            <span className="ml-2 text-sm text-muted-foreground font-normal">({photos.length})</span>
          </h2>
        </div>

        {photos.length === 0 ? (
          <EmptyState
            icon={Camera}
            titel="Nog geen foto's"
            beschrijving={isActive ? "Gasten kunnen nu foto's uploaden via de link hierboven." : "Activeer de fotomuur om foto's te ontvangen."}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className={[
                'relative rounded-xl overflow-hidden border group',
                photo.isFeatured ? 'ring-2 ring-amber-400' : '',
              ].join(' ')}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="" className="w-full aspect-square object-cover" />
                {photo.isFeatured && (
                  <div className="absolute top-1.5 left-1.5 bg-amber-400 rounded-full p-0.5">
                    <Star className="h-3 w-3 text-white fill-white" />
                  </div>
                )}
                {photo.guestName && (
                  <p className="px-2 py-1 text-xs text-foreground truncate bg-card border-t">
                    {photo.guestName}
                  </p>
                )}
                {/* Hover acties */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => void toggleFeature(photo)}
                    title={photo.isFeatured ? 'Uitlichten verwijderen' : 'Uitlichten op groot scherm'}
                    className="rounded-full bg-white/20 hover:bg-white/40 p-2 text-white"
                  >
                    <Star className={['h-4 w-4', photo.isFeatured ? 'fill-amber-400 text-amber-400' : ''].join(' ')} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(photo.id)}
                    className="rounded-full bg-white/20 hover:bg-rose-500/80 p-2 text-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verwijder-bevestiging */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
        title="Foto verwijderen?"
        description="Deze foto wordt permanent verwijderd van de muur."
        bevestigLabel="Verwijderen"
        onConfirm={() => deleteTarget && void deletePhoto(deleteTarget)}
      />
    </div>
  )
}
