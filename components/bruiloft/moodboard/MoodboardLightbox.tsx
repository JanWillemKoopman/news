'use client'

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ChevronLeft, ChevronRight, ExternalLink, Pencil, Trash2, X } from 'lucide-react'

import { Button, ConfirmDialog, Field, Input, Select, useToast } from '@/components/bruiloft/ui'
import { MOODBOARD_CATEGORIEEN } from '@/lib/bruiloft/moodboardCategorieen'
import { capFirst } from '@/lib/utils'
import type { MoodBoardItem } from '@/lib/bruiloft/types'

interface MoodboardLightboxProps {
  items: MoodBoardItem[] // de huidige (gefilterde, geordende) lijst — bepaalt vorige/volgende
  openItem: MoodBoardItem | null
  onOpenChange: (open: boolean) => void
  kanBewerken: boolean
  onUpdate: (id: string, patch: { categorie?: string; titel?: string }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

// Eigen, volledig-scherm viewer bovenop de Radix Dialog-primitive (niet de
// gestileerde Modal-wrapper — die is bewust een gecentreerd paneel met vaste
// max-breedte, precies niet wat een immersieve lightbox nodig heeft).
//
// Navigatie: de parent bepaalt welk item ooit "open" ging (openItem), maar
// vorige/volgende binnen de lightbox verplaatst alleen lokale state
// (huidigId) — zo hoeft de parent niets te weten van bladeren, en blijft
// sluiten/heropenen vanaf de parent altijd leidend.
export function MoodboardLightbox({
  items,
  openItem,
  onOpenChange,
  kanBewerken,
  onUpdate,
  onDelete,
}: MoodboardLightboxProps) {
  const { toast } = useToast()
  const [huidigId, setHuidigId] = React.useState<string | null>(null)
  const [bewerkModus, setBewerkModus] = React.useState(false)
  const [titelInvoer, setTitelInvoer] = React.useState('')
  const [categorieInvoer, setCategorieInvoer] = React.useState('')
  const [opslaan, setOpslaan] = React.useState(false)
  const [verwijderBevestiging, setVerwijderBevestiging] = React.useState(false)
  const swipeStartX = React.useRef<number | null>(null)

  React.useEffect(() => {
    setHuidigId(openItem?.id ?? null)
  }, [openItem?.id])

  const huidig = huidigId ? items.find((i) => i.id === huidigId) ?? null : null
  const huidigIndex = huidig ? items.findIndex((i) => i.id === huidig.id) : -1
  const vorige = huidigIndex > 0 ? items[huidigIndex - 1] : null
  const volgende = huidigIndex >= 0 && huidigIndex < items.length - 1 ? items[huidigIndex + 1] : null

  React.useEffect(() => {
    setBewerkModus(false)
    if (huidig) {
      setTitelInvoer(huidig.titel)
      setCategorieInvoer(huidig.categorie)
    }
    // Bewust alleen op id-wissel: een realtime-update van hetzelfde item
    // (bv. categorie door je partner gewijzigd) mag een openstaand
    // bewerkformulier niet resetten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [huidig?.id])

  // Toetsenbordnavigatie (Escape sluit al vanzelf via Radix).
  React.useEffect(() => {
    if (!huidig) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && vorige) setHuidigId(vorige.id)
      if (e.key === 'ArrowRight' && volgende) setHuidigId(volgende.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [huidig, vorige, volgende])

  const opslaanBewerking = async () => {
    if (!huidig) return
    setOpslaan(true)
    try {
      await onUpdate(huidig.id, { titel: titelInvoer.trim(), categorie: categorieInvoer.trim() || 'overig' })
      setBewerkModus(false)
      toast({ title: 'Opgeslagen', variant: 'success' })
    } catch {
      toast({ title: 'Opslaan mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    } finally {
      setOpslaan(false)
    }
  }

  const verwijder = async () => {
    if (!huidig) return
    const volgendeNaOpen = volgende ?? vorige
    try {
      await onDelete(huidig.id)
      toast({ title: 'Verwijderd van het bord', variant: 'success' })
      if (volgendeNaOpen) setHuidigId(volgendeNaOpen.id)
      else onOpenChange(false)
    } catch {
      toast({ title: 'Verwijderen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
  }

  const onTouchStart = (e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (swipeStartX.current === null) return
    const delta = e.changedTouches[0].clientX - swipeStartX.current
    swipeStartX.current = null
    if (Math.abs(delta) < 60) return
    if (delta > 0 && vorige) setHuidigId(vorige.id)
    if (delta < 0 && volgende) setHuidigId(volgende.id)
  }

  return (
    <Dialog.Root open={huidig !== null} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/90 data-[state=open]:animate-overlay-in" />
        <Dialog.Content
          className="fixed inset-0 z-50 flex flex-col outline-none data-[state=open]:animate-overlay-in"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {huidig ? (
            <>
              <Dialog.Title className="sr-only">{huidig.titel || 'Inspiratiebeeld'}</Dialog.Title>
              <Dialog.Description className="sr-only">
                {capFirst(huidig.categorie)}, afbeelding {huidigIndex + 1} van {items.length}
              </Dialog.Description>

              {/* Kopbalk */}
              <div className="flex shrink-0 items-center justify-between gap-3 p-4 text-white">
                <span className="text-sm text-white/70">
                  {huidigIndex + 1} / {items.length}
                </span>
                <div className="flex items-center gap-1.5">
                  {huidig.bron === 'link' && huidig.bronUrl ? (
                    <a
                      href={huidig.bronUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-white/90 transition-colors hover:bg-white/10"
                    >
                      <ExternalLink className="h-4 w-4" /> Bekijk bron
                    </a>
                  ) : null}
                  {kanBewerken ? (
                    <button
                      type="button"
                      onClick={() => setBewerkModus((v) => !v)}
                      aria-label="Bewerken"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/10"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  ) : null}
                  {kanBewerken ? (
                    <button
                      type="button"
                      onClick={() => setVerwijderBevestiging(true)}
                      aria-label="Verwijderen"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      aria-label="Sluiten"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/10"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </Dialog.Close>
                </div>
              </div>

              {/* Beeldvlak + navigatiepijlen */}
              <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-2">
                {vorige ? (
                  <button
                    type="button"
                    onClick={() => setHuidigId(vorige.id)}
                    aria-label="Vorige"
                    className="absolute left-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60 sm:flex"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                ) : null}

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={huidig.url}
                  alt={huidig.titel || 'Inspiratiebeeld'}
                  className="max-h-full max-w-full rounded-lg object-contain"
                />

                {volgende ? (
                  <button
                    type="button"
                    onClick={() => setHuidigId(volgende.id)}
                    aria-label="Volgende"
                    className="absolute right-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60 sm:flex"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                ) : null}
              </div>

              {/* Onderbalk: titel/categorie (of bewerkformulier) */}
              <div className="shrink-0 bg-black/40 px-4 py-3 backdrop-blur-sm">
                {bewerkModus ? (
                  <div className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row sm:items-end">
                    <Field label="Titel" htmlFor="lb-titel" className="flex-1 [&_label]:text-white/70">
                      <Input
                        id="lb-titel"
                        value={titelInvoer}
                        onChange={(e) => setTitelInvoer(e.target.value)}
                        placeholder="Bijv. Zara Bruidsjurk"
                      />
                    </Field>
                    <Field label="Categorie" htmlFor="lb-categorie" className="[&_label]:text-white/70">
                      <Select
                        id="lb-categorie"
                        value={categorieInvoer}
                        onChange={(e) => setCategorieInvoer(e.target.value)}
                      >
                        {MOODBOARD_CATEGORIEEN.map((c) => (
                          <option key={c} value={c}>
                            {capFirst(c)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Button onClick={opslaanBewerking} loading={opslaan}>
                      Opslaan
                    </Button>
                  </div>
                ) : (
                  <div className="mx-auto flex max-w-md items-center justify-between gap-3 text-white">
                    <p className="min-w-0 truncate text-sm font-medium">
                      {huidig.titel || capFirst(huidig.categorie)}
                    </p>
                    <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80">
                      {capFirst(huidig.categorie)}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>

      <ConfirmDialog
        open={verwijderBevestiging}
        onOpenChange={setVerwijderBevestiging}
        title="Van het bord verwijderen?"
        description="Dit inspiratiebeeld wordt van jullie moodboard verwijderd."
        onConfirm={verwijder}
      />
    </Dialog.Root>
  )
}
