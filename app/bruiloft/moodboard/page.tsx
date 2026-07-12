'use client'

import * as React from 'react'
import { Images, Plus } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { PageInfoButton } from '@/components/bruiloft/PageInfoButton'
import { moodboardInfo } from '@/components/bruiloft/faqContent'
import { MoodboardCategorieFilter } from '@/components/bruiloft/moodboard/MoodboardCategorieFilter'
import { MoodboardGrid } from '@/components/bruiloft/moodboard/MoodboardGrid'
import { MoodboardLightbox } from '@/components/bruiloft/moodboard/MoodboardLightbox'
import { MoodboardToevoegenModal } from '@/components/bruiloft/moodboard/MoodboardToevoegenModal'
import { Button, EmptyState } from '@/components/bruiloft/ui'
import { canEdit } from '@/lib/bruiloft/permissions'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { MoodBoardItem } from '@/lib/bruiloft/types'

export default function MoodboardPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const moodBoardItems = useBruiloftStore((s) => s.moodBoardItems)
  const reorderMoodBoardItems = useBruiloftStore((s) => s.reorderMoodBoardItems)
  const updateMoodBoardItem = useBruiloftStore((s) => s.updateMoodBoardItem)
  const deleteMoodBoardItem = useBruiloftStore((s) => s.deleteMoodBoardItem)
  const permissions = useBruiloftStore((s) => s.permissions)
  const kanBewerken = canEdit(permissions, 'moodboard')

  const [categorieFilter, setCategorieFilter] = React.useState<string | null>(null)
  const [toevoegenOpen, setToevoegenOpen] = React.useState(false)
  const [initialFiles, setInitialFiles] = React.useState<File[] | undefined>(undefined)
  const [lightboxItem, setLightboxItem] = React.useState<MoodBoardItem | null>(null)

  // Pagina-brede dropzone: bestanden vanaf het bureaublad ergens op de
  // pagina laten vallen opent de toevoegen-modal direct met die bestanden
  // erin — geen tussenstap nodig. Een teller i.p.v. een simpele boolean
  // voorkomt geflikker: dragenter/dragleave vuurt ook voor onderliggende
  // elementen, dus zonder teller zou het overlay-vlak knipperen zodra de
  // cursor over een kind-element beweegt.
  const [dragTeller, setDragTeller] = React.useState(0)
  const dragActief = dragTeller > 0

  React.useEffect(() => {
    if (!kanBewerken) return
    function bevatBestanden(e: DragEvent) {
      return Array.from(e.dataTransfer?.types ?? []).includes('Files')
    }
    function onEnter(e: DragEvent) {
      if (!bevatBestanden(e)) return
      e.preventDefault()
      setDragTeller((n) => n + 1)
    }
    function onLeave(e: DragEvent) {
      if (!bevatBestanden(e)) return
      setDragTeller((n) => Math.max(0, n - 1))
    }
    function onOver(e: DragEvent) {
      if (!bevatBestanden(e)) return
      e.preventDefault()
    }
    function onDrop(e: DragEvent) {
      if (!bevatBestanden(e)) return
      e.preventDefault()
      setDragTeller(0)
      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length > 0) {
        setInitialFiles(files)
        setToevoegenOpen(true)
      }
    }
    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('dragover', onOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [kanBewerken])

  if (!wedding) return null

  // Categorieën die daadwerkelijk in gebruik zijn, met aantal — alleen die
  // tonen we als filter (geen lege chips).
  const categorieTellers = new Map<string, number>()
  for (const item of moodBoardItems) {
    categorieTellers.set(item.categorie, (categorieTellers.get(item.categorie) ?? 0) + 1)
  }
  const categorieen = Array.from(categorieTellers.entries())
    .map(([naam, aantal]) => ({ naam, aantal }))
    .sort((a, b) => a.naam.localeCompare(b.naam, 'nl'))

  const gefilterd = categorieFilter
    ? moodBoardItems.filter((i) => i.categorie === categorieFilter)
    : moodBoardItems

  const openToevoegen = () => {
    setInitialFiles(undefined)
    setToevoegenOpen(true)
  }

  return (
    <div className="relative mx-auto max-w-6xl pb-24 min-h-screen">
      <PageHeader
        titel="Moodboard"
        info={<PageInfoButton {...moodboardInfo} />}
        primaryActie={
          kanBewerken ? (
            <Button onClick={openToevoegen}>
              <Plus className="h-4 w-4" /> Toevoegen
            </Button>
          ) : undefined
        }
        fab={kanBewerken ? { label: 'Toevoegen aan moodboard', onClick: openToevoegen } : undefined}
      />

      {moodBoardItems.length === 0 ? (
        <EmptyState
          icon={Images}
          titel="Nog geen inspiratie verzameld"
          beschrijving={
            kanBewerken
              ? 'Verzamel hier sfeerbeelden voor kleuren, jurk, bloemen en decoratie — upload eigen foto\'s of plak een link naar iets moois dat je online vond.'
              : 'Er staat nog niets op het moodboard.'
          }
          actie={
            kanBewerken ? (
              <Button onClick={openToevoegen}>
                <Plus className="h-4 w-4" /> Toevoegen
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {categorieen.length > 1 ? (
            <MoodboardCategorieFilter
              categorieen={categorieen}
              actief={categorieFilter}
              onChange={setCategorieFilter}
            />
          ) : null}

          {gefilterd.length === 0 ? (
            <EmptyState
              icon={Images}
              titel="Niets in deze categorie"
              beschrijving="Geen inspiratiebeelden komen overeen met dit filter."
              actie={
                <Button variant="outline" size="sm" onClick={() => setCategorieFilter(null)}>
                  Wis filter
                </Button>
              }
            />
          ) : (
            <MoodboardGrid
              items={gefilterd}
              kanHerordenen={kanBewerken && categorieFilter === null}
              onOpen={setLightboxItem}
              onReorder={(orderedIds) => {
                reorderMoodBoardItems(orderedIds).catch(() => {})
              }}
            />
          )}
        </>
      )}

      <MoodboardToevoegenModal
        open={toevoegenOpen}
        onOpenChange={setToevoegenOpen}
        standaardCategorie={categorieFilter}
        initialFiles={initialFiles}
      />

      <MoodboardLightbox
        items={gefilterd}
        openItem={lightboxItem}
        onOpenChange={(open) => !open && setLightboxItem(null)}
        kanBewerken={kanBewerken}
        onUpdate={async (id, patch) => updateMoodBoardItem(id, patch)}
        onDelete={async (id) => deleteMoodBoardItem(id)}
      />

      {/* Pagina-brede dropzone-overlay: verschijnt zodra bestanden vanaf het
          bureaublad over de pagina bewegen. Puur visuele feedback — het
          droppen zelf wordt op window-niveau afgehandeld (zie hierboven),
          zodat het overal op de pagina werkt, niet alleen boven het bord. */}
      {dragActief ? (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-rose-950/40 backdrop-blur-[2px]">
          <div className="rounded-2xl border-2 border-dashed border-white bg-rose-900/80 px-8 py-6 text-center text-white shadow-2xl">
            <Images className="mx-auto h-8 w-8" aria-hidden />
            <p className="mt-2 text-lg font-medium">Laat los om toe te voegen</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
